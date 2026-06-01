import { scoreColor } from "@/lib/utils";

export function ScoreRing({
  score,
  size = 120,
  label = "Overall",
  stroke = 9,
}: {
  score: number;
  size?: number;
  label?: string;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = scoreColor(score);

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold tabular-nums" style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-fg-faint">{label}</span>
      </div>
    </div>
  );
}

export function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = scoreColor(score);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-fg-muted">{label}</span>
        <span className="font-semibold tabular-nums" style={{ color }}>
          {score}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${score}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
        />
      </div>
    </div>
  );
}
