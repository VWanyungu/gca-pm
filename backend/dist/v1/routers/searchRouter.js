import express from 'express';
import { Search } from '../database/utils/database.js';
import { authorizeAnyRole } from '../middlewares/authorize.js';
import { searchQuerySchema } from '../utils/validation.js';
const router = express.Router();
// Global search spans projects, so it has no :projectId for authorize() to scope against —
// any grant gets in, and the results are then narrowed to what that grant can see.
const canSearch = authorizeAnyRole([
    'Admin',
    'ExCo',
    'PM',
    'Planner',
    'SiteEngineer',
    'ProjectCreator',
]);
/**
 * The projects a caller may see, as `Search.query` wants it: null for unrestricted, otherwise
 * the explicit list. Mirrors authorize()'s rule that a global grant contains every narrower
 * scope. Program-scoped grants are not expanded here — no route grants program scope today,
 * and guessing wrong would widen access rather than narrow it.
 */
function visibleProjectIds(grants) {
    if (grants.some((g) => g.scope_type === 'global'))
        return null;
    const ids = grants
        .filter((g) => g.scope_type === 'project' && g.project_id)
        .map((g) => g.project_id);
    return [...new Set(ids)];
}
router.get('/', canSearch, async (req, res) => {
    const { error, value } = searchQuerySchema.validate(req.query, { abortEarly: false });
    if (error) {
        res.status(400).json({ status: 'error', data: null, message: error.message });
        return;
    }
    const { q, limit } = value;
    try {
        const results = await Search.query({
            q,
            projectIds: visibleProjectIds(req.user.role),
            limit,
        });
        res.status(200).json({ status: 'success', data: results, message: 'Search results' });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});
export default router;
