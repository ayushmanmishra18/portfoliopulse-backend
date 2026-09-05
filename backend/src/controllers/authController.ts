import { Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import Tenant from "../models/Tenant";
import { AuthRequest } from "../types";

const generateToken = (userId: string, email: string): string => {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRES_IN as string) || "7d",
  } as jwt.SignOptions);
};

// Registering a new account creates a brand new tenant (company workspace)
// and makes the registering user its "owner".
export const register = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, companyName } = req.body;

    if (!name || !email || !password || !companyName) {
      return res
        .status(400)
        .json({ message: "Name, email, password, and companyName are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User with this email already exists" });
    }

    const tenant = await Tenant.create({ name: companyName });
    const user = await User.create({
      name,
      email,
      password,
      tenant: tenant._id,
      role: "owner",
    });

    const token = generateToken(user._id.toString(), user.email);

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      tenant: { id: tenant._id, name: tenant.name, slug: tenant.slug, plan: tenant.plan },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Registration failed" });
  }
};

export const login = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password").populate("tenant");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user._id.toString(), user.email);
    const tenant: any = user.tenant;

    res.status(200).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      tenant: { id: tenant._id, name: tenant.name, slug: tenant.slug, plan: tenant.plan },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Login failed" });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.userId).populate("tenant");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const tenant: any = user.tenant;
    res.status(200).json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      tenant: {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        apiRequestQuota: tenant.apiRequestQuota,
        apiRequestsUsedThisMonth: tenant.apiRequestsUsedThisMonth,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
