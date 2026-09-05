import { Request } from "express";

export type TenantRole = "owner" | "admin" | "viewer";

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
  tenantId?: string;
  tenantRole?: TenantRole;
  apiKeyTenantId?: string;
}
