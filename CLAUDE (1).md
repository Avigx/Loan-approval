# CLAUDE.md

Guidance for Claude Code (or any AI coding agent) working in this repository. This project implements the **Legal Notice Document Management System (DMS)** described in `PRD.md` — read that file first for full functional context. This file covers *how to build it*: stack, structure, schema, and conventions.

> Stack is fixed to **MERN** (MongoDB, Express, React, Node.js) per user requirement. Everything else below (file-mapping logic, permission rules, build order) is a direct implementation of `PRD.md` — don't drift from that spec without checking with the user.

---

## 1. Tech Stack

- **Frontend:** React 18 + Vite, React Router, Tailwind CSS, Axios for API calls, React Query (`@tanstack/react-query`) for server-state/caching.
- **Backend:** Node.js + Express (REST API), organized as routes → controllers → services.
- **Database:** MongoDB, accessed via **Mongoose** ODM.
- **Auth:** Custom JWT auth — `bcrypt` for password hashing, `jsonwebtoken` for access tokens, httpOnly cookie for the refresh token. Email verification token (random string, expiring) sent via a transactional email service (Resend or Nodemailer+SMTP; stub/log emails in dev).
- **File storage:** Local disk under `server/storage/` in development via `multer`, abstracted behind a storage interface so it can swap to S3-compatible object storage (AWS S3 / Cloudflare R2) in production without touching calling code.
- **Spreadsheet parsing:** `xlsx` (SheetJS) for `.xlsx`, `papaparse` for `.csv`.
- **Background processing:** Bulk-upload row processing runs as an async job on the Node process for v1 (note in code where a real queue like BullMQ + Redis would slot in for production scale).
- **Validation:** `zod` for all request-body/query schemas on the Express side.
- **Testing:** `vitest` or `jest` for both client and server; `supertest` for API integration tests.

Package manager: `npm`, run as an **npm workspaces monorepo** (`client/`, `server/`) so `npm install` at the root sets up both.

---

## 2. Getting Started

```bash
npm install                       # installs root + client + server workspaces
cp server/.env.example server/.env   # fill in MONGODB_URI, JWT_SECRET, email provider keys
npm run seed --workspace=server   # seeds: 1 demo Client, 1 client_admin user, a starter Folder/DocType master list
npm run dev                       # concurrently runs server (Express) + client (Vite)
```

- Server: http://localhost:5000 (API at `/api/*`)
- Client: http://localhost:5173 (proxies `/api` to the server in dev)

Run tests: `npm test --workspaces`
Lint + typecheck before considering any task done: `npm run lint --workspaces`

---

## 3. Project Structure

```
/ (npm workspaces root)
  package.json
/server
  package.json
  /src
    server.js                     # app entrypoint
    /config
      db.js                       # mongoose connection
      env.js
    /models
      Client.js
      User.js
      FolderType.js
      UploadBatch.js
      Document.js
      AuditLog.js
    /routes
      auth.routes.js
      documents.routes.js
      bulkUpload.routes.js
      users.routes.js
      folders.routes.js
      auditLog.routes.js
    /controllers
      auth.controller.js
      documents.controller.js
      bulkUpload.controller.js
      users.controller.js
      folders.controller.js
      auditLog.controller.js
    /middleware
      auth.middleware.js          # verifies JWT, attaches req.user
      permissions.middleware.js   # RBAC + tenant-scoping helpers
      upload.middleware.js        # multer config
      errorHandler.js
    /services
      fileMapping.service.js      # filename -> {loanNumber, folderCode, variant} parser
      storage.service.js          # storage interface (local + S3 implementations)
      bulkUpload.service.js       # batch processing orchestration
      audit.service.js            # writeAuditLog() helper
    /validators                   # zod schemas per route
  /storage                        # local dev file storage (gitignored)
  /tests
/client
  package.json
  /src
    main.jsx
    App.jsx
    /pages
      LoginPage.jsx
      VerifyEmailPage.jsx
      DashboardPage.jsx
      SearchPage.jsx
      BulkUploadPage.jsx
      UsersPage.jsx
      HistoryLogPage.jsx
    /components
      /search        # SearchFilters, ResultsTable
      /bulk-upload   # DropZone, BatchProgress
      /users         # UserTable, AddUserModal
      /dashboard     # StatCard, FolderCountGrid
      /common        # Layout, Sidebar, ProtectedRoute
    /api
      client.js      # axios instance with interceptors (auth token, 401 handling)
      documents.js
      bulkUpload.js
      users.js
      auditLog.js
    /context
      AuthContext.jsx
    /hooks
  /tests
```

---

## 4. Database Schema (Mongoose sketch)

MongoDB is document-based, so relationships below use `ObjectId` references (populate on read) rather than joins — keep them normalized like this (don't embed Documents inside Client, the collections will be large). Treat this as a starting point; refine as you build, but keep the entities and relationships intact — they map directly to `PRD.md` section 5.

```js
// models/Client.js
const ClientSchema = new Schema({
  name: { type: String, required: true, unique: true },   // e.g. "AU BANK"
  code: { type: String, required: true, unique: true },
  active: { type: Boolean, default: true },
}, { timestamps: true });

// models/User.js
const UserSchema = new Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['SUPER_ADMIN', 'CLIENT_ADMIN', 'CUSTOMER'], default: 'CUSTOMER' },
  permission: { type: String, enum: ['VIEW_DOWNLOAD', 'VIEW_ONLY', 'DOWNLOAD_DISABLED'], default: 'VIEW_DOWNLOAD' },
  active: { type: Boolean, default: true },
  emailVerified: { type: Boolean, default: false },
  emailVerifyToken: String,
  emailVerifyExpires: Date,
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', default: null },
  lastLoginAt: Date,
}, { timestamps: true });

// models/FolderType.js
const FolderTypeSchema = new Schema({
  familyName: { type: String, required: true },          // e.g. "Invocation", "Demand Notice"
  variant: { type: String, enum: ['NOTICE', 'POD', 'TRACKING'], required: true },
  folderCode: { type: String, required: true },           // e.g. "INVO", "INVO_POD", "INVO_TRACKING"
  displayLabel: { type: String, required: true },         // e.g. "Invocation Notice"
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', default: null }, // null = global/shared
  active: { type: Boolean, default: true },
}, { timestamps: true });
FolderTypeSchema.index({ clientId: 1, folderCode: 1 }, { unique: true });

// models/UploadBatch.js
const UploadBatchSchema = new Schema({
  batchCode: { type: String, required: true, unique: true }, // e.g. BATCH_<timestamp>_<random>
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  uploadedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  templateFilePath: String,
  totalRows: { type: Number, default: 0 },
  successfulRows: { type: Number, default: 0 },
  failedRows: { type: Number, default: 0 },
  status: { type: String, enum: ['processing', 'completed', 'failed'], default: 'processing' },
  errorLog: { type: Schema.Types.Mixed, default: [] },
}, { timestamps: true });

// models/Document.js
const DocumentSchema = new Schema({
  loanNumber: { type: String, required: true },            // PRIMARY SEARCH INDEX
  uniqueRef: { type: String, required: true },              // display id: {loanNumber}_{folderCode}, NOT guaranteed unique — see PRD 5.1
  customerName: String,
  folderTypeId: { type: Schema.Types.ObjectId, ref: 'FolderType', required: true },
  dispatchDate: Date,
  podStatus: String,
  podDate: Date,
  trackingNumber: String,
  remark: String,
  filePath: { type: String, required: true },
  fileType: { type: String, required: true },               // pdf | jpg | png | xlsx | csv
  fileSizeBytes: Number,
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  batchId: { type: Schema.Types.ObjectId, ref: 'UploadBatch', default: null },
}, { timestamps: true });

DocumentSchema.index({ loanNumber: 1 });
DocumentSchema.index({ clientId: 1, loanNumber: 1 });
DocumentSchema.index({ trackingNumber: 1 });
// Optional: text index for combined free-text search across customerName/remark
DocumentSchema.index({ customerName: 'text', remark: 'text' });

// models/AuditLog.js
const AuditLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  action: { type: String, required: true }, // upload | view | download | search | login | create_user | edit_permission | deactivate_user
  entityType: String,   // "Document" | "UploadBatch" | "User" | ...
  entityId: Schema.Types.ObjectId,
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', default: null },
  ipAddress: String,
  details: Schema.Types.Mixed,
}, { timestamps: { createdAt: true, updatedAt: false } });

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ userId: 1 });
```

---

## 5. Key Business Logic to Implement Carefully

### 5.1 Filename → row mapping (`services/fileMapping.service.js`)
Parse dropped filenames against the pattern:

```
{LoanNumber}_{FolderCode}[_TRACKING|_POD].{ext}
```

- Strip the extension.
- If the name ends in `_TRACKING` or `_POD`, that's the variant suffix — strip it and resolve to the corresponding `FolderType` variant.
- Everything before the first `_` that matches a known Loan Number pattern is the Loan Number; the remainder (minus the variant suffix) is the Folder Code — match case-insensitively against `FolderType.folderCode`, since the source data showed inconsistent casing (`invocation POD` vs `Invocation Notice`).
- Return `{ loanNumber, folderCode, variant } | { error: reason }` (never throw) so the bulk-upload processor can report per-file failures.
- Write unit tests against real examples: `L9001020228468693_INVO.pdf`, `L9001020228468693_INVO_TRACKING.pdf`.

### 5.2 Bulk upload processing (`services/bulkUpload.service.js`)
1. Parse the uploaded template (xlsx/csv) into rows: `loanNumber, folderCode, customerName?, dispatchDate?, podDate?/podStatus?, trackingNumber?, remark?`.
2. Parse every dropped file's name via 5.1.
3. Match files to rows on `(loanNumber, folderCode)`. Default to **one row per file**, matching the reference UI where each variant (Notice/POD/Tracking) appears as its own result row — confirm with the user if a different grouping is actually wanted.
4. For each matched pair: validate required fields (Loan Number, Folder Code), store the file via `services/storage.service.js`, insert a `Document`.
5. For each unmatched row or file: record a failure reason in `UploadBatch.errorLog` and increment `failedRows`.
6. Update `UploadBatch.totalRows/successfulRows/failedRows/status` when done. Don't wrap the whole batch in a single Mongo transaction that rolls back on any row failure — failures must be granular per PRD §7.

### 5.3 Permission enforcement (`middleware/permissions.middleware.js`)
- Every route that returns a file URL or triggers a download **must** check `req.user.permission !== 'DOWNLOAD_DISABLED'` server-side — never rely on the UI hiding the button.
- Every `Document`/`UploadBatch`/`User` query **must** be scoped by `clientId` for non-`SUPER_ADMIN` roles. Implement this once as `scopeToClient(req)` middleware/helper that injects `{ clientId: req.user.clientId }` into the Mongoose filter, rather than repeating it per controller — a missed spot here is a tenant-data-leak bug.

### 5.4 Audit logging (`services/audit.service.js`)
Call `writeAuditLog()` on: login, document view, document download, search executed, bulk upload started/completed, user created, permission/role changed, user activated/deactivated. Keep it fire-and-forget (`.catch(logger.error)`, don't `await`-block the main response on it).

### 5.5 Unique reference ID
Generate `uniqueRef` as `{loanNumber}_{folderCode}`. Since the reference UI tolerated duplicates, do **not** put a unique index on it in Mongo — the real primary key is `_id`. If the user later asks for strict uniqueness, append an incrementing suffix (`_2`, `_3`, ...) computed at insert time by counting existing docs with the same `uniqueRef` prefix.

### 5.6 JWT auth flow
- On login: verify password with `bcrypt.compare`, issue a short-lived access token (JWT, ~15min) returned in the response body, and a longer-lived refresh token set as an httpOnly, secure cookie.
- `middleware/auth.middleware.js` verifies the access token on protected routes and attaches `req.user` (fetched or decoded from the JWT payload — keep the payload minimal: `{ id, role, clientId, permission }`).
- Add a `/api/auth/refresh` route that reissues an access token from a valid refresh cookie.
- Block login entirely if `emailVerified === false`.

---

## 6. Build Order (suggested milestones)

1. **Schema + Auth:** Mongoose models, DB connection, seed script, JWT login + email verification stub, base React layout/nav matching PRD §6 screens, `ProtectedRoute` wrapper.
2. **Search Documents:** filters form, results table, view/download actions with permission checks, tenant scoping. (Core, most-used feature — get it right first.)
3. **Bulk Upload:** template-generation endpoint, dual dropzones (multer), file-mapping logic (5.1), batch processing (5.2), batch status UI/polling.
4. **Dashboard:** aggregate queries (Mongo `$group`/`$count`) for the four stat cards + folder-wise counts.
5. **Users:** list + add-user modal + inline permission/role/active editing, tenant-scoped for Client Admins.
6. **History & Logs:** audit log viewer with filters (date range, user, action type, loan number).
7. **Polish:** empty/loading states matching the reference UI's copy ("Enter filters and search", "Searching…"), error toasts for bulk-upload row failures, responsive layout.

Work through these in order — each is independently demoable, and later milestones (Dashboard, History & Logs) depend on data produced by earlier ones (Search, Bulk Upload).

---

## 7. Conventions

- All Express routes validate input with `zod` (via a small `validate(schema)` middleware) and return typed JSON errors (`{ error: string, details?: unknown }`) with correct HTTP status codes.
- Controllers stay thin — business logic lives in `/services`, not inline in route handlers, so it's unit-testable without spinning up Express.
- Every table/list UI in React should have explicit empty, loading, and error states — don't leave a blank screen.
- Write a unit test alongside any new function in `/services` — especially `fileMapping.service.js` and `permissions.middleware.js` — these are the two places a bug becomes either a data-integrity or a security problem.
- Don't hardcode the Folder/Document-Type list in code — it lives in the `FolderType` collection and should be seeded, not compiled in, since PRD §5.2 flags this list as incomplete/likely to grow.
- Use `.env` for all secrets/config on the server; never commit real credentials. `client/.env` for the Vite API base URL if client and server are ever deployed separately.

## 8. Before Marking Any Feature Done

- [ ] `npm run lint --workspaces` passes
- [ ] Tenant scoping verified (a Client A user cannot see Client B's documents/users via the API, not just the UI)
- [ ] Permission checks verified server-side, not just hidden client-side
- [ ] Loan Number search is covered by a Mongo index and tested with a non-trivial seeded dataset
- [ ] Bulk upload partial-failure path tested (some rows/files intentionally malformed)
