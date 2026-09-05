import { Router } from "express";
import { createApiKey, listApiKeys, revokeApiKey } from "../controllers/apiKeyController";
import { protect } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";

const router = Router();

router.use(protect);

router.post("/", requireRole("owner", "admin"), createApiKey);
router.get("/", listApiKeys);
router.delete("/:keyId", requireRole("owner", "admin"), revokeApiKey);

export default router;
