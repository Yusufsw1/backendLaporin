import cloudinary from "../utils/cloudinary";
import { Request, Response } from "express";
import supabase from "../utils/supabase";

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

export const submitReportFeedback = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { message, admin_id } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Foto bukti wajib diupload" });
    }

    // 1. Upload ke Cloudinary
    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      folder: "Laporin",
    });

    // 2. SIMPAN FEEDBACK (Tambahkan variabel error untuk mengecek)
    const { error: insertError } = await supabase.from("report_feedbacks").insert({
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
    const { data: report, error: reportError } = await supabase.from("reports").select("cluster_id").eq("id", id).single();

    if (reportError || !report) {
      return res.status(404).json({ message: "Report tidak ditemukan" });
    }

    // 4. Update Status Laporan & Cluster
    // Update semua laporan dalam cluster yang sama menjadi Selesai
    await supabase.from("reports").update({ status: "Selesai" }).eq("cluster_id", report.cluster_id);

    // Update status Cluster itu sendiri
    await supabase.from("report_clusters").update({ status: "Selesai" }).eq("id", report.cluster_id);

    return res.json({
      success: true,
      message: "Feedback berhasil disimpan & laporan diselesaikan",
    });
  } catch (err: any) {
    console.error("Submit Feedback Error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const deleteReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Ambil cluster_id sebelum laporan dihapus (untuk update count nanti)
    const { data: report } = await supabase.from("reports").select("cluster_id").eq("id", id).single();

    if (!report) {
      return res.status(404).json({ message: "Laporan tidak ditemukan" });
    }

    // 2. Hapus laporan dari database
    const { error: deleteError } = await supabase.from("reports").delete().eq("id", id);

    if (deleteError) throw deleteError;

    // 3. Update total_reports di cluster terkait
    if (report.cluster_id) {
      // Ambil jumlah laporan yang tersisa di cluster tersebut
      const { count } = await supabase.from("reports").select("*", { count: "exact", head: true }).eq("cluster_id", report.cluster_id);

      const remainingReports = count || 0;

      if (remainingReports === 0) {
        // Jika tidak ada laporan tersisa, hapus clusternya
        await supabase.from("report_clusters").delete().eq("id", report.cluster_id);
      } else {
        // Jika masih ada, update jumlahnya
        await supabase.from("report_clusters").update({ total_reports: remainingReports }).eq("id", report.cluster_id);
      }
    }

    return res.json({ message: "Laporan berhasil dihapus" });
  } catch (err: any) {
    console.error("Delete Report Error:", err);
    return res.status(500).json({ message: "Gagal menghapus laporan" });
  }
};
