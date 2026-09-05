import express, { Application } from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import apiKeyRoutes from "./routes/apiKeyRoutes";
import assetRoutes from "./routes/assetRoutes";
import webhookRoutes from "./routes/webhookRoutes";
import externalApiRoutes from "./routes/externalApiRoutes";
import testEndpointRoutes from "./routes/testEndpointRoutes";
import { notFound, errorHandler } from "./middleware/errorHandler";
import { dashboardLimiter } from "./middleware/rateLimiter";

const app: Application = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "PortfolioPulse API is running", status: "ok" });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", uptime: process.uptime() });
});

// ---- Dashboard API (JWT auth, human users, rate-limited generously) ----
app.use("/api/auth", dashboardLimiter, authRoutes);
app.use("/api/keys", dashboardLimiter, apiKeyRoutes);
app.use("/api/assets", dashboardLimiter, assetRoutes);
app.use("/api/webhooks", dashboardLimiter, webhookRoutes);
app.use("/api", testEndpointRoutes);

// ---- External/Public API (API-key auth, client systems, the actual product) ----
app.use("/v1", externalApiRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
