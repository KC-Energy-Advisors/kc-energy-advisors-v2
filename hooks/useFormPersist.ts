'use client';

// ── Persisted shape — only contact fields (never qualification answers) ──
export interface PersistedContact {
  firstName: string;
  lastName:  string;
  phone:     string;
  email:     string;
}

const KEY = 'kcea_form_contact';

// Writes current contact field values to sessionStorage.
// Call on every relevant field change.
export function saveContact(data: Partial<PersistedContact>): void {
  try {
    const existing = loadContact();
    sessionStorage.setItem(KEY, JSON.stringify({ ...existing, ...data }));
  } catch { /* storage blocked */ }
}

// Returns previously saved contact data (empty strings if nothing saved).
export function loadContact(): PersistedContact {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return { firstName: '', lastName: '', phone: '', email: '' };
    const parsed = JSON.parse(raw) as Partial<PersistedContact>;
    return {
      firstName: parsed.firstName ?? '',
      lastName:  parsed.lastName  ?? '',
      phone:     parsed.phone     ?? '',
      email:     parsed.email     ?? '',
    };
  } catch {
    return { firstName: '', lastName: '', phone: '', email: '' };
  }
}

// Call after successful form submission.
export function clearContact(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch { /* storage blocked */ }
}
