import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import ApiKey, { hashApiKey } from "../models/ApiKey";
import Tenant from "../models/Tenant";

/**
 * Gateway-style authentication for the External/Public API.
 * Unlike the dashboard's JWT auth (for logged-in humans), this validates
 * a long-lived API key sent by an external client system, resolves it to
 * a tenant, and enforces per-tenant monthly quota before allowing the request
 * to reach the underlying resource. Mirrors an API-gateway pattern: scope
 * resolution + quota enforcement happen at the edge, before business logic.
 */
export const authenticateApiKey = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const rawKey = req.headers["x-api-key"] as string | undefined;

  if (!rawKey) {
    res.status(401).json({ message: "Missing X-API-Key header" });
    return;
  }

  try {
    const hashedKey = hashApiKey(rawKey);
    const apiKeyDoc = await ApiKey.findOne({ hashedKey, revoked: false });

    if (!apiKeyDoc) {
      res.status(401).json({ message: "Invalid or revoked API key" });
      return;
    }

    const tenant = await Tenant.findById(apiKeyDoc.tenant);
    if (!tenant) {
      res.status(401).json({ message: "Tenant associated with this key no longer exists" });
      return;
    }

    if (tenant.apiRequestsUsedThisMonth >= tenant.apiRequestQuota) {
      res.status(429).json({
        message: "Monthly API request quota exceeded for this tenant's plan",
        quota: tenant.apiRequestQuota,
      });
      return;
    }

    // Attach resolved scope to the request for downstream handlers
    req.apiKeyTenantId = tenant._id.toString();
    (req as any).apiKeyId = apiKeyDoc._id.toString();

    // Fire-and-forget usage bookkeeping (non-blocking)
    apiKeyDoc.lastUsedAt = new Date();
    apiKeyDoc.save().catch(() => undefined);
    Tenant.findByIdAndUpdate(tenant._id, {
      $inc: { apiRequestsUsedThisMonth: 1 },
    }).catch(() => undefined);

    next();
  } catch (error) {
    res.status(500).json({ message: "Server error while authenticating API key" });
  }
};
