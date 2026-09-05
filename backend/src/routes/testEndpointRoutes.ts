import { Router } from "express";
import { receiveTestEvent, listTestEvents } from "../controllers/testEndpointController";
import { protect } from "../middleware/auth";

const router = Router();

// Public: external systems post here without auth.
router.post("/test-endpoint/:tenantSlug", receiveTestEvent);

// Dashboard: authenticated tenant reads its own received events.
router.get("/test-endpoint-events", protect, listTestEvents);

export default router;
