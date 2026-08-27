import { invokeLLM } from "./_core/llm";

type ConversationMessage = { role: "user" | "skoot"; content: string };
type Grounding = {
  activeSkoots: Array<{ title: string; reasoning: string }>;
  learningContext: string;
  sources: Array<{ title: string; lessonUrl: string | null }>;
  businessMemory: null | {
    companyName: string;
    primaryGoal: string;
    currentBottleneck: string | null;
    primaryOffer: string | null;
    actions: Array<{ title: string; reasoning: string; status: string }>;
    recentWins: Array<{ bookings: number; purchases: number; outcomeValue: unknown }>;
  };
};

export async function generateSkootConversationReply(
  message: string,
  history: ConversationMessage[],
  grounding: Grounding,
) {
  const recentHistory = history.slice(-12).map(item => ({
    role: item.role === "skoot" ? ("assistant" as const) : ("user" as const),
    content: item.content.slice(0, 1600),
  }));
  const context = [
    grounding.activeSkoots.length
      ? `ACTIVE SKOOTS:\n${grounding.activeSkoots.map(item => `- ${item.title}: ${item.reasoning}`).join("\n")}`
      : "ACTIVE SKOOTS: none yet",
    grounding.learningContext ? `AUTHORIZED LEARNING CONTEXT:\n${grounding.learningContext}` : "",
    grounding.businessMemory
      ? `BUSINESS MEMORY:\nCompany: ${grounding.businessMemory.companyName}\nGoal: ${grounding.businessMemory.primaryGoal}\nBottleneck: ${grounding.businessMemory.currentBottleneck ?? "not set"}\nOffer: ${grounding.businessMemory.primaryOffer ?? "not set"}\nCURRENT BUSINESS ACTIONS:\n${grounding.businessMemory.actions.map(action => `- ${action.title} (${action.status}): ${action.reasoning}`).join("\n") || "none"}\nRECENT RESULTS:\n${grounding.businessMemory.recentWins.map(win => `- ${win.bookings} bookings, ${win.purchases} purchases, $${String(win.outcomeValue ?? 0)} reported`).join("\n") || "none"}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  const result = await invokeLLM({
    model: "gpt-5-mini",
    maxTokens: 500,
    messages: [
      {
        role: "system",
        content:
          "You are Skoot, Skootly’s private execution companion. Be warm, decisive, and concise. Use only the supplied user-owned context. Help the user clarify or complete their highest-leverage next move. Prioritize the current business action before inventing work. Do not present more than two options. Do not claim to access, inspect, or change external platforms. Do not post, upload, message, browse, or take action for the user. When an external step is relevant, describe it as a user-confirmed next step and use only a supplied authorized link. If learning context is relevant, name the supplied lesson title without inventing details. Never expose another user’s data.",
      },
      { role: "system", content: context },
      ...recentHistory,
      { role: "user", content: message },
    ],
  });
  const raw = result.choices[0]?.message.content;
  const content = typeof raw === "string" ? raw : raw?.filter(part => part.type === "text").map(part => part.text).join("\n");
  if (!content?.trim()) throw new Error("Skoot could not form a response. Please try again.");
  return { content: content.trim().slice(0, 5000), citations: grounding.sources };
}
