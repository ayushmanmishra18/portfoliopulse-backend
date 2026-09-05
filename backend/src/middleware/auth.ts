import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthRequest, JwtPayload } from "../types";
import User from "../models/User";

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Not authorized, no token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401).json({ message: "User no longer exists" });
      return;
    }
    req.user = { userId: decoded.userId, email: decoded.email };
    req.tenantId = user.tenant.toString();
    req.tenantRole = user.role;
    next();
  } catch (error) {
    res.status(401).json({ message: "Not authorized, token invalid or expired" });
  }
};
