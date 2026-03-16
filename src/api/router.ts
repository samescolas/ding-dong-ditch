import { Router } from "express";
import authRouter from "./auth.js";
import camerasRouter from "./cameras.js";
import configRouter from "./config.js";
import recordingsRouter from "./recordings.js";

const router = Router();

router.use("/auth", authRouter);
router.use("/cameras", camerasRouter);
router.use("/config", configRouter);
router.use("/recordings", recordingsRouter);

export default router;
