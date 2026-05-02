# GSU Clubs Portal

A full-stack organization directory for Grambling State University. Students can browse all clubs and Greek organizations, view their constitutions and bylaws, and org presidents can securely manage their documents through a password-protected editor.

**Live site:** [gsu-clubs-portal.vercel.app](https://gsu-clubs-portal.vercel.app)


## Built By

Chimdinma Jason — solo, designed and built end-to-end as Student Software Engineer for the GSU Campus Activities & Student Engagement Department.

## User Roles

- **Public visitors** — browse the directory, view org details
- **Org presidents** — manage their org's profile, upload constitution and bylaws
- **Admins** — full department oversight, role management

## Features

- Public directory of all GSU clubs and Greek organizations
- Filter by All / Greek / Clubs
- Per-org detail pages with constitution and bylaws documents
- Password-protected document editor for org presidents
- Admin access to manage all organizations
- File attachments (PDF, DOCX) stored in cloud storage
- Versioned documents with audit trail

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML, CSS, JavaScript |
| Backend | Node.js + Express |
| Database | PostgreSQL via Neon |
| ORM | Prisma |
| File Storage | Supabase Storage (S3-compatible) |
| Auth | JWT (bcrypt-hashed org passwords) |
| Deployment | Vercel (frontend + backend) |

---

## Project Structure

```
gsu-clubs-portal/
├── index.html          # Org directory page
├── org.html            # Org detail page
├── style.css
├── js/
│   ├── main.js         # Directory page logic
│   └── org-details.js  # Org detail + document editor
└── server/
    ├── prisma/
    │   └── schema.prisma
    └── src/
        ├── app.js
        ├── index.js
        ├── lib/
        │   ├── prisma.js
        │   └── s3.js
        ├── middleware/
        │   ├── auth.js
        │   └── requireRole.js
        ├── routes/
        │   ├── auth.js
        │   ├── documents.js
        │   ├── orgs.js
        │   └── uploads.js
        └── scripts/
            └── seed.js
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/orgs` | public | List all orgs |
| GET | `/api/orgs/:slug` | public | Org detail + documents |
| POST | `/api/auth/org-login` | — | Org president login |
| POST | `/api/auth/admin-login` | — | Admin login |
| POST | `/api/orgs/:slug/documents` | JWT | Create document |
| PATCH | `/api/documents/:id` | JWT | Edit document |
| DELETE | `/api/documents/:id` | JWT | Delete document |
| POST | `/api/uploads/presign` | JWT | Get signed upload URL |

---

## Local Development

### Prerequisites
- Node.js 18+
- A PostgreSQL database (Neon recommended)
- A Supabase project (for file storage)

### Setup

```bash
# Clone the repo
git clone https://github.com/jasynj/gsu-clubs-portal.git
cd gsu-clubs-portal

# Install backend dependencies
cd server
npm install

# Copy and fill in environment variables
cp .env.example .env
```

Fill in `server/.env` — see `.env.example` for all required variables.

```bash
# Run database migrations
npx prisma migrate dev --name init
npx prisma generate

# Seed organizations
npm run seed

# Start the API server
npm run dev
```

Then open `index.html` with a local server (e.g. VS Code Live Server) — the frontend will connect to `localhost:3001`.

---

## Deployment

- **Frontend** — deployed to Vercel from the repo root
- **Backend** — deployed to Vercel from the `server/` root directory with all `.env` variables set in Vercel's environment variables panel
