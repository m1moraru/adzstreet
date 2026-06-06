import pool from "../config/db.js";

export async function getAdminAdsStats(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int AS "totalAds",

        COUNT(*) FILTER (
          WHERE is_published = true
        )::int AS "publishedAds",

        COUNT(*) FILTER (
          WHERE is_published = false
        )::int AS "pendingAds",

        COUNT(*) FILTER (
          WHERE is_active = true
          AND is_sold = false
        )::int AS "activeAds",

        COUNT(*) FILTER (
          WHERE is_active = false
          AND is_sold = false
        )::int AS "suspendedAds",

        COUNT(*) FILTER (
          WHERE is_sold = true
        )::int AS "soldAds",

        COUNT(*) FILTER (
          WHERE payment_status = 'paid'
        )::int AS "paidAds",

        COUNT(*) FILTER (
          WHERE payment_status = 'pending'
        )::int AS "paymentPendingAds",

        COUNT(*) FILTER (
          WHERE created_at >= CURRENT_DATE
        )::int AS "todayAds",

        COUNT(*) FILTER (
          WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
        )::int AS "weekAds",

        COUNT(*) FILTER (
          WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        )::int AS "monthAds"

      FROM ads
    `);

    return res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Admin ads stats error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch ads stats",
    });
  }
}

export async function getReportedAds(req, res) {
  try {
    const result = await pool.query(
      `
      SELECT
        r.id AS report_id,
        r.reason,
        r.message,
        r.created_at AS reported_at,

        reporter.id AS reporter_id,
        reporter.full_name AS reporter_name,
        reporter.email AS reporter_email,

        a.id AS ad_id,
        a.public_id,
        a.title,
        a.category,
        a.city,
        a.country,
        a.price_text,
        a.is_active,
        a.is_published,
        a.is_sold,
        a.created_at AS ad_created_at,

        owner.id AS owner_id,
        owner.full_name AS owner_name,
        owner.email AS owner_email,

        p.image_url AS main_photo
      FROM ad_reports r
      JOIN ads a ON a.id = r.ad_id
      LEFT JOIN users reporter ON reporter.id = r.user_id
      LEFT JOIN users owner ON owner.id = a.user_id
      LEFT JOIN LATERAL (
        SELECT image_url
        FROM ad_photos
        WHERE ad_id = a.id
        ORDER BY is_main DESC, sort_order ASC, created_at ASC
        LIMIT 1
      ) p ON true
      ORDER BY r.created_at DESC
      `
    );

    return res.json({
      success: true,
      reports: result.rows,
    });
  } catch (err) {
    console.error("Get reported ads error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch reported ads",
      error: err.message,
    });
  }
}

export async function getAdminAds(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    const result = await pool.query(
      `
      SELECT
        a.*,
        p.image_url AS main_photo

      FROM ads a

      LEFT JOIN ad_photos p
        ON p.ad_id = a.id
        AND p.is_main = true

      ORDER BY a.created_at DESC

      LIMIT $1
      OFFSET $2
      `,
      [Number(limit), offset]
    );

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error("Admin ads error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch ads",
    });
  }
}

export async function updateAdminAd(req, res) {
  try {
    const { id } = req.params;

    const allowedFields = {
      is_active: "is_active",
      is_published: "is_published",
      is_sold: "is_sold",
    };

    const normalizedBody = { ...req.body };

    ["is_active", "is_published", "is_sold"].forEach((key) => {
      if (normalizedBody[key] === "true") normalizedBody[key] = true;
      if (normalizedBody[key] === "false") normalizedBody[key] = false;
    });

    const updates = [];
    const values = [];

    for (const [bodyField, dbField] of Object.entries(allowedFields)) {
      if (normalizedBody[bodyField] !== undefined) {
        values.push(normalizedBody[bodyField]);
        updates.push(`${dbField} = $${values.length}`);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided",
      });
    }

    values.push(id);

    const result = await pool.query(
      `
      UPDATE ads
      SET ${updates.join(", ")},
          updated_at = NOW()
      WHERE id::text = $${values.length}
      RETURNING *
      `,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Ad not found",
      });
    }

    return res.json({
      success: true,
      message: "Ad updated successfully",
      ad: result.rows[0],
    });
  } catch (err) {
    console.error("Admin update ad error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to update ad",
    });
  }
}

export async function deleteAdminAd(req, res) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { id } = req.params;

    const adResult = await client.query(
      `
      SELECT id
      FROM ads
      WHERE id::text = $1
      LIMIT 1
      `,
      [id]
    );

    if (adResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Ad not found",
      });
    }

    const adId = adResult.rows[0].id;

    const detailTables = [
      "buy_sell_ad_details",
      "classes_ad_details",
      "free_personals_ad_details",
      "jobs_ad_details",
      "property_ad_details",
      "services_ad_details",
      "vehicles_ad_details",
    ];

    for (const table of detailTables) {
      await client.query(`DELETE FROM ${table} WHERE ad_id = $1`, [adId]);
    }

    await client.query("DELETE FROM ad_photos WHERE ad_id = $1", [adId]);

    await client.query("DELETE FROM ads WHERE id = $1", [adId]);

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Ad deleted successfully",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Admin delete ad error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to delete ad",
    });
  } finally {
    client.release();
  }
}

export async function deleteAdReport(req, res) {
  try {
    const { reportId } = req.params;

    const result = await pool.query(
      `
      DELETE FROM ad_reports
      WHERE id::text = $1
      RETURNING id
      `,
      [reportId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    return res.json({
      success: true,
      message: "Report dismissed",
    });
  } catch (err) {
    console.error("Delete ad report error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to dismiss report",
      error: err.message,
    });
  }
}