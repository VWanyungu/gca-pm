import express from 'express';
import { randomUUID } from 'crypto';
import { RiskIssues, RiskCategories } from '../database/utils/database.js';
import type { RiskStatus } from '../database/utils/database.js';
import authorize from '../middlewares/authorize.js';
import {
    createRiskIssueSchema,
    updateRiskIssueSchema,
    listRiskIssuesQuerySchema,
    riskIssueProjectParamsSchema,
    riskIssueParamsSchema,
    type CreateRiskIssueBody,
    type UpdateRiskIssueBody,
    type ListRiskIssuesQuery,
} from '../utils/validation.js';

// mergeParams so :projectId from the parent mount reaches authorize + handlers.
const router = express.Router({ mergeParams: true });

const canView = authorize([
    { role: 'PM', scopeType: 'project' },
    { role: 'Planner', scopeType: 'project' },
    { role: 'SiteEngineer', scopeType: 'project' },
    { role: 'ExCo', scopeType: 'global' },
    { role: 'Admin', scopeType: 'global' },
]);

const canManage = authorize([
    { role: 'PM', scopeType: 'project' },
    { role: 'ExCo', scopeType: 'global' },
    { role: 'Admin', scopeType: 'global' },
]);

const STATUS_TRANSITIONS: Record<RiskStatus, RiskStatus[]> = {
    open: ['mitigated', 'closed', 'dismissed'],
    mitigated: ['open', 'closed'],
    closed: ['open'],
    dismissed: ['open'],
    auto_resolved: [],
};

router.post('/', canManage, async (req, res) => {
    const params = riskIssueProjectParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const body = createRiskIssueSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (body.error) {
        res.status(400).json({ status: 'error', data: null, message: body.error.message });
        return;
    }
    const { projectId } = params.value as { projectId: string };
    const input = body.value as CreateRiskIssueBody;

    try {
        // AC-RSK-01: category must come from an active risk_category row.
        const category = await RiskCategories.getById(input.category_id);
        if (!category || !category.is_active) {
            res.status(400).json({ status: 'error', data: null, message: 'category_id must reference an active risk_category' });
            return;
        }

        const now = new Date();
        const kind = input.kind;
        const created = await RiskIssues.create({
            risk_id: randomUUID(),
            project_id: projectId,
            stage_no: input.stage_no ?? null,
            title: input.title,
            description: input.description ?? null,
            category_id: input.category_id,
            likelihood: kind === 'risk' ? input.likelihood ?? null : null,
            impact: input.impact,
            owner_id: input.owner_id ?? req.user!.userId,
            mitigation: input.mitigation ?? null,
            status: 'open',
            source: 'manual',
            kind,
            realised_at: kind === 'issue' ? now : null,
            realised_by: kind === 'issue' ? req.user!.userId : null,
            created_by: req.user!.userId,
        });

        res.status(201).json({ status: 'success', data: { riskIssue: created }, message: 'Risk/issue created' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});

router.get('/', canView, async (req, res) => {
    const params = riskIssueProjectParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const query = listRiskIssuesQuerySchema.validate(req.query, { abortEarly: false });
    if (query.error) {
        res.status(400).json({ status: 'error', data: null, message: query.error.message });
        return;
    }
    const { projectId } = params.value as { projectId: string };
    const { status, kind, page, limit } = query.value as ListRiskIssuesQuery;

    try {
        const result = await RiskIssues.list({ projectId, status, kind, page, limit });
        res.status(200).json({ status: 'success', data: result, message: 'Risk/issues retrieved' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});

router.get('/:riskId', canView, async (req, res) => {
    const params = riskIssueParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const { projectId, riskId } = params.value as { projectId: string; riskId: string };

    try {
        const riskIssue = await RiskIssues.getById(projectId, riskId);
        if (!riskIssue) {
            res.status(404).json({ status: 'error', data: null, message: 'Risk/issue not found' });
            return;
        }
        res.status(200).json({ status: 'success', data: { riskIssue }, message: 'Risk/issue retrieved' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});

router.patch('/:riskId', canManage, async (req, res) => {
    const params = riskIssueParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const body = updateRiskIssueSchema.validate(req.body ?? {}, { abortEarly: false, stripUnknown: true });
    if (body.error) {
        res.status(400).json({ status: 'error', data: null, message: body.error.message });
        return;
    }
    const { projectId, riskId } = params.value as { projectId: string; riskId: string };
    const patch = body.value as UpdateRiskIssueBody;

    try {
        const existing = await RiskIssues.getById(projectId, riskId);
        if (!existing) {
            res.status(404).json({ status: 'error', data: null, message: 'Risk/issue not found' });
            return;
        }

        const updates: Record<string, unknown> = { ...patch };
        if (patch.status && patch.status !== existing.status) {
            const allowed = STATUS_TRANSITIONS[existing.status];
            if (!allowed.includes(patch.status)) {
                res.status(400).json({ status: 'error', data: null, message: `Illegal status transition ${existing.status} → ${patch.status}` });
                return;
            }
            updates.closed_at = patch.status === 'open' ? null : new Date();
        }

        if (patch.kind === 'issue' && existing.kind !== 'issue') {
            if (existing.source === 'auto_overdue_task') {
                res.status(403).json({ status: 'error', data: null, message: 'Auto-overdue risks cannot be converted to issues' });
                return;
            }
            updates.realised_at = new Date();
            updates.realised_by = req.user!.userId;
            updates.likelihood = null;
        }

        if (patch.category_id && patch.category_id !== existing.category_id) {
            const category = await RiskCategories.getById(patch.category_id);
            if (!category || !category.is_active) {
                res.status(400).json({ status: 'error', data: null, message: 'category_id must reference an active risk_category' });
                return;
            }
        }

        const updated = await RiskIssues.update(projectId, riskId, updates);
        res.status(200).json({ status: 'success', data: { riskIssue: updated }, message: 'Risk/issue updated' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});

router.delete('/:riskId', canManage, async (req, res) => {
    const params = riskIssueParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const { projectId, riskId } = params.value as { projectId: string; riskId: string };
    const reason = (req.body?.reason as string | undefined)?.trim();
    if (!reason) {
        res.status(400).json({ status: 'error', data: null, message: 'reason required to dismiss' });
        return;
    }

    try {
        const existing = await RiskIssues.getById(projectId, riskId);
        if (!existing) {
            res.status(404).json({ status: 'error', data: null, message: 'Risk/issue not found' });
            return;
        }
        if (!STATUS_TRANSITIONS[existing.status].includes('dismissed')) {
            res.status(400).json({ status: 'error', data: null, message: `Cannot dismiss from status ${existing.status}` });
            return;
        }

        const dismissed = await RiskIssues.update(projectId, riskId, {
            status: 'dismissed',
            dismissal_reason: reason,
            closed_at: new Date(),
        });
        res.status(200).json({ status: 'success', data: { riskIssue: dismissed }, message: 'Risk/issue dismissed' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});

export default router;
