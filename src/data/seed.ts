import type { Opportunity, ProjectProfile, SourceRegistry, SubmissionAsset, SubmissionHistory } from "../types";
import { recalculateOpportunity } from "../lib/scoring";

export const projects: ProjectProfile[] = [
  {
    id: "handyman-ai",
    name: "Handyman AI",
    positioning: "AI-assisted intake and quote preparation for local home services.",
    stage: "MVP",
    targetUsers: "Local service operators and homeowners",
    problem: "Small operators lose leads because intake, scope, and follow-up are slow.",
    solution: "Structured intake, triage, and operator-ready response packs with human approval.",
    technology: "React, workflow automation, AI-assisted classification",
    liveUrl: "",
    repositoryUrl: "",
    users: "Pilot-ready",
    revenue: "Not yet",
    traction: "Internal operator workflow defined",
    evidence: "Workflow docs and intake prototypes",
    suitableCategories: ["AI competition", "Small business innovation", "Service automation"],
    missingEvidence: "Customer testimonials and revenue proof",
    owner: "User"
  },
  {
    id: "etf-backtesting",
    name: "ETF Backtesting",
    positioning: "A research tool for comparing ETF strategies over time.",
    stage: "Concept / prototype",
    targetUsers: "Retail investors and financial educators",
    problem: "ETF strategy decisions are often made without reusable scenario evidence.",
    solution: "Repeatable strategy backtesting and reporting.",
    technology: "Python, data analysis, charts",
    liveUrl: "",
    repositoryUrl: "",
    users: "Internal",
    revenue: "Not yet",
    traction: "Needs product proof",
    evidence: "Prototype notes",
    suitableCategories: ["Fintech", "Data science", "Innovation challenge"],
    missingEvidence: "Compliance framing and public demo",
    owner: "User"
  },
  {
    id: "ai-os-factory",
    name: "AI OS Factory",
    positioning: "Reusable AI operating layer for small business workflows.",
    stage: "Active build",
    targetUsers: "Solo founders and service businesses",
    problem: "Operators need one control surface instead of fragmented AI tools.",
    solution: "Project rules, routing, task boards, and repeatable agent workflows.",
    technology: "Codex, local automation, web apps, documentation systems",
    liveUrl: "",
    repositoryUrl: "",
    users: "Internal",
    revenue: "Not yet",
    traction: "Multiple internal workflows running",
    evidence: "Project workflow docs and local systems",
    suitableCategories: ["AI tools", "Productivity", "Startup pitch"],
    missingEvidence: "Case studies and measurable time savings",
    owner: "User"
  },
  {
    id: "australian-service-website",
    name: "Australian Service Website",
    positioning: "Local service website and lead workflow for Australian customers.",
    stage: "MVP",
    targetUsers: "Australian homeowners and local service buyers",
    problem: "Service discovery and follow-up are fragmented.",
    solution: "Simple service website with structured inquiry flow.",
    technology: "Web, forms, workflow automation",
    liveUrl: "",
    repositoryUrl: "",
    users: "Internal",
    revenue: "Not yet",
    traction: "Workflow concept defined",
    evidence: "Website and intake artifacts",
    suitableCategories: ["Australian grants", "Small business", "Digital transformation"],
    missingEvidence: "ABN/business evidence and customer proof",
    owner: "User"
  }
];

export const opportunities: Opportunity[] = [
  recalculateOpportunity({
    id: "global-ai-action-awards",
    name: "Global AI Action Awards",
    organizer: "AI for Good Network",
    type: "Award",
    sourceUrl: "https://example.org/global-ai-action-awards",
    eligibility: "Open to working AI products with social or business impact.",
    eligibilityStatus: "Unclear",
    countryRegion: "Global",
    companyStageRestrictions: "Prototype to early-stage",
    prizeFunding: 15000,
    entryFee: 0,
    rawDeadlineText: "31 August 2026 23:59 UTC",
    normalizedDeadlineUtc: "2026-08-31T23:59:00.000Z",
    timezone: "UTC",
    requiredTechnology: "AI product demo",
    requiredDeliverables: "Application form, demo video, project summary",
    ipLicenseNotes: "Confirm public demo and IP terms before applying.",
    travelRequirements: "Virtual finalist pitch",
    matchedProjectId: "ai-os-factory",
    score: { projectFit: 23, prizeBusinessValue: 16, winability: 10, reusability: 14, deadlineReadiness: 7, exposure: 9, ease: 4 },
    decision: "WATCH",
    nextAction: "Verify eligibility and prepare 150-word summary.",
    owner: "User",
    notes: "Seed record; verify official terms.",
    verifiedAt: undefined,
    verificationStatus: "Needs Review",
    pipelineStatus: "Open"
  }),
  recalculateOpportunity({
    id: "aus-small-business-digital-grant",
    name: "Australian Small Business Digital Grant",
    organizer: "State innovation program",
    type: "Australian grant",
    sourceUrl: "https://example.gov.au/small-business-digital-grant",
    eligibility: "Australian registered businesses; grant terms require confirmation.",
    eligibilityStatus: "Unclear",
    countryRegion: "Australia",
    companyStageRestrictions: "ABN required",
    prizeFunding: 5000,
    entryFee: 0,
    rawDeadlineText: "Rolling intake",
    normalizedDeadlineUtc: null,
    timezone: "Australia/Sydney",
    requiredTechnology: "Digital service improvement",
    requiredDeliverables: "Business profile, project plan, budget",
    ipLicenseNotes: "Grant reporting terms apply.",
    travelRequirements: "None",
    matchedProjectId: "australian-service-website",
    score: { projectFit: 20, prizeBusinessValue: 14, winability: 9, reusability: 10, deadlineReadiness: 6, exposure: 5, ease: 4 },
    decision: "WATCH",
    nextAction: "Check ABN/company eligibility and current grant status.",
    owner: "User",
    notes: "Rolling opportunity; mark stale if not checked monthly.",
    verificationStatus: "Unverified",
    pipelineStatus: "Watch"
  }),
  recalculateOpportunity({
    id: "startup-pitch-sprint",
    name: "Startup Pitch Sprint",
    organizer: "Founders Lab",
    type: "Startup pitch competition",
    sourceUrl: "https://example.com/startup-pitch-sprint",
    eligibility: "Early-stage startups with demo and pitch deck.",
    eligibilityStatus: "Eligible",
    countryRegion: "Global",
    companyStageRestrictions: "Pre-seed to seed",
    prizeFunding: 25000,
    entryFee: 49,
    rawDeadlineText: "20 July 2026 17:00 America/Los_Angeles",
    normalizedDeadlineUtc: "2026-07-21T00:00:00.000Z",
    timezone: "America/Los_Angeles",
    requiredTechnology: "Working demo preferred",
    requiredDeliverables: "Deck, 60-second video, founder bio",
    ipLicenseNotes: "Do not upload private code.",
    travelRequirements: "Online first round",
    matchedProjectId: "handyman-ai",
    score: { projectFit: 22, prizeBusinessValue: 17, winability: 10, reusability: 13, deadlineReadiness: 6, exposure: 8, ease: 4 },
    decision: "WATCH",
    nextAction: "Build submission kit and QA deck.",
    owner: "User",
    notes: "Good fit if video can be prepared quickly.",
    verificationStatus: "Verified",
    verifiedAt: "2026-07-12T00:00:00.000Z",
    pipelineStatus: "Open"
  })
];

export const sources: SourceRegistry[] = [
  { id: "ai-for-good", name: "AI for Good listings", url: "https://example.org", type: "RSS/public page", scanFrequency: "Weekly", active: true, notes: "Adapter allowed only if terms permit." },
  { id: "grants-gov-au", name: "Australian grants portals", url: "https://example.gov.au", type: "Manual/API", scanFrequency: "Weekly", active: true, notes: "Manual verification required." },
  { id: "founders-lab", name: "Founders Lab opportunities", url: "https://example.com", type: "Manual", scanFrequency: "Monthly", active: false, notes: "Paused until source terms checked." }
];

const assetNames = ["one-line tagline", "50-word summary", "150-word summary", "long narrative", "demo URL", "60-second video", "3-minute video", "pitch deck", "architecture diagram", "GitHub repository", "README", "screenshots", "traction sheet", "customer evidence", "revenue evidence", "privacy and AI safety statement", "founder biography", "company documents", "logos and brand assets"];

export const submissionAssets: SubmissionAsset[] = projects.flatMap((project) =>
  assetNames.map((name, index) => ({
    id: `${project.id}-${index}`,
    projectId: project.id,
    name,
    status: index < 4 ? "草稿" : "未開始",
    note: index < 4 ? "Draft exists or can be prepared from project profile." : ""
  }))
);

export const submissionHistory: SubmissionHistory[] = [
  { id: "hist-1", opportunityId: "startup-pitch-sprint", previousStatus: "Watch", newStatus: "Open", changedBy: "Codex", changedAt: "2026-07-12T00:00:00.000Z", note: "Seeded as active opportunity." }
];
