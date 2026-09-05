import { Request, Response } from "express";
import Tenant from "../models/Tenant";
import TestEndpointEvent from "../models/TestEndpointEvent";
import { AuthRequest } from "../types";

// Publicly accessible: external webhook senders won't have a JWT.
export const receiveTestEvent = async (req: Request, res: Response) => {
  try {
    const tenant = await Tenant.findOne({ slug: req.params.tenantSlug });
    if (!tenant) {
      return res.status(404).json({ message: "Unknown test endpoint" });
    }

    await TestEndpointEvent.create({
      tenant: tenant._id,
      payload: req.body,
      headers: req.headers,
    });

    res.status(200).json({ received: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const listTestEvents = async (req: AuthRequest, res: Response) => {
  try {
    const events = await TestEndpointEvent.find({ tenant: req.tenantId })
      .sort({ receivedAt: -1 })
      .limit(50);
    res.status(200).json({ events });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
