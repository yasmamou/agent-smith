import type { AuditAgent, AgentMeta } from "./base";
import { explorerAgent } from "./explorer";
import { functionalQaAgent } from "./functional-qa";
import { uxAgent } from "./ux";
import { uiAgent } from "./ui";
import { securityLightAgent } from "./security-light";
import { performanceAgent } from "./performance";

/** Agents that consume the crawl and emit findings, in execution order. */
export const ANALYSIS_AGENTS: AuditAgent[] = [
  explorerAgent,
  functionalQaAgent,
  uiAgent,
  uxAgent,
  securityLightAgent,
  performanceAgent,
];

/** PromptFixAgent is virtual — it synthesises the master fix prompt. */
export const PROMPT_FIX_META: AgentMeta = {
  key: "prompt-fix",
  name: "PromptFixAgent",
  role: "Turns findings into a ready-to-paste fix prompt",
  category: "functional",
};

export const ALL_AGENT_META: AgentMeta[] = [
  ...ANALYSIS_AGENTS.map((a) => a.meta),
  PROMPT_FIX_META,
];
