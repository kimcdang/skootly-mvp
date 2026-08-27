import { createHash, randomBytes } from "node:crypto";

export const packTemplateKinds = ["five_day_challenge", "client_implementation"] as const;
export type PackTemplateKind = (typeof packTemplateKinds)[number];

export type PackMilestoneDraft = {
  position: number;
  title: string;
  definitionOfDone: string;
  defaultSkoot: string;
  supportingSkoot?: string;
  feedbackPrompt: string;
  resourceUrl?: string;
  assetSpec?: string;
  notToday?: string;
};

export type PackBlueprintDraft = {
  templateKind: PackTemplateKind;
  name: string;
  description?: string;
  destination: string;
  audience: string;
  cadenceLabel: string;
  notToday?: string;
  milestones: PackMilestoneDraft[];
};

const challengeMilestones: PackMilestoneDraft[] = [
  {
    position: 1,
    title: "Prepare the challenge home",
    definitionOfDone: "Your cover communicates the current challenge start date.",
    defaultSkoot: "Update the challenge cover with the current start date.",
    feedbackPrompt: "What date did you set, and is the cover ready to publish?",
    assetSpec: "Cover: 1084 × 576. Icon: 128 × 128.",
    notToday: "Do not redesign the whole challenge before the cover is current.",
  },
  {
    position: 2,
    title: "Clarify the promise",
    definitionOfDone: "A member can understand the challenge outcome in one sentence.",
    defaultSkoot: "Write one plain-language promise for the challenge and add it to the group description.",
    feedbackPrompt: "What promise did you publish?",
  },
  {
    position: 3,
    title: "Design Day 1",
    definitionOfDone: "Day 1 has one clear action and one definition of done.",
    defaultSkoot: "Write the Day 1 action your students should complete first.",
    feedbackPrompt: "What will students complete on Day 1?",
  },
  {
    position: 4,
    title: "Complete the middle of the challenge",
    definitionOfDone: "Each remaining day moves students closer to the stated outcome.",
    defaultSkoot: "Name the next result students must achieve after Day 1 and outline the action that proves it.",
    feedbackPrompt: "What result does this step create for the student?",
  },
  {
    position: 5,
    title: "Invite the right students",
    definitionOfDone: "Your intended students have a clear way to join the challenge.",
    defaultSkoot: "Send the approved challenge invitation to the next group of right-fit students.",
    feedbackPrompt: "How many invitations did you send, and what response did you receive?",
  },
];

const implementationMilestones: PackMilestoneDraft[] = [
  {
    position: 1,
    title: "Name the client outcome",
    definitionOfDone: "The client can describe the intended result in one sentence.",
    defaultSkoot: "Write the specific outcome this implementation should create.",
    feedbackPrompt: "What outcome did you define?",
  },
  {
    position: 2,
    title: "Establish the starting point",
    definitionOfDone: "You know the most relevant current constraint.",
    defaultSkoot: "Answer the one question that best identifies your current bottleneck.",
    feedbackPrompt: "What is making this step hard right now?",
  },
  {
    position: 3,
    title: "Complete the first implementation move",
    definitionOfDone: "The first observable change has been made.",
    defaultSkoot: "Complete the smallest action that proves this implementation is moving.",
    feedbackPrompt: "What changed after you completed the action?",
  },
];

export function starterPackDraft(kind: PackTemplateKind): PackBlueprintDraft {
  if (kind === "five_day_challenge") {
    return {
      templateKind: kind,
      name: "5-Day Challenge Pack",
      description: "A guided execution path for a focused five-day challenge.",
      destination: "Students complete a focused five-day challenge and make measurable progress toward its promise.",
      audience: "Challenge participants",
      cadenceLabel: "5 days",
      notToday: "Do not add more lessons or tasks until the current day is complete.",
      milestones: challengeMilestones.map(item => ({ ...item })),
    };
  }
  return {
    templateKind: kind,
    name: "Client Implementation Pack",
    description: "A coach-guided path for a defined client implementation.",
    destination: "Clients complete the agreed implementation and can see the result.",
    audience: "Active clients",
    cadenceLabel: "Coach-defined",
    notToday: "Do not jump ahead to later improvements while the current implementation step is unresolved.",
    milestones: implementationMilestones.map(item => ({ ...item })),
  };
}

export function validatePackBlueprintDraft(draft: PackBlueprintDraft) {
  if (!packTemplateKinds.includes(draft.templateKind)) throw new Error("Choose a supported Pack template.");
  if (draft.milestones.length < 3 || draft.milestones.length > 7) throw new Error("A Pack needs three to seven milestones.");
  const positions = draft.milestones.map(item => item.position).sort((a, b) => a - b);
  if (positions.some((position, index) => position !== index + 1)) throw new Error("Milestones must be ordered from 1 without gaps.");
  for (const milestone of draft.milestones) {
    if (!milestone.title.trim() || !milestone.definitionOfDone.trim() || !milestone.defaultSkoot.trim() || !milestone.feedbackPrompt.trim()) {
      throw new Error("Each milestone needs a title, definition of done, primary Skoot, and feedback prompt.");
    }
    if (milestone.supportingSkoot && milestone.supportingSkoot.trim() === milestone.defaultSkoot.trim()) {
      throw new Error("The optional supporting Skoot must be different from the primary Skoot.");
    }
  }
}

export function createInviteToken() {
  return randomBytes(32).toString("base64url");
}

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isInviteExpired(expiresAt: number, now = Date.now()) {
  return expiresAt <= now;
}
