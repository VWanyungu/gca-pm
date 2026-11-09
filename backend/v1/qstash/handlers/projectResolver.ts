import { Projects, type ProjectRow } from '../../database/utils/database.js';

export async function resolveProject(projectIdentifier: {
  project_code?: string;
  project_id?: string;
}): Promise<ProjectRow> {
  const { project_code, project_id } = projectIdentifier;

  if (!project_code && !project_id) {
    throw new Error('Project identifier required: either project_code or project_id must be provided.');
  }

  let project: ProjectRow | null = null;

  if (project_id) {
    project = await Projects.getById(project_id);
  } else if (project_code) {
    project = await Projects.getByCode(project_code);
  }

  if (!project) {
    throw new Error(`Project not found with identifier: ${project_id ?? project_code}`);
  }

  return project;
}
