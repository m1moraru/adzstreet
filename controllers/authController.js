import passport from '../config/passport.js';

export function loginProvider(req, res, next) {
  passport.authenticate('local', (error, user, info) => {
    if (error) return next(error);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: info?.message || 'Login failed',
      });
    }

    req.logIn(user, (loginError) => {
      if (loginError) return next(loginError);

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.public_id,
          name: user.name,
          email: user.email,
          city: user.city,
          ageVerified: user.age_verified,
          ageVerificationStatus: user.age_verification_status,
          isPublished: user.is_published,
        },
      });
    });
  })(req, res, next);
}

export function logoutProvider(req, res, next) {
  req.logout((error) => {
    if (error) return next(error);

    req.session.destroy((sessionError) => {
      if (sessionError) return next(sessionError);

      res.clearCookie('connect.sid', {
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
      });

      return res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    });
  });
}

export function getCurrentProvider(req, res) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated',
    });
  }

  return res.status(200).json({
    success: true,
    user: {
      id: req.user.public_id,
      name: req.user.name,
      email: req.user.email,
      city: req.user.city,
      ageVerified: req.user.age_verified,
      ageVerificationStatus: req.user.age_verification_status,
      isPublished: req.user.is_published,
    },
  });
}