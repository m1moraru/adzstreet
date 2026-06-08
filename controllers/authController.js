import bcrypt from "bcrypt";
import passport from "../config/passport.js";
import pool from "../config/db.js";

async function getAccountAccessByEmail(email) {
  const normalizedEmail = email?.toLowerCase().trim();

  if (!normalizedEmail) {
    return {
      userAccount: null,
      providerAccount: null,
    };
  }

  const [userResult, providerResult] = await Promise.all([
    pool.query(
      `
      SELECT id, full_name, email, role
      FROM users
      WHERE LOWER(TRIM(email)) = $1
      LIMIT 1
      `,
      [normalizedEmail]
    ),
    pool.query(
      `
      SELECT
        id,
        public_id,
        name,
        email,
        city,
        age_verified,
        age_verification_status,
        is_published
      FROM providers
      WHERE LOWER(TRIM(email)) = $1
      LIMIT 1
      `,
      [normalizedEmail]
    ),
  ]);

  return {
    userAccount: userResult.rows[0] || null,
    providerAccount: providerResult.rows[0] || null,
  };
}

async function formatAuthUser(user) {
  const { userAccount, providerAccount } = await getAccountAccessByEmail(
    user.email
  );

  const hasUserAccount = Boolean(userAccount);
  const hasProviderAccount = Boolean(providerAccount);

  if (hasProviderAccount) {
    return {
      id: providerAccount.public_id,
      userId: userAccount?.id || null,
      providerId: providerAccount.id,
      providerPublicId: providerAccount.public_id,
      name: providerAccount.name,
      email: providerAccount.email,
      city: providerAccount.city,
      ageVerified: providerAccount.age_verified,
      ageVerificationStatus: providerAccount.age_verification_status,
      isPublished: providerAccount.is_published,

      accountType: hasUserAccount ? "both" : "provider",
      hasUserAccount,
      hasProviderAccount,
      defaultDashboard: "provider",
    };
  }

  if (hasUserAccount) {
    return {
      id: userAccount.id,
      userId: userAccount.id,
      providerId: null,
      providerPublicId: null,
      name: userAccount.full_name,
      email: userAccount.email,
      role: userAccount.role || "user",

      accountType: "user",
      hasUserAccount: true,
      hasProviderAccount: false,
      defaultDashboard: "user",
    };
  }

  return {
    id: user.id,
    userId: null,
    providerId: null,
    providerPublicId: null,
    name: user.name || user.full_name || "",
    email: user.email,

    accountType: user.account_type || "user",
    hasUserAccount: false,
    hasProviderAccount: false,
    defaultDashboard: "user",
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
      WHERE LOWER(TRIM(email)) = $1
      LIMIT 1
      `,
      [normalizedEmail]
    );

    if (userResult.rows.length > 0) {
      const dbUser = userResult.rows[0];

      const user = {
        id: dbUser.id,
        full_name: dbUser.full_name,
        name: dbUser.full_name,
        email: dbUser.email,
        password_hash: dbUser.password_hash,
        role: dbUser.role || "user",
        account_type: "user",
      };

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

        req.session.save(async (sessionError) => {
          if (sessionError) return next(sessionError);

          try {
            const formattedUser = await formatAuthUser(user);

            return res.status(200).json({
              success: true,
              message: "Login successful",
              user: formattedUser,
            });
          } catch (error) {
            return next(error);
          }
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

        req.session.save(async (sessionError) => {
          if (sessionError) return next(sessionError);

          try {
            const formattedUser = await formatAuthUser(provider);

            return res.status(200).json({
              success: true,
              message: "Login successful",
              user: formattedUser,
            });
          } catch (error) {
            return next(error);
          }
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

      req.session.save(async (sessionError) => {
        if (sessionError) return next(sessionError);

        try {
          const formattedUser = await formatAuthUser(user);

          return res.status(200).json({
            success: true,
            message: "Login successful",
            user: formattedUser,
          });
        } catch (error) {
          return next(error);
        }
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

export async function getCurrentProvider(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const formattedUser = await formatAuthUser(req.user);

    return res.status(200).json({
      success: true,
      user: formattedUser,
    });
  } catch (error) {
    return next(error);
  }
}