import express from 'express';
import { PersonnelRoles } from '../database/utils/database.js';
import { authorizeAnyRole } from '../middlewares/authorize.js';
import { listPersonnelRolesQuerySchema, createPersonnelRoleSchema, } from '../utils/validation.js';
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
// Creating is narrower than listing: ExCo is read-only on reference data.
const canCreatePersonnelRole = authorizeAnyRole(['Admin', 'PM', 'Planner', 'SiteEngineer']);
router.get('/', canListPersonnelRoles, async (req, res) => {
    const { error, value } = listPersonnelRolesQuerySchema.validate(req.query, { abortEarly: false });
    if (error) {
        res.status(400).json({ status: 'error', data: null, message: error.message });
        return;
    }
    const { include_inactive } = value;
    try {
        const result = await PersonnelRoles.list({ includeInactive: include_inactive });
        res.status(200).json({ status: 'success', data: result, message: 'Personnel roles retrieved' });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});
// POST / — site engineers add a trade that is missing from the list while filling a DPR,
// the same find-or-create the contractor picker does (AC-DPR-11).
router.post('/', canCreatePersonnelRole, async (req, res) => {
    const { error, value } = createPersonnelRoleSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
    });
    if (error) {
        res.status(400).json({ status: 'error', data: null, message: error.message });
        return;
    }
    const { name } = value;
    try {
        const role = await PersonnelRoles.findOrCreate(name);
        res.status(201).json({ status: 'success', data: { role }, message: 'Personnel role saved' });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});
export default router;
