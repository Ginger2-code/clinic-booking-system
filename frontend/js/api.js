// ============================================================
// frontend/js/api.js
// Thin wrapper around fetch(). Every function returns parsed JSON
// or throws an Error whose .message is suitable to show the user,
// and whose .fieldErrors (if present) holds the backend's array
// of validation messages.
// ============================================================

const API_BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  // 204 No Content has no body to parse.
  if (res.status === 204) return null;

  let body = null;
  try { body = await res.json(); } catch (_) { /* no/invalid body */ }

  if (!res.ok) {
    const err = new Error(
      (body && (body.error || (body.errors && body.errors.join(' ')))) ||
      `Request failed with status ${res.status}`
    );
    err.status = res.status;
    err.fieldErrors = body && body.errors;
    throw err;
  }
  return body;
}

const api = {
  // ---- generic CRUD factory for a resource path ----
  resource(path) {
    return {
      list: (params = {}) => {
        const qs = new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([, v]) => v))
        ).toString();
        return request(`${path}${qs ? `?${qs}` : ''}`);
      },
      get: (id) => request(`${path}/${id}`),
      create: (data) => request(path, { method: 'POST', body: JSON.stringify(data) }),
      update: (id, data) => request(`${path}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      remove: (id) => request(`${path}/${id}`, { method: 'DELETE' }),
    };
  },
};

const doctorsApi = api.resource('/doctors');
const patientsApi = api.resource('/patients');
const appointmentsApi = api.resource('/appointments');
