# 🚀 Invoice Tracker 2: Automated Tracking & Processing

A production-grade, enterprise-scale invoice management system built with **Next.js 15**. This platform automates the end-to-end invoice lifecycle—from ingestion and AI-driven digitization to 3-way matching and multi-role approval workflows.

---

## 🌟 Key Features

### 🔍 Smart Ingestion & AI Digitization
- **Automated Capture**: Multi-channel ingestion support (Email, SharePoint, Portal) for PDF, Images, and Excel.
- **AI-Powered OCR**: High-accuracy data extraction (Invoice #, Date, Amounts, Line Items).
- **Human-in-the-Loop (HIL)**: Dedicated interface for Finance users to review and correct low-confidence extractions.

### ⚖️ 3-Way Matching Engine
- **Intelligent Reconciliation**: Automated matching of **Invoice + Purchase Order + Ringi Annexures**.
- **Variance Control**: Configurable tolerance levels (±5%) with automated discrepancy flagging.
- **Line Item Detail**: Granular validation of quantities, unit prices, and descriptions.

### 👥 Role-Based Governance
- **Tailored Portals**: Custom dashboards and workflows for **Admin, Finance, PM, and Vendors**.
- **Audit Trail**: Full enterprise logging for compliance (SOX/IFRS ready) and 7-year data retention.
- **Secure RBAC**: Sophisticated access control ensuring data privacy and operational security.

---

## 🛠 Tech Stack

- **Core**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Database**: [MongoDB](https://www.mongodb.com/) (Mongoose ODM)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) & [DaisyUI 5](https://daisyui.com/)
- **Interactions**: [Framer Motion](https://www.framer.com/motion/) & [Lucide React](https://lucide.dev/)
- **Deployment**: Optimized for [Vercel](https://vercel.com/)

---

## 🚀 Quick Start

### 1. Installation
```bash
git clone https://github.com/Biswajitdash-09/Invoice-Tracker.git
cd Invoice-Tracker
npm install
```

### 2. Environment Setup
Create a `.env.local` file with your MongoDB connection string:
```env
MONGODB_URI=your_mongodb_connection_string
```

### 3. Run Locally
```bash
npm run dev
```
Access the portal at `http://localhost:3000`.

---

## 🔑 Access Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@invoiceflow.com` | `Password123!` |
| **Finance** | `financeuser@invoiceflow.com` | `Password123!` |
| **Project Manager** | `pm@invoiceflow.com` | `Password123!` |
| **Vendor** | `vendor@acme.com` | `Password123!` |

**Initialization**: Run `npm run seed` to populate the database with default users.

---

## 📊 Documentation
For detailed system specifications and architecture, refer to:
- [Problem Statement](problemStatement.md)
- [RBAC Definitions](updated%20rolebased.md)

---
*Internal Enterprise Use Only.*

Biswajit Test