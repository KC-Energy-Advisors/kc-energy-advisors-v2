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
  // Qualification
  is_owner:       'yes' | 'no';
  location_ok:    'yes' | 'no';
  bill_amount:    string;       // code e.g. '150-250'
  bill_label:     string;       // human label
  bill_midpoint:  string;       // dollar midpoint as string
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
