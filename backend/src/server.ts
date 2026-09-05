import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectDB } from "./config/db";
import { startWebhookRetryJob } from "./jobs/webhookRetryJob";
import { startQuotaResetJob } from "./jobs/quotaResetJob";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  startWebhookRetryJob();
  startQuotaResetJob();
  app.listen(PORT, () => {
    console.log(`PortfolioPulse API running on port ${PORT}`);
  });
};

startServer();
