import express from 'express';
import { Projects, ClientContacts } from '../database/utils/database.js';
import authorize from '../middlewares/authorize.js';
import {
  projectIdParamSchema,
  clientContactParamsSchema,
  createClientContactSchema,
  type CreateClientContactBody,
} from '../utils/validation.js';

// mergeParams so :projectId reaches authorize + handlers.
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

// GET /projects/:projectId/client-contacts
router.get('/', canView, async (req, res) => {
  const params = projectIdParamSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId } = params.value as { projectId: string };

  try {
    const contacts = await ClientContacts.listByProjectId(projectId);
    res.status(200).json({ status: 'success', data: { contacts }, message: 'Client contacts retrieved' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// POST /projects/:projectId/client-contacts
router.post('/', canManage, async (req, res) => {
  const params = projectIdParamSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const body = createClientContactSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (body.error) {
    res.status(400).json({ status: 'error', data: null, message: body.error.message });
    return;
  }
  const { projectId } = params.value as { projectId: string };
  const input = body.value as CreateClientContactBody;

  try {
    const project = await Projects.getById(projectId);
    if (!project) {
      res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
      return;
    }

    const contact = await ClientContacts.create({ project_id: projectId, ...input });
    res.status(201).json({ status: 'success', data: { contact }, message: 'Client contact added' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// DELETE /projects/:projectId/client-contacts/:contactId
router.delete('/:contactId', canManage, async (req, res) => {
  const params = clientContactParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, contactId } = params.value as { projectId: string; contactId: string };

  try {
    const contact = await ClientContacts.getById(contactId);
    if (!contact || contact.project_id !== projectId) {
      res.status(404).json({ status: 'error', data: null, message: 'Client contact not found' });
      return;
    }

    await ClientContacts.delete(contactId);
    res.status(200).json({ status: 'success', data: null, message: 'Client contact removed' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

export default router;
