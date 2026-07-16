export type Decision = "URGENT" | "PRIORITY" | "VERIFY" | "APPLY IF CAPACITY" | "WATCH" | "SKIP" | "CLOSED" | "PAUSED";
export type PipelineStatus = "Watch" | "Open" | "Registered" | "Building" | "Ready for QA" | "Submitted" | "Finalist" | "Won" | "Lost" | "Closed" | "Paused" | "Skip";
export type EligibilityStatus = "Eligible" | "Unclear" | "Likely ineligible";
export type VerificationStatus = "Unverified" | "Needs Review" | "Verified" | "Stale" | "Invalid" | "Closed";
export type DeadlineParseStatus = "parsed" | "unparseable" | "not_provided" | "manual_override";
export type EmailDigestStatus = "pending" | "sent" | "failed" | "cancelled";

export interface ScoreBreakdown {
  projectFit: number;
  prizeBusinessValue: number;
  winability: number;
  reusability: number;
  deadlineReadiness: number;
  exposure: number;
  ease: number;
}

export interface Opportunity {
  id: string;
  userId?: string;
  workspaceId?: string;
  name: string;
  organizer: string;
  type: string;
  sourceUrl: string;
  eligibility: string;
  eligibilityStatus: EligibilityStatus;
  countryRegion: string;
  companyStageRestrictions: string;
  prizeFunding: number;
  entryFee: number;
  nextCriticalDeadlineUtc?: string | null;
  finalDeadlineUtc?: string | null;
  rawDeadlineText: string;
  normalizedDeadlineUtc: string | null;
  timezone: string;
  deadlineTimezone?: string;
  deadlineParseStatus?: DeadlineParseStatus;
  deadlineParseNote?: string;
  requiredTechnology: string;
  requiredDeliverables: string;
  ipLicenseNotes: string;
  travelRequirements: string;
  matchedProjectId: string;
  score: ScoreBreakdown;
  automaticDecision?: Decision;
  manualDecisionOverride?: Decision | null;
  manualOverrideReason?: string | null;
  manualOverrideBy?: string | null;
  manualOverrideAt?: string | null;
  decisionOverride?: Decision;
  overrideReason?: string;
  decision: Decision;
  nextAction: string;
  owner: string;
  notes: string;
  verifiedAt?: string;
  verificationStatus: VerificationStatus;
  pipelineStatus: PipelineStatus;
  importedAt?: string;
  sourceFileName?: string;
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
}

export interface ProjectProfile {
  id: string;
  name: string;
  positioning: string;
  stage: string;
  targetUsers: string;
  problem: string;
  solution: string;
  technology: string;
  liveUrl: string;
  repositoryUrl: string;
  users: string;
  revenue: string;
  traction: string;
  evidence: string;
  suitableCategories: string[];
  missingEvidence: string;
  owner: string;
}

export interface SubmissionAsset {
  id: string;
  projectId: string;
  name: string;
  status: "待確認" | "未開始" | "草稿" | "可提交" | "需更新";
  url?: string;
  note?: string;
}

export interface SourceRegistry {
  id: string;
  name: string;
  url: string;
  type: string;
  scanFrequency: string;
  lastChecked?: string;
  lastSuccessfulScan?: string;
  active: boolean;
  notes: string;
}

export interface SubmissionHistory {
  id: string;
  opportunityId: string;
  previousStatus: PipelineStatus;
  newStatus: PipelineStatus;
  changedBy: string;
  changedAt: string;
  note: string;
}

export interface VerificationEvent {
  id: string;
  opportunityId: string;
  previousStatus: VerificationStatus;
  newStatus: VerificationStatus;
  verifiedBy: string;
  verifiedAt: string;
  sourceUrl: string;
  changedFields: string[];
  note: string;
}

export interface ActivityLog {
  id: string;
  actor: string;
  action: string;
  entityType: "opportunity" | "import" | "reminder" | "submission_asset" | "weekly_task";
  entityId: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface WeeklyTask {
  id: string;
  opportunityId: string;
  projectId: string;
  title: string;
  reason: string;
  action: string;
  priority: number;
  dueLabel: string;
  missingAssets: string[];
}

export interface ImportJobSummary {
  id: string;
  sourceFileName: string;
  mode: "preview" | "apply";
  createdAt: string;
  completedAt?: string;
  status?: "completed" | "failed";
  createCount: number;
  updateCount: number;
  skipCount: number;
  errorCount: number;
}

export interface AppSettings {
  id: string;
  userId: string;
  workspaceId?: string;
  timezone: string;
  staleThresholdDays: number;
  urgentStaleThresholdDays: number;
  urgentDeadlineWindowDays: number;
  reminderOffsets: string[];
  emailNotificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeadlineOverrideEvent {
  id: string;
  opportunityId: string;
  previousValue: string | null;
  newValue: string | null;
  reason: string;
  changedBy: string;
  changedAt: string;
}

export interface StoredReminder {
  id: string;
  userId: string;
  workspaceId?: string;
  opportunityId: string;
  deadlineType: "final" | "next_critical";
  deadlineUtc: string;
  offsetKey: string;
  remindAtUtc: string;
  idempotencyKey: string;
  status: "pending" | "sent" | "superseded" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export interface EmailDigestRecord {
  id: string;
  userId: string;
  workspaceId?: string;
  provider: "disabled" | "console" | "test";
  status: EmailDigestStatus;
  subject: string;
  body: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
}
