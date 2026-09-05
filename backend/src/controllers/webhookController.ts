import { Response } from "express";
import crypto from "crypto";
import Webhook from "../models/Webhook";
import WebhookDelivery from "../models/WebhookDelivery";
import { retryDelivery } from "../utils/webhookDispatcher";
import { AuthRequest } from "../types";

export const createWebhook = async (req: AuthRequest, res: Response) => {
  try {
    const { url, events } = req.body;
    if (!url) {
      return res.status(400).json({ message: "Webhook URL is required" });
    }

    const secret = crypto.randomBytes(20).toString("hex");

    const webhook = await Webhook.create({
      tenant: req.tenantId,
      url,
      events: events && events.length ? events : undefined,
      secret,
    });

    res.status(201).json({ webhook });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const listWebhooks = async (req: AuthRequest, res: Response) => {
  try {
    const webhooks = await Webhook.find({ tenant: req.tenantId });
    res.status(200).json({ webhooks });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteWebhook = async (req: AuthRequest, res: Response) => {
  try {
    const webhook = await Webhook.findOneAndDelete({
      _id: req.params.webhookId,
      tenant: req.tenantId,
    });
    if (!webhook) {
      return res.status(404).json({ message: "Webhook not found" });
    }
    res.status(200).json({ message: "Webhook deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const listWebhookDeliveries = async (req: AuthRequest, res: Response) => {
  try {
    const webhook = await Webhook.findOne({
      _id: req.params.webhookId,
      tenant: req.tenantId,
    });
    if (!webhook) {
      return res.status(404).json({ message: "Webhook not found" });
    }

    const deliveries = await WebhookDelivery.find({
      webhook: webhook._id,
      tenant: req.tenantId,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ deliveries });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const resendWebhookDelivery = async (req: AuthRequest, res: Response) => {
  try {
    const delivery = await WebhookDelivery.findOne({
      _id: req.params.deliveryId,
      tenant: req.tenantId,
    });
    if (!delivery) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    await retryDelivery(delivery);
    res.status(200).json({ delivery });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
