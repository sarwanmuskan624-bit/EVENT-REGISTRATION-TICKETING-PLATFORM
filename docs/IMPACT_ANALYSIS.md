# EventHub – Impact Analysis

## Intended impact
EventHub is designed to make college event registration and entry management more organized by moving common tasks into one web application.

| Area | Intended benefit | Current evidence/limitation |
|---|---|---|
| Registration | Standardized online attendee details | Registration workflow is implemented; no comparative study performed |
| Duplicate prevention | Reduce repeated registration for same event/email | Backend checks for an existing registration |
| Ticketing | Give each attendee a unique digital ticket | Ticket ID and QR generation implemented |
| Entry management | Faster lookup and repeat-entry prevention | QR/manual validation and duplicate check-in protection implemented |
| Administration | Centralized event and registration management | Admin workspace and CRUD features implemented |
| Reporting | Summaries and spreadsheet export | Dashboard reports and CSV export implemented |

## Stakeholders
- Students/attendees: browse events, register and keep a digital ticket.
- Event coordinators: manage event details and attendee records.
- Entry volunteers: validate tickets at the event entrance.

## Risks and limitations
- Demo payment is not a real payment transaction.
- Email notifications and automated ticket delivery are not available.
- Event capacity and configurable registration cut-off are not enforced.
- The platform depends on internet access and hosted services.
- Admin/database access depends on correctly configured Supabase Auth and RLS policies.

## Evaluation plan
A future evaluation can compare time required for manual versus QR-based check-in, count duplicate registration attempts rejected, collect attendee feedback, and measure report preparation time. No quantitative user evaluation has been conducted.

## Conclusion
EventHub provides an academic prototype for event discovery, registration, QR ticketing, administrative management and reporting. Its impact is demonstrated as workflow functionality, not as a measured real-world efficiency claim.
