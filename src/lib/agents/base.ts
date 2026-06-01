import type { Finding, Severity, Category } from "@/types";
import type { CrawlResult } from "@/lib/audit/crawl-types";
import { slugId, safeHost } from "@/lib/utils";

export interface AgentMeta {
  key: string;
  name: string;
  role: string;
  category: Category;
}

export interface AgentResult {
  meta: AgentMeta;
  findings: Finding[];
}

export type AuditAgent = {
  meta: AgentMeta;
  run: (crawl: CrawlResult) => Finding[];
};

export function makeFinding(args: {
  agent: string;
  title: string;
  severity: Severity;
  category: Category;
  description: string;
  evidence: string;
  reproductionSteps: string[];
  probableCause: string;
  recommendedFix: string;
  fixPromptBlock: string;
}): Finding {
  return { id: slugId("find"), ...args };
}

export function host(crawl: CrawlResult) {
  return safeHost(crawl.target);
}
