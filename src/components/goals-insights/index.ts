export { Ui9000GoalsInsights, registerGoalsInsights } from './element/ui9000-goals-insights.js';
export {
  MAX_CLAIMS,
  MAX_CONNECTED,
  normalizeGoalsInsights,
  type Claim,
  type ClaimInput,
  type Evidence,
  type GoalInput,
  type GoalsInsightsModel,
  type GoalsInsightsPayload,
  type InsightsGoal,
} from './lib/index.js';
export {
  DEFAULT_VIEW,
  renderGoalsInsights,
  type ColumnFrame,
  type ColumnPicks,
  type ColumnView,
  type GoalsInsightsController,
  type GoalsInsightsHandlers,
} from './render/index.js';
export { default as goalsInsightsMetadata } from './metadata.json';
