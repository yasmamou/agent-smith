/**
 * Provider-agnostic LLM helper for the hybrid agents.
 *  - AI_PROVIDER=claude-cli (or CLAUDE_CLI=1) → the local Claude Code CLI
 *    (`claude -p`) acts as the brain. Tokens go through the Claude Code session,
 *    NO API key needed. Used to dogfood: Claude Code IS the engine's LLM.
 *  - ANTHROPIC_API_KEY set → Claude API (PREFERRED among keys)
 *  - OPENAI_API_KEY set    → OpenAI Chat Completions (fallback, default gpt-4o-mini)
 *  - none                  → returns null (caller falls back to heuristics)
 *
 * Override the choice with AI_PROVIDER="claude-cli" | "anthropic" | "openai".
 * Used for: report narrative, UX judgment, intelligent QCM answering, synthesis,
 * site-model inference, agentic workflow decisions, strategic platform avis.
 */

function claudeCliEnabled() {
  const forced = process.env.AI_PROVIDER?.toLowerCase();
  return forced === "claude-cli" || process.env.CLAUDE_CLI === "1";
}

export function aiEnabled() {
  return claudeCliEnabled() || !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

export function aiProvider(): "claude-cli" | "openai" | "anthropic" | "none" {
  const forced = process.env.AI_PROVIDER?.toLowerCase();
  if (claudeCliEnabled()) return "claude-cli";
  if (forced === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (forced === "openai" && process.env.OPENAI_API_KEY) return "openai";
  // Default preference: Claude first, OpenAI as fallback.
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "none";
}

interface CompleteOpts {
  system?: string;
  maxTokens?: number;
  /** ask for strict JSON output */
  json?: boolean;
}

async function completeAnthropic(prompt: string, opts: CompleteOpts): Promise<string | null> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return null;
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: anthropicKey });
    const system = opts.json
      ? `${opts.system ?? ""}\nRespond with a single valid JSON object and nothing else.`.trim()
      : opts.system;
    const msg = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: opts.maxTokens ?? 500,
      system,
      messages: [{ role: "user", content: prompt }],
    });
    return (
      msg.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { text: string }).text)
        .join("\n")
        .trim() || null
    );
  } catch {
    return null;
  }
}

/**
 * Use the local Claude Code CLI (`claude -p`) as the LLM. The prompt (with system
 * + optional JSON instruction) is piped to stdin; stdout is the completion.
 * Tokens are billed to the Claude Code session — no API key. Slower (one process
 * per call) but high quality (session model, e.g. Opus).
 */
async function completeClaudeCli(prompt: string, opts: CompleteOpts): Promise<string | null> {
  try {
    const { spawn } = await import("node:child_process");
    const bin = process.env.CLAUDE_CLI_BIN || "claude";
    const input = [
      opts.system,
      opts.json ? "Réponds avec un seul objet JSON valide et rien d'autre (pas de texte autour, pas de balises de code)." : "",
      prompt,
    ]
      .filter(Boolean)
      .join("\n\n");

    return await new Promise<string | null>((resolve) => {
      const child = spawn(bin, ["-p", "--output-format", "text"], {
        stdio: ["pipe", "pipe", "ignore"],
      });
      let out = "";
      let settled = false;
      const done = (v: string | null) => { if (!settled) { settled = true; resolve(v); } };
      const timer = setTimeout(() => { try { child.kill("SIGKILL"); } catch { /* noop */ } done(null); }, 180_000);
      child.stdout.on("data", (d) => { out += d.toString(); });
      child.on("error", () => { clearTimeout(timer); done(null); });
      child.on("close", () => { clearTimeout(timer); done(out.trim() || null); });
      child.stdin.write(input);
      child.stdin.end();
    });
  } catch {
    return null;
  }
}

async function completeOpenai(prompt: string, opts: CompleteOpts): Promise<string | null> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return null;
  try {
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model,
        max_tokens: opts.maxTokens ?? 500,
        temperature: 0.3,
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
        messages: [
          ...(opts.system ? [{ role: "system", content: opts.system }] : []),
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`openai ${res.status}`);
    const data = await res.json();
    return (data.choices?.[0]?.message?.content ?? "").trim() || null;
  } catch {
    return null;
  }
}

export async function aiComplete(prompt: string, opts: CompleteOpts = {}): Promise<string | null> {
  const provider = aiProvider();
  if (provider === "claude-cli") {
    // Claude Code is the brain; fall back to keys only if the CLI fails.
    return (
      (await completeClaudeCli(prompt, opts)) ??
      (await completeAnthropic(prompt, opts)) ??
      (await completeOpenai(prompt, opts))
    );
  }
  // Try the preferred provider, then transparently fall back to the other.
  if (provider === "anthropic") {
    return (await completeAnthropic(prompt, opts)) ?? (await completeOpenai(prompt, opts));
  }
  if (provider === "openai") {
    return (await completeOpenai(prompt, opts)) ?? (await completeAnthropic(prompt, opts));
  }
  return null;
}

/** Parse a JSON object from a model response, tolerating code fences. */
export function parseAiJson<T>(text: string | null, fallback: T): T {
  if (!text) return fallback;
  try {
    const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]) as T;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}
