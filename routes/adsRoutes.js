import express from "express";
import multer from "multer";
import {
  createAd,
  getAds,
  getAdById,
  getMyAds,
  getRelatedAds,
  updateMyAd,
  deleteMyAd,
} from "../controllers/adsController.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 8,
    fileSize: 5 * 1024 * 1024,
  },
});

router.post("/", upload.array("photos", 8), createAd);

router.get("/my-ads", getMyAds);

router.get("/related", getRelatedAds);

router.patch("/:id", upload.array("photos", 8), updateMyAd);

router.delete("/:id", deleteMyAd);

router.get("/", getAds);

router.get("/:id", getAdById);

export default router;