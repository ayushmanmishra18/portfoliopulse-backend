Absolutely — if you mean **the actual `README.md` file content**, not the explanation around it, this is the version I’d use for GitHub. It is cleaner, more professional, and more visually polished while still staying technically accurate to your project documentation. 

# PortfolioPulse

<p align="center">
  <strong>Multi-Tenant Portfolio Management & Webhook Platform</strong>
</p>

<p align="center">
  A full-stack SaaS platform for managing portfolio assets, exposing secure APIs,
  delivering signed webhooks, and tracking usage across isolated organizations.
</p>

<p align="center">
  <a href="https://ayushmanmishra18-portfoliopulse-fro-wine.vercel.app/">
    <img src="https://img.shields.io/badge/Live%20Demo-Visit%20App-111827?style=for-the-badge" alt="Live Demo"/>
  </a>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19"/>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB"/>
</p>

---

## 📌 Overview

**PortfolioPulse** is a production-oriented, multi-tenant SaaS platform designed for organizations managing loan, equity, real-estate, and other portfolio assets.

It combines a web dashboard with an API-first architecture, allowing organizations to:

* Manage portfolio assets and their current value
* Track asset status and historical events
* Expose portfolio data to external systems through a REST API
* Receive signed webhook notifications when data changes
* Automatically retry failed webhook deliveries
* Monitor API usage and monthly quotas
* Manage API keys and webhook integrations
* Analyze portfolio and API activity

The platform follows an API-first SaaS pattern:

```text
Manage Data
     ↓
Expose Secure API
     ↓
Detect Changes
     ↓
Dispatch Webhook
     ↓
Retry Failed Delivery
     ↓
Track Usage
     ↓
Visualize Analytics
```

---

## ✨ Features

### 🏢 Multi-Tenant Architecture

Every organization operates inside an isolated workspace.

* Tenant-scoped MongoDB documents
* Server-side tenant isolation
* Tenant-specific API keys
* Tenant-specific webhooks
* Tenant-specific usage tracking
* Role-based dashboard access
* No cross-tenant data access

Every tenant-owned document carries a tenant reference, and database queries are scoped using the authenticated tenant context.

---

### 📊 Portfolio & Asset Management

Manage different types of portfolio assets:

* Loans
* Equity investments
* Real estate
* Other assets

Each asset tracks:

```text
Asset
├── Name
├── Type
├── Principal
├── Current Value
├── Status
└── Event History
```

Supported statuses:

```text
performing
watchlist
default
closed
```

Asset changes generate corresponding audit events.

---

### 🔐 Authentication & Authorization

PortfolioPulse provides separate authentication mechanisms for dashboard users and external integrations.

#### Dashboard

JWT-based authentication:

```http
Authorization: Bearer <token>
```

#### External API

API-key authentication:

```http
X-API-Key: <API_KEY>
```

Dashboard roles:

| Role   | Access                    |
| ------ | ------------------------- |
| Owner  | Full workspace access     |
| Admin  | Administrative operations |
| Viewer | Read-only access          |

Passwords are hashed with `bcryptjs`, while authorization middleware enforces tenant and role boundaries.

---

## 🔑 API-First Design

PortfolioPulse provides two separate API surfaces.

### Dashboard API

```text
/api/*
```

Used by the React dashboard with JWT authentication.

### External API

```text
/v1/*
```

Used by external systems with tenant-specific API keys.

```text
                    PortfolioPulse
                          │
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼
        Dashboard API            External API
           /api/*                   /v1/*
              │                       │
           JWT Auth              API Key Auth
              │                       │
              ▼                       ▼
       React Dashboard        External Systems
```

This separation allows dashboard users and external integrations to have independent authentication and rate-limiting strategies.

---

## 🔔 Webhook Infrastructure

External systems can subscribe to portfolio events.

Supported events include:

```text
created
status_change
value_update
```

When an asset changes:

```text
Asset Update
     ↓
AssetEvent Created
     ↓
Webhook Event
     ↓
HMAC-SHA256 Signing
     ↓
HTTP POST
     ↓
External System
```

Every webhook request contains a cryptographic signature:

```http
X-PortfolioPulse-Signature
```

Receivers can use the signature to verify the authenticity of incoming webhook requests.

---

## 🔁 Reliable Webhook Delivery

Webhook failures are persisted and retried instead of being silently discarded.

### Retry Strategy

```text
Initial Request
      │
      ├── Success ───────────────► Delivered
      │
      └── Failure
            │
            ▼
       +1 minute
            │
            ▼
       +5 minutes
            │
            ▼
       +30 minutes
            │
            ▼
        Exhausted
```

Each delivery maintains a state:

```text
pending
success
failed
exhausted
```

Failed deliveries remain visible in the dashboard and can be manually resent.

---

## 📈 Analytics & Usage Metering

PortfolioPulse tracks real application data to provide analytics such as:

* Portfolio value by asset type
* Asset activity over the last 30 days
* External API usage
* Monthly API quota consumption
* Asset event history

External API requests are recorded through `UsageLog` and contribute toward the tenant's monthly API quota.

---

## 🧪 Built-In Webhook Testing

PortfolioPulse includes a built-in webhook test endpoint so integrations can be tested without relying on third-party webhook tools.

```http
POST /api/test-endpoint/:tenantSlug
```

Incoming payloads are persisted and displayed in the dashboard, making it easy to inspect webhook requests during integration development.

---

# 🏗️ Architecture

```text
                         ┌──────────────────────┐
                         │      React 19        │
                         │    TypeScript/Vite   │
                         │                      │
                         │  Dashboard + UI      │
                         └──────────┬───────────┘
                                    │
                                    │ REST / HTTP
                                    ▼
                         ┌──────────────────────┐
                         │     Express API      │
                         │      TypeScript      │
                         │                      │
                         │ Auth / RBAC / API    │
                         │ Validation / Routes  │
                         └──────────┬───────────┘
                                    │
                ┌───────────────────┼───────────────────┐
                │                   │                   │
                ▼                   ▼                   ▼
        ┌──────────────┐    ┌───────────────┐   ┌──────────────┐
        │   MongoDB    │    │   Webhooks    │   │   Cron Jobs  │
        │  + Mongoose  │    │   Dispatcher  │   │ Retry / Quota│
        └──────────────┘    └───────┬───────┘   └──────────────┘
                                    │
                                    ▼
                           External Integrations
```

---

# 🛠️ Tech Stack

## Frontend

* **React 19**
* **TypeScript**
* **Vite**
* **React Router**
* **Axios**
* **Recharts**
* **Lucide React**
* **CSS**

## Backend

* **Node.js**
* **Express 4**
* **TypeScript**
* **MongoDB**
* **Mongoose**
* **JWT**
* **bcryptjs**
* **Axios**

## Infrastructure & Reliability

* **node-cron**
* **express-rate-limit**
* **HMAC-SHA256**
* Webhook delivery tracking
* API usage metering

The documented implementation uses React 19 + TypeScript on the frontend and Express + TypeScript + MongoDB/Mongoose on the backend.

---

# 📂 Project Structure

```text
portfolio-pulse/
│
├── backend/
│   └── src/
│       ├── app.ts
│       ├── server.ts
│       │
│       ├── config/
│       │   └── db.ts
│       │
│       ├── models/
│       │   ├── Tenant.ts
│       │   ├── User.ts
│       │   ├── Asset.ts
│       │   ├── AssetEvent.ts
│       │   ├── ApiKey.ts
│       │   ├── Webhook.ts
│       │   ├── WebhookDelivery.ts
│       │   ├── UsageLog.ts
│       │   └── TestEndpointEvent.ts
│       │
│       ├── controllers/
│       ├── routes/
│       │
│       ├── middleware/
│       │   ├── auth.ts
│       │   ├── apiKeyAuth.ts
│       │   ├── rbac.ts
│       │   ├── rateLimiter.ts
│       │   ├── usageLogger.ts
│       │   └── errorHandler.ts
│       │
│       ├── jobs/
│       │   ├── webhookRetryJob.ts
│       │   └── quotaResetJob.ts
│       │
│       ├── utils/
│       │   └── webhookDispatcher.ts
│       │
│       └── types/
│           └── index.ts
│
└── frontend/
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── App.css
        │
        ├── api/
        │   └── client.ts
        │
        ├── context/
        │   └── AuthContext.tsx
        │
        ├── components/
        │   ├── DashboardLayout.tsx
        │   └── ProtectedRoute.tsx
        │
        ├── pages/
        │   ├── LandingPage.tsx
        │   ├── Login.tsx
        │   ├── Register.tsx
        │   ├── Overview.tsx
        │   ├── Analytics.tsx
        │   ├── Assets.tsx
        │   ├── ApiKeys.tsx
        │   ├── Webhooks.tsx
        │   ├── WebhookDeliveries.tsx
        │   ├── TestEndpoint.tsx
        │   └── ApiDocs.tsx
        │
        └── types/
            └── index.ts
```

---

# 🔄 End-to-End Flow

A typical PortfolioPulse integration works as follows:

```text
1. Organization registers
          ↓
2. Tenant workspace is created
          ↓
3. User creates portfolio asset
          ↓
4. AssetEvent is recorded
          ↓
5. Tenant generates API key
          ↓
6. Tenant registers webhook
          ↓
7. External system updates asset
          ↓
8. API key authenticates request
          ↓
9. Tenant-scoped asset is updated
          ↓
10. AssetEvent is recorded
          ↓
11. Webhook is dispatched
          ↓
12. Payload is HMAC-SHA256 signed
          ↓
13. External system receives event
          ↓
14. Delivery is recorded
          ↓
15. Failed deliveries are retried
          ↓
16. API usage is logged
          ↓
17. Analytics are updated
```

---

# 📡 API Reference

## Authentication

### Register

```http
POST /api/auth/register
```

### Login

```http
POST /api/auth/login
```

### Current User

```http
GET /api/auth/me
Authorization: Bearer <token>
```

---

## Dashboard Assets

```http
GET    /api/assets
GET    /api/assets/:assetId
POST   /api/assets
PATCH  /api/assets/:assetId
DELETE /api/assets/:assetId
```

### Analytics

```http
GET /api/assets/analytics
```

---

## API Keys

```http
GET    /api/keys
POST   /api/keys
DELETE /api/keys/:keyId
```

---

## Webhooks

```http
GET    /api/webhooks
POST   /api/webhooks
DELETE /api/webhooks/:webhookId

GET    /api/webhooks/:webhookId/deliveries

POST   /api/webhooks/deliveries/:deliveryId/resend
```

---

## External API

External systems authenticate with:

```http
X-API-Key: <API_KEY>
```

Available endpoints:

```http
GET    /v1/assets
POST   /v1/assets
POST   /v1/assets/bulk
PATCH  /v1/assets/:assetId
```

The bulk endpoint supports importing up to 100 assets in a single request with per-item validation and results.

---

# 🔐 Security Model

PortfolioPulse was designed around tenant isolation and secure external integrations.

### Passwords

```text
Plain Password
      ↓
bcryptjs
      ↓
Password Hash
      ↓
MongoDB
```

### API Keys

```text
Generated API Key
      ↓
Hash
      ↓
MongoDB

Raw key
   ↓
Shown only once
```

### Webhooks

```text
Payload
   +
Webhook Secret
   ↓
HMAC-SHA256
   ↓
Signature
   ↓
X-PortfolioPulse-Signature
```

### Tenant Isolation

Every dashboard and external API request resolves the tenant from authentication context.

```text
Request
  ↓
Authentication
  ↓
Resolve Tenant
  ↓
req.tenantId
  ↓
Tenant-scoped Query
  ↓
MongoDB
```

The backend does not trust tenant identifiers supplied directly by clients.

---

# 📊 Dashboard

The dashboard provides dedicated interfaces for:

| Page          | Purpose                               |
| ------------- | ------------------------------------- |
| Overview      | Portfolio KPIs and status breakdown   |
| Assets        | Asset CRUD and monitoring             |
| Analytics     | Portfolio and API usage charts        |
| API Keys      | Generate and revoke integration keys  |
| Webhooks      | Register and manage webhook endpoints |
| Deliveries    | Inspect webhook delivery attempts     |
| Test Endpoint | Inspect incoming webhook payloads     |
| API Docs      | Explore external API usage            |

The frontend also mirrors backend authorization rules by hiding or disabling actions unavailable to viewer-level users.

---

# 🚀 Local Development

## Requirements

* Node.js 18+
* MongoDB Atlas or local MongoDB
* npm

## Clone

```bash
git clone <repository-url>
cd portfolio-pulse
```

## Backend

```bash
cd backend

cp .env.example .env

npm install
npm run dev
```

Backend:

```text
http://localhost:5000
```

## Frontend

```bash
cd frontend

cp .env.example .env

npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

The application can then be opened in the browser and a new workspace registered.

---

# ⚙️ Environment Variables

### Backend

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### Frontend

```env
VITE_API_URL=http://localhost:5000/api
```

---

# 🏭 Production Build

### Backend

```bash
cd backend
npm run build
npm start
```

### Frontend

```bash
cd frontend
npm run build
```

The production frontend is built with Vite, while the backend TypeScript source is compiled into `dist/`.

---

# 🎯 Engineering Highlights

PortfolioPulse focuses on solving real SaaS engineering problems rather than being a simple CRUD application.

### Architecture

* Multi-tenant SaaS architecture
* Separate dashboard and external API surfaces
* Tenant-scoped data access
* REST API design

### Security

* JWT authentication
* API-key authentication
* bcrypt password hashing
* RBAC
* HMAC-SHA256 webhook signing
* Tenant isolation
* Rate limiting

### Reliability

* Persistent webhook delivery records
* Automatic retry scheduling
* Manual webhook resend
* Delivery state tracking
* API usage metering

### Developer Experience

* Built-in webhook testing
* In-app API documentation
* External API
* Bulk asset import
* Analytics dashboard

---

# 🌐 Live Demo

**PortfolioPulse:**
[https://ayushmanmishra18-portfoliopulse-fro-wine.vercel.app/](https://ayushmanmishra18-portfoliopulse-fro-wine.vercel.app/)

---

# 👨‍💻 Author

**Ayushman Mishra**

Full Stack Engineer | Backend-focused

* GitHub: [https://github.com/ayushmanmishra18](https://github.com/ayushmanmishra18)
* LinkedIn: [https://www.linkedin.com/in/ayushman-mishra-979595280/](https://www.linkedin.com/in/ayushman-mishra-979595280/)

---

## ⭐ Project Goal

PortfolioPulse was built to explore how a real SaaS integration platform handles the complete lifecycle of data:

```text
DATA
 ↓
API
 ↓
AUTHENTICATION
 ↓
EVENTS
 ↓
WEBHOOKS
 ↓
RETRY / RELIABILITY
 ↓
USAGE METERING
 ↓
ANALYTICS
```

The goal was to build an end-to-end system that combines **full-stack development, backend architecture, API design, security, multi-tenancy, integrations, and production-oriented reliability** into a single application.
