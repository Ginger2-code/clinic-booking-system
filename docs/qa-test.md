# Clinic Booking System — QA Test Report

**Scope**: manual + scripted testing of the `/api/doctors`, `/api/patients`,
and `/api/appointments` endpoints, plus the frontend forms that call them.

**Method**: tests were run against a local instance seeded from
`schema.sql` (3 doctors, 3 patients, 3 appointments). Prepared statements
mean SQL-injection style inputs are expected to be treated as literal
strings rather than executed.

**Legend**: ✅ Pass · ❌ Fail · Expected = HTTP status + outcome.

---

## 1. Doctors

| Test ID | Action | Test Data | Expected Output | Status |
|---------|--------|-----------|------------------|--------|
| DOC-01 | `POST /api/doctors` — valid doctor | `{"full_name":"Dr. Kate Lee","specialty":"Cardiology","email":"kate.lee@clinic.test","phone":"555-0199"}` | 201, created doctor with `id` assigned | ✅ |
| DOC-02 | `POST /api/doctors` — missing required field | `{"specialty":"Cardiology","email":"x@test.com"}` (no `full_name`) | 400, `errors` array names `full_name` | ✅ |
| DOC-03 | `POST /api/doctors` — invalid email format | `{"full_name":"A","specialty":"B","email":"not-an-email"}` | 400, `errors` names email | ✅ |
| DOC-04 | `POST /api/doctors` — duplicate email | Same email as DOC-01 | 400, `"A doctor with this email already exists."` | ✅ |
| DOC-05 | `GET /api/doctors?q=cardio` | — | 200, array containing only doctors matching "cardio" (name/specialty/email) | ✅ |
| DOC-06 | `GET /api/doctors/:id` — existing id | id from DOC-01 | 200, full doctor object | ✅ |
| DOC-07 | `GET /api/doctors/:id` — non-existent id | `999999` | 404, `"Doctor not found."` | ✅ |
| DOC-08 | `GET /api/doctors/:id` — non-numeric id | `abc` | 400, `"id must be a positive integer"` | ✅ |
| DOC-09 | `PUT /api/doctors/:id` — valid update | Change `phone` on DOC-01's doctor | 200, updated object reflects new phone | ✅ |
| DOC-10 | `PUT /api/doctors/:id` — non-existent id | id `999999` | 404 | ✅ |
| DOC-11 | `DELETE /api/doctors/:id` — doctor with existing appointments | Seeded doctor id `1` | 400, `"Cannot delete: doctor has existing appointments."` | ✅ |
| DOC-12 | `DELETE /api/doctors/:id` — doctor with no appointments | Doctor created in DOC-01 (never booked) | 204, no body | ✅ |
| DOC-13 | `DELETE /api/doctors/:id` — already-deleted id | Same id as DOC-12, called again | 404 | ✅ |

## 2. Patients

| Test ID | Action | Test Data | Expected Output | Status |
|---------|--------|-----------|------------------|--------|
| PAT-01 | `POST /api/patients` — valid patient | `{"full_name":"Sam Rivera","email":"sam.rivera@mail.test","phone":"555-0300","date_of_birth":"1995-06-01"}` | 201, created patient | ✅ |
| PAT-02 | `POST /api/patients` — missing email | `{"full_name":"No Email"}` | 400, `errors` names email | ✅ |
| PAT-03 | `POST /api/patients` — malformed date_of_birth | `{"full_name":"X","email":"x2@test.com","date_of_birth":"06/01/1995"}` | 400, `errors` names `date_of_birth` format | ✅ |
| PAT-04 | `POST /api/patients` — duplicate email | Same email as PAT-01 | 400, duplicate-email message | ✅ |
| PAT-05 | `GET /api/patients?q=rivera` | — | 200, array containing only matching patients | ✅ |
| PAT-06 | `PUT /api/patients/:id` — valid update | Change `phone` on PAT-01's patient | 200, updated object | ✅ |
| PAT-07 | `DELETE /api/patients/:id` — patient with existing appointments | Seeded patient id `1` | 400, `"Cannot delete: patient has existing appointments."` | ✅ |
| PAT-08 | `DELETE /api/patients/:id` — patient with no appointments | Patient created in PAT-01 | 204 | ✅ |
| PAT-09 | SQL-injection attempt in search | `GET /api/patients?q='; DROP TABLE patients; --` | 200, treated as a literal (no-match) search string; table still exists afterward | ✅ |

## 3. Appointments

| Test ID | Action | Test Data | Expected Output | Status |
|---------|--------|-----------|------------------|--------|
| APT-01 | `POST /api/appointments` — valid booking | `{"patient_id":2,"doctor_id":2,"appointment_date":"2026-12-15 09:00","status":"scheduled","notes":"Routine"}` | 201, created appointment with joined `patient_name`/`doctor_name` | ✅ |
| APT-02 | `POST /api/appointments` — non-existent patient_id | `{"patient_id":999999,"doctor_id":1,"appointment_date":"2026-12-15 09:00"}` | 400, `"No patient found with id 999999."` | ✅ |
| APT-03 | `POST /api/appointments` — non-existent doctor_id | `{"patient_id":1,"doctor_id":999999,"appointment_date":"2026-12-15 09:00"}` | 400, `"No doctor found with id 999999."` | ✅ |
| APT-04 | `POST /api/appointments` — malformed date | `{"patient_id":1,"doctor_id":1,"appointment_date":"15 Dec 2026"}` | 400, `errors` names `appointment_date` format | ✅ |
| APT-05 | `POST /api/appointments` — invalid status value | `{"patient_id":1,"doctor_id":1,"appointment_date":"2026-12-15 09:00","status":"pending"}` | 400, `errors` lists valid status values | ✅ |
| APT-06 | `GET /api/appointments?status=scheduled` | — | 200, only `status: "scheduled"` rows returned | ✅ |
| APT-07 | `GET /api/appointments?q=skin` | — | 200, matches appointment with "Skin consultation" note | ✅ |
| APT-08 | `PUT /api/appointments/:id` — reschedule | Change `appointment_date` and `status` to `"completed"` on APT-01's appointment | 200, updated fields reflected | ✅ |
| APT-09 | `PUT /api/appointments/:id` — non-existent id | id `999999` | 404 | ✅ |
| APT-10 | `DELETE /api/appointments/:id` — existing appointment | id from APT-01 | 204, subsequent `GET` on same id returns 404 | ✅ |
| APT-11 | `DELETE /api/appointments/:id` — already-deleted id | Same id as APT-10 | 404 | ✅ |
| APT-12 | Cascade check: delete a doctor's *only* remaining link via appointment delete, then delete the doctor | Delete the single appointment referencing a test doctor, then `DELETE` that doctor | 204 on doctor delete (no longer blocked) | ✅ |

## 4. Frontend (manual, browser-driven)

| Test ID | Action | Steps | Expected Output | Status |
|---------|--------|-------|------------------|--------|
| UI-01 | Create appointment via modal | Open "New Appointment", fill form, submit | No page reload; new row appears in table; success message shown | ✅ |
| UI-02 | Edit appointment pre-fills form | Click "Edit" on an existing row | Modal opens with patient/doctor/date/status/notes already populated | ✅ |
| UI-03 | Delete requires confirmation | Click "Delete" on a row | Confirmation dialog appears; row is NOT removed until "Delete" is confirmed | ✅ |
| UI-04 | Cancel confirmation | Click "Delete", then "Cancel" in the dialog | Dialog closes, row remains in table | ✅ |
| UI-05 | Live search, no reload | Type into the appointments search box | Table re-filters via `fetch()` without a full page navigation (debounced) | ✅ |
| UI-06 | Status filter combines with search | Set status dropdown to "cancelled" while a search term is present | Only rows matching both conditions shown | ✅ |
| UI-07 | Validation error surfaces inline | Submit "New Doctor" with empty email | Modal stays open; error text shown inside the modal, not a browser alert | ✅ |
| UI-08 | Tab switching preserves no stale state | Switch from Appointments → Patients → Appointments | Appointments table still shows its last-loaded data, no flicker or dupes | ✅ |

---

## Summary

- **Total tests**: 33 — 33 passed, 0 failed at time of writing.
- **Coverage**: all four CRUD verbs exercised for all three resources,
  including both the happy path and negative/edge cases (missing fields,
  bad formats, non-existent IDs, duplicate emails, FK-referenced deletes,
  and a SQL-injection probe confirming prepared statements hold).
- **Known gaps / follow-ups**: no automated test runner is wired up yet
  (these were executed manually with `curl`/Postman and in-browser); a
  natural next step is porting this matrix into a Jest + Supertest suite
  for CI.
