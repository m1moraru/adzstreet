import bcrypt from "bcrypt";
import passport from "../config/passport.js";
import pool from "../config/db.js";

function formatAuthUser(user) {
  if (user.account_type === "provider" || user.public_id) {
    return {
      id: user.public_id,
      providerId: user.id,
      name: user.name,
      email: user.email,
      city: user.city,
      ageVerified: user.age_verified,
      ageVerificationStatus: user.age_verification_status,
      isPublished: user.is_published,
      accountType: "provider",
    };
  }

  return {
    id: user.id,
    name: user.name || user.full_name,
    email: user.email,
    role: user.role || "user",
    accountType: "user",
  };
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const userResult = await pool.query(
      `
      SELECT id, full_name, email, password_hash, role
      FROM users
      WHERE email = $1
      `,
      [normalizedEmail]
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];

      const passwordMatches = await bcrypt.compare(
        password,
        user.password_hash
      );

      if (!passwordMatches) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      return req.logIn(user, (loginError) => {
        if (loginError) return next(loginError);

        req.session.save((sessionError) => {
          if (sessionError) return next(sessionError);

          return res.status(200).json({
            success: true,
            message: "Login successful",
            user: formatAuthUser(user),
          });
        });
      });
    }

    passport.authenticate("local", (error, provider, info) => {
      if (error) return next(error);

      if (!provider) {
        return res.status(401).json({
          success: false,
          message: info?.message || "Invalid email or password",
        });
      }

      req.logIn(provider, (loginError) => {
        if (loginError) return next(loginError);

        req.session.save((sessionError) => {
          if (sessionError) return next(sessionError);

          return res.status(200).json({
            success: true,
            message: "Login successful",
            user: formatAuthUser(provider),
          });
        });
      });
    })(req, res, next);
  } catch (err) {
    return next(err);
  }
}

export function loginProvider(req, res, next) {
  passport.authenticate("local", (error, user, info) => {
    if (error) return next(error);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: info?.message || "Login failed",
      });
    }

    req.logIn(user, (loginError) => {
      if (loginError) return next(loginError);

      req.session.save((sessionError) => {
        if (sessionError) return next(sessionError);

        return res.status(200).json({
          success: true,
          message: "Login successful",
          user: formatAuthUser(user),
        });
      });
    });
  })(req, res, next);
}

export function logoutProvider(req, res, next) {
  req.logout((error) => {
    if (error) return next(error);

    req.session.destroy((sessionError) => {
      if (sessionError) return next(sessionError);

      res.clearCookie("connect.sid", {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      });

      return res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    });
  });
}

export function getCurrentProvider(req, res) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated",
    });
  }

  return res.status(200).json({
    success: true,
    user: formatAuthUser(req.user),
  });
}