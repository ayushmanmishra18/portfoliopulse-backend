import { Response } from "express";
import ApiKey, { generateApiKey } from "../models/ApiKey";
import { AuthRequest } from "../types";

export const createApiKey = async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Key name is required" });
    }

    const { rawKey, prefix, hashedKey } = generateApiKey();

    const apiKey = await ApiKey.create({
      tenant: req.tenantId,
      name,
      keyPrefix: prefix,
      hashedKey,
    });

    // The raw key is only ever shown once, at creation time.
    res.status(201).json({
      apiKey: {
        id: apiKey._id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        createdAt: apiKey.createdAt,
      },
      rawKey,
      warning: "Store this key securely. It will not be shown again.",
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const listApiKeys = async (req: AuthRequest, res: Response) => {
  try {
    const keys = await ApiKey.find({ tenant: req.tenantId }).select("-hashedKey");
    res.status(200).json({ apiKeys: keys });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const revokeApiKey = async (req: AuthRequest, res: Response) => {
  try {
    const key = await ApiKey.findOne({ _id: req.params.keyId, tenant: req.tenantId });
    if (!key) {
      return res.status(404).json({ message: "API key not found" });
    }
    key.revoked = true;
    await key.save();
    res.status(200).json({ message: "API key revoked" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
