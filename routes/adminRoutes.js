import express from 'express';
import uploadProviderMedia from '../middleware/uploadProviderMedia.js';
import {
  requireAdminAuth,
  requireAdminRole,
} from '../middleware/adminAuthMiddleware.js';
import {
  getDashboardStats,
  getProviders,
  getProviderById,
  getPendingProviders,
  verifyProvider,
  rejectProvider,
  publishAd,
  unpublishAd,
  suspendAccount,
  reactivateAccount,
  deleteProvider,
  deleteMedia,
  emailProvider,
  updateProvider,
} from '../controllers/adminController.js';

const router = express.Router();

router.use(requireAdminAuth, requireAdminRole);

router.get('/dashboard/stats', getDashboardStats);

router.get('/providers', getProviders);
router.get('/providers/pending', getPendingProviders);
router.get('/providers/:id', getProviderById);

router.put('/providers/:id', uploadProviderMedia, updateProvider);

router.patch('/providers/:id/verify-age', verifyProvider);
router.patch('/providers/:id/reject-age', rejectProvider);
router.patch('/providers/:id/publish-ad', publishAd);
router.patch('/providers/:id/unpublish-ad', unpublishAd);
router.patch('/providers/:id/suspend-account', suspendAccount);
router.patch('/providers/:id/reactivate-account', reactivateAccount);

router.delete('/providers/:id', deleteProvider);
router.delete('/providers/:id/media/:mediaId', deleteMedia);

router.post('/providers/:id/email', emailProvider);

router.post('/login', async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const { rows } = await pool.query(
      `
      SELECT id, email, password_hash, role
      FROM admins
      WHERE email = $1
      LIMIT 1
      `,
      [email]
    );

    const admin = rows[0];

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const passwordMatches = await bcrypt.compare(password, admin.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    req.session.admin = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
    };

    console.log('LOGIN sessionID:', req.sessionID);
    console.log('LOGIN session before save:', req.session);

    req.session.save((err) => {
      if (err) {
        return next(err);
      }

      console.log('LOGIN session after save:', req.session);

      return res.status(200).json({
        success: true,
        message: 'Admin logged in successfully',
        admin: req.session.admin,
      });
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', (req, res) => {
  console.log('ME sessionID:', req.sessionID);
  console.log('ME session:', req.session);

  if (!req.session?.admin) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated',
    });
  }

  return res.json({
    success: true,
    admin: req.session.admin,
  });
});

export default router;