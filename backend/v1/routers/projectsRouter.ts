import express from 'express';
import {
  Projects,
  Programs,
  ProjectStages,
  ProjectStatusHistory,
  ProjectMetrics,
} from '../database/utils/database.js';
import authorize from '../middlewares/authorize.js';
import {
  createProjectSchema,
  updateProjectSchema,
  projectIdParamSchema,
  listProjectsQuerySchema,
  suggestProjectCodeQuerySchema,
  type CreateProjectBody,
  type UpdateProjectBody,
  type ListProjectsQuery,
} from '../utils/validation.js';

const router = express.Router();

const canCreate = authorize([
  { role: 'ProjectCreator', scopeType: 'global' },
  { role: 'Admin', scopeType: 'global' },
  { role: 'ExCo', scopeType: 'global' },
]);

const canListProjects = authorize([
  { role: 'Admin', scopeType: 'global' },
  { role: 'ExCo', scopeType: 'global' },
  { role: 'ProjectCreator', scopeType: 'global' },
  { role: 'PM', scopeType: 'global' },
  { role: 'PM', scopeType: 'project' },
  { role: 'Planner', scopeType: 'global' },
  { role: 'SiteEngineer', scopeType: 'global' },
]);

const canViewProject = authorize([
  { role: 'Admin', scopeType: 'global' },
  { role: 'ExCo', scopeType: 'global' },
  { role: 'ProjectCreator', scopeType: 'global' },
  { role: 'PM', scopeType: 'global' },
  { role: 'PM', scopeType: 'project' },
  { role: 'Planner', scopeType: 'project' },
  { role: 'SiteEngineer', scopeType: 'project' },
]);

const canManageProject = authorize([
  { role: 'Admin', scopeType: 'global' },
  { role: 'ExCo', scopeType: 'global' },
  { role: 'PM', scopeType: 'project' },
]);

const canDeleteProject = authorize([
  { role: 'Admin', scopeType: 'global' },
]);

// GET /projects/suggest-code?program_id=1&year=2026
router.get('/suggest-code', canCreate, async (req, res) => {
  const query = suggestProjectCodeQuerySchema.validate(req.query);
  if (query.error) {
    res.status(400).json({ status: 'error', data: null, message: query.error.message });
    return;
  }
  const { program_id, year } = query.value as { program_id: number; year?: number };

  try {
    const suggestedCode = await Projects.suggestNextCode(program_id, year);
    res.status(200).json({
      status: 'success',
      data: { suggested_project_code: suggestedCode },
      message: 'Suggested project code generated',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// POST /projects
router.post('/', canCreate, async (req, res) => {
  const body = createProjectSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (body.error) {
    res.status(400).json({ status: 'error', data: null, message: body.error.message });
    return;
  }
  const input = body.value as CreateProjectBody;

  try {
    const program = await Programs.getById(input.program_id);
    if (!program) {
      res.status(404).json({ status: 'error', data: null, message: 'Program not found' });
      return;
    }

    const codeExists = await Projects.getByCode(input.project_code);
    if (codeExists) {
      res.status(409).json({
        status: 'error',
        data: null,
        message: `Project with code '${input.project_code}' already exists`,
      });
      return;
    }

    const result = await Projects.create({
      ...input,
      created_by: req.user!.userId,
    });

    res.status(201).json({
      status: 'success',
      data: result,
      message: 'Project created successfully',
    });
  } catch (err: any) {
    if (err?.code === '23505' && err?.constraint?.includes('project_code')) {
      res.status(409).json({
        status: 'error',
        data: null,
        message: `Project code '${input.project_code}' was just taken by another request, please retry`,
      });
      return;
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// GET /projects
router.get('/', canListProjects, async (req, res) => {
  const query = listProjectsQuerySchema.validate(req.query, { abortEarly: false });
  
  if (query.error) {
    res.status(400).json({ status: 'error', data: null, message: query.error.message });
    return;
  }
  const filter = query.value as ListProjectsQuery;

  try {
    const result = await Projects.list({
      programId: filter.program_id,
      status: filter.status,
      country: filter.country,
      search: filter.search,
      page: filter.page,
      limit: filter.limit,
    });

    res.status(200).json({
      status: 'success',
      data: { projects: result.projects, ...result.pagination },
      message: 'Projects retrieved',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// GET /projects/:projectId
router.get('/:projectId', canViewProject, async (req, res) => {
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

    const stages = await ProjectStages.list({ projectId });
    const statusHistory = await ProjectStatusHistory.listByProjectId(projectId);
    const metrics = await ProjectMetrics.listByProjectId(projectId);

    res.status(200).json({
      status: 'success',
      data: {
        project,
        stages,
        statusHistory,
        metrics,
      },
      message: 'Project retrieved',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// PATCH /projects/:projectId
router.patch('/:projectId', canManageProject, async (req, res) => {
  const params = projectIdParamSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const body = updateProjectSchema.validate(req.body ?? {}, { abortEarly: false, stripUnknown: true });
  if (body.error) {
    res.status(400).json({ status: 'error', data: null, message: body.error.message });
    return;
  }
  const { projectId } = params.value as { projectId: string };
  const input = body.value as UpdateProjectBody;

  try {
    const existing = await Projects.getById(projectId);
    if (!existing) {
      res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
      return;
    }

    if (input.program_id) {
      const program = await Programs.getById(input.program_id);
      if (!program) {
        res.status(404).json({ status: 'error', data: null, message: 'Program not found' });
        return;
      }
    }

    const { status_reason, ...patchFields } = input;
    const updated = await Projects.update(
      projectId,
      patchFields,
      req.user!.userId,
      status_reason,
    );

    res.status(200).json({
      status: 'success',
      data: { project: updated },
      message: 'Project updated',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    // Validation or transition errors return 400
    if (message.includes('Invalid project status transition') || message.includes('Reason is required')) {
      res.status(400).json({ status: 'error', data: null, message });
      return;
    }
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// DELETE /projects/:projectId
router.delete('/:projectId', canDeleteProject, async (req, res) => {
  const params = projectIdParamSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId } = params.value as { projectId: string };

  try {
    const existing = await Projects.getById(projectId);
    if (!existing) {
      res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
      return;
    }

    await Projects.delete(projectId);

    res.status(200).json({
      status: 'success',
      data: null,
      message: 'Project deleted',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

export default router;
