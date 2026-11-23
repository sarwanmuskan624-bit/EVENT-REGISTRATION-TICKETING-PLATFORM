# EventHub – Project Documentation

## 1. Project overview
EventHub is a web-based event registration and ticketing platform. Visitors can discover college events, register, receive a digital ticket with a unique Ticket ID and QR code, and print the ticket. Administrators can manage events and registrations, record demo payment status, validate tickets at entry, and review reports.

## 2. Problem statement
Manual event registration and entry checking can involve paper lists, repeated data entry, slow verification and difficulty preparing attendance reports. EventHub provides a centralized workflow for event discovery, registration, ticket generation and attendee check-in.

## 3. Objectives
- Publish and manage event details.
- Accept and validate attendee registrations.
- Reduce duplicate registrations for the same event/email.
- Issue a unique digital ticket and QR code.
- Allow administrators to validate tickets and avoid repeated check-ins.
- Summarize registrations, payment labels and attendance.
- Export registration data for spreadsheet use.

## 4. Scope and limitations
The current implementation is an academic demonstration. Payment is a demo simulation, not a payment gateway. It does not charge money or verify a bank/card transaction. Email delivery, event capacity enforcement and configurable registration deadlines are not implemented. Do not represent this as a production payment service.

## 5. Technology stack
| Layer | Technology |
|---|---|
| Frontend | React 19, JavaScript, Vite, CSS |
| Backend | Node.js, Express 5 |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| QR generation | qrcode.react |
| QR scanning | html5-qrcode |
| Frontend hosting | GitHub Pages |
| Backend hosting | Render |

This is a React + Express + Node application using Supabase/PostgreSQL. MongoDB is not part of the current implementation; the selected project brief's database options should be followed.

## 6. System architecture
1. The browser loads the React application from GitHub Pages.
2. The React frontend calls the Express API hosted on Render.
3. The Express backend accesses Supabase PostgreSQL using a server-side secret.
4. Supabase Auth handles administrator sign-in from the frontend.
5. QR tickets are generated in the frontend and validated by the backend at check-in.

## 7. Main modules
### Public module
- Event listing and event details.
- Registration form with name, email and phone validation.
- Duplicate registration check.
- Unique Ticket ID and QR ticket.
- Demo payment simulation for paid tickets.
- Ticket view and print.

### Administrator module
- Supabase email/password sign-in.
- Dashboard summary.
- Event create, edit and delete.
- Registration search, view and delete.
- Payment and attendance status controls.
- QR scanner and manual Ticket ID validation.
- Reports, charts and CSV export.

## 8. Database design
### events
| Field | Purpose |
|---|---|
| id | Event identifier |
| name | Event name |
| event_date | Event date |
| venue | Event venue |
| ticket_price | Ticket price |

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

The live Supabase schema is authoritative. Confirm column types, constraints, indexes and RLS policies in Supabase before making schema changes.

## 9. API summary
| Method | Route | Purpose |
|---|---|---|
| GET | /api/health | API health check |
| GET | /api/events | List events |
| POST | /api/registrations | Validate and create registration |
| POST | /api/demo-payment | Academic demo payment status update |
| POST | /api/validate-ticket | Validate ticket and check in attendee |

## 10. Security considerations
- Keep the Supabase service-role/secret key only in Render environment variables or a private server .env file.
- Never commit real .env files or put a service key in browser code.
- Use the frontend anon/publishable key only in the browser.
- Keep Supabase RLS enabled and review policies so public users cannot access administrator data.
- Restrict CORS to the deployed frontend and approved local development origins.
- Demo payment is not a substitute for gateway signature verification and must not be used for real payments.

## 11. Deployment
- Frontend: https://sarwanmuskan624-bit.github.io/EVENT-REGISTRATION-TICKETING-PLATFORM/
- Backend: https://event-registration-ticketing-platform.onrender.com
- Source repository: https://github.com/sarwanmuskan624-bit/EVENT-REGISTRATION-TICKETING-PLATFORM

## 12. Testing
Run the API smoke tests from the project root using npm run test:api. The tests call the deployed API by default. To test a local backend in Windows PowerShell, set API_URL to http://localhost:5000 before running the command. See TESTING.md for test cases and manual end-to-end checks.

## 13. Impact and expected outcomes
- Centralizes event and registration information.
- Reduces manual attendee lookup through Ticket ID/QR validation.
- Helps administrators review attendance and registration summaries.
- Provides exportable data for follow-up and record keeping.
These are expected workflow benefits; no comparative user study or measured time-saving evaluation has been conducted.

## 14. Future enhancements
- Integrate a payment gateway in test mode and verify server-side payment signatures.
- Send registration confirmation emails.
- Add event capacity and configurable registration deadlines.
- Add downloadable PDF tickets.
- Add automated integration tests and role-based authorization checks.
