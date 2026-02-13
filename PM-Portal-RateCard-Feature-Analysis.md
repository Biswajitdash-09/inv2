
# PM Portal Rate Card Feature Analysis

**Analysis Date:** 2026-02-13  
**Focus:** Rate card functionality at Project Manager portal  
**Scope:** All rate card interactions, capabilities, and workflows available to PMs

---

## Executive Summary

The rate card feature in the PM portal is **limited and incomplete**. While PMs interact with rate cards indirectly through document upload validation and timesheet cross-checking, they lack a dedicated interface to view, manage, or interact with rate cards directly. The rate card system is primarily designed for and managed by Admins, with PMs having minimal visibility and control.

**Key Finding:** The PM portal has **NO dedicated Rate Cards page or section** - rate card functionality is fragmented and hidden within the document uploading process.

---

## Current Implementation

### 1. PM Portal Navigation (Sidebar)

**File:** [`components/Layout/Sidebar.jsx`](components/Layout/Sidebar.jsx:16-31)

PMs have access to these navigation items:
- Dashboard
- Messages
- Digitization
- Matching
- Approvals
- PM Approval Queue
- Documents
- Analytics

**Missing:** No "Rate Cards" navigation item exists for PMs.

### 2. PM Dashboard

**File:** [`components/Dashboard/Roles/ProjectManagerDashboard.jsx`](components/Dashboard/Roles/ProjectManagerDashboard.jsx:1-394)

The PM dashboard displays:
- Statistics: Total Invoices, Pending Approvals, Approved, Discrepancies
- Lists: Pending Approvals, Discrepancies
- Quick Actions: Approve & Review, Document Management, Vendor Messages
- Recent Invoices table
- Approval History table

**Missing:**
- NO rate card statistics, summaries, or information displayed
- NO indicators for which invoices were validated against rate cards
- NO visibility into rate card availability or status

### 3. PM Documents Page

**File:** [`app/pm/documents/page.jsx`](app/pm/documents/page.jsx:1-709)

**What PMs CAN do:**
- Upload documents of types: RINGI, ANNEX, TIMESHEET, RATE_CARD
- View uploaded documents in a list format
- Filter documents by type and projectId
- View document status: VALIDATED, PENDING, REJECTED
- View document metadata including validation results
- Delete their own documents
- Open document viewer modal and download files

**Rate Card Upload Process:**
1. PM selects "RATE_CARD" document type
2. Uploads Excel (.xls, .xlsx) file containing rate definitions
3. System validates the file using [`validateRateCard()`](lib/services/validation.js:56-98):
   - Checks for unreasonable rate amounts
   - Detects duplicate rate descriptions
4. Status becomes VALIDATED (if valid) or PENDING (if invalid or PDF)
5. Validation notes stored: "Validated: X rate entries" or "Validation failed: [errors]"

**Critical Gap:** PMs cannot see the actual rate definitions in a readable format - only the file upload record.

### 4. PM Documents API

**File:** [`app/api/pm/documents/route.js`](app/api/pm/documents/route.js:1-334)

**Endpoints Available to PMs:**
- `GET /api/pm/documents` - List documents with filters
- `POST /api/pm/documents` - Upload documents (including rate cards)
- `DELETE /api/pm/documents?id=xxx` - Delete own documents

**Missing:**
- No GET endpoint to fetch rate card data
- No PUT/PATCH endpoint to edit rate cards
- PMs cannot directly access or manipulate rate cards (Admin-only feature)

### 5. Rate Card Validation and Cross-Checking

**File:** [`lib/services/validation.js`](lib/services/validation.js:1-204)

**Rate Card Validation (`validateRateCard`):**
- Validates Excel file structure and content
- Checks for unreasonable rates (e.g., negative values, extremely high amounts)
- Detects duplicate descriptions within same rate card
- Returns summary data with total rate count

**Timesheet Cross-Checking (`crossCheckWithRateCard`):**
- When PM uploads TIMESHEET, system automatically cross-references rate cards
- Lookup logic:
