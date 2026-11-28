# EventHub Testing Plan and Results

## Test approach
The project has been exercised manually during development. A repeatable API smoke-test suite is included in server/test/api.test.js. It checks the health endpoint, authentication requirements and invalid-input paths against the deployed backend. The suite does not create registrations or change payment/attendance data.

Run from the repository root: `npm run test:api`

For a local backend in PowerShell: `$env:API_URL="http://localhost:5000"` then run the command above.

## Automated API test cases
| ID | Test | Expected result |
|---|---|---|
| API-01 | GET /api/health | HTTP 200 and success=true |
| API-02 | GET /api/events without bearer token | Request is rejected because authentication is required |
| API-03 | POST /api/registrations with an empty request | Request is rejected; no registration is created |
| API-04 | GET /api/public-events/:token with a malformed token | Request is rejected as an invalid event link |
| API-05 | Demo payment with a ticket code but without matching registered email details | Payment simulation is rejected |
| API-06 | POST /api/validate-ticket with an empty ticket code | Request is rejected; ticket code is required |
| API-07 | Demo payment without a ticket code | Payment simulation is rejected; ticket code is required |

## Latest automated API test run
The following result was recorded from the deployed API test command on 28 November 2026:

- Tests: 7
- Passed: 7
- Failed: 0
- Skipped: 0

These are the results shown by the latest `npm run test:api` execution. Run the suite again after relevant backend changes.

## Production build check
On 28 November 2026, `npm run build` completed successfully using Vite 8.3.5 and generated the `dist` folder. Vite displayed a bundle-size warning because the generated JavaScript chunk was larger than 500 kB; this was a warning, not a build failure.

## Manual end-to-end regression checklist
Use two test accounts and disposable test events. Do not delete real records or use personal contact information.

| ID | Action | Expected result |
|---|---|---|
| UI-01 | Open public homepage while signed out | General homepage opens; no users' event list is displayed |
| UI-02 | Sign in with account A | Account A's dashboard opens |
| UI-03 | Open homepage while signed in as A | Only A's own events are displayed |
| UI-04 | Create an event as A | Event appears in A's workspace |
| UI-05 | Copy A's event registration link and open it signed out | Registration page shows only the event linked by that token |
| UI-06 | Submit valid attendee details | Registration succeeds and unique Ticket ID appears |
| UI-07 | Register same email for same event again | Duplicate registration is rejected |
| UI-08 | View digital ticket | Ticket details and QR code are visible |
| UI-09 | Print ticket | Browser print dialog opens |
| UI-10 | Complete demo payment for a paid ticket | UI says demo; status becomes Paid; no money is charged |
| UI-11 | Scan Paid ticket QR or enter Ticket ID as event owner | First check-in succeeds and attendee becomes Present |
| UI-12 | Validate same ticket again | Duplicate check-in is rejected |
| UI-13 | Validate random/invalid Ticket ID | Invalid ticket is rejected |
| UI-14 | Sign in with account B | B sees only B's own events and registrations |
| UI-15 | Sign out | Returns to general homepage; account event list is cleared |
| UI-16 | Open Reports & Analytics and export CSV | Reports render and CSV downloads |
| UI-17 | Admin creates, edits and deletes a disposable test event | Each change is reflected in the event list |

## Previously observed during project walkthrough
The user previously reported that the public homepage, logout behavior, account-specific event visibility and second-account checks worked. They also confirmed successful registration, Ticket ID/QR generation, demo-payment status, manual Ticket ID check-in, rejection of a second check-in, and CSV export control visibility. Mobile layout was also checked in browser device emulation. These are conversation-reported checks, not a fresh automated test execution.

## Result recording
For future manual regression runs, record the date, browser, test ID, actual result and pass/fail status. Do not mark a manual test as passed unless it has been run on the current deployment.
