import { Router } from "express";
import {
  createWebhook,
  listWebhooks,
  deleteWebhook,
  listWebhookDeliveries,
  resendWebhookDelivery,
} from "../controllers/webhookController";
import { protect } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";

const router = Router();

router.use(protect);

router.post("/", requireRole("owner", "admin"), createWebhook);
router.get("/", listWebhooks);
router.delete("/:webhookId", requireRole("owner", "admin"), deleteWebhook);
router.get("/:webhookId/deliveries", listWebhookDeliveries);
router.post("/deliveries/:deliveryId/resend", requireRole("owner", "admin"), resendWebhookDelivery);

export default router;
