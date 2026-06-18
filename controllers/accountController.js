import bcrypt from "bcrypt";
import pool from "../config/db.js";

export async function deleteUserAccount(req, res, next) {
  try {
    const email = req.user?.email?.toLowerCase().trim();

    if (!email) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    await pool.query(
      `DELETE FROM users WHERE LOWER(TRIM(email)) = $1`,
      [email]
    );

    req.logout(() => {
      req.session.destroy(() => {
        res.clearCookie("connect.sid");
        return res.json({ success: true, message: "User account deleted" });
      });
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteProviderAccount(req, res, next) {
  try {
    const email = req.user?.email?.toLowerCase().trim();

    if (!email) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    await pool.query(
      `
      UPDATE providers
      SET is_active = false,
          is_published = false,
          updated_at = NOW()
      WHERE LOWER(TRIM(email)) = $1
      `,
      [email]
    );

    return res.json({
      success: true,
      message: "Provider account deleted",
    });
  } catch (error) {
    next(error);
  }
}


export async function updateAccountEmail(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { newEmail, currentPassword } = req.body;

    if (!newEmail || !currentPassword) {
      return res.status(400).json({
        message: "New email and current password are required",
      });
    }

    const normalizedEmail = newEmail.toLowerCase().trim();

    const userResult = await pool.query(
      "SELECT id, email, password_hash FROM users WHERE id = $1",
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userResult.rows[0];

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const existingEmail = await pool.query(
      "SELECT id FROM users WHERE email = $1 AND id != $2",
      [normalizedEmail, req.user.id]
    );

    if (existingEmail.rows.length > 0) {
      return res.status(409).json({ message: "Email is already in use" });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET email = $1,
          is_verified = false,
          updated_at = NOW()
      WHERE id = $2
      RETURNING id, full_name, email, role, is_verified
      `,
      [normalizedEmail, req.user.id]
    );

    return res.json({
      success: true,
      message: "Email updated successfully. Please verify your new email.",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("Update email error:", err);
    return res.status(500).json({ message: "Failed to update email" });
  }
}

export async function updateAccountPassword(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters",
      });
    }

    const userResult = await pool.query(
      "SELECT id, password_hash FROM users WHERE id = $1",
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userResult.rows[0];

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `
      UPDATE users
      SET password_hash = $1,
          updated_at = NOW()
      WHERE id = $2
      `,
      [newPasswordHash, req.user.id]
    );

    return res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (err) {
    console.error("Update password error:", err);
    return res.status(500).json({ message: "Failed to update password" });
  }
}