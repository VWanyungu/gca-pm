import express from 'express';
import {
  Dprs,
  Projects,
  ProjectStages,
  ProjectContractors,
} from '../database/utils/database.js';
import authorize from '../middlewares/authorize.js';
import {
  projectIdParamSchema,
  dprIdParamSchema,
  createDprSchema,
  updateDprSchema,
  listDprsQuerySchema,
  uploadDprPhotoSchema,
  type CreateDprBody,
  type UpdateDprBody,
  type ListDprsQuery,
  type UploadDprPhotoBody,
} from '../utils/validation.js';
import { storeObject, FileValidationError, FileStorageError } from '../utils/objectStorage.js';

// mergeParams so :projectId reaches authorize and handlers
const router = express.Router({ mergeParams: true });

// AC-DPR-01: Create/edit/submit requires SiteEngineer@project or Admin@global
const canCreateOrEdit = authorize([
  { role: 'SiteEngineer', scopeType: 'project' },
  { role: 'Admin', scopeType: 'global' },
]);

// AC-DPR-01: Read allowed for SiteEngineer, PM, Planner, ExCo, Admin
const canView = authorize([
  { role: 'SiteEngineer', scopeType: 'project' },
  { role: 'PM', scopeType: 'global' },
  { role: 'PM', scopeType: 'project' },
  { role: 'Planner', scopeType: 'project' },
  { role: 'ExCo', scopeType: 'global' },
  { role: 'Admin', scopeType: 'global' },
]);

function getTodayInTimezone(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    return `${y}-${m}-${day}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function isSameDayInTimezone(d1: Date, d2: Date, timezone: string): boolean {
  try {
    const format = (d: Date) => {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(d);
      const y = parts.find((p) => p.type === 'year')?.value;
      const m = parts.find((p) => p.type === 'month')?.value;
      const day = parts.find((p) => p.type === 'day')?.value;
      return `${y}-${m}-${day}`;
    };
    return format(d1) === format(d2);
  } catch {
    return d1.toISOString().slice(0, 10) === d2.toISOString().slice(0, 10);
  }
}

function userIsAdmin(req: express.Request): boolean {
  return (
    req.user?.role.some((r) => r.role === 'Admin' && r.scope_type === 'global') ??
    false
  );
}

// GET /projects/:projectId/dpr/prefill - AC-DPR-12
router.get('/prefill', canCreateOrEdit, async (req, res) => {
  const params = projectIdParamSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId } = params.value as { projectId: string };

  try {
    const project = await Projects.getById(projectId);
    if (!project) {
      res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
      return;
    }

    const prefillData = await Dprs.prefill(projectId);
    res.status(200).json({
      status: 'success',
      data: { prefill: prefillData },
      message: 'Prefill data retrieved',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// POST /projects/:projectId/dpr/photos/upload - AC-DPR-09
// Registered before /:dprId routes so "photos" isn't captured as a dprId param.
router.post('/photos/upload', canCreateOrEdit, async (req, res) => {
  const params = projectIdParamSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const body = uploadDprPhotoSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (body.error) {
    res.status(400).json({ status: 'error', data: null, message: body.error.message });
    return;
  }
  const { projectId } = params.value as { projectId: string };
  const input = body.value as UploadDprPhotoBody;

  try {
    const project = await Projects.getById(projectId);
    if (!project) {
      res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
      return;
    }

    const { fileObject, url } = await storeObject({
      file: input.file,
      purpose: 'dpr_photo',
      projectId,
      uploadedBy: req.user!.userId,
      originalFilename: input.filename,
    });

    res.status(201).json({
      status: 'success',
      data: { file_id: fileObject.file_id, url },
      message: 'Photo uploaded',
    });
  } catch (err) {
    if (err instanceof FileValidationError) {
      res.status(400).json({ status: 'error', data: null, message: err.message });
      return;
    }
    if (err instanceof FileStorageError) {
      res.status(502).json({
        status: 'error',
        data: null,
        message: `Could not store the photo: ${err.message}`,
      });
      return;
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// POST /projects/:projectId/dpr
router.post('/', canCreateOrEdit, async (req, res) => {
  const params = projectIdParamSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const body = createDprSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (body.error) {
    res.status(400).json({ status: 'error', data: null, message: body.error.message });
    return;
  }

  const { projectId } = params.value as { projectId: string };
  const input = body.value as CreateDprBody;

  try {
    const project = await Projects.getById(projectId);
    if (!project) {
      res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
      return;
    }

    const projectTz = project.timezone || 'Africa/Nairobi';
    const reportDateStr = input.report_date.slice(0, 10);

    // AC-DPR-03: report_date must not be in the future (project-local)
    const todayStr = getTodayInTimezone(projectTz);
    if (reportDateStr > todayStr) {
      res.status(400).json({
        status: 'error',
        data: null,
        message: 'Report date cannot be in the future',
      });
      return;
    }

    // AC-DPR-04: One DPR per project per date (drafts included)
    const existingForDate = await Dprs.getByProjectAndDate(projectId, reportDateStr);
    if (existingForDate) {
      res.status(409).json({
        status: 'error',
        data: { existingDprId: existingForDate.dpr_id, dprRef: existingForDate.dpr_ref },
        message: `A DPR already exists for project ${projectId} on ${reportDateStr}`,
      });
      return;
    }

    // AC-DPR-02: stage_no must be 7, 8 or 10, in scope, and active
    let resolvedStageNo: number;
    if (input.stage_no !== undefined && input.stage_no !== null) {
      if (![7, 8, 10].includes(input.stage_no)) {
        res.status(400).json({
          status: 'error',
          data: null,
          message: 'DPR stage must be 7 (Construction), 8 (Commissioning), or 10 (Post-Commissioning)',
        });
        return;
      }
      const stage = await ProjectStages.get(projectId, input.stage_no);
      if (!stage || !stage.in_scope || stage.state !== 'active') {
        res.status(400).json({
          status: 'error',
          data: null,
          message: `Stage ${input.stage_no} is not active or not in scope for this project`,
        });
        return;
      }
      resolvedStageNo = input.stage_no;
    } else {
      // Default to 7 if active; otherwise try 8 then 10
      const stage7 = await ProjectStages.get(projectId, 7);
      if (stage7 && stage7.in_scope && stage7.state === 'active') {
        resolvedStageNo = 7;
      } else {
        const stage8 = await ProjectStages.get(projectId, 8);
        if (stage8 && stage8.in_scope && stage8.state === 'active') {
          resolvedStageNo = 8;
        } else {
          const stage10 = await ProjectStages.get(projectId, 10);
          if (stage10 && stage10.in_scope && stage10.state === 'active') {
            resolvedStageNo = 10;
          } else {
            res.status(400).json({
              status: 'error',
              data: null,
              message: 'No eligible active stage (7, 8, or 10) found for this project. Please specify stage_no.',
            });
            return;
          }
        }
      }
    }

    // AC-DPR-06: Activity progress rows validation
    if (input.activity_progress && input.activity_progress.length > 0) {
      for (const act of input.activity_progress) {
        if (act.today_pct > act.total_pct) {
          res.status(400).json({
            status: 'error',
            data: null,
            message: `today_pct (${act.today_pct}) cannot be greater than total_pct (${act.total_pct})`,
          });
          return;
        }
      }
    }

    // AC-DPR-07: Personnel groups validation
    if (input.personnel_groups && input.personnel_groups.length > 0) {
      for (const group of input.personnel_groups) {
        if (group.role_counts && group.role_counts.length > 0) {
          const sum = group.role_counts.reduce((acc, curr) => acc + curr.headcount, 0);
          if (sum > group.total_headcount) {
            res.status(400).json({
              status: 'error',
              data: null,
              message: `Sum of role headcounts (${sum}) cannot exceed total headcount (${group.total_headcount})`,
            });
            return;
          }
        }

        const pc = await ProjectContractors.getById(group.project_contractor_id);
        if (!pc || pc.project_id !== projectId) {
          res.status(400).json({
            status: 'error',
            data: null,
            message: `Contractor link ${group.project_contractor_id} does not belong to project ${projectId}`,
          });
          return;
        }
        if (!pc.is_active) {
          res.status(400).json({
            status: 'error',
            data: null,
            message: `Contractor ${pc.contractor_name} is not active on this project`,
          });
          return;
        }
      }
    }

    const created = await Dprs.create({
      ...input,
      project_id: projectId,
      stage_no: resolvedStageNo,
      report_date: reportDateStr,
      author_id: req.user!.userId,
    });

    res.status(201).json({
      status: 'success',
      data: { dpr: created },
      message: 'DPR created',
    });
  } catch (err: any) {
    if (
      err?.code === '23505' &&
      (err?.detail?.includes('report_date') || err?.constraint?.includes('dpr'))
    ) {
      res.status(409).json({
        status: 'error',
        data: null,
        message: `A DPR already exists for project ${projectId} on this report date`,
      });
      return;
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// GET /projects/:projectId/dpr
router.get('/', canView, async (req, res) => {
  const params = projectIdParamSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const queryVal = listDprsQuerySchema.validate(req.query, { abortEarly: false, stripUnknown: true });
  if (queryVal.error) {
    res.status(400).json({ status: 'error', data: null, message: queryVal.error.message });
    return;
  }

  const { projectId } = params.value as { projectId: string };
  const query = queryVal.value as ListDprsQuery;

  try {
    const project = await Projects.getById(projectId);
    if (!project) {
      res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
      return;
    }

    const isAdmin = userIsAdmin(req);
    const result = await Dprs.list({
      projectId,
      stageNo: query.stage_no,
      status: query.status,
      fromDate: query.from_date?.slice(0, 10),
      toDate: query.to_date?.slice(0, 10),
      authorId: query.author_id,
      page: query.page,
      limit: query.limit,
      visibleToUserId: req.user!.userId,
      isAdmin,
    });

    res.status(200).json({
      status: 'success',
      data: result,
      message: 'DPRs retrieved',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// GET /projects/:projectId/dpr/:dprId
router.get('/:dprId', canView, async (req, res) => {
  const params = dprIdParamSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, dprId } = params.value as { projectId: string; dprId: string };

  try {
    const dpr = await Dprs.getById(dprId, projectId);
    if (!dpr) {
      res.status(404).json({ status: 'error', data: null, message: 'DPR not found' });
      return;
    }

    // AC-DPR-01: Drafts are visible only to author and Admin
    const isAdmin = userIsAdmin(req);
    if (dpr.status === 'draft' && !isAdmin && dpr.author_id !== req.user!.userId) {
      res.status(404).json({ status: 'error', data: null, message: 'DPR not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: { dpr },
      message: 'DPR retrieved',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// PATCH /projects/:projectId/dpr/:dprId
router.patch('/:dprId', canCreateOrEdit, async (req, res) => {
  const params = dprIdParamSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const body = updateDprSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (body.error) {
    res.status(400).json({ status: 'error', data: null, message: body.error.message });
    return;
  }

  const { projectId, dprId } = params.value as { projectId: string; dprId: string };
  const patch = body.value as UpdateDprBody;

  try {
    const existing = await Dprs.getById(dprId, projectId);
    if (!existing) {
      res.status(404).json({ status: 'error', data: null, message: 'DPR not found' });
      return;
    }

    const isAdmin = userIsAdmin(req);
    const isAuthor = existing.author_id === req.user!.userId;

    if (!isAdmin && !isAuthor) {
      res.status(403).json({
        status: 'error',
        data: null,
        message: 'Only the author can edit this DPR',
      });
      return;
    }

    const project = await Projects.getById(projectId);
    const projectTz = project?.timezone || 'Africa/Nairobi';

    // AC-DPR-08: Same-day edit window for submitted DPRs
    if (existing.status === 'submitted') {
      if (!existing.submitted_at) {
        res.status(400).json({
          status: 'error',
          data: null,
          message: 'Cannot edit submitted DPR without submission timestamp',
        });
        return;
      }

      const submittedDate = new Date(existing.submitted_at);
      const now = new Date();
      const inSameDayWindow = isSameDayInTimezone(submittedDate, now, projectTz);

      if (!inSameDayWindow && !isAdmin) {
        res.status(403).json({
          status: 'error',
          data: null,
          message: 'Submitted DPRs cannot be edited directly after the day of submission. Please submit an amendment request.',
        });
        return;
      }
    }

    // Stage validation if provided
    if (patch.stage_no !== undefined && patch.stage_no !== null) {
      if (![7, 8, 10].includes(patch.stage_no)) {
        res.status(400).json({
          status: 'error',
          data: null,
          message: 'DPR stage must be 7 (Construction), 8 (Commissioning), or 10 (Post-Commissioning)',
        });
        return;
      }
      const stage = await ProjectStages.get(projectId, patch.stage_no);
      if (!stage || !stage.in_scope || stage.state !== 'active') {
        res.status(400).json({
          status: 'error',
          data: null,
          message: `Stage ${patch.stage_no} is not active or not in scope for this project`,
        });
        return;
      }
    }

    // Report date validation if provided
    if (patch.report_date) {
      const reportDateStr = patch.report_date.slice(0, 10);
      const todayStr = getTodayInTimezone(projectTz);
      if (reportDateStr > todayStr) {
        res.status(400).json({
          status: 'error',
          data: null,
          message: 'Report date cannot be in the future',
        });
        return;
      }

      const existingForDate = await Dprs.getByProjectAndDate(projectId, reportDateStr);
      if (existingForDate && existingForDate.dpr_id !== dprId) {
        res.status(409).json({
          status: 'error',
          data: { existingDprId: existingForDate.dpr_id, dprRef: existingForDate.dpr_ref },
          message: `A DPR already exists for project ${projectId} on ${reportDateStr}`,
        });
        return;
      }
      patch.report_date = reportDateStr;
    }

    // Activity progress rows validation
    if (patch.activity_progress && patch.activity_progress.length > 0) {
      for (const act of patch.activity_progress) {
        if (act.today_pct > act.total_pct) {
          res.status(400).json({
            status: 'error',
            data: null,
            message: `today_pct (${act.today_pct}) cannot be greater than total_pct (${act.total_pct})`,
          });
          return;
        }
      }
    }

    // Personnel groups validation
    if (patch.personnel_groups && patch.personnel_groups.length > 0) {
      for (const group of patch.personnel_groups) {
        if (group.role_counts && group.role_counts.length > 0) {
          const sum = group.role_counts.reduce((acc, curr) => acc + curr.headcount, 0);
          if (sum > group.total_headcount) {
            res.status(400).json({
              status: 'error',
              data: null,
              message: `Sum of role headcounts (${sum}) cannot exceed total headcount (${group.total_headcount})`,
            });
            return;
          }
        }

        const pc = await ProjectContractors.getById(group.project_contractor_id);
        if (!pc || pc.project_id !== projectId) {
          res.status(400).json({
            status: 'error',
            data: null,
            message: `Contractor link ${group.project_contractor_id} does not belong to project ${projectId}`,
          });
          return;
        }
        if (!pc.is_active) {
          res.status(400).json({
            status: 'error',
            data: null,
            message: `Contractor ${pc.contractor_name} is not active on this project`,
          });
          return;
        }
      }
    }

    const updated = await Dprs.update(dprId, patch);

    res.status(200).json({
      status: 'success',
      data: { dpr: updated },
      message: 'DPR updated',
    });
  } catch (err: any) {
    if (
      err?.code === '23505' &&
      (err?.detail?.includes('report_date') || err?.constraint?.includes('dpr'))
    ) {
      res.status(409).json({
        status: 'error',
        data: null,
        message: `A DPR already exists for project ${projectId} on this report date`,
      });
      return;
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// POST /projects/:projectId/dpr/:dprId/submit - AC-DPR-05
router.post('/:dprId/submit', canCreateOrEdit, async (req, res) => {
  const params = dprIdParamSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, dprId } = params.value as { projectId: string; dprId: string };

  try {
    const existing = await Dprs.getById(dprId, projectId);
    if (!existing) {
      res.status(404).json({ status: 'error', data: null, message: 'DPR not found' });
      return;
    }

    if (existing.status === 'submitted') {
      res.status(400).json({
        status: 'error',
        data: null,
        message: 'DPR has already been submitted',
      });
      return;
    }

    const isAdmin = userIsAdmin(req);
    const isAuthor = existing.author_id === req.user!.userId;
    if (!isAdmin && !isAuthor) {
      res.status(403).json({
        status: 'error',
        data: null,
        message: 'Only the author can submit this DPR',
      });
      return;
    }

    const submitted = await Dprs.submit(dprId, req.user!.userId);

    res.status(200).json({
      status: 'success',
      data: { dpr: submitted },
      message: 'DPR submitted successfully',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// DELETE /projects/:projectId/dpr/:dprId
router.delete('/:dprId', canCreateOrEdit, async (req, res) => {
  const params = dprIdParamSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, dprId } = params.value as { projectId: string; dprId: string };

  try {
    const existing = await Dprs.getById(dprId, projectId);
    if (!existing) {
      res.status(404).json({ status: 'error', data: null, message: 'DPR not found' });
      return;
    }

    if (existing.status !== 'draft') {
      res.status(400).json({
        status: 'error',
        data: null,
        message: 'Submitted DPRs cannot be deleted',
      });
      return;
    }

    const isAdmin = userIsAdmin(req);
    const isAuthor = existing.author_id === req.user!.userId;
    if (!isAdmin && !isAuthor) {
      res.status(403).json({
        status: 'error',
        data: null,
        message: 'Only the author can delete this draft DPR',
      });
      return;
    }

    const deleted = await Dprs.delete(dprId);
    if (!deleted) {
      res.status(404).json({ status: 'error', data: null, message: 'DPR not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: null,
      message: 'Draft DPR deleted successfully',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

export default router;
