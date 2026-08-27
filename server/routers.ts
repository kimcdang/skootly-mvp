import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { highLevelRouter } from "./routers/highlevel";
import { conversationRouter } from "./routers/conversation";
import { actionEngineRouter } from "./routers/actionEngine";
import { creatorPacksRouter } from "./routers/creatorPacks";
import { escalationsRouter } from "./routers/escalations";
import { labRouter } from "./routers/lab";
import { learningRouter } from "./routers/learning";
import { packsRouter } from "./routers/packs";
import { skootlyRouter } from "./routers/skootly";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  skootly: skootlyRouter,
  lab: labRouter,
  highLevel: highLevelRouter,
  learning: learningRouter,
  packs: packsRouter,
  conversation: conversationRouter,
  actionEngine: actionEngineRouter,
  creatorPacks: creatorPacksRouter,
  escalations: escalationsRouter,
});

export type AppRouter = typeof appRouter;
