# Clinic Booking System — Plan & Analysis

## 1. Problem Statement

Small clinics often juggle appointment scheduling across phone calls, paper
logs, and spreadsheets, which leads to double-bookings, lost patient
history, and no easy way to search upcoming visits. This project delivers a
full-stack **Clinic Booking System** that lets front-desk staff:

- Maintain a roster of **doctors** (with specialty) and **patients**.
- Create, view, update, cancel, and delete **appointments** that link a
  patient to a doctor at a specific date/time.
- Search and filter appointments (by patient/doctor name, notes, or status)
  without reloading the page.

**Out of scope** for this iteration: user authentication/roles, payment
processing, SMS/email reminders, and recurring appointments. These are
natural follow-ups but are not required by the current brief.

**Success criteria**: all four CRUD operations work end-to-end through the
UI for all three entities, keyword search works on appointments, invalid
input is rejected with a 400 and a clear message, and the test matrix in
`qa-test.md` passes.

---

## 2. Entity-Relationship Diagram (ERD)

```
┌───────────────────┐          ┌──────────────────────┐          ┌───────────────────┐
│      doctors       │          │     appointments      │          │      patients       │
├───────────────────┤          ├──────────────────────┤          ├───────────────────┤
│ PK id              │ 1      N │ PK id                 │ N      1 │ PK id               │
│    full_name        │◄─────────┤ FK doctor_id          │────────►│    full_name         │
│    specialty         │          │ FK patient_id         │          │    email             │
│    email (unique)    │          │    appointment_date    │          │    phone             │
│    phone             │          │    status              │          │    date_of_birth     │
│    created_at         │          │    notes                │          │    created_at         │
│    updated_at         │          │    created_at           │          │    updated_at         │
└───────────────────┘          │    updated_at           │          └───────────────────┘
                                 └──────────────────────┘
```

**Relationships**

- One `doctor` can have **many** `appointments` (1:N).
- One `patient` can have **many** `appointments` (1:N).
- `appointments` is the associative/junction-like entity resolving the
  implicit many-to-many relationship between doctors and patients, while
  also carrying its own attributes (date, status, notes).
- Both foreign keys use `ON DELETE RESTRICT`, so the database itself
  refuses to delete a doctor or patient that still has appointments
  (MySQL error `ER_ROW_IS_REFERENCED_2`). The controllers catch that
  specific error code and turn it into a clean `400` with a friendly
  message instead of a raw SQL error — the staff member must cancel or
  reassign the appointments first.

---

## 3. Data Dictionary

### `doctors`

| Column      | Type          | Constraints                  | Description                     |
|-------------|---------------|-------------------------------|----------------------------------|
| id          | INT           | PK, AUTO_INCREMENT            | Surrogate key                    |
| full_name   | VARCHAR(100)  | NOT NULL                      | Doctor's display name            |
| specialty   | VARCHAR(100)  | NOT NULL                      | e.g. "Pediatrics"                |
| email       | VARCHAR(150)  | NOT NULL, UNIQUE               | Contact email, also a login key for future auth |
| phone       | VARCHAR(20)   | NULL                           | Contact phone                    |
| created_at  | TIMESTAMP     | DEFAULT CURRENT_TIMESTAMP      | Row creation time                |
| updated_at  | TIMESTAMP     | ON UPDATE CURRENT_TIMESTAMP    | Last modification time           |

### `patients`

| Column         | Type          | Constraints                 | Description                |
|----------------|---------------|-------------------------------|------------------------------|
| id             | INT           | PK, AUTO_INCREMENT            | Surrogate key                |
| full_name      | VARCHAR(100)  | NOT NULL                      | Patient's name                |
| email          | VARCHAR(150)  | NOT NULL, UNIQUE               | Contact email                 |
| phone          | VARCHAR(20)   | NULL                           | Contact phone                 |
| date_of_birth  | DATE          | NULL                           | Used for age-sensitive care    |
| created_at     | TIMESTAMP     | DEFAULT CURRENT_TIMESTAMP      | Row creation time             |
| updated_at     | TIMESTAMP     | ON UPDATE CURRENT_TIMESTAMP    | Last modification time        |

### `appointments`

| Column            | Type                                   | Constraints                          | Description                         |
|-------------------|------------------------------------------|----------------------------------------|----------------------------------------|
| id                | INT                                      | PK, AUTO_INCREMENT                     | Surrogate key                         |
| patient_id        | INT                                      | NOT NULL, FK → patients.id              | Who the appointment is for            |
| doctor_id         | INT                                      | NOT NULL, FK → doctors.id               | Who the appointment is with           |
| appointment_date  | DATETIME                                 | NOT NULL                               | Scheduled date and time               |
| status            | ENUM('scheduled','completed','cancelled') | NOT NULL, DEFAULT 'scheduled'           | Lifecycle state                       |
| notes             | VARCHAR(500)                             | NULL                                    | Free-text reason/notes                |
| created_at        | TIMESTAMP                                 | DEFAULT CURRENT_TIMESTAMP               | Row creation time                     |
| updated_at        | TIMESTAMP                                 | ON UPDATE CURRENT_TIMESTAMP             | Last modification time                |

---

## 4. REST API Contracts

Base URL: `/api`. All request/response bodies are JSON. All list/detail
endpoints return `200`; creation returns `201`; delete returns `204 No
Content`; validation failures return `400` with an `errors` array; missing
records return `404`.

### Doctors — `/api/doctors`

| Method | Path              | Body                                              | Success | Notes |
|--------|-------------------|-----------------------------------------------------|---------|-------|
| GET    | `/`               | —                                                     | 200, `Doctor[]` | `?q=` keyword search across name/specialty/email |
| GET    | `/:id`            | —                                                     | 200, `Doctor`   | 404 if not found |
| POST   | `/`               | `{ full_name, specialty, email, phone? }`             | 201, `Doctor`   | 400 on missing/invalid fields or duplicate email |
| PUT    | `/:id`            | `{ full_name, specialty, email, phone? }`             | 200, `Doctor`   | 400/404 as above |
| DELETE | `/:id`            | —                                                     | 204             | 400 if doctor has existing appointments; 404 if not found |

### Patients — `/api/patients`

| Method | Path     | Body                                                     | Success | Notes |
|--------|----------|-------------------------------------------------------------|---------|-------|
| GET    | `/`      | —                                                            | 200, `Patient[]` | `?q=` keyword search across name/email/phone |
| GET    | `/:id`   | —                                                            | 200, `Patient`   | 404 if not found |
| POST   | `/`      | `{ full_name, email, phone?, date_of_birth? }`                | 201, `Patient`   | 400 on missing/invalid fields or duplicate email |
| PUT    | `/:id`   | `{ full_name, email, phone?, date_of_birth? }`                | 200, `Patient`   | 400/404 as above |
| DELETE | `/:id`   | —                                                            | 204             | 400 if patient has existing appointments; 404 if not found |

### Appointments — `/api/appointments`

| Method | Path     | Body                                                                 | Success | Notes |
|--------|----------|--------------------------------------------------------------------------|---------|-------|
| GET    | `/`      | —                                                                        | 200, `Appointment[]` | `?q=` searches patient/doctor name + notes; `?status=` filters exactly |
| GET    | `/:id`   | —                                                                        | 200, `Appointment`   | 404 if not found |
| POST   | `/`      | `{ patient_id, doctor_id, appointment_date, status?, notes? }`           | 201, `Appointment`   | 400 if patient_id/doctor_id don't reference real rows, or date is malformed |
| PUT    | `/:id`   | `{ patient_id, doctor_id, appointment_date, status, notes? }`            | 200, `Appointment`   | 400/404 as above |
| DELETE | `/:id`   | —                                                                        | 204             | 404 if not found |

`appointment_date` is accepted as `YYYY-MM-DD HH:MM` or `YYYY-MM-DD
HH:MM:SS` (the frontend's `<input type="datetime-local">` is converted to
this format before sending).

Every list/detail `Appointment` response is enriched with `patient_name`,
`doctor_name`, and `doctor_specialty` via a SQL join, so the frontend never
needs a second round-trip to render a human-readable row.

---

## 5. Architecture Notes

- **MRC (Model-Route-Controller)**: `models/` hold all SQL (via
  parameterized queries only), `controllers/` validate input and shape HTTP
  responses, `routes/` wire URLs to controller functions. This keeps SQL
  out of request handlers and validation out of the data layer.
- **Connection pooling**: `config/db.js` creates one `mysql2/promise` pool
  shared by the whole app instead of opening a connection per request.
- **Centralized error handling**: controllers forward unexpected errors to
  `next(err)`, which lands in a single Express error-handling middleware in
  `server.js` — consistent JSON shape, no leaked stack traces.
- **Frontend**: a single HTML shell with three tab panels, one shared modal
  component that renders a different form per resource, and a thin
  `api.js` fetch wrapper. No build step, no frameworks.
