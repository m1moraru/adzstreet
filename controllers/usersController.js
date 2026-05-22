import bcrypt from "bcrypt";
import pool from "../config/db.js";

export async function signupUser(req, res) {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (full_name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, full_name, email, role, is_verified, created_at
      `,
      [fullName.trim(), normalizedEmail, passwordHash]
    );

    const user = result.rows[0];

    req.login(user, (loginErr) => {
      if (loginErr) {
        console.error("Auto-login after signup failed:", loginErr);

        return res.status(500).json({
          success: false,
          message: "Account created, but login failed",
        });
      }

      return res.status(201).json({
        success: true,
        message: "Account created successfully",
        user,
      });
    });
  } catch (err) {
    console.error("Signup error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to create account",
    });
  }
}
