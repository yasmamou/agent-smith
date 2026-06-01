export type StepStatus = "success" | "partial" | "blocked" | "gated";

export interface JourneyStep {
  index: number;
  title: string;
  action: string;
  url: string;
  status: StepStatus;
  rating: number; // 0..5 — the persona's satisfaction with this step
  loadMs: number;
  observations: string[];
  /** data URI (PNG) for embedding */
  screenshot?: string;
  /** path on disk */
  screenshotFile?: string;
}

export interface QuizAttempt {
  reached: boolean;
  questionsSeen: number;
  questionsAnswered: number;
  correct: number;
  incorrect: number;
  scoreText?: string;
  notes: string[];
}

export interface JourneyResult {
  personaSlug: string;
  personaName: string;
  personaAvatar: string;
  target: string;
  goal: string;
  steps: JourneyStep[];
  experienceScore: number; // 0..100
  avgRating: number; // 0..5
  narrative: string;
  gated: boolean;
  gatedNote?: string;
  quiz?: QuizAttempt;
  durationMs: number;
}
