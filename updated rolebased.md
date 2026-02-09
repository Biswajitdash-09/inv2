1

2

3

4

Role-Based Access Control
Automated Invoice Tracking and Processing System
Document Version: 2.0
Date: February 07, 2026
Source: PRD - Automated Invoice Tracking and Processing System
Overview
This document outlines the feature access permissions for each user role in the
Automated Invoice Tracking and Processing System. The system implements role-
based access control (RBAC) to ensure appropriate security and operational efficiency.
1. Admin
Complete system control with full administrative privileges and audit capabilities
Feature Access:
• Full system configuration and settings management
• User account creation, modification, and deactivation
• Role and permission assignment
• System-wide reporting and analytics
• Integration configuration (SAP, Ringi Portal, SharePoint, Email)
• Audit log access and review
• Complete audit trail review
• Compliance report generation
• Historical data access (7-year retention)
• Access to all system logs and timestamps
• Backup and disaster recovery management
• Vendor rate card management and configuration
• Define standard rates with vendors
Restrictions:
• No invoice upload capability (handled by vendors)
2. Finance User
Financial authority with operational processing, approval capabilities, and oversight
Feature Access:
• Invoice data entry and processing
• Invoice status tracking and monitoring
• Data validation and correction
• Human-in-the-Loop (HIL) verification of all entered invoice details
• Review and verify OCR-extracted data
• Handle flagged discrepancies from 3-way matching
• Review low-confidence OCR extractions
• Process manual review queues
• Basic reporting for operational tracking
• Final invoice approval authority
• Payment release authorization
• Access to all financial reports and dashboards
• Invoice status tracking across all projects
• Vendor performance analytics
• End-to-end visibility of invoice lifecycle
3. Project Manager (PM)
Project-level invoice approval, document upload, and vendor communication
Feature Access:
• Invoice approval/rejection for assigned projects
• Request additional information from vendors
• View invoices routed to them for approval
• Communicate with vendors regarding invoice issues
• Track approval status for their projects
• Receive notifications for pending approvals
• Access to project-specific invoice reports
• Document upload capability with the following document types:
Serial No. Document Type Description/Format
1 Ringi PDF format
2 Annex PDF, Word, or Excel format
3 Timesheet Excel or PDF format - validated at
upload
4 Rate Card Excel or PDF format - added by Admin
• Add project metadata including:
- Project name
- Ringi number
- Billing month
• Timesheet validation at time of upload
Note: Rate cards are defined and managed by Admin with standard rates per vendor.
PM validates timesheets during upload.
4. Vendor
Limited external access for invoice and document submission with PM selection
Feature Access:
• Document submission through vendor portal (up to 3 documents):
Document Type Status
A. Invoice Mandatory
B. RFP Commercial Optional
C. Timesheet Optional
• Project Manager (PM) selection from dropdown menu
• Track submitted invoice status (limited view)
• Receive notifications (acknowledgment, rejection, payment confirmation)
• View their own invoice history only
Restrictions:
• No access to internal approval workflows
• No access to other vendors' data
• No access to system configuration
Summary Matrix
Role Create Read Update Approve Configure
Admin ✓ ✓ ✓ ✓ ✓
Finance User ✓ ✓ ✓ ✓ —
Project Manager ✓ ✓ — ✓ —
Vendor ✓ Limited — — —
UI/UX Changes
Portal Access:
• Top right dashboard button removed
• Login button text changed from "Enter Dashboard" to "Login to Portal"
OCR Processing:
• OCR model verification required for accuracy and performance
• All OCR-extracted data subject to Finance User HIL review
Notes
• Finance Manager and Auditor roles have been consolidated into Admin and Finance
User roles respectively
• The PRD does not provide granular feature-level permissions beyond these role
descriptions
• It is recommended to create a detailed RACI matrix or permission matrix during the
design phase
• This matrix should specify exactly which features each role can view, create, edit, or
delete
• All access is subject to security policies including TLS 1.2+, RBAC, AES-256
encryption, and SSO
• Vendor rate cards are managed exclusively by Admin to ensure standardization
• Timesheet validation by PM at upload ensures data quality before processing