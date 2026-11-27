# EventHub – Impact Analysis

## Intended impact
EventHub is designed to make college event registration and entry management more organized by giving each organizer a separate event workspace and providing attendees with a direct event-specific registration link.

| Area | Intended benefit | Current evidence/limitation |
|---|---|---|
| Account separation | Keep each user's events and registrations within their own workspace | Frontend event queries filter by authenticated owner ID; backend event listing and ticket validation check ownership |
| Public privacy | Avoid showing every user's events on the public homepage | Logged-out homepage receives an empty event list |
| Registration | Standardize attendee details through a web form | Registration workflow is implemented through a token-based event link |
| Duplicate prevention | Reduce repeated registration for the same event/email | Backend checks for an existing registration |
| Ticketing | Give each attendee a unique digital ticket | Ticket ID and QR generation implemented |
| Entry management | Support ticket lookup and repeat-entry prevention | Authenticated QR/manual validation and duplicate check-in protection implemented |
| Administration | Centralize event and registration management | Organizer dashboard and event CRUD features implemented |
| Reporting | Summarize records and export data | Dashboard reports and CSV export implemented |

## Stakeholders
- Event organizers: create and manage their own events and review their attendee records.
- Students/attendees: open an event-specific link, register and keep a digital ticket.
- Entry volunteers working with an organizer: validate tickets at the event entrance.

## Risks and limitations
- Demo payment is not a real payment transaction.
- Email notifications and automated ticket delivery are not available.
- Event capacity and configurable registration cut-off are not enforced.
- The public homepage does not provide a global directory of all users' events; attendees need the organizer's registration link.
- The platform depends on internet access and hosted services.
- Admin/database access depends on correctly configured Supabase Auth, RLS policies and backend authorization checks.

## Evaluation plan
A future evaluation can compare time required for manual versus QR-based check-in, count duplicate registration attempts rejected, test whether one account can access another account's events, collect attendee feedback, and measure report preparation time. No quantitative user evaluation has been conducted.

## Conclusion
EventHub provides an academic prototype for separate organizer workspaces, event-specific attendee registration, QR ticketing, administrative management and reporting. Its impact is demonstrated as workflow functionality, not as a measured real-world efficiency claim.
