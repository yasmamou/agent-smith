#!/usr/bin/env node
/**
 * Agent Smith MCP server — lets Claude Code run audits on the hosted engine
 * as a tool, closing the loop (audit → fix → re-audit).
 *
 * Add to Claude Code:
 *   claude mcp add agent-smith \
 *     --env AGENT_SMITH_API_KEY=as_xxx \
 *     -- node /absolute/path/to/agent-smith/mcp/server.mjs
 *
 * Tools:
 *   - run_audit(url, type?, persona?, login?, password?) → full report + fix prompt
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = process.env.AGENT_SMITH_URL || "https://agent-smith-iota.vercel.app";
const KEY = process.env.AGENT_SMITH_API_KEY || "";

const server = new McpServer({ name: "agent-smith", version: "1.0.0" });

server.tool(
  "run_audit",
  "Run an Agent Smith QA audit on a deployed web app (real browser, hosted engine). " +
    "Returns scores, findings, and a ready-to-apply fix prompt. Use type 'technical' for QA, " +
    "'persona' for a user-journey, 'authenticated' to log in and test features (provide login/password).",
  {
    url: z.string().url().describe("Target URL to audit (https://…)"),
    type: z.enum(["technical", "persona", "authenticated"]).default("technical"),
    persona: z.enum(["lyceen", "externe", "interne"]).optional().describe("Persona for persona/authenticated audits"),
    login: z.string().optional().describe("Test account email (authenticated only)"),
    password: z.string().optional().describe("Test account password (authenticated only)"),
  },
  async ({ url, type, persona, login, password }) => {
    if (!KEY) {
      return { content: [{ type: "text", text: "Missing AGENT_SMITH_API_KEY env var." }], isError: true };
    }
    const res = await fetch(`${BASE}/api/v1/audit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({ targetUrl: url, type, persona, login, password }),
    });
    const data = await res.json().catch(() => ({ error: "bad response" }));
    if (!res.ok) {
      return { content: [{ type: "text", text: `Audit failed: ${data.error || res.status}` }], isError: true };
    }
    const lines = [];
    lines.push(`Agent Smith audit of ${url} (${type})`);
    if (data.scores) lines.push(`Overall score: ${data.scores.overall}/100`);
    if (data.journey) lines.push(`Experience: ${data.journey.experienceScore}/100`);
    lines.push(`Report: ${data.url}`);
    if (data.findings?.length) {
      lines.push(`\nFindings (${data.findings.length}):`);
      for (const f of data.findings) lines.push(`- [${f.severity}/${f.category}] ${f.title}: ${f.recommendedFix}`);
    }
    if (data.summary) lines.push(`\nSummary: ${data.summary}`);
    if (data.fixPrompt) lines.push(`\n--- FIX PROMPT ---\n${data.fixPrompt}`);
    return {
      content: [
        { type: "text", text: lines.join("\n") },
        { type: "text", text: "JSON:\n" + JSON.stringify({ id: data.id, scores: data.scores, findings: data.findings }) },
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
