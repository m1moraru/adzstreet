import pool from "../config/db.js";

export async function getAdminUsers(req, res) {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const values = [];
    const conditions = [];

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`
        (
          full_name ILIKE $${values.length}
          OR email ILIKE $${values.length}
          OR role ILIKE $${values.length}
        )
      `);
    }

    values.push(Number(limit));
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
      message: "Failed to fetch users",
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
      RETURNING id, full_name, email, provider, role, is_verified, is_suspended, created_at, updated_at
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
      message: "Failed to update user",
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
      message: "Failed to delete user",
    });
  }
}