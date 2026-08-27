export const EXPERIMENT_VERSIONS = ["founder", "coach", "client_success"] as const;

export type ExperimentVersion = (typeof EXPERIMENT_VERSIONS)[number];

export type ExperimentConfig = {
  version: ExperimentVersion;
  route: string;
  eyebrow: string;
  positioning: string;
  audience: string;
  promise: string;
  goalLabel: string;
  stateLabel: string;
  blockerLabel: string;
  contextPrompt: string;
  accent: "mint" | "lilac" | "yellow";
  recommendationPriorities: string[];
  demoContext?: {
    goal: string;
    currentState: string;
    blocker: string;
    metricName: string;
    currentValue: string;
    targetValue: string;
    opportunities: string;
    constraints: string;
  };
};

export const EXPERIMENTS: Record<ExperimentVersion, ExperimentConfig> = {
  founder: {
    version: "founder",
    route: "/founder",
    eyebrow: "For founders & operators",
    positioning: "Know exactly what to do next.",
    audience: "Founders, consultants, and operators with too many possible priorities.",
    promise: "Skootly protects your attention and points it at the constraint closest to cash or progress.",
    goalLabel: "What outcome matters most right now?",
    stateLabel: "What is true about the business today?",
    blockerLabel: "What feels stuck or slower than it should?",
    contextPrompt: "Include revenue, cash flow, warm opportunities, active projects, and anything competing for attention.",
    accent: "mint",
    recommendationPriorities: [
      "Favor existing revenue opportunities before creating new complexity.",
      "When cash flow is urgent, prefer actions closest to cash.",
      "Protect the founder from attractive but non-bottleneck work.",
    ],
  },
  coach: {
    version: "coach",
    route: "/coach",
    eyebrow: "For coaches & programs",
    positioning: "Give every client the right next step.",
    audience: "Coaches, consultants, masterminds, and course creators guiding client progress.",
    promise: "Turn a client update into the next milestone-moving action without overwhelming them.",
    goalLabel: "What outcome is the client working toward?",
    stateLabel: "Where is the client in your methodology today?",
    blockerLabel: "What is preventing the next milestone?",
    contextPrompt: "Include the relevant milestone, methodology, recent client activity, and support already provided.",
    accent: "lilac",
    recommendationPriorities: [
      "Choose the action that advances the next explicit milestone.",
      "Keep the recommendation executable by the client without coach intervention when possible.",
      "Use the coach's stated methodology as a constraint, not generic advice.",
    ],
  },
  client_success: {
    version: "client_success",
    route: "/client-success",
    eyebrow: "For client success teams",
    positioning: "Manage Client Success Through Chat.",
    audience: "Client success managers, agencies, coaching companies, and education teams.",
    promise: "Prioritize the client whose stalled progress or risk most needs a human intervention.",
    goalLabel: "What client outcome are you protecting?",
    stateLabel: "What has happened with this client recently?",
    blockerLabel: "Why is this client at risk or stalled?",
    contextPrompt: "Include milestones, engagement, sentiment, response gaps, and any retention risk signals.",
    accent: "yellow",
    recommendationPriorities: [
      "Prioritize retention and unblocking over general account activity.",
      "Prefer a specific human intervention when risk is high.",
      "Explain why this client deserves attention before lower-risk accounts.",
    ],
    demoContext: {
      goal: "Fictional demo: Retain Acme Co. and restore progress toward launch.",
      currentState: "Fictional demo: Acme Co. has not completed onboarding, missed the last milestone, and has not replied for eight days.",
      blocker: "Fictional demo: The client is unclear about the next implementation step and ownership is ambiguous.",
      metricName: "Onboarding completion",
      currentValue: "40%",
      targetValue: "80%",
      opportunities: "Fictional demo: Their operations lead previously responded quickly to short, specific requests.",
      constraints: "Fictional demo: Renewal is in 21 days. No testimonial, rating, or customer claim is implied by this sample.",
    },
  },
};

export function experimentFromPath(path: string): ExperimentVersion | null {
  return Object.values(EXPERIMENTS).find(item => item.route === path)?.version ?? null;
}
