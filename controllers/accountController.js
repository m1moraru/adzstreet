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