# Cove Booking

Multi-tenant SaaS booking platform for Caribbean tour operators. Each business
gets a public booking page (`book.<slug>.<root>` or a custom domain), a
lightweight owner dashboard, and — for you, the platform operator — an admin
panel that manages the whole fleet.

**Stack:** Python 3.11 · Flask · Supabase (Postgres) · Jinja + Tailwind CDN ·
vanilla JS · flatpickr for the booking-page calendar · O-Pay hosted checkout ·
Twilio WhatsApp · SendGrid/Resend email.

---

## Table of contents

1. [Project layout](#project-layout)
2. [Local development](#local-development)
3. [Database setup](#database-setup)
4. [Environment variables](#environment-variables)
5. [Deployment](#deployment)
6. [Onboarding a new business](#onboarding-a-new-business)
7. [How things fit together](#how-things-fit-together)
8. [Tours: time slots + pricing modes](#tours-time-slots--pricing-modes)
9. [Admin dashboard: platform vs impersonation](#admin-dashboard-platform-vs-impersonation)
10. [O-Pay integration notes](#o-pay-integration-notes)
11. [Account self-service](#account-self-service)
12. [Cancellation policy](#cancellation-policy)
13. [Security](#security)

---

## Project layout

```
CoveBooking/
├── app.py                      # Flask application factory
├── wsgi.py                     # gunicorn entrypoint
├── config.py                   # All env-var reading
├── requirements.txt
├── Procfile / render.yaml      # Render + generic PaaS deploy
├── runtime.txt                 # Python version pin
├── .env.example
├── cancellationpolicy.md       # Canonical cancellation & refund policy text
├── migrations/
│   ├── initial_schema.sql      # Fresh DB — run once
│   ├── 002_slots_and_pricing.sql  # Adds slot/pricing model to existing DB
│   ├── 003_account_self_service.sql  # Adds password-reset + email-change tokens
│   └── 004_age_based_pricing.sql  # Adds adult/child price columns
├── cove/
│   ├── db.py                   # Supabase client wrapper
│   ├── auth.py                 # Flask-Login users, decorators
│   ├── tenant.py               # Hostname → business resolution
│   ├── utils.py                # Slug, phone, email, money helpers
│   ├── routes/
│   │   ├── public.py           # book.<slug>.<root> booking pages
│   │   ├── dashboard.py        # Owner dashboard + account self-service
│   │   ├── admin.py            # Platform admin (role=admin)
│   │   ├── webhooks.py         # O-Pay webhook receiver
│   │   └── system.py           # /health, /internal/cron/reminders
│   └── services/
│       ├── opay.py             # O-Pay API client + signature verify
│       ├── messaging.py        # Twilio WhatsApp + email (SendGrid/Resend)
│       ├── bookings.py         # Booking lifecycle, slot generation, capacity math
│       └── accounts.py         # Password reset, password change, email change
├── templates/                  # Jinja2
│   ├── base_public.html        # Tenant-branded shell
│   ├── base_dashboard.html
│   ├── public/                 # index, tour_detail, success, cancel
│   ├── dashboard/              # login, home, bookings, booking_detail, tours,
│   │                           # availability, settings, account, forgot_password,
│   │                           # reset_password
│   ├── admin/                  # home, business_form
│   └── errors/                 # 403, 404, generic
└── static/                     # (empty; add your own if needed)
```

---

## Local development

```bash
python -m venv .venv
source .venv/bin/activate                # or: .venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env                     # then fill in values
python app.py                            # http://localhost:5000
```

You'll want two Host headers to test multi-tenancy locally. Add these to your
`hosts` file (`C:\Windows\System32\drivers\etc\hosts` or `/etc/hosts`):

```
127.0.0.1  app.cove.local
127.0.0.1  book.demo.cove.local
```

Set `ROOT_DOMAIN=cove.local` in `.env`. Then:
- `http://app.cove.local:5000/dashboard/login` — dashboard/admin
- `http://book.demo.cove.local:5000/` — booking page for the business with `slug=demo`

You can also skip the hosts hack and use `?business=<slug>` on `localhost:5000`.

---

## Database setup

### Fresh install

1. Create a Supabase project.
2. Open the SQL editor and paste the full contents of
   [`migrations/initial_schema.sql`](migrations/initial_schema.sql). Run it.
3. Grab `Project URL`, `service_role` key from Settings → API. Put them in
   `.env` as `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

The schema uses `citext` for case-insensitive slugs/emails and `pgcrypto` for
UUIDs. It creates all tables plus two views (`v_tour_date_load` and
`v_tour_slot_load`) the app uses to compute seats-remaining efficiently.

### Upgrading an existing database

Apply each numbered migration in order in the Supabase SQL editor. All are
idempotent — safe to re-run.

| Migration | What it does |
|---|---|
| `002_slots_and_pricing.sql` | Adds `tours.buffer_minutes`, `pricing_mode`, `max_group_size`; adds `bookings.booking_time`; adds `availability.slot_time`; creates `v_tour_slot_load` view |
| `003_account_self_service.sql` | Adds `password_reset_tokens` and `email_change_tokens` tables; adds `users.email_changed_at` |
| `004_age_based_pricing.sql` | Adds `tours.pricing_type`, `adult_price_cents`, `child_price_cents`; adds `bookings.num_adults`, `num_children` |

**RLS?** Deliberately off. Flask holds the service-role key and enforces tenant
isolation in application code. Add RLS only if you ever expose PostgREST
directly to browsers.

---

## Environment variables

Every variable is documented in [`.env.example`](.env.example). Highlights:

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | Flask session/CSRF signing key. Generate 32+ random bytes. |
| `APP_BASE_URL` | Public URL of the app root (no trailing slash). Used by cron caller. |
| `ROOT_DOMAIN` | The base under which tenants live: `book.<slug>.<ROOT_DOMAIN>`. |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Database access. |
| `OPAY_API_KEY` / `OPAY_WEBHOOK_SECRET` | O-Pay Bearer token + HMAC-SHA256 secret. |
| `TWILIO_*` | WhatsApp reminders. Leave blank to no-op. |
| `EMAIL_PROVIDER` | `sendgrid`, `resend`, or `console` (logs to stdout — great for dev). |
| `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` | Created on first boot if no admin exists. **Rotate immediately after first login.** |
| `CRON_SECRET` | Bearer token that the daily reminder job uses to auth against `/internal/cron/reminders`. |

---

## Deployment

### Render (recommended — one click)

1. Push this repo to GitHub.
2. In Render, **New → Blueprint** and point it at the repo. The `render.yaml`
   provisions a web service + a daily cron job for reminders.
3. Fill in the env vars marked `sync: false` in the Render dashboard.
4. First deploy — the app creates the bootstrap admin. Log in at
   `https://<render-host>/dashboard/login` and change the password.
5. Point your DNS:
   - `A/CNAME  app.cove.com   → render-host`
   - Wildcard `CNAME *.book.cove.com → render-host` for tenant subdomains
     (or add each `book.<slug>.cove.com` individually).
6. Set the O-Pay webhook URL to `https://app.cove.com/webhooks/opay` and paste
   the shared secret into `OPAY_WEBHOOK_SECRET`.

### PythonAnywhere

1. Create a new Web App → **Manual configuration** → Python 3.11.
2. Clone the repo, `pip install --user -r requirements.txt`.
3. Point the WSGI file at `wsgi.py:app`.
4. Add env vars in the Web tab → **Environment variables** section.
5. For the daily reminder job, add a **Scheduled task**:
   ```
   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
        https://yourdomain.pythonanywhere.com/internal/cron/reminders
   ```
6. Wildcard subdomains on PythonAnywhere require a paid plan.

### Any host

```
gunicorn -w 3 -b 0.0.0.0:$PORT wsgi:app
```

Health check: `GET /health` returns `200 {"status":"ok"}` when DB is reachable.

---

## Onboarding a new business

As platform admin:

1. Log in at `https://app.cove.com/dashboard/login`.
2. **Admin → + New business**. Fill in name, slug (URL segment), currency,
   timezone, primary color, and an initial owner email + password.
3. Give the owner their login. They can now log in at the same URL to manage
   tours, availability, bookings, and settings.
4. Their booking page is instantly live at `https://book.<slug>.cove.com/`.
   To attach a custom domain later: edit the business in the admin panel,
   fill in `custom_domain`, and ask them to add a CNAME to `cove.com`.

The **one-link integration** you promise them: put this button on their site.

```html
<a href="https://book.theirbusiness.com/" style="…">Book Now</a>
```

That's it. No JS, no iframe.

Admins can also **Disable** a business (hides its booking page, keeps history)
or **Delete** it permanently. Delete refuses when the business has any booking
rows on record — financial history is preserved by `ON DELETE RESTRICT` on the
bookings FK; disable those businesses instead.

---

## How things fit together

### Tenant resolution (`cove/tenant.py`)

Every request goes through `resolve_business()` which looks at the `Host`
header and finds the business by:

1. `book.<slug>.<ROOT_DOMAIN>` → look up `businesses.slug`
2. Otherwise → look up `businesses.custom_domain`
3. Otherwise (dev only) → check `?business=<slug>` query param

The dashboard (`app.<ROOT_DOMAIN>`) and admin routes don't need a tenant — they
key off the logged-in user. The public routes 404 if no business is resolved.

### Booking lifecycle (`cove/services/bookings.py`)

```
POST /book            →  create_pending_booking()   status=pending
                         opay.create_checkout()     attach opay_session_id
                         redirect to O-Pay hosted checkout
Tourist pays          →  O-Pay redirects to /pay/success?session_id=…
                         mark_paid() fires optimistically for good UX
POST /webhooks/opay   →  mark_paid() again (idempotent) — canonical source of truth
Owner needs to refund →  Opens modal in dashboard → refunds manually in O-Pay Dashboard
O-Pay fires webhook   →  charge.refunded → apply_refund() → mark refunded + email customer
```

**Idempotency** is key:
- `mark_paid()` is safe to call multiple times (webhook + success page).
- `apply_refund()` skips the notification email when the cumulative
  `amount_refunded` hasn't grown, so replayed `charge.refunded` webhooks
  are harmless.
- `opay_session_id`/`opay_payment_id` are UNIQUE in the DB so duplicate
  webhooks can't create duplicate bookings.

### Booking lead time

Customers must give at least `BOOKING_LEAD_DAYS` (currently **2** — see the
constant in `cove/services/bookings.py`) days of notice. Enforced both
client-side (flatpickr `minDate`) and server-side (`/book` rejects earlier
dates).

### Reminders (`cove/services/bookings.py::send_due_reminders`)

The cron endpoint calls `send_due_reminders()` which finds paid bookings with
`booking_date = tomorrow` and `whatsapp_reminder_sent_at IS NULL` (indexed
predicate), sends via Twilio, and stamps the timestamp. Failures don't stamp —
so a re-run naturally retries.

### Auth (`cove/auth.py`)

Flask-Login sessions in an HTTPOnly, SameSite=Lax cookie. Passwords hashed
with PBKDF2-SHA256 via Werkzeug. Two roles:
- `admin` — platform admin, no `business_id`. Can enter any business.
- `owner` — belongs to one business, sees only their own data.

Every dashboard query is scoped to `current_user.business_id` (owners) or the
admin's active-impersonation session (admins).

---

## Tours: time slots + pricing modes

Each tour has a **duration** and a **buffer** between slots. Slots are derived
purely from those two numbers plus the business-wide operating window
(`09:00–15:00` — constants `OPERATING_START`/`OPERATING_END` at the top of
`cove/services/bookings.py`). A 60-minute tour with a 20-minute buffer yields
`09:00, 10:20, 11:40, 13:00`. Nothing is materialized in the DB.

Each tour picks a **pricing mode** and, for shared tours, a **pricing type**:

| Mode | Pricing type | How price is calculated | Capacity |
|---|---|---|---|
| **Shared** | **Single** | `price_cents × num_people` | seats pool up to `max_capacity` |
| **Shared** | **Age-based** | `adult_price_cents × adults + child_price_cents × children` | headcount pools up to `max_capacity` |
| **Private** | *(single only)* | flat `price_cents` for the whole group | one booking per slot; headcount ≤ `max_group_size` |

The customer flow is identical in all modes: pick date → pick time → enter
headcount → pay. All pricing and capacity logic lives in
`create_pending_booking()` and `seats_remaining()` — routes and templates just
render what those return.

### Availability overrides

Rows in `availability` are additive. A row with `slot_time IS NULL` overrides
the whole day; a row with a specific `slot_time` overrides just that slot.
Absence of a row = the tour's default is open. Blocking (`is_blocked = true`)
takes precedence over any capacity override.

### Slot-related endpoints

- `GET /api/tours/<id>/availability` — dates with at least one open slot,
  within a rolling 90-day window; also returns `earliest_date`.
- `GET /api/tours/<id>/slots?date=YYYY-MM-DD` — every slot for that date with
  `seats_remaining`. Full/blocked slots are still returned so the UI can grey
  them out.
- `GET /api/tours/<id>/seats?date=YYYY-MM-DD&time=HH:MM` — remaining capacity
  for a specific slot (refreshed as the customer adjusts headcount).

---

## Admin dashboard: platform vs impersonation

`/admin/*` is the **platform-operator** view: just the business list, "New
business" form, and edit pages. The platform admin has no business identity.

To see a specific business's data, an admin clicks **Enter dashboard** which
posts to `/admin/businesses/<id>/enter`, sets
`session["admin_active_business_id"]`, and redirects to `/dashboard/`. From
then on:

- The owner nav (Overview / Bookings / Tours / Availability / Settings) appears.
- An amber banner shows the business name and an "Exit to admin" button.
- Every dashboard query is scoped to that specific business.

Navigating to any `/admin/*` page (or clicking Exit) clears the flag. Admins
never resolve to a "default" business silently: an admin hitting `/dashboard/*`
with no active impersonation is redirected to `/admin/`.

---

## O-Pay integration notes

- **Create session:** `POST /api/v1/payments` with `amount` (smallest currency
  unit), `currency`, `customer.email`, `customer.name`, `success_url`,
  `cancel_url`. We include `metadata.booking_id` so the webhook can find the
  booking without querying by session ID.
- **Return URL:** O-Pay appends `?session_id=<id>` when redirecting back.
- **Webhook:** `POST /webhooks/opay` — payload shape: `{event, data, timestamp}`.

  | Event | Action |
  |---|---|
  | `payment.succeeded`, `checkout.completed`, `payment.captured` | `mark_paid()` |
  | `payment.failed`, `payment.cancelled`, `checkout.expired` | `mark_failed()` |
  | `charge.refunded`, `payment.refunded` | `apply_refund()` |

- **Signature verification:** HMAC-SHA256 over the raw body, compared against
  `X-Opay-Signature` (fallback: `X-Signature`). If `OPAY_WEBHOOK_SECRET` is
  blank, verification is bypassed with a warning log (dev only — **always set
  in production**).
- **Refunds:** No O-Pay refund API is called from Cove. The owner clicks
  **Refund** on a booking detail page, which opens a modal with step-by-step
  instructions and a direct link to `https://opay.orbtronics.co/dashboard/transactions`.
  Once the owner processes the refund in O-Pay, the `charge.refunded` webhook
  fires back and Cove:
  1. Records `refund_amount_cents` (cumulative from `data.amount_refunded`).
  2. Sets `status = 'refunded'` when `data.refunded == true` (full refund).
  3. Sends the customer a refund confirmation email.

---

## Account self-service

Owners can manage their own credentials from **Dashboard → Account**:

| Feature | How it works |
|---|---|
| **Forgot password** | `/dashboard/forgot-password` — sends a 1-hour single-use reset link. Token is SHA-256 hashed at rest. |
| **Change password** | Requires current password; enforced in `accounts.change_password()`. |
| **Change email** | Sends a 24-hour verification link to the *new* address. Email is only updated on click. 30-day cooldown enforced via `users.email_changed_at`. |

All token logic lives in `cove/services/accounts.py`. Tokens are single-use
and SHA-256 hashed before storage.

---

## Cancellation policy

The policy is stored in [`cancellationpolicy.md`](cancellationpolicy.md) and
rendered inline on every tour's booking page as a collapsible accordion
section, positioned above the Pay Now button. To update the policy wording,
edit that file — no template changes needed.

**Current policy summary:**
- Cancel > 24h before departure → 100% refund (5–7 business days).
- Reschedule > 24h before departure → free, no fee.
- Cancel / no-show ≤ 24h before departure → non-refundable, no reschedule.
- Operator cancels (weather/safety) → customer's choice of full refund or free reschedule.

---

## Security

- **CSRF:** Flask-WTF `CSRFProtect` guards every state-changing form. Webhook
  and cron endpoints are exempt (they use HMAC / bearer token instead).
- **Rate limiting:** Flask-Limiter, 1000 req/hour default globally and 30/hour
  on the public booking blueprint (checkout creation).
- **Password storage:** PBKDF2-SHA256 with 16-byte salt (Werkzeug default).
- **Session cookie:** `HttpOnly`, `SameSite=Lax`, `Secure` in production.
- **SQL injection:** all queries go through supabase-py (PostgREST) with
  parameter binding — no raw SQL strings from user input.
- **Input validation:** phone numbers normalized to E.164; emails validated
  with `email-validator`; slugs constrained by a Postgres CHECK constraint;
  `booking_time` server-validated against the tour's generated slot set.
- **CSP:** default-src 'self' plus explicit allow for the Tailwind CDN, Google
  Fonts, and jsdelivr (flatpickr). Frame ancestors locked to 'self'.
- **Webhook signature verification:** HMAC-SHA256, constant-time compare.
- **Uploads:** none. Logo/image fields take URLs only, so no file-upload
  attack surface.
- **Reset tokens:** SHA-256 hashed at rest, single-use, time-limited (1h
  password reset, 24h email change).

---

## Making changes

- **New route?** Add it to the appropriate blueprint in `cove/routes/`.
- **New DB column?** Edit `migrations/initial_schema.sql` for fresh installs
  AND write an additive migration (`ALTER TABLE ... ADD COLUMN ...`) in the
  next numbered file (see `002`–`004` for the pattern). Run in the Supabase
  SQL editor.
- **New email template?** Edit the inline HTML in `cove/services/bookings.py`
  — kept inline to avoid extra dependencies.
- **Change branding on a tenant's booking page?** Their `primary_color` and
  `logo_url` in the `businesses` table are the only knobs.
- **Change operating hours or lead time?** `OPERATING_START`, `OPERATING_END`,
  and `BOOKING_LEAD_DAYS` at the top of `cove/services/bookings.py`.
- **Update cancellation policy?** Edit `cancellationpolicy.md` — it's rendered
  directly on the booking page.
