import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import UsageLog from "../models/UsageLog";

/**
 * Logs every external API request for per-tenant usage metering/billing.
 * Attached after authenticateApiKey so tenant/apiKey context is available.
 */
export const logUsage = (req: AuthRequest, res: Response, next: NextFunction): void => {
  res.on("finish", () => {
    const tenantId = req.apiKeyTenantId;
    const apiKeyId = (req as any).apiKeyId;
    if (!tenantId || !apiKeyId) return;

    UsageLog.create({
      tenant: tenantId,
      apiKey: apiKeyId,
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: res.statusCode,
    }).catch(() => undefined);
  });
  next();
};
