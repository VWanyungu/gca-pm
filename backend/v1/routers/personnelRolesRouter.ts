import express from 'express';
import { PersonnelRoles } from '../database/utils/database.js';
import { authorizeAnyRole } from '../middlewares/authorize.js';
import {
    listPersonnelRolesQuerySchema,
    type ListPersonnelRolesQuery,
} from '../utils/validation.js';

const router = express.Router();

// Reference data, not project-scoped — any grant of these roles qualifies (see authorizeAnyRole).
const canListPersonnelRoles = authorizeAnyRole([
    'ExCo',
    'Admin',
    'PM',
    'Planner',
    'SiteEngineer',
    'ProjectCreator',
]);

router.get('/', canListPersonnelRoles, async (req, res) => {
    const { error, value } = listPersonnelRolesQuerySchema.validate(req.query, { abortEarly: false });
    if (error) {
        res.status(400).json({ status: 'error', data: null, message: error.message });
        return;
    }
    const { include_inactive } = value as ListPersonnelRolesQuery;

    try {
        const result = await PersonnelRoles.list({ includeInactive: include_inactive });
        res.status(200).json({ status: 'success', data: result, message: 'Personnel roles retrieved' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});

export default router;
