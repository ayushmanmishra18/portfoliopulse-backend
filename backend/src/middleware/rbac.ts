import { Response, NextFunction } from "express";
import { AuthRequest, TenantRole } from "../types";

/**
 * Restricts a dashboard route to specific tenant roles.
 * Usage: requireRole("owner", "admin")
 */
export const requireRole = (...allowedRoles: TenantRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.tenantRole || !allowedRoles.includes(req.tenantRole)) {
      res.status(403).json({
        message: `Forbidden: requires one of roles [${allowedRoles.join(", ")}]`,
      });
      return;
    }
    next();
  };
};
