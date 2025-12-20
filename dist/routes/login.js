"use strict";
//login.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../controller/auth");
const router = (0, express_1.Router)();
router.post("/google-verify", auth_1.googleVerify);
exports.default = router;
