import { Response } from "express";
import mongoose from "mongoose";
import Asset from "../models/Asset";
import AssetEvent from "../models/AssetEvent";
import UsageLog from "../models/UsageLog";
import { AuthRequest } from "../types";
import { dispatchWebhookEvent } from "../utils/webhookDispatcher";

const DAY_MS = 24 * 60 * 60 * 1000;

// Fills in zero-count days so charts don't have gaps for quiet days.
const fillDailySeries = (
  counts: { _id: string; count: number }[],
  days: number
): { date: string; count: number }[] => {
  const byDate = new Map(counts.map((c) => [c._id, c.count]));
  const series: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10);
    series.push({ date, count: byDate.get(date) || 0 });
  }
  return series;
};

export const createAsset = async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, principalAmount, currentValue, status, metadata } = req.body;

    if (!name || principalAmount === undefined || currentValue === undefined) {
      return res
        .status(400)
        .json({ message: "name, principalAmount, and currentValue are required" });
    }

    const asset = await Asset.create({
      tenant: req.tenantId,
      name,
      type,
      principalAmount,
      currentValue,
      status,
      metadata,
    });

    await AssetEvent.create({
      tenant: req.tenantId,
      asset: asset._id,
      eventType: "created",
      newValue: asset.status,
    });

    dispatchWebhookEvent(req.tenantId as string, "created", {
      assetId: asset._id,
      name: asset.name,
      status: asset.status,
    });

    res.status(201).json({ asset });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAssets = async (req: AuthRequest, res: Response) => {
  try {
    const { status, type } = req.query;
    const filter: Record<string, unknown> = { tenant: req.tenantId };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const assets = await Asset.find(filter).sort({ createdAt: -1 });

    // Portfolio-level KPI summary — the kind of rollup a monitoring dashboard needs
    const totalPrincipal = assets.reduce((sum, a) => sum + a.principalAmount, 0);
    const totalCurrentValue = assets.reduce((sum, a) => sum + a.currentValue, 0);
    const statusBreakdown = assets.reduce((acc: Record<string, number>, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      assets,
      summary: {
        count: assets.length,
        totalPrincipal,
        totalCurrentValue,
        statusBreakdown,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAssetById = async (req: AuthRequest, res: Response) => {
  try {
    const asset = await Asset.findOne({ _id: req.params.assetId, tenant: req.tenantId });
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }
    const events = await AssetEvent.find({ asset: asset._id }).sort({ createdAt: -1 });
    res.status(200).json({ asset, events });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAsset = async (req: AuthRequest, res: Response) => {
  try {
    const asset = await Asset.findOne({ _id: req.params.assetId, tenant: req.tenantId });
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    const { status, currentValue } = req.body;
    const events: Promise<any>[] = [];

    if (status && status !== asset.status) {
      events.push(
        AssetEvent.create({
          tenant: req.tenantId,
          asset: asset._id,
          eventType: "status_change",
          previousValue: asset.status,
          newValue: status,
        })
      );
      dispatchWebhookEvent(req.tenantId as string, "status_change", {
        assetId: asset._id,
        previousStatus: asset.status,
        newStatus: status,
      });
      asset.status = status;
    }

    if (currentValue !== undefined && currentValue !== asset.currentValue) {
      events.push(
        AssetEvent.create({
          tenant: req.tenantId,
          asset: asset._id,
          eventType: "value_update",
          previousValue: String(asset.currentValue),
          newValue: String(currentValue),
        })
      );
      dispatchWebhookEvent(req.tenantId as string, "value_update", {
        assetId: asset._id,
        previousValue: asset.currentValue,
        newValue: currentValue,
      });
      asset.currentValue = currentValue;
    }

    await Promise.all(events);
    await asset.save();

    res.status(200).json({ asset });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAssetAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = new mongoose.Types.ObjectId(req.tenantId);
    const days = 30;
    const since = new Date(Date.now() - days * DAY_MS);

    const [valueByType, activityCounts, usageCounts] = await Promise.all([
      Asset.aggregate([
        { $match: { tenant: tenantId } },
        {
          $group: {
            _id: "$type",
            totalValue: { $sum: "$currentValue" },
            count: { $sum: 1 },
          },
        },
      ]),
      AssetEvent.aggregate([
        { $match: { tenant: tenantId, createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
      ]),
      UsageLog.aggregate([
        { $match: { tenant: tenantId, createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    res.status(200).json({
      valueByType: valueByType.map((v) => ({
        type: v._id,
        totalValue: v.totalValue,
        count: v.count,
      })),
      assetActivity: fillDailySeries(activityCounts, days),
      apiUsage: fillDailySeries(usageCounts, days),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteAsset = async (req: AuthRequest, res: Response) => {
  try {
    const asset = await Asset.findOneAndDelete({
      _id: req.params.assetId,
      tenant: req.tenantId,
    });
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }
    await AssetEvent.deleteMany({ asset: asset._id });
    res.status(200).json({ message: "Asset deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
