import { Router, type IRouter } from "express";
import healthRouter      from "./health";
import slackRouter       from "./slack";
import secretsRouter     from "./secrets";
import geminiRouter      from "./gemini";
import googleRouter      from "./google";
import googleOAuthRouter from "./googleOAuth";
import salesforceRouter  from "./salesforce";

const router: IRouter = Router();

router.use(healthRouter);
router.use(slackRouter);
router.use(secretsRouter);
router.use(geminiRouter);
router.use(googleRouter);
router.use(googleOAuthRouter);
router.use(salesforceRouter);

export default router;
