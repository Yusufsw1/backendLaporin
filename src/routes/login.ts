//login.ts

import { Router } from "express";
import { googleVerify } from "../controller/auth";

const router = Router();

router.post("/google-verify", googleVerify);

export default router;
