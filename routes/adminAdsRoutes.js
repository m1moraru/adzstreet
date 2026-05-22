import express from "express";

import {
  getAdminAds,
  getAdminAdsStats,
  updateAdminAd,
  deleteAdminAd,
} from "../controllers/adminAdsController.js";

const router = express.Router();

router.get("/stats", getAdminAdsStats);

router.get("/", getAdminAds);

router.patch("/:id", updateAdminAd);

router.delete("/:id", deleteAdminAd);

export default router;