"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteReport = exports.submitReportFeedback = void 0;
const cloudinary_1 = __importDefault(require("../utils/cloudinary"));
const supabase_1 = __importDefault(require("../utils/supabase"));
// export const submitReportFeedback = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { message, admin_id } = req.body;
//     console.log("LOG DATA:", { reportId: id, adminId: admin_id });
//     if (!req.file) {
//       return res.status(400).json({ message: "Foto bukti wajib diupload" });
//     }
//     // upload ke Cloudinary
//     const uploadResult = await cloudinary.uploader.upload(req.file.path, {
//       folder: "Laporin",
//     });
//     // simpan feedback
//     await supabase.from("report_feedbacks").insert({
//       report_id: id,
//       admin_id,
//       message,
//       photo_url: uploadResult.secure_url,
//     });
//     // ambil cluster_id
//     const { data: report, error } = await supabase.from("reports").select("cluster_id").eq("id", id).single();
//     if (error || !report) {
//       return res.status(404).json({ message: "Report tidak ditemukan" });
//     }
//     // 🔥 SERAGAMKAN STATUS
//     await supabase.from("reports").update({ status: "Selesai" }).eq("cluster_id", report.cluster_id);
//     await supabase.from("report_clusters").update({ status: "Selesai" }).eq("id", report.cluster_id);
//     return res.json({
//       message: "Feedback berhasil dikirim & cluster diselesaikan",
//     });
//   } catch (err) {
//     console.error("Submit Feedback Error:", err);
//     return res.status(500).json({ message: "Server error" });
//   }
// };
const submitReportFeedback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { message, admin_id } = req.body;
        if (!req.file) {
            return res.status(400).json({ message: "Foto bukti wajib diupload" });
        }
        // 1. Upload ke Cloudinary
        const uploadResult = yield cloudinary_1.default.uploader.upload(req.file.path, {
            folder: "Laporin",
        });
        // 2. SIMPAN FEEDBACK (Tambahkan variabel error untuk mengecek)
        const { error: insertError } = yield supabase_1.default.from("report_feedbacks").insert({
            report_id: id,
            admin_id: admin_id, // Pastikan UUID ini ada di tabel users
            message: message,
            photo_url: uploadResult.secure_url,
        });
        // JIKA INSERT GAGAL, BERHENTI DI SINI
        if (insertError) {
            console.error("Gagal simpan feedback:", insertError.message);
            return res.status(500).json({
                message: "Gagal menyimpan feedback ke database",
                error: insertError.message,
            });
        }
        // 3. Ambil data report untuk mendapatkan cluster_id
        const { data: report, error: reportError } = yield supabase_1.default.from("reports").select("cluster_id").eq("id", id).single();
        if (reportError || !report) {
            return res.status(404).json({ message: "Report tidak ditemukan" });
        }
        // 4. Update Status Laporan & Cluster
        // Update semua laporan dalam cluster yang sama menjadi Selesai
        yield supabase_1.default.from("reports").update({ status: "Selesai" }).eq("cluster_id", report.cluster_id);
        // Update status Cluster itu sendiri
        yield supabase_1.default.from("report_clusters").update({ status: "Selesai" }).eq("id", report.cluster_id);
        return res.json({
            success: true,
            message: "Feedback berhasil disimpan & laporan diselesaikan",
        });
    }
    catch (err) {
        console.error("Submit Feedback Error:", err);
        return res.status(500).json({ message: "Server error", error: err.message });
    }
});
exports.submitReportFeedback = submitReportFeedback;
const deleteReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // 1. Ambil cluster_id sebelum laporan dihapus (untuk update count nanti)
        const { data: report } = yield supabase_1.default.from("reports").select("cluster_id").eq("id", id).single();
        if (!report) {
            return res.status(404).json({ message: "Laporan tidak ditemukan" });
        }
        // 2. Hapus laporan dari database
        const { error: deleteError } = yield supabase_1.default.from("reports").delete().eq("id", id);
        if (deleteError)
            throw deleteError;
        // 3. Update total_reports di cluster terkait
        if (report.cluster_id) {
            // Ambil jumlah laporan yang tersisa di cluster tersebut
            const { count } = yield supabase_1.default.from("reports").select("*", { count: "exact", head: true }).eq("cluster_id", report.cluster_id);
            const remainingReports = count || 0;
            if (remainingReports === 0) {
                // Jika tidak ada laporan tersisa, hapus clusternya
                yield supabase_1.default.from("report_clusters").delete().eq("id", report.cluster_id);
            }
            else {
                // Jika masih ada, update jumlahnya
                yield supabase_1.default.from("report_clusters").update({ total_reports: remainingReports }).eq("id", report.cluster_id);
            }
        }
        return res.json({ message: "Laporan berhasil dihapus" });
    }
    catch (err) {
        console.error("Delete Report Error:", err);
        return res.status(500).json({ message: "Gagal menghapus laporan" });
    }
});
exports.deleteReport = deleteReport;
