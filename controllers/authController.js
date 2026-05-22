import passport from "../config/passport.js";

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
        secure: false,
        sameSite: "lax",
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