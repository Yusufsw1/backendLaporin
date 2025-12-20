"use strict";
//lapor.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("../utils/multer"));
const lapor_1 = require("../controller/lapor");
const admin_1 = require("../controller/admin");
const router = express_1.default.Router();
router.post("/create", multer_1.default.array("images", 5), lapor_1.createReport);
router.get("/all", lapor_1.getAllReports);
router.put("/:id/status", lapor_1.updateReportStatus);
router.post("/:id/feedback", multer_1.default.single("photo"), admin_1.submitReportFeedback);
router.put("/:id/support", lapor_1.toggleSupport);
router.delete("/:id", admin_1.deleteReport);
exports.default = router;
