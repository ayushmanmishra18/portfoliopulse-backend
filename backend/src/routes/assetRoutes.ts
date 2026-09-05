import { Router } from "express";
import {
  createAsset,
  getAssets,
  getAssetById,
  updateAsset,
  deleteAsset,
  getAssetAnalytics,
} from "../controllers/assetController";
import { protect } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";

const router = Router();

router.use(protect);

router.post("/", requireRole("owner", "admin"), createAsset);
router.get("/", getAssets);
router.get("/analytics", getAssetAnalytics);
router.get("/:assetId", getAssetById);
router.patch("/:assetId", requireRole("owner", "admin"), updateAsset);
router.delete("/:assetId", requireRole("owner", "admin"), deleteAsset);

export default router;
