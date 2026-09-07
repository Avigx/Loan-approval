# Product Requirements Document
## Legal Notice Document Management System (DMS)

**Version:** 1.0 (Draft)
**Author:** Generated from walkthrough video analysis
**Status:** Ready for review

> **Note on source material:** This PRD was reconstructed by frame-by-frame visual analysis of a screen-recorded walkthrough of a reference application. The recording had no captions and audio transcription was not available in this environment, so requirements below are derived from on-screen UI, field labels, dropdown contents, and file-explorer evidence — not from the narration. Sections built on an assumption (rather than something literally visible on screen) are marked **[ASSUMPTION]**. Please correct anything that was actually specified verbally but isn't reflected here.

---

## 1. Overview

A web-based **Document Management System (DMS)** for tracking legal notices and related correspondence issued during a loan recovery / collections lifecycle (e.g., SARFAESI invocation, demand notices, legal notices, arbitration, conciliation, settlement, recovery/reminder notices, and their proof-of-delivery and courier-tracking artifacts).

The system is **multi-tenant** (multiple lending institutions/"Clients", e.g. "AU BANK", can be onboarded), and every document is indexed primarily by **Loan Number**, so any user can pull up every notice, tracking slip, and POD ever issued against a loan account in one search.

## 2. Goals

- Give collections/legal teams a single place to **search all documents for a loan account by Loan Number**.
- Allow **bulk ingestion** of large batches of scanned notices/PODs/tracking slips (hundreds/thousands at a time) via an Excel/CSV template + a folder of files, auto-matched by filename.
- Provide **role- and permission-based access** so different banks/users can be restricted to View-only or have downloads disabled entirely (these are legally sensitive documents).
- Maintain a **dashboard** of upload health (successful vs failed rows) and document volume per category.
- Keep an **audit trail** (History & Logs) of who uploaded, viewed, downloaded, or administered what, and when.

## 3. Non-Goals (out of scope for v1)

- Drafting/generating the legal notices themselves (this system stores and tracks documents already produced elsewhere).
- E-signature or digital dispatch of notices.
- SMS/email/courier API integration for actually dispatching notices (Dispatch Date and Tracking Number are captured as data, not sent from the system) — **[ASSUMPTION]**, revisit if the source system does integrate with a courier API.
- Case management / litigation workflow beyond document storage and status fields.

## 4. Users & Roles

Observed in the video (Users screen):

| Role | Description | Example seen |
|---|---|---|
| **Super Admin / Vendor Admin** | Manages Clients (tenants), global settings. Implied by multi-tenant "Client" dropdown at user-creation time. **[ASSUMPTION — not directly shown]** | — |
| **Client Admin** | Administers one tenant: uploads documents, manages that tenant's users, searches all of that tenant's documents. | `RAKESH — CLIENT ADMIN` |
| **Customer / Bank User** | Tenant-side user who searches/views/downloads documents per their assigned Permission. Role shown as "Customer" in the Add User form. | `AU BANK Admin`, `RAUSHAN` (shown with role "no role" until assigned) |

Independent of Role, every user has a **Permission** level controlling document actions:

| Permission | Effect |
|---|---|
| `View + Download` | Can preview and download files |
| `View only` | Can preview but not download |
| `Download disabled` | Explicitly blocks downloads (distinct option from "View only" — suggests it can be toggled separately from viewing) |

Each user also has an **Active** toggle (enable/disable login without deleting the account), and accounts are created via **email + password**, with email verification required before first sign-in depending on the mail provider's settings — **[ASSUMPTION: implies a cloud auth provider such as Firebase Auth / Supabase Auth / AWS Cognito rather than a fully custom auth system]**.

## 5. Core Data Model ("Required Fields")

This is the heart of the ask: the fields that must exist for every document record, with **Loan Number as the primary search index**.

### 5.1 Document record (one row = one physical file)

| Field | Required? | Type | Notes |
|---|---|---|---|
| **Loan Number** | **Yes — primary search index** | string | e.g. `L9001020228468693`. Format observed: starts with `L` + digits. Should be indexed for fast lookup; expect high cardinality and repeat lookups. |
| **Unique ID** | System-generated | string | Observed pattern: `{LoanNumber}_{FolderCode}` (e.g. `L9001020228468693_INVO_TRACKING`). **Caveat:** the video showed two different documents sharing the *same* Unique ID string — so on screen this behaves as a derived/display label, not a hard unique key. Recommend the real primary key be a separate UUID, and either (a) append a running suffix (`_1`, `_2`) to keep the human-readable ID unique, or (b) keep it as a non-unique "reference code" and rely on the UUID internally. Flag this to the user as a design decision. |
| **Customer Name** | No | string | Borrower/customer name. Searchable filter. |
| **Folder Code** | **Yes** | string (FK to Document Type Master) | The category code, e.g. `INVO`, `INVO_TRACKING`, `INVO_POD`. Drives which "Folder" bucket a doc lands in. |
| **Document Type (label)** | No (auto-fillable from Folder Code) | string | Human-readable label shown in results, e.g. "Invocation Notice", "Invocation_tracking". |
| **Dispatch Date** | No | date | Date the notice was sent out. Used as a date-range filter ("Dispatch From" / "Dispatch To"). |
| **POD (Proof of Delivery)** | No | date or status string | Delivery confirmation info/date. |
| **Tracking Number** | No | string | Courier/postal tracking ID. Searchable filter. |
| **Remark** | No | text | Free-form notes. |
| **File** | Yes | binary/blob reference | Accepted types observed: PDF, JPG, PNG, XLSX, CSV. Max size observed: **25 MB**. |
| **Client (Tenant)** | Yes (system) | FK | e.g. "AU BANK". Enforces multi-tenant isolation. |
| **Batch ID** | System-generated | FK | Which bulk-upload batch this row came from (folder names observed like `BATCH_1781602827928_KUFLKFCFPMTF`). |
| Uploaded By / Uploaded At | System-generated | FK / timestamp | Audit fields. |

### 5.2 Document Type / Folder Master

Folders come in **families of up to three variants**: the base notice, its **POD**, and its **Tracking** slip. Families observed on screen (not necessarily exhaustive — the dropdown list was long and scrolled past what was captured):

- Invocation Notice / Invocation POD / Invocation Tracking
- Reference Notice / Reference POD / Reference Tracking
- Conciliation Notice / Conciliation POD / Conciliation Tracking
- Demand Notice / Demand Notice POD / Demand Notice Tracking
- Legal Notice / Legal Notice POD / Legal Notice Tracking
- Arbitration Notice / Arbitration POD / Arbitration Tracking
- Settlement (variants not fully visible)
- Recovery Notice / Recovery Notice POD / Recovery Notice Tracking
- Reminder Notice / Reminder Notice POD / Reminder Notice Tracking
- Acknowledgement / Reply (+ POD, + Tracking)
- Payment Proof (+ POD, + Tracking)
- Agreement / Contract (+ POD, + Tracking)
- Supporting Documents (+ POD, + Tracking)
- Court Case (POD and Tracking variants seen; base variant likely exists above what was captured)

**Recommendation:** model this as an admin-manageable master table (`family_name`, `variant` enum [`NOTICE`, `POD`, `TRACKING`], `folder_code`, `display_label`, `client_id`, `active`) rather than a hardcoded enum, since the list is long, was still scrolling on screen, and will likely need to be extended per client. **[ASSUMPTION: exact full list should be confirmed with the client/user before building.]**

### 5.3 Upload Batch

| Field | Notes |
|---|---|
| Batch code | e.g. `BATCH_1781602827928_KUFLKFCFPMTF` |
| Client | Tenant this batch belongs to |
| Total rows / Successful rows / Failed rows | Shown on Dashboard |
| Template file reference | The Excel/CSV that drove the batch |
| Status, created_at, error log | For failed-row diagnostics |

### 5.4 User

Full Name, Email, Password (hashed), Role, Client (tenant), Permission (`View + Download` / `View only` / `Download disabled`), Active flag, email-verified flag, created_at, last_login.

### 5.5 Audit Log (History & Logs)

Not shown in detail on screen, but implied by the "History & Logs" nav item. Recommended fields — **[ASSUMPTION]**:
Timestamp, Actor (user), Action (`upload`, `view`, `download`, `search`, `login`, `create_user`, `edit_permission`, `deactivate_user`), Entity type/ID affected, Client, IP address, Details (JSON).

---

## 6. Functional Requirements by Screen

### 6.1 Dashboard
- Cards: **Total Documents**, **Upload Batches**, **Successful Rows**, **Failed Rows**.
- "Folder-wise Document Count": a breakdown of document counts grouped by Folder Code (e.g. `INVO_TRACKING: 4`, `INVO: 2`).
- Scoped to the logged-in user's Client (tenant).

### 6.2 Search Documents (primary use case)
Filter form fields:
- **Loan Number** (free text — primary index)
- Unique ID (free text)
- Customer Name (free text)
- Folder (dropdown of all Folder Codes, "All folders" default)
- Tracking Number (free text)
- Document Type (free text)
- Dispatch From / Dispatch To (date range)
- `Search` and `Reset` buttons

Results table columns: **Loan #, Unique ID, Customer, Folder, Doc Type, Dispatch, POD, Tracking, Remark, Actions**.
- Actions: **View** (eye icon — inline/preview) and **Download** (subject to the user's Permission level; disabled/hidden if `Download disabled`).
- Empty state: "Enter filters and search". Loading state: "Searching…". Result count shown top-right (e.g. "3 document(s)").
- Search should be efficient even with a large document corpus — Loan Number should be a database index at minimum, ideally combined with Client for tenant-scoped lookups.

### 6.3 Bulk Upload
- Two drop zones:
  1. **"Drop Excel/CSV template"** — a spreadsheet where each row = one document record (Loan Number, Folder Code, Customer Name, Dispatch Date, POD, Tracking Number, Remark).
  2. **"Drop document files"** — the actual files (PDF, JPG, PNG, XLSX, CSV; up to 25 MB each).
- **"Download Template"** button provides a pre-formatted Excel/CSV with the correct headers.
- Copy on screen: *"Upload Excel/CSV template + document files. Files auto-map by Folder Code."*
- **Auto-mapping logic (inferred from filenames observed in Windows Explorer):**
  - Base document: `{LoanNumber}_{FolderCode}.<ext>` — e.g. `L9001020228468693_INVO.pdf`
  - Tracking slip: `{LoanNumber}_{FolderCode}_TRACKING.<ext>` — e.g. `L9001020228468693_INVO_TRACKING.pdf`
  - Proof of delivery (by symmetry with Tracking — **[ASSUMPTION]**): `{LoanNumber}_{FolderCode}_POD.<ext>`
  - The system should parse each dropped filename, extract Loan Number + Folder Code (+ optional suffix), and match it to the corresponding template row; unmatched files or rows should be reported as failures rather than silently dropped.
- "Start Upload (N rows)" button is disabled/shows 0 until both a template and matching files are staged; "Reset" clears the staged batch.
- On completion, batch stats (successful/failed rows) roll up into the Dashboard, and each successful row becomes a Document record.
- Uploads are grouped into a **Batch** (folder naming convention observed: `BATCH_<timestamp>_<random>`).

### 6.4 Users
- Table: Name, Email, Role, Permission (inline-editable dropdown), Active (toggle).
- "+ Add User" modal: Full name, Email, Password, Role, Client (tenant), Permission. On create, an account-verification email may be required before first login.
- Client Admins should only be able to manage users within their own tenant; a Super Admin (if implemented) can manage across tenants.

### 6.5 History & Logs
- **[ASSUMPTION — page contents not captured in the recording.]** Should provide a searchable/filterable audit trail (by user, date range, action type, affected loan number) covering uploads, downloads, views, searches, and user/permission administration, for compliance and dispute resolution (these are legal documents).

---

## 7. Non-Functional Requirements

- **Multi-tenancy & data isolation:** a user must never see another Client's documents or users. Enforce at the query layer, not just the UI.
- **Security & compliance:** these are legally sensitive personal-financial documents (loan/collections notices). Require encryption at rest and in transit, role-based access control, and a durable audit log. Be mindful of applicable data-protection law (e.g. India's DPDP Act) for PII such as customer names and loan numbers.
- **Performance:** Loan Number search must remain fast as volume grows into the hundreds of thousands of documents; bulk upload must handle large batches (hundreds–thousands of rows) without blocking the UI (background job / queue recommended).
- **Reliability of bulk upload:** partial failures must not fail the whole batch — report per-row success/failure with reasons (e.g. "no matching file found", "invalid Loan Number", "unsupported file type").
- **File constraints:** accepted types PDF/JPG/PNG/XLSX/CSV; 25 MB max per file (as observed).
- **Auditability:** every view/download/upload/admin action should be logged with actor, timestamp, and affected entity.

---

## 8. Tech Stack

The video only shows the finished product, not the implementation. The user has specified a **MERN stack** (MongoDB, Express, React, Node.js). See `CLAUDE.md` for the concrete setup this implies — schema, folder structure, and libraries. The data model and feature spec above are otherwise stack-agnostic and apply regardless.

---

## 9. Open Questions (please confirm before/while building)

1. Is the **complete** list of Folder/Document-Type families known, or should it start as a small seed list that's easy to extend later via an admin screen?
2. Should **Unique ID** be a strictly unique key (with a de-dup suffix), or is duplication across rows acceptable as seen in the demo?
3. What exactly does **POD** capture — a date, a status (Delivered/Returned/Pending), or an uploaded proof-of-delivery scan (or all three)?
4. Is there a **Super Admin** role that manages multiple Clients/banks, or is each deployment single-tenant per bank in practice even though the UI has a Client dropdown?
5. What should the **History & Logs** screen filter/show, specifically?
6. Any requirement to integrate with a courier/dispatch API, or is Dispatch Date/Tracking Number always manually entered via the Excel template?
7. Any specific auth provider preference (Firebase/Supabase/Cognito/custom), given the "Cloud email settings" hint about email verification?

---

## 10. Future Enhancements (not v1)

- Automated reconciliation reminders (e.g. flag loans with a Notice but no POD/Tracking after N days).
- Bulk download / export of search results.
- API for other internal systems to push document metadata programmatically instead of via Excel upload.
