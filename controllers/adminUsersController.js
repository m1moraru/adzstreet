import pool from "../config/db.js";

export async function getAdminUsers(req, res) {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const offset = (safePage - 1) * safeLimit;

    const values = [];
    const conditions = [];

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`
        (
          full_name ILIKE $${values.length}
          OR email ILIKE $${values.length}
          OR provider ILIKE $${values.length}
          OR role ILIKE $${values.length}
        )
      `);
    }

    values.push(safeLimit);
    const limitIndex = values.length;

    values.push(offset);
    const offsetIndex = values.length;

    const result = await pool.query(
      `
      SELECT
        id,
        full_name,
        email,
        provider,
        role,
        is_verified,
        is_suspended,
        suspended_at,
        suspension_reason,
        created_at,
        updated_at
      FROM users
      ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
      ORDER BY created_at DESC
      LIMIT $${limitIndex}
      OFFSET $${offsetIndex}
      `,
      values
    );

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error("Admin get users error:", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch users",
    });
  }
}

export async function updateAdminUser(req, res) {
  try {
    const { id } = req.params;

    const allowedFields = {
      role: "role",
      is_verified: "is_verified",
      is_suspended: "is_suspended",
      suspension_reason: "suspension_reason",
    };

    const normalizedBody = { ...req.body };

    ["is_verified", "is_suspended"].forEach((key) => {
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

    if (normalizedBody.is_suspended === true) {
      updates.push("suspended_at = NOW()");

      if (
        normalizedBody.suspension_reason === undefined ||
        normalizedBody.suspension_reason === null ||
        String(normalizedBody.suspension_reason).trim() === ""
      ) {
        values.push("Suspended by admin");
        updates.push(`suspension_reason = $${values.length}`);
      }
    }

    if (normalizedBody.is_suspended === false) {
      updates.push("suspended_at = NULL");
      updates.push("suspension_reason = NULL");
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
      UPDATE users
      SET ${updates.join(", ")},
          updated_at = NOW()
      WHERE id::text = $${values.length}
      RETURNING
        id,
        full_name,
        email,
        provider,
        role,
        is_verified,
        is_suspended,
        suspended_at,
        suspension_reason,
        created_at,
        updated_at
      `,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      message: "User updated successfully",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("Admin update user error:", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Failed to update user",
    });
  }
}

export async function deleteAdminUser(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM users
      WHERE id::text = $1
      RETURNING id
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (err) {
    console.error("Admin delete user error:", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Failed to delete user",
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