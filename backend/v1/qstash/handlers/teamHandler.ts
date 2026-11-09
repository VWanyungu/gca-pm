import { randomUUID } from 'crypto';
import db from '../../database/dbSetup.js';
import { Roles, ClientContacts } from '../../database/utils/database.js';
import type {
  TeamSyncPayload,
  ContractorSyncItem,
  ClientContactSyncItem,
  QStashEventEnvelope,
} from '../types.js';
import { resolveProject } from './projectResolver.js';

const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

async function resolveUserId(userId?: string, email?: string): Promise<string | null> {
  if (userId) return userId;
  if (!email) return null;
  const user = await db('users').whereRaw('LOWER(email) = ?', [email.trim().toLowerCase()]).first('id');
  return user?.id ?? null;
}

export async function handleTeamSync(envelope: QStashEventEnvelope<TeamSyncPayload>) {
  const project = await resolveProject(envelope.project);
  return await applyProjectTeam(project.project_id, envelope.data, envelope.event_id);
}

export async function applyProjectTeam(
  projectId: string,
  team: TeamSyncPayload,
  correlationId: string,
) {
  const updates: Record<string, any> = {};

  // 1. PM Reassignment
  const pmId = await resolveUserId(team.pm_user_id, team.pm_email);
  if (pmId) {
    await Roles.reassignMain({
      projectId,
      role: 'PM',
      newUserId: pmId,
      actorId: SYSTEM_ACTOR_ID,
      reason: 'Assigned PM via QStash sync',
    });
    updates.pm_id = pmId;
  }

  // 2. Planner Reassignment
  const plannerId = await resolveUserId(team.planner_user_id, team.planner_email);
  if (plannerId) {
    await Roles.reassignMain({
      projectId,
      role: 'Planner',
      newUserId: plannerId,
      actorId: SYSTEM_ACTOR_ID,
      reason: 'Assigned Planner via QStash sync',
    });
    updates.planner_id = plannerId;
  }

  // 3. Site Engineer Assignment
  const engineerId = await resolveUserId(team.site_engineer_user_id, team.site_engineer_email);
  if (engineerId) {
    // Revoke previous site engineer on this project
    await db('roles')
      .where({ project_id: projectId, role: 'SiteEngineer', scope_type: 'project' })
      .whereNull('revoked_at')
      .update({
        revoked_by: SYSTEM_ACTOR_ID,
        revoked_at: new Date(),
        revoke_reason: 'Reassigned Site Engineer via QStash sync',
      });

    // Grant new site engineer role
    await db('roles').insert({
      attribute_id: randomUUID(),
      user_id: engineerId,
      role: 'SiteEngineer',
      scope_type: 'project',
      project_id: projectId,
      granted_by: SYSTEM_ACTOR_ID,
      granted_at: new Date(),
    });
    updates.site_engineer_id = engineerId;
  }

  // 4. Team Members & Lead
  if (team.members && team.members.length > 0) {
    const memberResults: any[] = [];
    for (const member of team.members) {
      const memberUserId = await resolveUserId(member.user_id, member.email);
      if (!memberUserId) continue;

      if (member.is_team_lead) {
        // Clear old team lead first (enforce project_team_members_one_lead_per_project)
        await db('project_team_members')
          .where({ project_id: projectId })
          .update({ is_team_lead: false });
      }

      await db('project_team_members')
        .insert({
          project_id: projectId,
          user_id: memberUserId,
          is_team_lead: member.is_team_lead ?? false,
          added_at: new Date(),
        })
        .onConflict(['project_id', 'user_id'])
        .merge({
          is_team_lead: member.is_team_lead ?? false,
        });

      memberResults.push({ user_id: memberUserId, is_team_lead: member.is_team_lead });
    }
    updates.members = memberResults;
  }

  // 5. Audit
  await db('audit_event').insert({
    occurred_at: new Date(),
    actor_id: SYSTEM_ACTOR_ID,
    channel: 'qstash_webhook',
    correlation_id: correlationId,
    project_id: projectId,
    entity_type: 'project_team',
    entity_id: projectId,
    action: 'team.sync',
    after_json: JSON.stringify(updates),
    reason: 'Project team updated via QStash sync',
  });

  return updates;
}

export async function applyProjectContractors(
  projectId: string,
  contractors: ContractorSyncItem[],
  correlationId: string,
) {
  const results: any[] = [];

  for (const c of contractors) {
    let contractorId = c.contractor_id;

    if (!contractorId && c.contractor_name) {
      const trimmed = c.contractor_name.trim();
      const existing = await db('contractor')
        .whereRaw('LOWER(name) = ?', [trimmed.toLowerCase()])
        .first();

      if (existing) {
        contractorId = existing.contractor_id;
      } else {
        const [created] = await db('contractor')
          .insert({
            contractor_id: randomUUID(),
            name: trimmed,
            is_active: true,
          })
          .returning('contractor_id');
        contractorId = created.contractor_id;
      }
    }

    if (!contractorId) continue;

    const existingLink = await db('project_contractor')
      .where({ project_id: projectId, contractor_id: contractorId })
      .first();

    if (existingLink) {
      await db('project_contractor')
        .where({ project_contractor_id: existingLink.project_contractor_id })
        .update({
          party_type: c.party_type ?? existingLink.party_type,
          is_active: c.is_active ?? existingLink.is_active,
        });
      results.push({ contractor_id: contractorId, action: 'updated' });
    } else {
      await db('project_contractor').insert({
        project_contractor_id: randomUUID(),
        project_id: projectId,
        contractor_id: contractorId,
        party_type: c.party_type ?? 'contractor',
        is_active: c.is_active ?? true,
      });
      results.push({ contractor_id: contractorId, action: 'linked' });
    }
  }

  await db('audit_event').insert({
    occurred_at: new Date(),
    actor_id: SYSTEM_ACTOR_ID,
    channel: 'qstash_webhook',
    correlation_id: correlationId,
    project_id: projectId,
    entity_type: 'project_contractor',
    entity_id: projectId,
    action: 'contractors.sync',
    after_json: JSON.stringify(contractors),
    reason: 'Contractors linked via QStash sync',
  });

  return results;
}

export async function applyClientContacts(
  projectId: string,
  contacts: ClientContactSyncItem[],
  correlationId: string,
) {
  const results: any[] = [];

  for (const contact of contacts) {
    const existing = contact.contact_id
      ? await ClientContacts.getById(contact.contact_id)
      : await db('client_contacts')
          .where({ project_id: projectId, email: contact.email })
          .first();

    if (existing) {
      const updateData: Record<string, any> = {
        name: contact.name,
        title: contact.role_title ?? (contact as any).title ?? existing.title,
        email: contact.email,
      };
      if (contact.phone !== undefined) updateData.phone = contact.phone;
      if (contact.is_primary !== undefined) updateData.is_primary = contact.is_primary;
      if (contact.receives_reports !== undefined) updateData.receives_reports = contact.receives_reports;

      await db('client_contacts').where({ contact_id: existing.contact_id }).update(updateData);
      results.push({ contact_id: existing.contact_id, action: 'updated' });
    } else {
      const created = await ClientContacts.create({
        project_id: projectId,
        name: contact.name,
        title: contact.role_title ?? (contact as any).title ?? null,
        email: contact.email,
        receives_reports: contact.receives_reports ?? true,
      });
      results.push({ contact_id: created.contact_id, action: 'created' });
    }
  }

  await db('audit_event').insert({
    occurred_at: new Date(),
    actor_id: SYSTEM_ACTOR_ID,
    channel: 'qstash_webhook',
    correlation_id: correlationId,
    project_id: projectId,
    entity_type: 'client_contacts',
    entity_id: projectId,
    action: 'client_contacts.sync',
    after_json: JSON.stringify(contacts),
    reason: 'Client contacts synced via QStash',
  });

  return results;
}
