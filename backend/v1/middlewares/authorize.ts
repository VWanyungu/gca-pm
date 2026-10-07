import type { RequestHandler } from 'express';
import type { RoleName, ScopeType } from '../database/utils/database.js';
import type { TokenRoleItem } from '../../types.js';

type RequiredRole = { role: RoleName; scopeType: ScopeType };

const deny = (res: Parameters<RequestHandler>[1]) =>
    res.status(403).json({ status: 'error', data: null, message: 'Not authorized' });

export default function authorize(requestedRole: RequiredRole[]): RequestHandler {
    return (req, res, next) => {
        const roles = req.user?.role;
        if (!roles) {
            res.status(403).json({ status: 'error', data: req.user, message: 'Authentication token not provided' });
            return;
        }

        const { programId, projectId } = req.params;

        const matches = (userRole: TokenRoleItem, requiredRole: RequiredRole) =>
            userRole.role === requiredRole.role &&
            userRole.scope_type === requiredRole.scopeType &&
            (requiredRole.scopeType !== 'program' || userRole.program_id === programId) &&
            (requiredRole.scopeType !== 'project' || userRole.project_id === projectId);

        const isAuthorized = roles.some(role => (role.role === 'Admin' && role.scope_type === 'global') || requestedRole.some(requiredRole => matches(role, requiredRole)));

        isAuthorized ? next() : deny(res);
    };
}