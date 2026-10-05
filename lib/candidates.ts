// Gemensamt för kandidater: steg, svenska etiketter och validering.
// Används av jobbsidan nu och av kanban-tavlan senare.

export const STAGES = [
  "applied",
  "screening",
  "interview",
  "offer",
  "hired",
  "rejected",
] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  applied: "Ansökt",
  screening: "Screening",
  interview: "Intervju",
  offer: "Erbjudande",
  hired: "Anställd",
  rejected: "Avböjd",
};

export const STAGE_COLORS: Record<Stage, string> = {
  applied: "bg-blue-100 text-blue-800",
  screening: "bg-yellow-100 text-yellow-800",
  interview: "bg-orange-100 text-orange-800",
  offer: "bg-purple-100 text-purple-800",
  hired: "bg-green-100 text-green-800",
  rejected: "bg-gray-100 text-gray-600",
};

// Samma regel som CHECK-villkoret i databasen, så att användaren får ett
// begripligt fel i stället för ett databasfel.
const LINKEDIN_RE = /^https?:\/\/([a-z0-9-]+\.)*linkedin\.com\//i;

// Tillåter att man klistrar in "linkedin.com/in/namn" utan https://.
export function normalizeLinkedIn(raw: string): { url: string | null; error?: string } {
  const value = raw.trim();
  if (!value) return { url: null };

  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  if (!LINKEDIN_RE.test(withScheme)) {
    return {
      url: null,
      error: "LinkedIn-länken måste gå till linkedin.com, t.ex. https://www.linkedin.com/in/namn",
    };
  }
  return { url: withScheme };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string) {
  return EMAIL_RE.test(value);
}


// AI-bedömning som Edge Function assess-cv sparar i candidates.ai_assessment.
export type AiAssessment = {
  score: number; // 1–10
  summary: string;
  strengths: string[];
  gaps: string[];
  model?: string;
};

// Färg på betygsmärket: grönt = stark matchning, gult = mellan, rött = svag.
export function scoreColor(score: number) {
  if (score >= 8) return "bg-green-100 text-green-800";
  if (score >= 5) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}