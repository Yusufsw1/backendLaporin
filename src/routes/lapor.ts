//lapor.ts

import express from "express";
import upload from "../utils/multer";
import { createReport, getAllReports, updateReportStatus, toggleSupport } from "../controller/lapor";
import { deleteReport, submitReportFeedback } from "../controller/admin";

const router = express.Router();

router.post("/create", upload.array("images", 5), createReport);
router.get("/all", getAllReports);
router.put("/:id/status", updateReportStatus);
router.post("/:id/feedback", upload.single("photo"), submitReportFeedback);
router.put("/:id/support", toggleSupport);
router.delete("/:id", deleteReport);

export default router;
