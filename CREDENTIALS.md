# Login Credentials for All Roles

This document lists the default login credentials for all user roles in the Invoice Tracker system.

> **⚠️ Security Warning:** These are default credentials for development/testing. Change all passwords in production!

## Default Password
**All users share the same default password:** `Password123!`

---

## User Credentials by Role

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| **Admin** | `admin@invoiceflow.com` | `Password123!` | Full system access, user management, configuration, audit logs, analytics |
| **Finance User** | `financeuser@invoiceflow.com` | `Password123!` | Operational role - processes invoices, HIL review, approvals, digitization, matching |
| **Project Manager** | `pm@invoiceflow.com` | `Password123!` | Approves invoices for assigned projects (Project Alpha, Cloud Migration) |
| **Vendor** | `vendor@acme.com` | `Password123!` | Submits invoices, views own invoices (Acme Solutions) |

---

## How to Seed Users

### Option 1: Via API Endpoint (Recommended)
```bash
# Make a GET request to the seed endpoint
curl http://localhost:3000/api/debug/seed

# Or visit in browser:
# http://localhost:3000/api/debug/seed
```

### Option 2: Via Node Script
```bash
npm run seed
# or
node scripts/seed-users.mjs
```

---

## Role Capabilities Summary

### Admin
- ✅ Full system access
- ✅ User management
- ✅ System configuration
- ✅ View all invoices, vendors, users
- ✅ Access analytics and audit logs

### Finance User
- ✅ Process invoices (digitization, matching)
- ✅ HIL (Human-In-Loop) review
- ✅ Approve/reject invoices
- ✅ Finalize payments
- ✅ View assigned invoices
- ❌ Cannot view global audit logs
- ❌ Cannot access system health

### Project Manager
- ✅ Approve invoices for assigned projects
- ✅ Reject invoices
- ✅ Request additional information from vendors
- ✅ View invoices for assigned projects only
- ✅ Upload documents

### Vendor
- ✅ Submit invoices
- ✅ View own submitted invoices
- ✅ Track invoice status
- ❌ Cannot view other vendors' invoices
- ❌ Cannot approve/reject invoices

---

## Notes

- All users are created with `isActive: true` by default
- Project Manager is assigned to: "Project Alpha" and "Cloud Migration"
- Vendor user is linked to vendor ID: `v-001` (Acme Solutions)
- Passwords are hashed using bcrypt (salt rounds: 10)
- Email addresses are stored in lowercase for consistency

---

## Production Checklist

Before deploying to production:

1. ✅ Change default password for all users
2. ✅ Use strong, unique passwords per user
3. ✅ Enable 2FA/MFA if available
4. ✅ Review and restrict seed endpoint access
5. ✅ Set up proper email verification
6. ✅ Implement password reset flow
7. ✅ Set up session timeout policies
8. ✅ Enable audit logging for authentication events
