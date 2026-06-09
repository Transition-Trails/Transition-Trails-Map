import { Router, type IRouter } from "express";
import healthRouter     from "./health";
import slackRouter      from "./slack";
import secretsRouter    from "./secrets";
import geminiRouter     from "./gemini";
import googleRouter     from "./google";
import googleOAuthRouter from "./googleOAuth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(slackRouter);
router.use(secretsRouter);
router.use(geminiRouter);
router.use(googleRouter);
router.use(googleOAuthRouter);

export default router;
