/**
 * Provider-agnostic LLM helper for the hybrid agents.
 *  - OPENAI_API_KEY set  → OpenAI Chat Completions (default gpt-4o-mini)
 *  - ANTHROPIC_API_KEY   → Claude
 *  - neither             → returns null (caller falls back to heuristics)
 *
 * Used for: report narrative, UX judgment, intelligent QCM answering, synthesis.
 */

export function aiEnabled() {
  return !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

export function aiProvider(): "openai" | "anthropic" | "none" {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "none";
}

interface CompleteOpts {
  system?: string;
  maxTokens?: number;
  /** ask for strict JSON output */
  json?: boolean;
}

export async function aiComplete(prompt: string, opts: CompleteOpts = {}): Promise<string | null> {
  const { system, maxTokens = 500, json = false } = opts;

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature: 0.3,
          ...(json ? { response_format: { type: "json_object" } } : {}),
          messages: [
            ...(system ? [{ role: "system", content: system }] : []),
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

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({ apiKey: anthropicKey });
      const msg = await client.messages.create({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
        max_tokens: maxTokens,
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
