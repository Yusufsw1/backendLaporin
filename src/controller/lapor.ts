//controller/lapor.ts

import cloudinary from "../utils/cloudinary";
import { Request, Response } from "express";
import supabase from "../utils/supabase";
import { getDistanceInMeters } from "../utils/distance";

export const createReport = async (req: Request, res: Response) => {
  try {
    // Pastikan user_id diambil dari req.body
    const { description, category, latitude, longitude, user_id } = req.body;

    const lat = Number(latitude);
    const lon = Number(longitude);

    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ message: "At least one image is required" });
    }
    if (!description || !category) {
      return res.status(400).json({ message: "Description & category required" });
    }

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return res.status(400).json({ message: "Latitude & longitude invalid" });
    }

    const uploadPromises = files.map((file) => cloudinary.uploader.upload(file.path, { folder: "Laporin" }));
    const uploadResults = await Promise.all(uploadPromises);
    const photoUrls = uploadResults.map((result) => result.secure_url);

    // Cari cluster yang sudah ada
    const { data: clusters } = await supabase.from("report_clusters").select("*").eq("category", category);

    let targetCluster = null;

    for (const cluster of clusters || []) {
      const distance = getDistanceInMeters(lat, lon, cluster.latitude, cluster.longitude);
      const CLUSTER_RADIUS_M = 20;
      if (distance <= CLUSTER_RADIUS_M) {
        targetCluster = cluster;
        break;
      }
    }

    if (!targetCluster) {
      // Buat Cluster Baru
      const { data: newCluster, error: clusterErr } = await supabase
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

      if (clusterErr) throw clusterErr;
      targetCluster = newCluster;
    } else {
      // Update Cluster Lama
      const newTotal = targetCluster.total_reports + 1;
      let newLabel = "Rendah";

      if (newTotal >= 10) newLabel = "Sangat Tinggi";
      else if (newTotal >= 8) newLabel = "Tinggi";
      else if (newTotal >= 3) newLabel = "Sedang";
      else newLabel = "Rendah";

      await supabase.from("report_clusters").update({ total_reports: newTotal, label: newLabel }).eq("id", targetCluster.id);
    }

    // Masukkan user_id ke tabel reports
    const { data: report, error } = await supabase
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

    if (error) throw error;

    return res.json({ message: "Laporan berhasil dibuat dengan banyak foto", report });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getAllReports = async (req: Request, res: Response) => {
  try {
    // Ambil user_id dari query params (misal: /all?user_id=123)
    const { user_id } = req.query;

    const { data, error } = await supabase
      .from("reports")
      .select(
        `
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
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase Error:", error);
      return res.status(500).json({ message: "Gagal mengambil data laporan" });
    }

    const feedbackMap: Record<string, any> = {};

    (data as any[]).forEach((r) => {
      if (r.cluster_id && r.report_feedbacks && r.report_feedbacks.length > 0) {
        // Simpan feedback pertama yang ditemukan untuk cluster ini
        feedbackMap[r.cluster_id] = r.report_feedbacks[0];
      }
    });

    // --- LOGIKA PENGECEKAN SUPPORT ---
    let supportedIds: string[] = [];
    if (user_id) {
      const { data: userSupports } = await supabase.from("report_supports").select("report_id").eq("user_id", user_id);

      if (userSupports) {
        supportedIds = userSupports.map((s) => s.report_id);
      }
    }

    const reports = (data as any[]).map((r) => ({
      id: r.id,
      category: r.category,
      latitude: r.latitude,
      longitude: r.longitude,
      photo_list: Array.isArray(r.photo_urls) ? r.photo_urls : [],
      deskripsi: r.deskripsi,
      status: r.status,
      created_at: r.created_at,
      support_count: r.support_count || 0,
      label: r.report_clusters?.label ?? null,
      cluster_total: r.report_clusters?.total_reports ?? 1,
      user: r.user,
      user_has_supported: supportedIds.includes(r.id),
      feedback: r.cluster_id ? feedbackMap[r.cluster_id] || null : r.report_feedbacks?.[0] || null,
    }));

    return res.json({ reports });
  } catch (err) {
    console.error("GET Reports Error:", err);
    return res.status(500).json({ message: "Server error saat mengambil laporan" });
  }
};

export const updateReportStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["Menunggu Persetujuan", "Survei Lapangan", "Masuk List Tunggu", "Dalam Proses", "Selesai"].includes(status)) {
    return res.status(400).json({ message: "Status tidak valid" });
  }

  // 1. Ambil cluster_id dari report
  const { data: report, error } = await supabase.from("reports").select("cluster_id").eq("id", id).single();

  if (error || !report?.cluster_id) {
    return res.status(404).json({ message: "Cluster tidak ditemukan" });
  }

  // 2. Update SEMUA report dalam cluster
  await supabase.from("reports").update({ status }).eq("cluster_id", report.cluster_id);

  // 3. Update status cluster juga
  await supabase.from("report_clusters").update({ status }).eq("id", report.cluster_id);

  return res.json({
    message: "Status semua laporan dalam cluster berhasil diseragamkan",
    status,
  });
};

export const toggleSupport = async (req: Request, res: Response) => {
  try {
    const { id: report_id } = req.params;
    const { user_id } = req.body;

    if (!user_id) return res.status(400).json({ message: "User ID wajib diisi" });

    // 1. Ambil data report dulu untuk cek keberadaannya & ambil cluster_id
    // Pastikan kolom 'support_count' sudah ada di tabel 'reports' database Anda!
    const { data: report, error: reportError } = await supabase.from("reports").select("id, cluster_id, support_count").eq("id", report_id).maybeSingle();

    if (reportError) {
      console.error("Database Error (Reports):", reportError.message);
      return res.status(500).json({ message: "Gagal mengambil data laporan", error: reportError.message });
    }

    if (!report) {
      return res.status(404).json({ message: "Laporan tidak ditemukan di database" });
    }

    // 2. Cek apakah user sudah pernah support
    const { data: existing, error: checkError } = await supabase.from("report_supports").select("id").eq("report_id", report_id).eq("user_id", user_id).maybeSingle();

    if (checkError) throw checkError;

    let change = 0;
    if (existing) {
      // Jika sudah ada, hapus (Unsupport)
      const { error: delError } = await supabase.from("report_supports").delete().eq("id", existing.id);

      if (delError) throw delError;
      change = -1;
    } else {
      // Jika belum ada, tambah (Support)
      const { error: insError } = await supabase.from("report_supports").insert([{ report_id, user_id }]);

      if (insError) throw insError;
      change = 1;
    }

    // 3. Update support_count di tabel reports
    const newSupportCount = Math.max(0, (report.support_count || 0) + change);
    const { error: updateReportError } = await supabase.from("reports").update({ support_count: newSupportCount }).eq("id", report_id);

    if (updateReportError) throw updateReportError;

    // 4. Update Cluster (Jika laporan terikat ke sebuah cluster)
    if (report.cluster_id) {
      const { data: cluster } = await supabase.from("report_clusters").select("total_reports").eq("id", report.cluster_id).single();

      if (cluster) {
        const newTotal = Math.max(0, (cluster.total_reports || 0) + change);

        // Logika Labeling Berdasarkan Jumlah Support/Laporan
        let newLabel = "Light";
        if (newTotal >= 10) newLabel = "Sangat Tinggi";
        else if (newTotal >= 8) newLabel = "Tinggi";
        else if (newTotal >= 3) newLabel = "Sedang";
        else if (newTotal > 0) newLabel = "Rendah";

        await supabase
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
  } catch (err: any) {
    console.error("FATAL ERROR:", err);
    return res.status(500).json({ message: "Terjadi kesalahan pada server", error: err.message });
  }
};
