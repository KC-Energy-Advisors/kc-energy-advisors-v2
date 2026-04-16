# KC Energy Advisors — Deployment Guide

## First-time setup (local dev)

```bash
cd kc-energy-next
cp .env.local.example .env.local   # then fill in real values
npm install
npm run dev                        # → http://localhost:3000
```

## Deploy to Vercel (recommended)

### Option A — Vercel CLI (fastest)
```bash
npm i -g vercel
vercel                             # follow the prompts
vercel --prod                      # push to production
```

### Option B — GitHub → Vercel dashboard
1. Push the `kc-energy-next/` folder to a GitHub repo
2. Go to vercel.com → New Project → Import repo
3. Set root directory to `kc-energy-next` if it's nested
4. Add environment variables (see below)
5. Click Deploy — live in ~60 seconds

## Environment variables to set in Vercel

Set these in Vercel → Project → Settings → Environment Variables:

| Variable | Value |
|---|---|
| `GHL_WEBHOOK_URL` | Your GHL Workflow 1 webhook URL |
| `GHL_LOCATION_ID` | `GzCNeSvcjSom5bMGtmt6` |
| `GHL_API_KEY` | Your GHL API key |
| `NEXT_PUBLIC_SITE_URL` | `https://kcenergyadvisors.com` |
| `NEXT_PUBLIC_LOCATION_ID` | `GzCNeSvcjSom5bMGtmt6` |
| `NEXT_PUBLIC_BOOKING_CALENDAR_URL` | Your GHL calendar embed URL |

## Custom domain on Vercel

1. Vercel → Project → Settings → Domains
2. Add `kcenergyadvisors.com` + `www.kcenergyadvisors.com`
3. Update DNS at your registrar:
   - A record: `@` → `76.76.21.21`
   - CNAME: `www` → `cname.vercel-dns.com`
4. SSL auto-provisioned — usually live within 5 minutes

## GHL Webhook setup

Your GHL Workflow 1 needs the correct trigger:

1. GHL → Automations → Workflow 1 (the Michael AI sequence)
2. Trigger type: **Inbound Webhook** (NOT "Customer Replied")
3. Copy the webhook URL → paste as `GHL_WEBHOOK_URL` in Vercel env vars
4. Workflow reads the payload fields: `firstName`, `lastName`, `phone`, `is_owner`, `location_ok`, `bill_label`, `bill_midpoint`, `tags`

## Testing the form locally

1. Start dev server: `npm run dev`
2. Fill out the form at http://localhost:3000
3. Check API route logs in terminal
4. If `GHL_WEBHOOK_URL` is not set, leads are logged to console (safe for testing)
5. Check `http://localhost:3000/api/health` — should return `{"status":"ok"}`
