import {
  conversationDeleteInputSchema,
  conversationSendInputSchema,
  conversationStartInputSchema,
} from "../../shared/skootly";
import { protectedProcedure, router } from "../_core/trpc";
import {
  appendConversationMessage,
  createConversation,
  deleteConversation,
  getConversationGrounding,
  getLatestConversation,
} from "../db";
import { generateSkootConversationReply } from "../conversation";

export const conversationRouter = router({
  latest: protectedProcedure.query(({ ctx }) => getLatestConversation(ctx.user.id)),
  start: protectedProcedure.input(conversationStartInputSchema).mutation(async ({ ctx, input }) => {
    const conversationId = await createConversation(ctx.user.id, input.title);
    return { conversationId };
  }),
  send: protectedProcedure.input(conversationSendInputSchema).mutation(async ({ ctx, input }) => {
    const existing = await getLatestConversation(ctx.user.id);
    if (!existing || existing.conversation.id !== input.conversationId) {
      throw new Error("Private conversation not found.");
    }
    await appendConversationMessage(ctx.user.id, input.conversationId, "user", input.content);
    const grounding = await getConversationGrounding(ctx.user.id);
    const reply = await generateSkootConversationReply(
      input.content,
      existing.messages.map(message => ({ role: message.role, content: message.content })),
      grounding,
    );
    await appendConversationMessage(ctx.user.id, input.conversationId, "skoot", reply.content, reply.citations);
    return reply;
  }),
  delete: protectedProcedure.input(conversationDeleteInputSchema).mutation(({ ctx, input }) =>
    deleteConversation(ctx.user.id, input.conversationId).then(() => ({ success: true })),
  ),
});
