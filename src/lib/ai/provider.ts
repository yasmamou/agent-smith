/**
 * Provider-agnostic LLM helper for the hybrid agents.
 *  - ANTHROPIC_API_KEY set → Claude (PREFERRED)
 *  - OPENAI_API_KEY set    → OpenAI Chat Completions (fallback, default gpt-4o-mini)
 *  - neither               → returns null (caller falls back to heuristics)
 *
 * Override the choice with AI_PROVIDER="anthropic" | "openai".
 * Used for: report narrative, UX judgment, intelligent QCM answering, synthesis,
 * site-model inference, agentic workflow decisions, strategic platform avis.
 */

export function aiEnabled() {
  return !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

export function aiProvider(): "openai" | "anthropic" | "none" {
  const forced = process.env.AI_PROVIDER?.toLowerCase();
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
