import express from 'express';
import { Projects, Contractors, ProjectContractors, } from '../database/utils/database.js';
import authorize from '../middlewares/authorize.js';
import { projectIdParamSchema, projectContractorParamsSchema, createProjectContractorSchema, updateProjectContractorSchema, listProjectContractorsQuerySchema, } from '../utils/validation.js';
// mergeParams so :projectId reaches authorize + handlers.
const router = express.Router({ mergeParams: true });
const canView = authorize([
    { role: 'PM', scopeType: 'global' },
    { role: 'PM', scopeType: 'project' },
    { role: 'Planner', scopeType: 'project' },
    { role: 'SiteEngineer', scopeType: 'project' },
    { role: 'ExCo', scopeType: 'global' },
    { role: 'Admin', scopeType: 'global' },
]);
const canManage = authorize([
    { role: 'PM', scopeType: 'project' },
    { role: 'SiteEngineer', scopeType: 'project' },
    { role: 'ExCo', scopeType: 'global' },
    { role: 'Admin', scopeType: 'global' },
]);
// POST /projects/:projectId/contractors (Supports AC-DPR-11: find-or-create contractor and link)
router.post('/', canManage, async (req, res) => {
    const params = projectIdParamSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const body = createProjectContractorSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (body.error) {
        res.status(400).json({ status: 'error', data: null, message: body.error.message });
        return;
    }
    const { projectId } = params.value;
    const input = body.value;
    try {
        const project = await Projects.getById(projectId);
        if (!project) {
            res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
            return;
        }
        let contractorId = input.contractor_id;
        // AC-DPR-11: If contractor_name provided, find-or-create contractor
        if (!contractorId && input.contractor_name) {
            const { contractor } = await Contractors.findOrCreate(input.contractor_name, req.user.userId);
            contractorId = contractor.contractor_id;
        }
        if (!contractorId) {
            res.status(400).json({ status: 'error', data: null, message: 'contractor_id or contractor_name is required' });
            return;
        }
        // Verify contractor exists and resolve merged target if necessary
        const contractor = await Contractors.getById(contractorId);
        if (!contractor) {
            res.status(404).json({ status: 'error', data: null, message: 'Contractor not found' });
            return;
        }
        const effectiveContractorId = contractor.merged_into_id || contractor.contractor_id;
        const existingLink = await ProjectContractors.get(projectId, effectiveContractorId);
        if (existingLink) {
            // If inactive, reactivate it
            if (!existingLink.is_active) {
                const reactivated = await ProjectContractors.update(existingLink.project_contractor_id, {
                    is_active: true,
                    party_type: input.party_type ?? existingLink.party_type,
                });
                res.status(200).json({
                    status: 'success',
                    data: { projectContractor: reactivated },
                    message: 'Contractor reactivated on project',
                });
                return;
            }
            res.status(409).json({
                status: 'error',
                data: null,
                message: 'Contractor is already linked to this project',
            });
            return;
        }
        const linked = await ProjectContractors.link({
            project_id: projectId,
            contractor_id: effectiveContractorId,
            party_type: input.party_type ?? 'contractor',
            is_active: input.is_active ?? true,
            added_by: req.user.userId,
        });
        res.status(201).json({
            status: 'success',
            data: { projectContractor: linked },
            message: 'Contractor linked to project successfully',
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});
// GET /projects/:projectId/contractors
router.get('/', canView, async (req, res) => {
    const params = projectIdParamSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const query = listProjectContractorsQuerySchema.validate(req.query);
    if (query.error) {
        res.status(400).json({ status: 'error', data: null, message: query.error.message });
        return;
    }
    const { projectId } = params.value;
    const { includeInactive } = query.value;
    try {
        const project = await Projects.getById(projectId);
        if (!project) {
            res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
            return;
        }
        const contractors = await ProjectContractors.listByProject(projectId, { includeInactive });
        res.status(200).json({
            status: 'success',
            data: { contractors },
            message: 'Project contractors retrieved',
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});
// GET /projects/:projectId/contractors/:contractorId
router.get('/:contractorId', canView, async (req, res) => {
    const params = projectContractorParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const { projectId, contractorId } = params.value;
    try {
        const link = await ProjectContractors.get(projectId, contractorId);
        if (!link) {
            res.status(404).json({ status: 'error', data: null, message: 'Contractor not linked to this project' });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: { projectContractor: link },
            message: 'Project contractor retrieved',
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});
// PATCH /projects/:projectId/contractors/:contractorId
router.patch('/:contractorId', canManage, async (req, res) => {
    const params = projectContractorParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const body = updateProjectContractorSchema.validate(req.body ?? {}, { abortEarly: false, stripUnknown: true });
    if (body.error) {
        res.status(400).json({ status: 'error', data: null, message: body.error.message });
        return;
    }
    const { projectId, contractorId } = params.value;
    const input = body.value;
    try {
        const link = await ProjectContractors.get(projectId, contractorId);
        if (!link) {
            res.status(404).json({ status: 'error', data: null, message: 'Contractor not linked to this project' });
            return;
        }
        const updated = await ProjectContractors.update(link.project_contractor_id, input);
        res.status(200).json({
            status: 'success',
            data: { projectContractor: updated },
            message: 'Project contractor updated',
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});
// DELETE /projects/:projectId/contractors/:contractorId
router.delete('/:contractorId', canManage, async (req, res) => {
    const params = projectContractorParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const { projectId, contractorId } = params.value;
    try {
        const link = await ProjectContractors.get(projectId, contractorId);
        if (!link) {
            res.status(404).json({ status: 'error', data: null, message: 'Contractor not linked to this project' });
            return;
        }
        // Soft deactivate by default
        await ProjectContractors.update(link.project_contractor_id, { is_active: false });
        res.status(200).json({
            status: 'success',
            data: null,
            message: 'Contractor removed from project',
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});
export default router;
