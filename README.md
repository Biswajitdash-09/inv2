# 🚀 Invoice Tracker 2: Automated Tracking & Processing

A production-grade, enterprise-scale invoice management system built with **Next.js 15**. This platform automates the end-to-end invoice lifecycle—from ingestion and AI-driven digitization to 3-way matching and multi-role approval workflows.

---

## 🌟 Key Features

### 🔍 Smart Ingestion & AI Digitization
- **Automated Capture**: Multi-channel ingestion support (Email, SharePoint, Portal) for PDF, Images, and Excel.
- **AI-Powered OCR**: High-accuracy data extraction (Invoice #, Date, Amounts, Line Items) using Tesseract.js.
- **Human-in-the-Loop (HIL)**: Dedicated interface for Finance users to review and correct low-confidence extractions.
- **Document Persistence**: All uploaded documents stored in MongoDB using Base64 encoding for complete auditability.

### ⚖️ 3-Way Matching Engine
- **Intelligent Reconciliation**: Automated matching of **Invoice + Purchase Order + Ringi Annexures**.
- **Variance Control**: Configurable tolerance levels (±5%) with automated discrepancy flagging.
- **Line Item Detail**: Granular validation of quantities, unit prices, and descriptions.
- **Discrepancy Status**: Invoice status set to `MATCH_DISCREPANCY` when validation fails.

### 👥 Role-Based Governance
- **Tailored Portals**: Custom dashboards and workflows for **Admin, Project Manager, Finance User, and Vendors**.
- **Audit Trail**: Full enterprise logging for compliance (SOX/IFRS ready) and 7-year data retention.
- **Secure RBAC**: Sophisticated access control ensuring data privacy and operational security.
- **PM Delegation**: Project Managers can delegate responsibilities to other PMs with expiration dates.

### 📊 Analytics & Monitoring
- **Real-time Metrics**: Cycle time tracking, OCR accuracy rates, approval volumes, and processing speeds.
- **System Health**: Admin-only health monitoring with database status, latency metrics, memory usage, and uptime tracking.
- **Savings Estimation**: Automated calculation of cost savings from automation.
- **Status Distribution**: Visual breakdown of invoice statuses across the workflow.

### 🔄 Invoice Workflow
- **Status Hierarchy**: `manually_submitted` → `PENDING` → `VERIFIED` → `APPROVED` → `PAID`
- **Exception Pathing**: `REJECTED`, `MATCH_DISCREPANCY`, `VALIDATION_REQUIRED` statuses for edge cases
- **Dual Approval System**: Separate PM and Finance approval workflows with independent tracking
- **Auto-Vendor Creation**: Vendors automatically created if they don't exist during invoice submission

---

## 🛠 Tech Stack

| Component | Technology |
|-----------|------------|
| **Core Framework** | [Next.js 15.1.7](https://nextjs.org/) (App Router) |
| **UI Library** | [React 19.0.0](https://react.dev/) |
| **Database** | [MongoDB 8.10.1](https://www.mongodb.com/) (Mongoose ODM) |
| **OCR Engine** | [Tesseract.js 7.0.0](https://tesseract.projectnaptha.com/) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) & [DaisyUI 5](https://daisyui.com/) |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Authentication** | [jose](https://jose.dev/) (JWT-based) |
| **Deployment** | Optimized for [Vercel](https://vercel.com/) |

---

## 👤 User Roles

### ADMIN
- **Full System Access**: Complete visibility and control over all features
- **User Management**: Create, update, and deactivate user accounts
- **Audit Logs**: Access to comprehensive audit trail for compliance
- **System Configuration**: Manage global settings and parameters
- **View All Data**: Access to all invoices, vendors, projects, and purchase orders

### PROJECT MANAGER (PM)
- **Project Oversight**: Manage invoices for assigned projects
- **PM Approvals**: Review and approve/reject invoices for their projects
- **Delegation**: Delegate responsibilities to other PMs with expiration dates
- **Vendor Management**: View vendors associated with their projects
- **Reporting**: Access to analytics on project spending and performance

### FINANCE USER
- **Operational Processing**: Handle invoice digitization, matching, and verification
- **HIL Review**: Review and correct OCR-extracted data with confidence scoring
- **Finance Approvals**: Final approval for invoice payments
- **Manual Entry**: Submit invoices manually through dedicated interface
- **Discrepancy Resolution**: Handle MATCH_DISCREPANCY and VALIDATION_REQUIRED invoices

### VENDOR
- **Invoice Submission**: Submit invoices via portal with document upload
- **Own Data Only**: View and manage only their own invoices
- **Status Tracking**: Monitor invoice processing status in real-time
- **Manual Entry**: Submit invoices through manual entry form
- **Account Management**: Update vendor profile and bank details

---

## 📁 Application Structure

```
AutoInvoice/
├── app/
│   ├── api/
│   │   ├── analytics/route.js      # Analytics endpoint (cycle time, OCR accuracy, status distribution)
│   │   ├── health/route.js         # System health monitoring (admin only)
│   │   └── invoices/route.js       # Invoice CRUD operations
│   ├── finance/
│   │   ├── dashboard/page.jsx      # Finance dashboard with approvals and metrics
│   │   └── manual-entry/page.jsx   # Manual invoice submission form
│   └── layout.jsx                  # Root layout component
├── components/
│   └── Layout/
│       └── Sidebar.jsx             # Role-based navigation menu
├── constants/
│   └── roles.js                    # Role definitions and menu permissions
├── lib/
│   ├── db.js                       # MongoDB operations with RBAC filtering
│   └── rbac.js                     # Role-Based Access Control utilities
└── models/
    ├── User.js                     # User schema with RBAC and delegation fields
    ├── Invoice.js                  # Invoice with dual approval and HIL schemas
    ├── Vendor.js                   # Vendor with performance metrics
    ├── Project.js                  # Project with PM assignments
    ├── PurchaseOrder.js            # PO with line items
    ├── Annexure.js                 # Ringi annexure schema
    └── AuditTrail.js               # Audit logging schema
```

---

## 🔌 API Endpoints

### `GET /api/health` (Admin Only)
Returns system health metrics:
- Database status and latency
- API response latency
- Storage usage and memory consumption
- System uptime and platform info
- CPU count

### `GET /api/health` (Admin Only)
Returns analytics data:
- Average cycle time (hours)
- OCR accuracy percentage
- Total and paid invoice counts
- Estimated savings
- Volume over time series
- Status distribution
- Category volume breakdown

### `POST /api/invoices`
Submit a new invoice manually:
- Required fields: `vendorName`, `invoiceNumber`, `amount`, `date`
- Optional fields: `poNumber`, `project`, `description`, `document`
- Auto-creates vendor if doesn't exist
- Stores document as Base64 data URI
- Default status: `manually_submitted`
- Creates audit trail entry
- Validated for duplicate invoice numbers

### `GET /api/invoices?status={status}`
Fetch invoices with optional filtering:
- Returns all invoices (with RBAC filtering based on role)
- Filter by status, vendor, project, date range
- Caching headers for performance
- For Admin/Finance: enriches with `vendorCode` for display
- For PM: filtered to assigned projects or delegated projects
- For Vendor: filtered to only their own invoices (`submittedByUserId`)

---

## 📊 Data Models

### User
```javascript
{
  id: String (unique),
  name: String,
  email: String (unique),
  passwordHash: String,
  role: String (ADMIN | PROJECT_MANAGER | FINANCE_USER | VENDOR),
  assignedProjects: [String],  // For PMs
  vendorId: String,            // For Vendors
  isActive: Boolean,
  permissions: [String],
  lastLogin: Date,
  delegatedTo: String,         // PM delegation target
  delegationExpiresAt: Date    // PM delegation expiration
}
```

### Invoice
```javascript
{
  id: String (unique),
  vendorName: String,
  submittedByUserId: String,   // User ID of submitter (vendor)
  vendorId: String,            // Vendor record ID
  invoiceNumber: String,
  date: String,
  amount: Number,
  status: String,              // manually_submitted, PENDING, VERIFIED, APPROVED, 
                               // PAID, REJECTED, MATCH_DISCREPANCY, VALIDATION_REQUIRED
  currency: String (default: 'INR'),
  project: String,
  poNumber: String,
  assignedPM: String,
  
  financeApproval: {
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'INFO_REQUESTED',
    approvedBy: String,
    approvedAt: Date,
    notes: String
  },
  
  pmApproval: {
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'INFO_REQUESTED',
    approvedBy: String,
    approvedAt: Date,
    notes: String
  },
  
  hilReview: {
    status: 'PENDING' | 'REVIEWED' | 'FLAGGED',
    reviewedBy: String,
    reviewedAt: Date,
    confidence: Number,
    corrections: Mixed
  },
  
  documents: [{ documentId: String, type: String }],
  matching: Mixed,              // 3-way matching results
  fileUrl: String               // Base64 document data
}
```

### Vendor
```javascript
{
  id: String (unique),
  vendorCode: String (unique),  // e.g., ve-001, ve-002
  name: String,
  email: String,
  phone: String,
  address: String,
  tax_id: String,
  status: 'ACTIVE' | 'INACTIVE',
  linkedUserId: String,         // Link to vendor user account
  
  bankDetails: {
    accountName: String,
    accountNumber: String,
    bankName: String,
    ifscCode: String
  },
  
  performanceMetrics: {
    totalInvoices: Number,
    onTimePayments: Number,
    rejectionRate: Number
  }
}
```

### Project
```javascript
{
  id: String (unique),
  name: String,
  ringiNumber: String,
  description: String,
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED',
  assignedPMs: [String],        // Array of PM user IDs
  vendorIds: [String],          // Associated vendor IDs
  billingMonth: String
}
```

### PurchaseOrder
```javascript
{
  id: String (unique),
  poNumber: String (unique),
  vendorId: String,
  date: String,
  totalAmount: Number,
  currency: String (default: 'INR'),
  status: String (default: 'OPEN'),
  items: [{
    description: String,
    quantity: Number,
    unitPrice: Number,
    amount: Number,
    glAccount: String
  }]
}
```

---

## 🚀 Quick Start

### 1. Installation
```bash
git clone https://github.com/Biswajitdash-09/Invoice-Tracker.git
cd Invoice-Tracker/AutoInvoice
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

### 4. Initialize Database (Optional)
```bash
npm run seed
```
Populates the database with default users and sample data.

---

## 🔑 Access Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@invoiceflow.com` | `Password123!` |
| **Finance User** | `financeuser@invoiceflow.com` | `Password123!` |
| **Project Manager** | `pm@invoiceflow.com` | `Password123!` |
| **Vendor** | `vendor@acme.com` | `Password123!` |

**Note**: Run `npm run seed` to create these users in the database.

---

## 🎯 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server on `localhost:3000` |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run test` | Run test suite |
| `npm run seed` | Seed database with default users |
| `npm run bump` | Bump version number |

---

## 📊 RBAC Filtering Logic

### Invoice Visibility Rules

**Admin & Finance User:**
- Can view all invoices in the system
- Enriches invoice data with `vendorCode` for display purposes

**Project Manager:**
- Views invoices for projects in their `assignedProjects` array
- Views invoices where `assignedPM` matches their user ID
- Views invoices for projects they've been delegated to (via `delegatedTo`)
- Access delegation with expiration dates via `delegationExpiresAt`

**Vendor:**
- Views only invoices where `submittedByUserId` matches their user ID
- Security-focused: no name/email matching, strict userId filter only

---

## 🔄 Invoice Status Workflow

```
manually_submitted (Initial)
    │
    ▼
PENDING (Awaiting verification)
    │
    ├─→ VERIFIED (Passed 3-way matching)
    │       │
    │       ├─→ APPROVED (Both PM & Finance approved)
    │       │       │
    │       │       └─→ PAID (Payment processing complete)
    │       │
    │       └─→ [Parallel: PM/Finance Approval]
    │
    ├─→ MATCH_DISCREPANCY (Failed 3-way matching)
    │       │
    │       └─→ PENDING (After corrections)
    │
    └─→ VALIDATION_REQUIRED (Data issues)
            │
            └─→ PENDING (After corrections)

REJECTED (Rejection at any stage)
```

---

## 📊 Menu Items by Role

### Admin
- Dashboard
- Digitization
- Matching
- Approvals
- Documents
- Messages
- Vendors
- Analytics
- Finance Dashboard
- Manual Entry
- Configuration
- User Management
- Audit Logs

### Project Manager
- Dashboard
- Approvals
- Documents
- Messages
- Vendors
- Analytics

### Finance User
- Dashboard
- Digitization
- Matching
- Approvals
- Documents
- Messages
- Vendors
- Analytics
- Finance Dashboard
- Manual Entry

### Vendor
- Dashboard
- Documents
- Messages
- Users (limited view)

---

## 📝 Documentation

For detailed system specifications and architecture:
- [Problem Statement](problemStatement.md)
- [RBAC Definitions](updated%20rolebased.md)

---

## 📦 Version

Current Version: `1.0.48`

---

*Internal Enterprise Use Only.*


