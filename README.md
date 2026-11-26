# Clinic Booking System

A full-stack clinic appointment booking app: Node.js/Express backend (MRC
architecture) over MySQL, with a plain HTML/CSS/JS frontend — no frontend
framework, no page reloads.

## Tech Stack

- **Backend**: Node.js, Express, MRC (Model-Route-Controller)
- **Database**: MySQL (connection pooling via `mysql2/promise`, prepared
  statements everywhere — no string-concatenated SQL)
- **Frontend**: HTML5, CSS3, vanilla JavaScript (`fetch()`, no frameworks)

## Project Structure

```
clinic-booking/
├── backend/
│   ├── config/db.js              # MySQL pool + connection check
│   ├── models/                   # SQL per table (doctorModel, patientModel, appointmentModel)
│   ├── controllers/               # Validation + HTTP response shaping
│   ├── routes/                    # Express routers per resource
│   ├── middleware/validateId.js  # Rejects non-numeric :id params
│   ├── server.js                  # App entry point
│   └── package.json
├── frontend/
│   ├── index.html
│   ├── css/style.css
│   └── js/{api.js, app.js}
├── docs/
│   ├── plan.md                    # Problem statement, ERD, data dictionary, API contracts
│   └── qa-test.md                 # Test matrix (pass/fail)
├── schema.sql                     # Creates the DB, tables, and seed data
├── .env.example
├── .gitignore
└── README.md
```

## Setup

### 1. Database

```bash
mysql -u root -p < schema.sql
```

This creates the `clinic_booking` database, its three tables
(`doctors`, `patients`, `appointments`), and a handful of seed rows.

### 2. Backend

```bash
cd backend
npm install
cp ../.env.example .env   # then edit .env with your real DB credentials
npm start                 # or: npm run dev (auto-restart on file change)
```

The server starts on `http://localhost:3000` by default and also serves
the `frontend/` folder as static files, so once it's running you can just
open `http://localhost:3000` in a browser — no separate frontend server
needed.

### 3. Frontend (if served separately)

The frontend is plain static files with no build step. If you'd rather not
rely on Express's static middleware, you can serve `frontend/` with any
static file server (e.g. `npx serve frontend`) — just make sure the
backend's CORS is enabled (it is, via the `cors` package) and that
`API_BASE` in `frontend/js/api.js` points at the backend's URL.

## API Overview

All endpoints are under `/api`:

- `GET/POST /api/doctors`, `GET/PUT/DELETE /api/doctors/:id`
- `GET/POST /api/patients`, `GET/PUT/DELETE /api/patients/:id`
- `GET/POST /api/appointments`, `GET/PUT/DELETE /api/appointments/:id`

Full request/response contracts, status codes, and the data dictionary are
in [`docs/plan.md`](docs/plan.md). The full test matrix is in
[`docs/qa-test.md`](docs/qa-test.md).

## Notes on Design Choices

- **Prepared statements** (`?` placeholders) are used for every query —
  no string concatenation — to prevent SQL injection.
- **Connection pooling** avoids the overhead of a new MySQL connection per
  HTTP request.
- **FK-aware deletes**: deleting a doctor/patient that still has
  appointments returns a `400` with a clear message rather than a raw
  MySQL foreign-key error.
- **No frameworks on the frontend**: all DOM updates, form handling, and
  the shared modal are hand-written vanilla JS, with `e.preventDefault()`
  on every form submit so nothing ever triggers a full page reload.
