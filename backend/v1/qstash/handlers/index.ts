import type { QStashEventEnvelope } from '../types.js';
import { handleDprSync } from './dprHandler.js';
import { handleWeeklySync } from './weeklyHandler.js';
import { handleRiskSync } from './riskHandler.js';
import { handleChangeRequestSync } from './changeRequestHandler.js';
import { handleProjectSync } from './projectHandler.js';
import { handleMetricsSync } from './metricsHandler.js';
import { handleStageSync } from './stageHandler.js';
import { handleTeamSync } from './teamHandler.js';
import { handleMilestoneSync } from './milestoneHandler.js';
import { handleClientFeedbackSync } from './clientFeedbackHandler.js';

export async function dispatchQStashEvent(envelope: QStashEventEnvelope): Promise<any> {
  const { event_type } = envelope;

  switch (event_type) {
    case 'dpr.sync':
      return await handleDprSync(envelope);
    case 'weekly_report.sync':
      return await handleWeeklySync(envelope);
    case 'risk.sync':
      return await handleRiskSync(envelope);
    case 'change_request.sync':
      return await handleChangeRequestSync(envelope);
    case 'project.sync':
      return await handleProjectSync(envelope);
    case 'metrics.sync':
      return await handleMetricsSync(envelope);
    case 'stage.sync':
      return await handleStageSync(envelope);
    case 'team.sync':
      return await handleTeamSync(envelope);
    case 'milestone.sync':
      return await handleMilestoneSync(envelope);
    case 'client_feedback.sync':
      return await handleClientFeedbackSync(envelope);
    default:
      throw new Error(`Unsupported QStash event type: ${event_type}`);
  }
}
