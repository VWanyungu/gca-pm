import express from 'express';
import {
  Projects,
  ScheduleVersions,
  ScheduleTasks,
  ScheduleReconciliationFlags,
  ScheduleUploadInFlightError,
  ChangeRequests,
} from '../database/utils/database.js';
import authorize from '../middlewares/authorize.js';
import {
  scheduleProjectParamsSchema,
  scheduleVersionParamsSchema,
  listReconciliationFlagsQuerySchema,
  acknowledgeReconciliationFlagsSchema,
  uploadScheduleSchema,
  type UploadScheduleBody,
} from '../utils/validation.js';
import {
  storeObject,
  discardObject,
  FileValidationError,
  FileStorageError,
} from '../utils/objectStorage.js';
import { processScheduleVersion } from '../utils/scheduleProcessor.js';

// mergeParams so :projectId reaches authorize and handlers
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
  { role: 'Planner', scopeType: 'project' },
  { role: 'ExCo', scopeType: 'global' },
  { role: 'Admin', scopeType: 'global' },
]);

// AC-SCH-01 narrows uploading to the project's Planner; authorize() always lets Admin@global through.
const canUpload = authorize([{ role: 'Planner', scopeType: 'project' }]);

// GET /projects/:projectId/schedule/versions
router.get('/versions', canView, async (req, res) => {
  const params = scheduleProjectParamsSchema.validate(req.params);
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

    const versions = await ScheduleVersions.listApplied(projectId);
    res.status(200).json({ status: 'success', data: { versions }, message: 'Schedule versions retrieved' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// GET /projects/:projectId/schedule/versions/:versionId
// Any status, so the upload screen can poll a queued or parsing version and show the
// diagnostics of a failed one (AC-SCH-42).
router.get('/versions/:versionId', canView, async (req, res) => {
  const params = scheduleVersionParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, versionId } = params.value as { projectId: string; versionId: string };

  try {
    const version = await ScheduleVersions.getById(projectId, versionId);
    if (!version) {
      res.status(404).json({ status: 'error', data: null, message: 'Schedule version not found' });
      return;
    }
    res.status(200).json({ status: 'success', data: { version }, message: 'Schedule version retrieved' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// GET /projects/:projectId/schedule/versions/:versionId/changes
router.get('/versions/:versionId/changes', canView, async (req, res) => {
  const params = scheduleVersionParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, versionId } = params.value as { projectId: string; versionId: string };

  try {
    const project = await Projects.getById(projectId);
    if (!project) {
      res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
      return;
    }

    const changes = await ScheduleVersions.getChanges(projectId, versionId);
    res.status(200).json({ status: 'success', data: { changes }, message: 'Version changes retrieved' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// GET /projects/:projectId/schedule/tasks
router.get('/tasks', canView, async (req, res) => {
  const params = scheduleProjectParamsSchema.validate(req.params);
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

    const tasks = await ScheduleTasks.listCurrent(projectId);
    res.status(200).json({ status: 'success', data: { tasks }, message: 'Schedule tasks retrieved' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// GET /projects/:projectId/schedule/overdue
router.get('/overdue', canView, async (req, res) => {
  const params = scheduleProjectParamsSchema.validate(req.params);
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

    const tasks = await ScheduleTasks.listOverdue(projectId);
    res.status(200).json({ status: 'success', data: { tasks }, message: 'Overdue tasks retrieved' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// GET /projects/:projectId/schedule/reconciliation-flags
router.get('/reconciliation-flags', canView, async (req, res) => {
  const params = scheduleProjectParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const query = listReconciliationFlagsQuerySchema.validate(req.query, { abortEarly: false });
  if (query.error) {
    res.status(400).json({ status: 'error', data: null, message: query.error.message });
    return;
  }
  const { projectId } = params.value as { projectId: string };
  const filter = query.value as { includeAcknowledged: boolean; page: number; limit: number };

  try {
    const project = await Projects.getById(projectId);
    if (!project) {
      res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
      return;
    }

    const result = await ScheduleReconciliationFlags.list({
      projectId,
      includeAcknowledged: filter.includeAcknowledged,
      page: filter.page,
      limit: filter.limit,
    });

    res.status(200).json({ status: 'success', data: result, message: 'Reconciliation flags retrieved' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// POST /projects/:projectId/schedule/reconciliation-flags/acknowledge
router.post('/reconciliation-flags/acknowledge', canManage, async (req, res) => {
  const params = scheduleProjectParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const body = acknowledgeReconciliationFlagsSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (body.error) {
    res.status(400).json({ status: 'error', data: null, message: body.error.message });
    return;
  }
  const { projectId } = params.value as { projectId: string };
  const { flag_ids } = body.value as { flag_ids: string[] };

  try {
    const project = await Projects.getById(projectId);
    if (!project) {
      res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
      return;
    }

    const acknowledged = await ScheduleReconciliationFlags.acknowledge(projectId, flag_ids, req.user!.userId);
    res.status(200).json({ status: 'success', data: { acknowledged }, message: 'Flags acknowledged' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// POST /projects/:projectId/schedule/upload
// AC-SCH-01: store the file, queue a version, and answer. The parse and the apply
// transaction happen after this request; the client polls the version for the outcome.
router.post('/upload', canUpload, async (req, res) => {
  const params = scheduleProjectParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const body = uploadScheduleSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (body.error) {
    res.status(400).json({ status: 'error', data: null, message: body.error.message });
    return;
  }
  const { projectId } = params.value as { projectId: string };
  const input = body.value as UploadScheduleBody;

  try {
    const project = await Projects.getById(projectId);
    if (!project) {
      res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
      return;
    }

    // Cheap pre-check so a Planner who clicks twice gets the real message rather than a
    // storage bill; ux_sv_one_inflight below is what actually settles the race.
    if (await ScheduleVersions.hasInFlight(projectId)) {
      res.status(409).json({
        status: 'error',
        data: null,
        message: 'An upload for this project is still being processed',
      });
      return;
    }

    const latestApplied = await ScheduleVersions.latestApplied(projectId);

    // AC-SCH-02: the first applied upload of a project is its baseline; a change request
    // turns a later one into a rebaseline, and must be an approved CR of this project.
    let uploadKind: 'regular' | 'initial_baseline' | 'rebaseline';
    if (input.change_request_id) {
      const changeRequest = await ChangeRequests.getById(projectId, input.change_request_id);
      if (!changeRequest) {
        res.status(404).json({ status: 'error', data: null, message: 'Change request not found' });
        return;
      }
      if (changeRequest.status !== 'approved') {
        res.status(400).json({
          status: 'error',
          data: null,
          message: 'A rebaseline needs an approved change request',
        });
        return;
      }
      uploadKind = 'rebaseline';
    } else {
      uploadKind = latestApplied ? 'regular' : 'initial_baseline';
    }

    const { fileObject, bytes } = await storeObject({
      file: input.file,
      purpose: 'schedule_mpp',
      projectId,
      uploadedBy: req.user!.userId,
      originalFilename: input.filename,
    });

    let version;
    try {
      version = await ScheduleVersions.createQueued({
        project_id: projectId,
        upload_kind: uploadKind,
        change_request_id: input.change_request_id ?? null,
        scope_mode: input.scope_mode,
        source_file_id: fileObject.file_id,
        file_sha256: fileObject.sha256,
        uploaded_by: req.user!.userId,
        notes: input.notes?.trim() || null,
      });
    } catch (err) {
      // Nothing will ever reference this file, so take it back out rather than leave a
      // paid-for object behind. Cleanup failing must not change what the caller is told.
      await discardObject(fileObject).catch((cleanupError) =>
        console.error('Failed to discard orphaned schedule file', fileObject.file_id, cleanupError),
      );
      if (err instanceof ScheduleUploadInFlightError) {
        res.status(409).json({ status: 'error', data: null, message: err.message });
        return;
      }
      throw err;
    }

    // AC-SCH-03: identical to the current schedule is allowed, but say so.
    const duplicateOfVersionNo =
      latestApplied?.file_sha256 === fileObject.sha256 ? latestApplied?.version_no : null;

    // Parse and apply after answering: the client polls the version for the outcome.
    // Failures are recorded on the version itself, so nothing is lost by not awaiting.
    void processScheduleVersion(version.schedule_version_id, bytes).catch((err) =>
      console.error('Schedule processing failed', version.schedule_version_id, err),
    );

    res.status(202).json({
      status: 'success',
      data: {
        schedule_version_id: version.schedule_version_id,
        status: version.status,
        upload_kind: version.upload_kind,
        scope_mode: input.scope_mode,
        notes: version.notes,
        duplicate_of_version_no: duplicateOfVersionNo,
      },
      message: duplicateOfVersionNo
        ? `This file is identical to version ${duplicateOfVersionNo}. Queued for processing.`
        : 'Schedule queued for processing',
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
        message: `Could not store the schedule file: ${err.message}`,
      });
      return;
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

export default router;
