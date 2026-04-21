import { Router, type IRouter } from "express";
import healthRouter from "./health";
import paymentsRouter from "./payments";
import referralRouter from "./referral";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/payments", paymentsRouter);
router.use("/referral", referralRouter);

export default router;
