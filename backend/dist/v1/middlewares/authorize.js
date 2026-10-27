const deny = (res) => res.status(403).json({ status: 'error', data: null, message: 'Not authorized' });
export default function authorize(requestedRole) {
    return (req, res, next) => {
        const roles = req.user?.role;
        if (!roles) {
            res.status(403).json({ status: 'error', data: req.user, message: 'Authentication token not provided' });
            return;
        }
        const { programId, projectId } = req.params;
        // A grant is global, per-program or per-project, and the wider scope contains the
        // narrower one: a global PM is a PM of every project, so anywhere a PM@project would
        // be allowed, a PM@global is too. A project-scoped grant never satisfies a
        // requirement for a global one, which stays the stronger ask.
        const matches = (userRole, requiredRole) => {
            if (userRole.role !== requiredRole.role)
                return false;
            if (userRole.scope_type === 'global')
                return true;
            if (userRole.scope_type !== requiredRole.scopeType)
                return false;
            if (requiredRole.scopeType === 'program')
                return userRole.program_id === programId;
            if (requiredRole.scopeType === 'project')
                return userRole.project_id === projectId;
            return true;
        };
        const isAuthorized = roles.some(role => (role.role === 'Admin' && role.scope_type === 'global') || requestedRole.some(requiredRole => matches(role, requiredRole)));
        console.log('Authorization check:', {
            userRoles: roles,
            requestedRoles: requestedRole,
            programId,
            projectId,
            isAuthorized,
        });
        isAuthorized ? next() : deny(res);
    };
}
/**
 * For read-only, project-agnostic reference data (weather categories, personnel roles): any
 * grant of one of these roles qualifies, at any scope. `authorize()`'s project/program scope
 * check only works on routes that carry a matching `:projectId`/`:programId` param — a
 * reference-data route has neither, so a project-scoped grant (the common case for
 * SiteEngineer, Planner, etc.) can never satisfy `authorize()`'s `scopeType: 'project'` there.
 */
export function authorizeAnyRole(roles) {
    return (req, res, next) => {
        const grants = req.user?.role;
        if (!grants) {
            res.status(403).json({ status: 'error', data: req.user, message: 'Authentication token not provided' });
            return;
        }
        const isAuthorized = grants.some((grant) => (grant.role === 'Admin' && grant.scope_type === 'global') || roles.includes(grant.role));
        isAuthorized ? next() : deny(res);
    };
}
