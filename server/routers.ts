import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { highLevelRouter } from "./routers/highlevel";
import { conversationRouter } from "./routers/conversation";
import { actionEngineRouter } from "./routers/actionEngine";
import { creatorPacksRouter } from "./routers/creatorPacks";
import { escalationsRouter } from "./routers/escalations";
import { labRouter } from "./routers/lab";
import { learningRouter } from "./routers/learning";
import { packsRouter } from "./routers/packs";
import { skootlyRouter } from "./routers/skootly";
import { authRouter } from "./routers/auth";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
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
