// ── KC Energy Advisors — TypeScript Interfaces ──────────────────

export type Stage =
  | 'INITIAL'
  | 'ASK_OWNERSHIP'
  | 'ASK_LOCATION'
  | 'ASK_BILL'
  | 'SEND_BOOKING'
  | 'BOOKED'
  | 'DISQUALIFIED'
  | 'DNC';

export interface BillOption {
  code:      string;   // e.g. '150-250'
  label:     string;   // e.g. '$150 – $250'
  midpoint:  number;   // representative dollar amount for savings calc
  qualifies: boolean;
  tag:       string;   // GHL tag applied for this tier
  badge?:    string;   // optional badge text shown in UI
}

export interface FormState {
  step:          1 | 2 | 3 | 4;
  isOwner:       boolean | null;
  locationOK:    boolean | null;
  billCode:      string | null;
  billLabel:     string | null;
  billMidpoint:  number | null;
}

export interface ContactData {
  firstName: string;
  lastName:  string;
  phone:     string;
  email:     string;
}

export interface LeadPayload {
  // Identity
  locationId:    string;
  firstName:     string;
  lastName:      string;
  phone:         string;        // E.164 format
  email:         string;
  address?:      string;        // full address string from Step 1 form
  // Qualification
  is_owner:       'yes' | 'no';
  location_ok:    'yes' | 'no';
  bill_amount:    string;       // code e.g. '150-200'
  bill_label:     string;       // human label
  bill_midpoint:  string;       // dollar midpoint as string
  roofType?:      string;       // 'asphalt' | 'metal' | 'tile' | 'unsure'
  timeline?:      string;       // 'exploring' | 'interested' | 'ready'
  // Tags
  tags:           string[];
  // Attribution
  utm_source:     string;
  utm_medium:     string;
  utm_campaign:   string;
  utm_content:    string;
  utm_term:       string;
  // Metadata
  formVersion:    string;
  submittedAt:    string;       // ISO 8601
  source:         string;
  stage?:         string;       // funnel stage at time of submission, e.g. 'step1' | 'complete'
  // TCPA consent record — optional so all existing callsites compile unchanged
  sms_consent?:           string;  // 'yes' | 'no'
  sms_consent_timestamp?: string;  // ISO 8601 datetime of acceptance
  sms_consent_language?:  string;  // version string, e.g. 'TCPA-v2-2026'
}

export interface SavingsResult {
  yr1:    number;
  yr5:    number;
  yr25:   number;
  credit: number;
  kwSize: string;
}

export interface ChatMessage {
  from:  'michael' | 'user';
  text:  string;
  delay: number;  // ms before this message appears
}

// ── Booking flow ─────────────────────────────────────────────────────────────

export interface CalendarSlot {
  startTime: string;  // ISO 8601, e.g. "2026-04-22T09:00:00-05:00"
  endTime:   string;  // ISO 8601, e.g. "2026-04-22T09:30:00-05:00"
}

/** Keys are date strings "YYYY-MM-DD" in the contact's timezone */
export type SlotsByDate = Record<string, CalendarSlot[]>;

export interface BookingRequest {
  contactId?  : string;  // optional — route will upsert contact if absent or empty
  startTime   : string;  // ISO 8601
  endTime     : string;  // ISO 8601
  name        : string;  // full name — kept for backward compat
  timezone    : string;  // IANA tz, e.g. "America/Chicago"
  // ── Optional lead summary — populated from form state ──────────────
  firstName?  : string;
  lastName?   : string;
  phone?      : string;  // E.164
  email?      : string;
  address?    : string;
  ownsHome?   : string;  // 'yes' | 'no'
  monthlyBill?: string;  // code: 'under-100' | '100-150' | '150-200' | '200-plus'
  roofType?   : string;  // 'asphalt' | 'metal' | 'tile' | 'unsure'
  timeline?   : string;  // 'exploring' | 'interested' | 'ready'
}

export interface BookingResponse {
  success       : boolean;
  appointmentId?: string;
  contactId?    : string;  // echoed back on success — never null on a successful booking
  error?        : string;
}
