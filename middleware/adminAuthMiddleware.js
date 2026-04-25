export function requireAdminAuth(req, res, next) {
  if (!req.session?.admin) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  next();
}

export function requireAdminRole(req, res, next) {
  if (!req.session?.admin) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (req.session.admin.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }

  next();
}