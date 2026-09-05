import { Response } from "express";
import Asset from "../models/Asset";
import AssetEvent from "../models/AssetEvent";
import { AuthRequest } from "../types";
import { dispatchWebhookEvent } from "../utils/webhookDispatcher";

/**
 * This controller powers the PUBLIC / EXTERNAL API — the surface that
 * PortfolioPulse actually sells to client systems. Requests here are
 * authenticated via API key (see apiKeyAuth middleware), not JWT, and
 * are scoped strictly to the tenant that owns the key. This is the
 * "product" a client integrates with from their own backend.
 */

export const externalListAssets = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.apiKeyTenantId;
    const { status, type, limit = "50", offset = "0" } = req.query;

    const filter: Record<string, unknown> = { tenant: tenantId };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const assets = await Asset.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit), 100))
      .skip(Number(offset));

    const total = await Asset.countDocuments(filter);

    res.status(200).json({
      data: assets,
      pagination: { total, limit: Number(limit), offset: Number(offset) },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const externalGetAsset = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.apiKeyTenantId;
    const asset = await Asset.findOne({ _id: req.params.assetId, tenant: tenantId });
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }
    res.status(200).json({ data: asset });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const externalCreateAsset = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.apiKeyTenantId;
    const { name, type, principalAmount, currentValue, status, metadata } = req.body;

    if (!name || principalAmount === undefined || currentValue === undefined) {
      return res
        .status(400)
        .json({ message: "name, principalAmount, and currentValue are required" });
    }

    const asset = await Asset.create({
      tenant: tenantId,
      name,
      type,
      principalAmount,
      currentValue,
      status,
      metadata,
    });

    await AssetEvent.create({
      tenant: tenantId,
      asset: asset._id,
      eventType: "created",
      newValue: asset.status,
    });

    dispatchWebhookEvent(tenantId as string, "created", {
      assetId: asset._id,
      name: asset.name,
      status: asset.status,
    });

    res.status(201).json({ data: asset });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

const MAX_BULK_ASSETS = 100;

interface BulkAssetInput {
  name?: string;
  type?: string;
  principalAmount?: number;
  currentValue?: number;
  status?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Bulk import: accepts up to MAX_BULK_ASSETS assets in one call so a client
 * doing an initial data migration doesn't have to make one HTTP round trip
 * (and burn one quota unit) per asset. Each asset is validated and created
 * independently — one bad row doesn't fail the whole batch — and the
 * response reports per-index success/failure like a real bulk API.
 */
export const externalBulkCreateAssets = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.apiKeyTenantId;
    const { assets } = req.body as { assets?: BulkAssetInput[] };

    if (!Array.isArray(assets) || assets.length === 0) {
      return res.status(400).json({ message: "Provide a non-empty 'assets' array" });
    }
    if (assets.length > MAX_BULK_ASSETS) {
      return res
        .status(400)
        .json({ message: `Cannot import more than ${MAX_BULK_ASSETS} assets per request` });
    }

    const results = await Promise.all(
      assets.map(async (input, index) => {
        const { name, type, principalAmount, currentValue, status, metadata } = input;

        if (!name || principalAmount === undefined || currentValue === undefined) {
          return {
            index,
            success: false,
            error: "name, principalAmount, and currentValue are required",
          };
        }

        try {
          const asset = await Asset.create({
            tenant: tenantId,
            name,
            type,
            principalAmount,
            currentValue,
            status,
            metadata,
          });

          await AssetEvent.create({
            tenant: tenantId,
            asset: asset._id,
            eventType: "created",
            newValue: asset.status,
          });

          dispatchWebhookEvent(tenantId as string, "created", {
            assetId: asset._id,
            name: asset.name,
            status: asset.status,
          });

          return { index, success: true, data: asset };
        } catch (err: any) {
          return { index, success: false, error: err.message };
        }
      })
    );

    const created = results.filter((r) => r.success).length;
    res.status(207).json({
      summary: { total: assets.length, created, failed: assets.length - created },
      results,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const externalUpdateAsset = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.apiKeyTenantId;
    const asset = await Asset.findOne({ _id: req.params.assetId, tenant: tenantId });
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    const { status, currentValue } = req.body;

    if (status && status !== asset.status) {
      await AssetEvent.create({
        tenant: tenantId,
        asset: asset._id,
        eventType: "status_change",
        previousValue: asset.status,
        newValue: status,
      });
      dispatchWebhookEvent(tenantId as string, "status_change", {
        assetId: asset._id,
        previousStatus: asset.status,
        newStatus: status,
      });
      asset.status = status;
    }

    if (currentValue !== undefined && currentValue !== asset.currentValue) {
      await AssetEvent.create({
        tenant: tenantId,
        asset: asset._id,
        eventType: "value_update",
        previousValue: String(asset.currentValue),
        newValue: String(currentValue),
      });
      dispatchWebhookEvent(tenantId as string, "value_update", {
        assetId: asset._id,
        previousValue: asset.currentValue,
        newValue: currentValue,
      });
      asset.currentValue = currentValue;
    }

    await asset.save();
    res.status(200).json({ data: asset });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
