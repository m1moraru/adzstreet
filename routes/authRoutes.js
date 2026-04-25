import express from 'express';
import {
  loginProvider,
  logoutProvider,
  getCurrentProvider,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', loginProvider);
router.post('/logout', requireAuth, logoutProvider);
router.get('/me', requireAuth, getCurrentProvider);

export default router;