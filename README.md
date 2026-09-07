# Legal Notice Document Management System (DMS)

A full-stack **MERN** application for managing legal notices, proof-of-delivery records, and courier tracking documents in loan recovery workflows. Multi-tenant, role-based, with bulk upload and audit logging.

---

## Prerequisites

Before running this project, install the following:

| Software | Version | Download Link |
|----------|---------|---------------|
| **Node.js** | v18+ (LTS recommended) | [https://nodejs.org](https://nodejs.org) |
| **npm** | v9+ (comes with Node.js) | Included with Node.js |
| **MongoDB** | v6+ (Community Edition) | [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community) |
| **Git** | Latest | [https://git-scm.com](https://git-scm.com) |

### MongoDB Options

You can use **either** a local MongoDB instance or a cloud-hosted one:

- **Local (recommended for dev):** Install MongoDB Community Edition and ensure `mongod` is running on `localhost:27017`
- **Cloud (MongoDB Atlas):** Create a free cluster at [https://cloud.mongodb.com](https://cloud.mongodb.com) and use the connection string in `.env`

---

## Quick Start

```bash
# 1. Install dependencies (root + client + server workspaces)
npm install

# 2. Set up environment variables
cp server/.env.example server/.env
# Edit server/.env — at minimum set MONGODB_URI and JWT secrets

# 3. Seed the database with demo data
npm run seed

# 4. Start development servers (backend + frontend concurrently)
npm run dev
```

After starting:
- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000/api](http://localhost:5000/api)
- **Health check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

### Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `superadmin@dms.com` | `password123` |
| Client Admin (AU BANK) | `admin@aubank.com` | `password123` |

---

## Environment Variables

Edit `server/.env` (copied from `.env.example`):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | ✅ | `mongodb://localhost:27017/legal-notice-dms` | MongoDB connection string |
| `JWT_SECRET` | ✅ | `your-jwt-secret-change-this` | Secret for signing JWT access tokens |
| `JWT_REFRESH_SECRET` | ✅ | `your-refresh-secret-change-this` | Secret for signing refresh tokens |
| `JWT_ACCESS_EXPIRY` | | `15m` | Access token expiry (e.g. `15m`, `1h`) |
| `JWT_REFRESH_EXPIRY` | | `7d` | Refresh token expiry |
| `PORT` | | `5000` | Express server port |
| `CLIENT_URL` | | `http://localhost:5173` | Frontend URL for CORS |
| `EMAIL_PROVIDER` | | `stub` | `stub` = log emails to console; configure for production |
| `STORAGE_MODE` | | `local` | `local` = disk storage; `s3` for production |
| `MAX_FILE_SIZE` | | `26214400` | Max upload size in bytes (25MB) |

---

## Project Structure

```
/ (npm workspaces root)
├── package.json                    # Monorepo config
├── server/
│   ├── package.json
│   ├── .env.example
│   ├── src/
│   │   ├── server.js              # Express entrypoint
│   │   ├── config/                # DB connection, env config
│   │   ├── models/                # Mongoose schemas (6 models)
│   │   ├── routes/                # Express route definitions
│   │   ├── controllers/           # Request handlers (thin)
│   │   ├── middleware/            # Auth, permissions, upload, validation
│   │   ├── services/             # Business logic (file mapping, storage, bulk upload, audit)
│   │   ├── validators/           # Zod request schemas
│   │   └── seed.js               # Database seeder
│   ├── storage/                   # Local file storage (gitignored)
│   └── tests/                     # Vitest test files
└── client/
    ├── package.json
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── main.jsx               # React entrypoint
        ├── App.jsx                # Router + providers
        ├── api/                   # Axios API modules
        ├── context/               # AuthContext
        ├── components/            # Reusable UI components
        └── pages/                 # Page-level components
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/register` | Register new account |
| GET | `/api/auth/verify-email?token=xxx` | Verify email address |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Clear refresh token cookie |
| GET | `/api/auth/me` | Get current user info |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents/search` | Search with filters (loan #, folder, date range, etc.) |
| GET | `/api/documents/stats` | Dashboard statistics |
| GET | `/api/documents/:id/view` | View document details |
| GET | `/api/documents/:id/download` | Download document file |

### Bulk Upload
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bulk-upload` | Upload template + document files |
| GET | `/api/bulk-upload/template` | Download upload template (.xlsx) |
| GET | `/api/bulk-upload/batches` | List all batches |
| GET | `/api/bulk-upload/:id/status` | Get batch processing status |

### Users (Admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users |
| POST | `/api/users` | Create user |
| PATCH | `/api/users/:id` | Update user role/permission/active |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/folders` | List folder types |
| GET | `/api/audit-logs` | List audit logs with filters |
| GET | `/api/health` | Health check |

---

## Running Tests

```bash
# Run all tests (both workspaces)
npm test

# Run only server tests
npm test --workspace=server

# Run server tests in watch mode
npm run test:watch --workspace=server
```

---

## Seeded Data

The `npm run seed` command creates:

1. **Client:** AU BANK (code: `AUBANK`)
2. **Users:**
   - Super Admin: `superadmin@dms.com` / `password123`
   - Client Admin: `admin@aubank.com` / `password123`
3. **39 Folder Types** across 13 families:
   - Invocation, Reference Notice, Conciliation, Demand Notice, Legal Notice, Arbitration, Settlement, Recovery Notice, Reminder Notice, Acknowledgement/Reply, Payment Proof, Agreement/Contract, Supporting Documents
   - Each with 3 variants: Notice, POD, Tracking

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS, React Router, React Query, Axios |
| Backend | Node.js, Express, Mongoose ODM |
| Database | MongoDB |
| Auth | JWT (access + refresh tokens), bcrypt |
| File Upload | Multer (local disk), abstracted for S3 swap |
| Spreadsheet Parsing | SheetJS (xlsx), PapaParse (csv) |
| Validation | Zod |
| Testing | Vitest, Supertest |

---

## Production Notes

- Change `JWT_SECRET` and `JWT_REFRESH_SECRET` to strong random values
- Set `STORAGE_MODE=s3` and configure S3 credentials for file storage
- Set `EMAIL_PROVIDER` to a real email service (Resend/SMTP)
- Use a process manager like PM2 or deploy to a container platform
- Set `NODE_ENV=production` for secure cookies
- Consider adding BullMQ + Redis for bulk upload job queue at scale
