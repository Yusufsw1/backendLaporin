"use strict";
//controller/lapor.ts
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
exports.toggleSupport = exports.updateReportStatus = exports.getAllReports = exports.createReport = void 0;
const cloudinary_1 = __importDefault(require("../utils/cloudinary"));
const supabase_1 = __importDefault(require("../utils/supabase"));
const distance_1 = require("../utils/distance");
const createReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Pastikan user_id diambil dari req.body
        const { description, category, latitude, longitude, user_id } = req.body;
        const lat = Number(latitude);
        const lon = Number(longitude);
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({ message: "At least one image is required" });
        }
        if (!description || !category) {
            return res.status(400).json({ message: "Description & category required" });
        }
        if (Number.isNaN(lat) || Number.isNaN(lon)) {
            return res.status(400).json({ message: "Latitude & longitude invalid" });
        }
        const uploadPromises = files.map((file) => cloudinary_1.default.uploader.upload(file.path, { folder: "Laporin" }));
        const uploadResults = yield Promise.all(uploadPromises);
        const photoUrls = uploadResults.map((result) => result.secure_url);
        // Cari cluster yang sudah ada
        const { data: clusters } = yield supabase_1.default.from("report_clusters").select("*").eq("category", category);
        let targetCluster = null;
        for (const cluster of clusters || []) {
            const distance = (0, distance_1.getDistanceInMeters)(lat, lon, cluster.latitude, cluster.longitude);
            const CLUSTER_RADIUS_M = 20;
            if (distance <= CLUSTER_RADIUS_M) {
                targetCluster = cluster;
                break;
            }
        }
        if (!targetCluster) {
            // Buat Cluster Baru
            const { data: newCluster, error: clusterErr } = yield supabase_1.default
                .from("report_clusters")
                .insert([
                {
                    category,
                    latitude: lat,
                    longitude: lon,
                    total_reports: 1,
                    label: "Rendah",
                    status: "Menunggu Persetujuan", // Set status awal cluster
                },
            ])
                .select()
                .single();
            if (clusterErr)
                throw clusterErr;
            targetCluster = newCluster;
        }
        else {
            // Update Cluster Lama
            const newTotal = targetCluster.total_reports + 1;
            let newLabel = "Rendah";
            if (newTotal >= 10)
                newLabel = "Sangat Tinggi";
            else if (newTotal >= 8)
                newLabel = "Tinggi";
            else if (newTotal >= 3)
                newLabel = "Sedang";
            else
                newLabel = "Rendah";
            yield supabase_1.default.from("report_clusters").update({ total_reports: newTotal, label: newLabel }).eq("id", targetCluster.id);
        }
        // Masukkan user_id ke tabel reports
        const { data: report, error } = yield supabase_1.default
            .from("reports")
            .insert([
            {
                user_id,
                category,
                latitude: Number(latitude),
                longitude: Number(longitude),
                photo_urls: photoUrls,
                deskripsi: description,
                cluster_id: targetCluster.id,
                status: "Menunggu Persetujuan",
            },
        ])
            .select()
            .single();
        if (error)
            throw error;
        return res.json({ message: "Laporan berhasil dibuat dengan banyak foto", report });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
});
exports.createReport = createReport;
const getAllReports = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Ambil user_id dari query params (misal: /all?user_id=123)
        const { user_id } = req.query;
        const { data, error } = yield supabase_1.default
            .from("reports")
            .select(`
        id,
        cluster_id,
        category,
        latitude,
        longitude,
        photo_urls,
        deskripsi,
        status,
        created_at,
        support_count,
        user:user_id (
          name
        ),
        report_clusters:cluster_id (
          label,
          total_reports
        ),
          report_feedbacks (
          message,
          photo_url,
          created_at
        )
      `)
            .order("created_at", { ascending: false });
        if (error) {
            console.error("Supabase Error:", error);
            return res.status(500).json({ message: "Gagal mengambil data laporan" });
        }
        const feedbackMap = {};
        data.forEach((r) => {
            if (r.cluster_id && r.report_feedbacks && r.report_feedbacks.length > 0) {
                // Simpan feedback pertama yang ditemukan untuk cluster ini
                feedbackMap[r.cluster_id] = r.report_feedbacks[0];
            }
        });
        // --- LOGIKA PENGECEKAN SUPPORT ---
        let supportedIds = [];
        if (user_id) {
            const { data: userSupports } = yield supabase_1.default.from("report_supports").select("report_id").eq("user_id", user_id);
            if (userSupports) {
                supportedIds = userSupports.map((s) => s.report_id);
            }
        }
        const reports = data.map((r) => {
            var _a, _b, _c, _d, _e;
            return ({
                id: r.id,
                category: r.category,
                latitude: r.latitude,
                longitude: r.longitude,
                photo_list: Array.isArray(r.photo_urls) ? r.photo_urls : [],
                deskripsi: r.deskripsi,
                status: r.status,
                created_at: r.created_at,
                support_count: r.support_count || 0,
                label: (_b = (_a = r.report_clusters) === null || _a === void 0 ? void 0 : _a.label) !== null && _b !== void 0 ? _b : null,
                cluster_total: (_d = (_c = r.report_clusters) === null || _c === void 0 ? void 0 : _c.total_reports) !== null && _d !== void 0 ? _d : 1,
                user: r.user,
                user_has_supported: supportedIds.includes(r.id),
                feedback: r.cluster_id ? feedbackMap[r.cluster_id] || null : ((_e = r.report_feedbacks) === null || _e === void 0 ? void 0 : _e[0]) || null,
            });
        });
        return res.json({ reports });
    }
    catch (err) {
        console.error("GET Reports Error:", err);
        return res.status(500).json({ message: "Server error saat mengambil laporan" });
    }
});
exports.getAllReports = getAllReports;
const updateReportStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { status } = req.body;
    if (!["Menunggu Persetujuan", "Survei Lapangan", "Masuk List Tunggu", "Dalam Proses", "Selesai"].includes(status)) {
        return res.status(400).json({ message: "Status tidak valid" });
    }
    // 1. Ambil cluster_id dari report
    const { data: report, error } = yield supabase_1.default.from("reports").select("cluster_id").eq("id", id).single();
    if (error || !(report === null || report === void 0 ? void 0 : report.cluster_id)) {
        return res.status(404).json({ message: "Cluster tidak ditemukan" });
    }
    // 2. Update SEMUA report dalam cluster
    yield supabase_1.default.from("reports").update({ status }).eq("cluster_id", report.cluster_id);
    // 3. Update status cluster juga
    yield supabase_1.default.from("report_clusters").update({ status }).eq("id", report.cluster_id);
    return res.json({
        message: "Status semua laporan dalam cluster berhasil diseragamkan",
        status,
    });
});
exports.updateReportStatus = updateReportStatus;
const toggleSupport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id: report_id } = req.params;
        const { user_id } = req.body;
        if (!user_id)
            return res.status(400).json({ message: "User ID wajib diisi" });
        // 1. Ambil data report dulu untuk cek keberadaannya & ambil cluster_id
        // Pastikan kolom 'support_count' sudah ada di tabel 'reports' database Anda!
        const { data: report, error: reportError } = yield supabase_1.default.from("reports").select("id, cluster_id, support_count").eq("id", report_id).maybeSingle();
        if (reportError) {
            console.error("Database Error (Reports):", reportError.message);
            return res.status(500).json({ message: "Gagal mengambil data laporan", error: reportError.message });
        }
        if (!report) {
            return res.status(404).json({ message: "Laporan tidak ditemukan di database" });
        }
        // 2. Cek apakah user sudah pernah support
        const { data: existing, error: checkError } = yield supabase_1.default.from("report_supports").select("id").eq("report_id", report_id).eq("user_id", user_id).maybeSingle();
        if (checkError)
            throw checkError;
        let change = 0;
        if (existing) {
            // Jika sudah ada, hapus (Unsupport)
            const { error: delError } = yield supabase_1.default.from("report_supports").delete().eq("id", existing.id);
            if (delError)
                throw delError;
            change = -1;
        }
        else {
            // Jika belum ada, tambah (Support)
            const { error: insError } = yield supabase_1.default.from("report_supports").insert([{ report_id, user_id }]);
            if (insError)
                throw insError;
            change = 1;
        }
        // 3. Update support_count di tabel reports
        const newSupportCount = Math.max(0, (report.support_count || 0) + change);
        const { error: updateReportError } = yield supabase_1.default.from("reports").update({ support_count: newSupportCount }).eq("id", report_id);
        if (updateReportError)
            throw updateReportError;
        // 4. Update Cluster (Jika laporan terikat ke sebuah cluster)
        if (report.cluster_id) {
            const { data: cluster } = yield supabase_1.default.from("report_clusters").select("total_reports").eq("id", report.cluster_id).single();
            if (cluster) {
                const newTotal = Math.max(0, (cluster.total_reports || 0) + change);
                // Logika Labeling Berdasarkan Jumlah Support/Laporan
                let newLabel = "Light";
                if (newTotal >= 10)
                    newLabel = "Sangat Tinggi";
                else if (newTotal >= 8)
                    newLabel = "Tinggi";
                else if (newTotal >= 3)
                    newLabel = "Sedang";
                else if (newTotal > 0)
                    newLabel = "Rendah";
                yield supabase_1.default
                    .from("report_clusters")
                    .update({
                    total_reports: newTotal,
                    label: newLabel,
                })
                    .eq("id", report.cluster_id);
            }
        }
        return res.status(200).json({
            success: true,
            message: existing ? "Support dihapus" : "Support ditambahkan",
            current_count: newSupportCount,
        });
    }
    catch (err) {
        console.error("FATAL ERROR:", err);
        return res.status(500).json({ message: "Terjadi kesalahan pada server", error: err.message });
    }
});
exports.toggleSupport = toggleSupport;
