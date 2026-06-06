"use client";

import { useEffect, useState } from "react";
import { KeyRound, RefreshCw, Terminal, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";

export default function ApiPage() {
  const [apiKey, setApiKey] = useState<string | null>(null); // full key, only just after (re)generation
  const [prefix, setPrefix] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    fetch("/api/account/api-key")
      .then((r) => r.json())
      .then((d) => { setApiKey(d.apiKey); setPrefix(d.prefix || ""); if (d.justCreated) setReveal(true); })
      .finally(() => setLoading(false));
  }, []);

  async function rotate() {
    if (!confirm("Régénérer la clé ? L'ancienne cessera de fonctionner.")) return;
    setLoading(true);
    const d = await fetch("/api/account/api-key", { method: "POST" }).then((r) => r.json());
    setApiKey(d.apiKey);
    setPrefix(d.prefix || "");
    setReveal(true);
    setLoading(false);
  }

  // The key is hashed at rest → only visible right after (re)generation.
  const key = apiKey || `${prefix || "as_xxx"}…`;
  const masked = apiKey ? apiKey.slice(0, 6) + "•".repeat(20) + apiKey.slice(-4) : `${prefix}••••• (régénère pour révéler)`;

  const curl = `curl -X POST ${origin()}/api/v1/audit \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{"targetUrl":"https://your-app.com","type":"technical"}'`;

  const mcp = `claude mcp add agent-smith \\
  --env AGENT_SMITH_API_KEY=${key} \\
  -- node /chemin/vers/agent-smith/mcp/server.mjs`;

  const cli = `AGENT_SMITH_API_KEY=${key} \\
  node scripts/agent-smith.mjs https://your-app.com technical`;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-fg">
        <KeyRound className="size-6 text-matrix" /> API &amp; Claude Code
      </h1>
      <p className="mt-1 text-sm text-fg-muted">
        Lance des audits depuis Claude Code, Cursor ou ta CI sur le moteur en ligne, et récupère
        findings + prompt correctif. Boucle : audit → corrige → re-audit.
      </p>

      {/* API key */}
      <div className="glass-bright mt-6 rounded-2xl p-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-faint">Ta clé API</h2>
          <Button variant="ghost" size="sm" onClick={rotate} disabled={loading}>
            <RefreshCw className="size-4" /> Régénérer
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg border border-border bg-bg/60 px-3 py-2 font-mono text-sm text-matrix-bright">
            {loading ? "…" : reveal ? key : masked}
          </code>
          <Button variant="secondary" size="sm" onClick={() => setReveal((r) => !r)}>
            {reveal ? "Masquer" : "Afficher"}
          </Button>
          {apiKey && <CopyButton text={apiKey} label="Copier" />}
        </div>
        <p className="mt-2 text-xs text-fg-faint">
          Garde-la secrète. Elle donne accès à tes audits. Régénère-la si elle fuite.
        </p>
      </div>

      {/* Snippets */}
      <Snippet icon={Plug} title="Claude Code (MCP — recommandé)" text={mcp}
        note="Ajoute le serveur MCP : Claude Code obtient un outil run_audit(url, type) qui tourne sur le moteur en ligne et renvoie le rapport." />
      <Snippet icon={Terminal} title="CLI (terminal / CI)" text={cli}
        note="Zéro dépendance. Idéal pour scripter ou tourner dans un pipeline." />
      <Snippet icon={Terminal} title="API REST (curl)" text={curl}
        note="POST /api/v1/audit — crée + exécute + renvoie le rapport complet en un appel. types: technical · persona · authenticated." />
    </div>
  );
}

function Snippet({ icon: Icon, title, text, note }: { icon: typeof Terminal; title: string; text: string; note: string }) {
  return (
    <div className="glass mt-4 rounded-2xl p-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Icon className="size-4 text-matrix" /> {title}
        </h3>
        <CopyButton text={text} label="Copier" />
      </div>
      <pre className="overflow-auto rounded-lg border border-border bg-bg/60 p-3 font-mono text-xs leading-relaxed text-fg-muted">
        {text}
      </pre>
      <p className="mt-2 text-xs text-fg-faint">{note}</p>
    </div>
  );
}

function origin() {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://agent-smith-iota.vercel.app";
}
