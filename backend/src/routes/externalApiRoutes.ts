import { Router } from "express";
import {
  externalListAssets,
  externalGetAsset,
  externalCreateAsset,
  externalBulkCreateAssets,
  externalUpdateAsset,
} from "../controllers/externalApiController";
import { authenticateApiKey } from "../middleware/apiKeyAuth";
import { publicApiLimiter } from "../middleware/rateLimiter";
import { logUsage } from "../middleware/usageLogger";

const router = Router();

// Every request on this router represents a call from an external client
// system, not a logged-in dashboard user. Order matters: authenticate the
// key first (resolves tenant + enforces quota), then rate-limit per IP,
// then log usage for metering.
router.use(authenticateApiKey);
router.use(publicApiLimiter);
router.use(logUsage);

router.get("/assets", externalListAssets);
router.get("/assets/:assetId", externalGetAsset);
router.post("/assets", externalCreateAsset);
router.post("/assets/bulk", externalBulkCreateAssets);
router.patch("/assets/:assetId", externalUpdateAsset);

export default router;
