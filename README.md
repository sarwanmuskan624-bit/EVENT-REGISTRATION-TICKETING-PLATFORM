# EventHub – Event Registration & Ticketing Platform

EventHub is a student event-registration platform. Visitors can browse events, register, receive a QR ticket and print it. Administrators can sign in, manage events and registrations, view reports, update payment/attendance status and scan tickets.

## Features

### Public website
- Browse events loaded from the Express API.
- Register with name, email and phone.
- Receive a ticket with a unique ticket code and QR code.
- Prevent duplicate registrations for the same event using the same email address.
- Validate name, email, phone number and event availability before saving a registration.
- Complete a clearly labelled demo payment for college-project presentation; no real money is charged.
- Print the ticket.

### Admin workspace
- Supabase email/password authentication.
- Dashboard overview.
- Create and delete events.
- Search, update and delete registrations.
- Payment and attendance status management.
- Reports for event registrations, payment status, attendance and estimated paid ticket value.
- Export registration records as a CSV spreadsheet.
- QR scanner that validates a ticket and marks it as Present; manual Ticket ID verification is also available if camera access is unavailable.
- Reject invalid tickets and prevent a second check-in for an already-used ticket.

## Technology
- React 19 + Vite
- Supabase Database and Authentication
- Express 5 backend hosted separately
- qrcode.react and html5-qrcode
- GitHub Pages frontend deployment

## Project structure
```text
.
├── src/
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   ├── main.jsx
│   └── supabaseClient.js
├── server/
│   ├── server.js
│   └── package.json
├── index.html
├── vite.config.js
└── package.json
```

## Requirements
- Node.js 20 or newer recommended
- npm
- A Supabase project

## Environment variables

Create a root `.env` file for the frontend:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
```

Create `server/.env` for the backend:
```env
PORT=5000
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SECRET_KEY=YOUR_SUPABASE_SERVICE_ROLE_SECRET
```

Keep both real `.env` files private. Never commit a service-role/secret key or share it in screenshots. The backend Supabase secret belongs only on the server (for local use in `server/.env`, and in Render environment settings in production). Never place either secret in frontend code or GitHub. The frontend must use only the Supabase anon/publishable key.

## Supabase data

The application expects two tables.

### events
- `id`
- `name`
- `event_date`
- `venue`
- `ticket_price`

### registrations
- `id`
- `event_id`
- `student_name`
- `email`
- `phone`
- `ticket_code`
- `payment_status`
- `attendance_status`
- `created_at`

The backend writes registration fields `student_name`, `email`, `phone`, `ticket_code`, `payment_status`, and `attendance_status`. Make sure the existing Supabase table has these columns. This version uses `student_name`; an additional `full_name` column is not required.

## Run locally

Open two terminals from the project root.

### 1. Frontend
```bash
npm install
npm run dev
```
Open the local URL printed by Vite (usually http://localhost:5173).

### 2. Backend
```bash
cd server
npm install
npm start
```
The API listens on port 5000 by default. The frontend's `API_URL` in `src/App.jsx` currently points to the hosted Render API; change it to your local backend URL only when testing locally.

### Other scripts
- `npm run build` – production frontend build
- `npm run preview` – preview the production build
- `npm run server` – start the backend using its installed dependencies

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Backend health message |
| GET | `/api/events` | List events |
| POST | `/api/registrations` | Create registration and ticket code |
| POST | `/api/demo-payment` | Simulate a project demo payment and mark ticket Paid |
| POST | `/api/validate-ticket` | Validate QR ticket and check in attendee |
| GET | `/api/health` | Backend health check |

**Demo payment note:** The project uses a clearly labelled payment simulation for academic demonstration. It does not connect to a payment gateway and does not charge real money. The demo endpoint is not suitable for a production ticketing or payment system.

## Deployment
- Frontend: GitHub Pages
- Backend: Render
- Database and authentication: Supabase

The Vite `base` setting is configured for the repository's GitHub Pages path. A frontend build can be checked with `npm run build`.

## Important security notes
- Never put a Supabase service-role/secret key in frontend code or GitHub.
- Keep `.env` files out of version control (the repository `.gitignore` excludes them).
- Configure Supabase Row Level Security policies intentionally. Do not disable RLS as a workaround.
- The admin UI is protected by Supabase sign-in, but database permissions must also be enforced by Supabase policies.

## Known scope / limitations
- Demo payment is a simulation only. Real payments would require a payment gateway integration, merchant onboarding and security review.
- Email confirmations are not implemented. Users can print tickets or use the browser's Save as PDF option.
- Event capacity limits are not enforced.
- Registration closes at the end of the event date; there is no separate configurable registration deadline.
- The backend uses a server-side Supabase secret, so keep that secret private and rotate it if it is ever exposed.
