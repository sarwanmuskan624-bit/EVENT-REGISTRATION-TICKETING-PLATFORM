# EventHub – Event Registration & Ticketing Platform

EventHub is a web-based event registration and ticketing platform designed for college events. Event organisers can sign in, manage their own events, track registrations and attendance, scan QR tickets, and view reports. Attendees can open a secure event-specific registration link, register, receive a digital ticket, and print it.

## Live Demo

- **Website:** https://sarwanmuskan624-bit.github.io/EVENT-REGISTRATION-TICKETING-PLATFORM/
- **Backend API:** https://event-registration-ticketing-platform.onrender.com
- **GitHub Repository:** https://github.com/sarwanmuskan624-bit/EVENT-REGISTRATION-TICKETING-PLATFORM

## Key Features

### Public website and attendee registration
- Public homepage is accessible without signing in.
- Logged-out visitors do not see organisers' private event lists.
- Each signed-in organiser sees only their own events.
- Each event has a shareable, token-based registration link.
- The public registration link opens only the selected event.
- Attendee form validates name, email and phone number.
- Duplicate registration for the same event and email is prevented.
- Successful registration creates a unique Ticket ID and QR code.
- Attendees can view and print their ticket.
- A clearly labelled demo payment flow is available for project demonstration; it does not charge real money.

### Organiser dashboard
- Supabase email/password authentication.
- Create, edit and delete events.
- View and manage registrations for the organiser's own events.
- Search and update registration details/status.
- View reports and event analytics.
- Export registration data as CSV.
- Scan QR tickets or enter a Ticket ID manually.
- Check ticket payment status before check-in.
- Prevent invalid tickets and duplicate check-ins.
- User data is separated by organiser account.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, JavaScript, Vite, CSS |
| Backend | Node.js, Express 5 |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| QR code generation | qrcode.react |
| QR code scanning | html5-qrcode |
| Frontend hosting | GitHub Pages |
| Backend hosting | Render |

## Project Structure

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
├── docs/
│   ├── PROJECT_DOCUMENTATION.md
│   ├── TESTING.md
│   └── IMPACT_ANALYSIS.md
├── index.html
├── vite.config.js
└── package.json
```

## Requirements

- Node.js 20 or newer recommended
- npm
- A Supabase project

## Environment Setup

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

Use your own Supabase project values. Never commit real `.env` files, expose a service-role/secret key, or put the backend secret in frontend code. In production, configure the backend secret in Render environment settings. Only the public anon/publishable key belongs in the frontend.

## Run Locally

Open two terminals from the project root.

**1. Start the frontend**

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually http://localhost:5173).

**2. Start the backend**

```bash
cd server
npm install
npm start
```

The API listens on port 5000 by default. For local end-to-end testing, configure the frontend API URL to use your local backend.

### Useful scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start Vite development server |
| `npm run build` | Build the frontend for production |
| `npm run preview` | Preview the production build |
| `npm run server` | Start the backend |
| `npm run test:api` | Run API smoke tests |

## Main API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Backend health message |
| GET | `/api/health` | API health check |
| GET | `/api/events` | Get events belonging to the authenticated organiser |
| GET | `/api/public-events/:token` | Retrieve one event using its registration token |
| POST | `/api/registrations` | Validate attendee details and create a registration |
| POST | `/api/demo-payment` | Simulate payment status for demonstration |
| POST | `/api/validate-ticket` | Validate a ticket and check in the attendee |

## Data and Access Control

The application uses Supabase PostgreSQL tables for events and registrations. Event records are associated with an organiser account. Authenticated event requests are filtered by the signed-in user's ID, and ticket scanning checks that the event belongs to the current organiser. Public registration uses an event-specific registration token rather than exposing an organiser's full event list.

Keep Supabase Row Level Security (RLS) enabled and configure policies carefully. The live database schema and policies are authoritative; review them in Supabase when setting up another environment.

## Deployment

- **Frontend:** GitHub Pages
- **Backend:** Render
- **Database and authentication:** Supabase

The Vite base path is configured for this GitHub Pages repository.

## Limitations and Future Improvements

- **Payment is simulated only.** The project does not integrate a real payment gateway and does not charge money.
- Registration confirmation emails are not currently implemented.
- Event capacity limits are not currently enforced.
- A configurable registration deadline is not currently implemented.
- Future improvements could include a real payment gateway with server-side verification, confirmation emails, capacity management and downloadable PDF tickets.

## Additional Documentation

- [Project documentation](./docs/PROJECT_DOCUMENTATION.md)
- [Testing plan and regression checklist](./docs/TESTING.md)
- [Impact analysis](./docs/IMPACT_ANALYSIS.md)
