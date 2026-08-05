import type { HowItWorksSection } from './howItWorksTypes';
import { GETTING_STARTED_SECTION } from '../sections/gettingStartedSection';
import { IMPORT_SYNC_SECTION } from '../sections/importSyncSection';
import { DATA_NORMALIZATION_SECTION } from '../sections/dataNormalizationSection';
import { KEY_METRICS_SECTION } from '../sections/keyMetricsSection';
import { MUSCLE_HEATMAPS_SECTION } from '../sections/muscleHeatmapsSection';
import { EXERCISE_ANALYSIS_SECTION } from '../sections/exerciseAnalysisSection';
import { PR_TRACKING_SECTION } from '../sections/prTrackingSection';
import { PLATEAU_DETECTION_SECTION } from '../sections/plateauDetectionSection';
import { INJURY_RISK_SECTION } from '../sections/injuryRiskSection';
import { STRENGTH_IMBALANCE_SECTION } from '../sections/strengthImbalanceSection';
import { SET_BY_SET_SECTION } from '../sections/setBySetSection';
import { ACTIVITY_CONSISTENCY_SECTION } from '../sections/activityConsistencySection';
import { CALENDAR_FILTERING_SECTION } from '../sections/calendarFilteringSection';
import { AI_EXPORT_SECTION } from '../sections/aiExportSection';
import { LIFETIME_PROGRESS_SECTION } from '../sections/lifetimeProgressSection';
import { FLEX_CARDS_SECTION } from '../sections/flexCardsSection';
import { PRIVACY_STORAGE_SECTION, TROUBLESHOOTING_SECTION } from '../sections/privacyTroubleshootingSection';

export type { HowItWorksLink, HowItWorksNode, HowItWorksSection } from './howItWorksTypes';

export const HOW_IT_WORKS_SECTIONS: HowItWorksSection[] = [
  GETTING_STARTED_SECTION,
  IMPORT_SYNC_SECTION,
  DATA_NORMALIZATION_SECTION,
  KEY_METRICS_SECTION,
  MUSCLE_HEATMAPS_SECTION,
  ACTIVITY_CONSISTENCY_SECTION,
  EXERCISE_ANALYSIS_SECTION,
  PR_TRACKING_SECTION,
  PLATEAU_DETECTION_SECTION,
  INJURY_RISK_SECTION,
  STRENGTH_IMBALANCE_SECTION,
  SET_BY_SET_SECTION,
  CALENDAR_FILTERING_SECTION,
  AI_EXPORT_SECTION,
  LIFETIME_PROGRESS_SECTION,
  FLEX_CARDS_SECTION,
  PRIVACY_STORAGE_SECTION,
  TROUBLESHOOTING_SECTION,
];
