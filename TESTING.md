# Testing Guide — Legal Notice DMS

This document explains how to run automated tests, manually test each feature, and what test data is available.

---

## 1. Prerequisites for Testing

| Requirement | Purpose |
|-------------|---------|
| **Node.js v18+** | Runtime |
| **MongoDB running** | Database (local at `localhost:27017` or Atlas) |
| **Dependencies installed** | Run `npm install` from root |
| **Database seeded** | Run `npm run seed` for test data |

---

## 2. Automated Tests

### Run All Tests

```bash
npm test                          # Runs tests in both client and server workspaces
npm test --workspace=server       # Server tests only
```

### Watch Mode (for development)

```bash
npm run test:watch --workspace=server
```

### What's Covered

| Test File | What It Tests |
|-----------|---------------|
| `server/tests/fileMapping.test.js` | Filename parsing: `{LoanNumber}_{FolderCode}[_TRACKING\|_POD].{ext}` |
| `server/tests/permissions.test.js` | Tenant scoping (`scopeToClient`), role checks, download permission enforcement |

### Expected Output

```
✓ fileMapping.service > parseFilename > should parse a basic filename
✓ fileMapping.service > parseFilename > should parse a TRACKING filename
✓ fileMapping.service > parseFilename > should parse a POD filename
✓ fileMapping.service > parseFilename > should handle case-insensitive variant suffixes
✓ permissions.middleware > scopeToClient > should return empty filter for SUPER_ADMIN
✓ permissions.middleware > requireRole > should return 403 when user lacks required role
✓ permissions.middleware > requireDownloadPermission > should return 403 for DOWNLOAD_DISABLED
...
```

---

## 3. Manual Testing Checklist

### 3.1 Authentication

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Login success | Go to `/login`, enter `admin@aubank.com` / `password123`, click Sign In | Redirects to Dashboard |
| 2 | Login failure | Enter wrong password | Shows "Invalid email or password" error toast |
| 3 | Login blocked (inactive) | Deactivate a user via Users page, then try to login as that user | Shows "Account is deactivated" error |
| 4 | Token refresh | Wait >15 min or manually expire token; make an API call | Token auto-refreshes without logging out |
| 5 | Logout | Click Sign Out in sidebar | Redirected to login page, token cleared |

### 3.2 Dashboard

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | Empty state | Login before any uploads | Shows 0 for all stats, "No documents yet" in folder grid |
| 2 | After upload | Upload a batch, refresh dashboard | Stats and folder counts update |
| 3 | Tenant isolation | Login as different client's user | Only sees own client's data |

### 3.3 Search Documents

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | Empty state | Navigate to Search | Shows "Enter filters and search" |
| 2 | Search by Loan # | Enter a loan number, click Search | Shows matching documents |
| 3 | Multiple filters | Combine loan #, folder, date range | Results match all filters |
| 4 | No results | Search for nonexistent loan # | Shows "No documents found" |
| 5 | View action | Click eye icon on a result | Shows document detail modal |
| 6 | Download action | Click download icon | Downloads the file |
| 7 | Download blocked | Login as user with DOWNLOAD_DISABLED permission | Download button hidden; API returns 403 |

### 3.4 Bulk Upload

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | Download template | Click "Download Template" | Downloads `bulk_upload_template.xlsx` with correct headers |
| 2 | Happy path upload | Fill template with valid data, drop files with matching names | Batch completes, all rows successful |
| 3 | Partial failure | Include rows with invalid loan #s or missing files | Batch completes with specific error messages per failed row |
| 4 | No template | Try to upload without template | Error: "Template file is required" |
| 5 | No documents | Try to upload without document files | Error: "At least one document file is required" |
| 6 | Wrong file format | Upload a .txt file as a document | Error about unsupported file type |
| 7 | File too large | Upload a file >25MB | Error about file size |

**Filename convention for test files:**
```
{LoanNumber}_{FolderCode}.pdf          → e.g., L123456_INVO.pdf
{LoanNumber}_{FolderCode}_TRACKING.pdf → e.g., L123456_INVO_TRACKING.pdf
{LoanNumber}_{FolderCode}_POD.pdf      → e.g., L123456_INVO_POD.pdf
```

### 3.5 Users Management

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | List users | Navigate to Users page | Shows all users for tenant |
| 2 | Add user | Click "+ Add User", fill form, submit | New user appears in table |
| 3 | Change permission | Change dropdown from "VIEW DOWNLOAD" to "VIEW ONLY" | Toast confirms update |
| 4 | Toggle active | Click the toggle switch | User is activated/deactivated |
| 5 | Tenant isolation | As CLIENT_ADMIN, should only see own tenant's users | Cannot see users from other clients |
| 6 | Role restriction | As CLIENT_ADMIN, cannot create SUPER_ADMIN | Returns 403 |

### 3.6 History & Logs

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | View logs | Navigate to History & Logs | Shows recent actions |
| 2 | Filter by action | Select "login" from dropdown, click Filter | Only login events shown |
| 3 | Filter by date | Set date range | Only events in range shown |
| 4 | Pagination | Generate >50 log entries | Pagination controls appear and work |

---

## 4. Security Testing

### 4.1 Tenant Isolation (CRITICAL)

This must be verified at the **API level**, not just the UI:

```bash
# Login as Client A admin
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aubank.com","password":"password123"}'

# Save the access token from response, then try to access Client B's documents:
# All Document/User/AuditLog endpoints MUST be scoped by clientId
# A Client A user should NEVER see Client B's data even by directly calling the API
```

### 4.2 Permission Enforcement (Server-side)

```bash
# Login as a user with DOWNLOAD_DISABLED permission
# Try to download a document via API:
curl http://localhost:5000/api/documents/{docId}/download \
  -H "Authorization: Bearer {token}"
# Should return 403, not the file
```

### 4.3 Role-based Access

- CUSTOMER should get 403 on `/api/users`, `/api/bulk-upload` (POST), `/api/audit-logs`
- CLIENT_ADMIN should get 403 when trying to create a SUPER_ADMIN user

---

## 5. Creating Test Data

### Using the Seed Script

```bash
npm run seed    # Creates AU BANK client, 2 admin users, 39 folder types
```

### Creating Test Upload Files

1. Download the template from the Bulk Upload page
2. Fill in sample rows:

| loanNumber | folderCode | customerName | dispatchDate | podStatus | trackingNumber | remark |
|------------|------------|--------------|--------------|-----------|----------------|--------|
| L123456789 | INVO | John Doe | 2024-01-15 | Delivered | TR001 | Test notice |
| L123456789 | INVO_TRACKING | John Doe | 2024-01-15 | | TR001 | Tracking slip |

3. Create matching files:
   - `L123456789_INVO.pdf` (any valid PDF)
   - `L123456789_INVO_TRACKING.pdf` (any valid PDF)

4. Upload both template and files via the Bulk Upload page

---

## 6. API Testing with cURL

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aubank.com","password":"password123"}'
```

### Search Documents
```bash
curl "http://localhost:5000/api/documents/search?loanNumber=L123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Health Check
```bash
curl http://localhost:5000/api/health
```

---

## 7. Troubleshooting

| Issue | Solution |
|-------|----------|
| `MongoDB connection error` | Ensure MongoDB is running: `mongod` or check Atlas connection string |
| `Port 5000 already in use` | Change `PORT` in `server/.env` or kill the process |
| `ENOENT: storage directory` | The `server/storage/` directory is created automatically; ensure write permissions |
| `Token expired` on every request | Check system clock; ensure JWT_ACCESS_EXPIRY is reasonable (e.g., `15m`) |
| `Cannot find module` errors | Run `npm install` from the project root |
| Tailwind styles not applying | Ensure `postcss.config.js` and `tailwind.config.js` exist in `client/` |
