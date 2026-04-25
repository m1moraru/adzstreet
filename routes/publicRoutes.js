import express from 'express';
import { listProviders, getProvider } from '../controllers/publicController.js';

const router = express.Router();

router.get('/providers', listProviders);
router.get('/providers/:id', getProvider);

export default router;