// The onboarding steps (J1, D-060, D-034; step 5.4), pure. Before the account: age, language, account. After it:
// username, reading, visibility, dna, dnaAudience, how, reminder, then done. Every step counts in "Korak N od M"
// whether or not it is shown (J1: skipped optional steps still count, so the total does not jump around);
// dnaAudience is shown only after at least one pick (D-034) and reminder only while the push flag is on (D-093 (1)).

export const STEPS = [
  "age",
  "language",
  "account",
  "username",
  "reading",
  "visibility",
  "dna",
  "dnaAudience",
  "how",
  "reminder",
] as const;
export type Step = (typeof STEPS)[number];

export const PRE_ACCOUNT_STEPS: readonly Step[] = ["age", "language", "account"];
export const isStep = (s: unknown): s is Step => STEPS.includes(s as Step);
export const isPreAccount = (s: Step) => PRE_ACCOUNT_STEPS.includes(s);

export type StepContext = {
  /** At least one Music DNA pick, so ONB-06 is shown (D-034). */
  hasPicks: boolean;
  /** The push flag is on, so ONB-08 is shown (D-093 (1)). */
  reminder: boolean;
};

export const REQUIRED_STEPS: readonly Step[] = ["age", "account", "username", "visibility"];

/** Is the step shown for this member? */
export function shown(step: Step, ctx: StepContext): boolean {
  if (step === "dnaAudience") return ctx.hasPicks;
  if (step === "reminder") return ctx.reminder;
  return true;
}

export const PATHS: Record<Step, string> = {
  age: "/join/age",
  language: "/join/language",
  account: "/join/account",
  username: "/join/username",
  reading: "/join/reading",
  visibility: "/join/visibility",
  dna: "/join/dna",
  dnaAudience: "/join/dna-audience",
  how: "/join/how",
  reminder: "/join/reminder",
};
export const DONE_PATH = "/join/done";

export const stepIndex = (step: Step) => STEPS.indexOf(step);

/** "Korak N od M": the total counts the reminder step only while it exists at all. */
export function progress(step: Step, ctx: Pick<StepContext, "reminder">) {
  const total = ctx.reminder ? STEPS.length : STEPS.length - 1;
  return { n: stepIndex(step) + 1, total };
}

/** The next step that is shown, or null when onboarding is done. */
export function nextStep(step: Step, ctx: StepContext): Step | null {
  for (let i = stepIndex(step) + 1; i < STEPS.length; i++) {
    if (shown(STEPS[i]!, ctx)) return STEPS[i]!;
  }
  return null;
}

/** The previous step that is shown, never crossing the account boundary (there is no way back to the invite). */
export function prevStep(step: Step, ctx: StepContext): Step | null {
  const pre = isPreAccount(step);
  for (let i = stepIndex(step) - 1; i >= 0; i--) {
    const s = STEPS[i]!;
    if (!pre && isPreAccount(s)) return null;
    if (shown(s, ctx)) return s;
  }
  return null;
}

export const nextPath = (step: Step, ctx: StepContext) => {
  const n = nextStep(step, ctx);
  return n ? PATHS[n] : DONE_PATH;
};

/**
 * May the member open `step` while their pointer is at `resume`? Earlier steps stay reachable (Back keeps earlier
 * answers); later ones redirect to the pointer (J1 E8). A step that is not shown is never reachable.
 */
export function reachable(step: Step, resume: Step, ctx: StepContext): boolean {
  if (!shown(step, ctx)) return false;
  return stepIndex(step) <= stepIndex(resume);
}
