# EventHub – Project Documentation

## 1. Project overview
EventHub is a web-based event registration and ticketing platform. Each signed-in account has its own event workspace. A logged-out visitor sees the general homepage without another user's event list. An organizer can share a unique event registration link with attendees, who can register and receive a digital ticket with a unique Ticket ID and QR code.

## 2. Problem statement
Manual event registration and entry checking can involve paper lists, repeated data entry, slow verification and difficulty preparing attendance reports. EventHub provides a web-based workflow for organizers to manage their own events, collect attendee registrations through event-specific links, issue tickets and validate entry.

## 3. Objectives
- Allow users to create an account and sign in.
- Keep each user's events and registrations separated from other users' workspaces.
- Create, edit and delete events.
- Provide a unique shareable registration link for each event.
- Validate attendee details and reject duplicate registrations for the same event/email.
- Issue a unique digital Ticket ID and QR code.
- Allow the event owner to validate tickets and prevent repeated check-ins.
- Provide dashboard summaries, reports and CSV export.

## 4. Scope and limitations
The current implementation is an academic demonstration. Payment is a demo simulation, not a payment gateway. It does not charge money or verify a bank/card transaction. Email delivery, event capacity enforcement and configurable registration deadlines are not implemented. The public homepage does not display all users' events; event details are accessed by attendees through a specific event registration link.

## 5. Technology stack
| Layer | Technology |
|---|---|
| Frontend | React 19, JavaScript, Vite, CSS |
| Backend | Node.js, Express |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| QR generation | qrcode.react |
| QR scanning | html5-qrcode |
| Frontend hosting | GitHub Pages |
| Backend hosting | Render |

This is a React + Express + Node application using Supabase/PostgreSQL.

## 6. System architecture
1. The browser loads the React application from GitHub Pages.
2. Supabase Auth manages user sign-in and session state.
3. A signed-in user loads events filtered by their authenticated user ID.
4. The Express backend hosted on Render accesses Supabase PostgreSQL using a server-side secret.
5. An organizer shares an event-specific URL containing a registration token.
6. The public registration page asks the backend to resolve that token to one event; attendees submit their details through the registration API.
7. QR tickets are generated in the frontend and validated by the backend at check-in.

## 7. Main modules
### Account and homepage
- General public homepage is available without signing in.
- Logged-out visitors do not see users' event lists.
- Users can sign in or create an account through the Admin/login entry.
- After sign-in, the user can open their own homepage and dashboard.

### Organizer workspace
- Supabase email/password authentication.
- Dashboard summary.
- Create, edit and delete owned events.
- View and search registrations for owned events.
- Review ticket, payment and attendance status.
- QR scanner and manual Ticket ID validation.
- Reports, charts and CSV export.

### Attendee registration
- Organizer shares a unique event registration URL.
- The URL uses a registration token rather than exposing a sequential event ID as the public link.
- The attendee enters name, email and phone number.
- Backend validates the token and details, checks for a duplicate registration for that event/email, and creates a ticket.
- Attendee can view and print the digital ticket.
- Paid-event demo payment can be simulated; it is not a real transaction.

## 8. Database design
The application uses Supabase PostgreSQL. The following are the key fields referenced by the application; verify the live Supabase schema for exact types, constraints and any additional columns.

### events
| Field | Purpose |
|---|---|
| id | Event identifier |
| owner_id | Authenticated user ID who owns the event |
| name | Event name |
| event_date | Event date |
| venue | Event venue |
| ticket_price | Ticket price |
| registration_token | Unique token used in the attendee registration link |

### registrations
| Field | Purpose |
|---|---|
| id | Registration identifier |
| event_id | Related event |
| student_name | Attendee name |
| email | Attendee email |
| phone | Contact number |
| ticket_code | Unique ticket identifier |
| payment_status | Pending/Paid project status |
| attendance_status | Absent/Present |
| created_at | Registration timestamp |

The event's owner relationship is used to scope organizer event access. Registration records are loaded for the signed-in user's event IDs. Supabase Row Level Security (RLS) policies should remain enabled and aligned with these ownership rules.

## 9. API summary
| Method | Route | Purpose |
|---|---|---|
| GET | /api/health | API health check |
| GET | /api/events | Authenticated list of the signed-in user's events |
| GET | /api/public-events/:token | Resolve a single event from its registration token |
| POST | /api/registrations | Validate event token and attendee details; create registration |
| POST | /api/demo-payment | Academic demo payment status update; no real payment |
| POST | /api/validate-ticket | Authenticated ticket validation and event-owner check-in |

## 10. Security and access control
- Keep the Supabase service/secret key only in Render environment variables or a private server .env file. Never put it in frontend code or commit it to GitHub.
- The browser uses the Supabase public anon/publishable key.
- Event queries are filtered by the signed-in user's ID; the backend events endpoint also verifies the bearer token and filters by owner_id.
- The ticket-validation API verifies the signed-in user and checks that the ticket belongs to an event owned by that user.
- Public attendee registration is limited to an event resolved by its registration token.
- Keep Supabase RLS enabled and periodically review table policies. A service-role backend bypasses RLS, so every privileged backend route must perform its own authorization and validation.
- The demo-payment endpoint is a demonstration feature, not a production payment flow. Do not use it to process real payments.

## 11. Deployment
- Frontend: https://sarwanmuskan624-bit.github.io/EVENT-REGISTRATION-TICKETING-PLATFORM/
- Backend: https://event-registration-ticketing-platform.onrender.com
- Source repository: https://github.com/sarwanmuskan624-bit/EVENT-REGISTRATION-TICKETING-PLATFORM
- Database and authentication: Supabase

## 12. Testing
A repeatable API smoke-test suite is available at server/test/api.test.js. Run it from the repository root using npm run test:api. It checks safe health, response-shape and invalid-input paths. It does not replace manual end-to-end testing. See TESTING.md for the checklist and previously reported walkthrough results.

## 13. Expected outcomes
- Keeps each organizer's event workspace separate.
- Gives attendees a direct registration route for one specific event.
- Reduces manual ticket lookup through QR and Ticket ID validation.
- Helps organizers review attendance and registration summaries.
These are intended workflow benefits; no comparative user study or measured time-saving evaluation has been conducted.

## 14. Future enhancements
- Integrate a payment gateway in test mode with server-side signature verification.
- Send registration confirmation emails.
- Add event capacity and configurable registration deadlines.
- Add downloadable PDF tickets.
- Expand automated tests for authorization, account isolation and complete registration flows.
