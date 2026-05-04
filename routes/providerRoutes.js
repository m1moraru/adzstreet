import express from 'express';
import uploadProviderMedia from '../middleware/uploadProviderMedia.js';
import {
  createProvider,
  getMyProvider,
  updateMyProvider,
  updateMyPassword,
  pauseMyProvider,
  updateMyPublicationStatus,
  verifyProviderAge,
  rejectProviderAge,
  getProvidersForAdmin,
} from '../controllers/providerController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/test', (_req, res) => {
  res.json({ success: true, message: 'provider routes working' });
});

router.post('/', uploadProviderMedia, createProvider);

router.get('/me', requireAuth, getMyProvider);
router.put('/me', requireAuth, uploadProviderMedia, updateMyProvider);
router.put('/me/password', requireAuth, updateMyPassword);
router.patch('/me/pause', requireAuth, pauseMyProvider);
router.patch('/me/publication', requireAuth, updateMyPublicationStatus);

// admin
router.get('/admin/list', getProvidersForAdmin);
router.patch('/:id/verify-age', verifyProviderAge);
router.patch('/:id/reject-age', rejectProviderAge);

export default router;