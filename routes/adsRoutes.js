import express from "express";
import multer from "multer";
import {
  createAd,
  getAds,
  getAdById,
  getMyAds,
  updateMyAd,
  deleteMyAd,
} from "../controllers/adsController.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: "uploads/ads",
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}-${file.originalname}`;

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    files: 8,
    fileSize: 5 * 1024 * 1024,
  },
});

router.post("/", upload.array("photos", 8), createAd);

router.get("/my-ads", getMyAds);

router.patch("/:id", upload.array("photos", 8), updateMyAd);

router.delete("/:id", deleteMyAd);

router.get("/", getAds);

router.get("/:id", getAdById);

export default router;