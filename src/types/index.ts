/* ------------------------------------------------------------------ */
/*  Agent Smith — shared domain types                                  */
/* ------------------------------------------------------------------ */

export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type Category = "functional" | "ui" | "ux" | "security" | "performance";
export type AuditStatus = "pending" | "running" | "completed" | "failed";
export type AuditMode = "quick" | "standard" | "deep";

export const SEVERITIES: Severity[] = ["critical", "high", "medium", "low", "info"];
export const CATEGORIES: Category[] = ["functional", "ui", "ux", "security", "performance"];

export interface AuditScores {
  overall: number;
  functional: number;
  ui: number;
  ux: number;
  security: number;
  performance: number;
}

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  category: Category;
  description: string;
  evidence: string;
  reproductionSteps: string[];
  probableCause: string;
  recommendedFix: string;
  fixPromptBlock: string;
  agent: string;
}

export interface ScreenshotRef {
  id: string;
  label: string;
  page: string;
  /** data URI (placeholder svg) or real file path */
  src: string;
  caption?: string;
}

export interface PageVisit {
  url: string;
  title: string;
  statusCode: number;
  loadMs: number;
  consoleErrors: number;
  networkErrors: number;
}

export interface TimelineEvent {
  t: number; // ms offset from start
  agent: string;
  action: string;
  detail?: string;
  status: "ok" | "warn" | "error" | "info";
}

export interface SiteModel {
  appType: string;
  purpose: string;
  audience: string;
  primaryWorkflow: {
    name: string;
    goal: string;
    entryPath: string;
    successSignal: string;
  };
}

export interface WorkflowStep {
  n: number;
  action: string; // click | fill | goto | assert
  target: string;
  note: string;
}

export interface WorkflowResult {
  goal: string;
  entryPath: string;
  status: "pass" | "blocked" | "fail" | "skipped";
  why: string;
  steps: WorkflowStep[];
  screenshots: string[]; // data URIs
  health?: number; // 0-100 — how healthy the primary workflow is
}

export interface AuditReport {
  summary: string;
  scores: AuditScores;
  findings: Finding[];
  uxSuggestions: string[];
  securityFindings: Finding[];
  performanceFindings: Finding[];
  pagesVisited: PageVisit[];
  screenshots: ScreenshotRef[];
  timeline: TimelineEvent[];
  fixPrompt: string;
  reportMarkdown: string;
  engine: "playwright" | "mock";
  siteModel?: SiteModel | null;
  workflow?: WorkflowResult | null;
}

export interface AuditConfig {
  targetUrl: string;
  mode: AuditMode;
  agentsCount: number;
  durationMinutes: number;
  instructions?: string;
  whitelistNotes?: string;
  /** never logged or persisted in clear */
  login?: string;
  password?: string;
  apiKey?: string;
}

export interface AgentProfile {
  slug: string;
  name: string;
  tagline: string;
  specialty: string;
  testingStyle: string;
  price: string;
  priceNote: string;
  rating: number;
  reviews: number;
  accent: string;
  avatar: string; // emoji / glyph
  premium: boolean;
  focus: Category[];
  /** catalogue check ids this agent runs (makes the preset actually runnable) */
  checks?: string[];
  aiInstructions?: string;
}
