# EventHub Testing Plan and Results

## Test approach
The project has previously been exercised manually during development. A repeatable API smoke-test suite is included in server/test/api.test.js. It checks safe read/invalid-input paths against the deployed backend and does not create registrations or change payment/attendance data.

Run from the repository root: npm run test:api

For a local backend in PowerShell: set $env:API_URL="http://localhost:5000" then run npm run test:api.

## Automated API test cases
| ID | Test | Expected result |
|---|---|---|
| API-01 | GET /api/health | HTTP 200 and success=true |
| API-02 | GET /api/events | HTTP 200 and JSON array |
| API-03 | POST /api/registrations with empty body | HTTP 400; event selection validation |
| API-04 | POST /api/validate-ticket with empty body | HTTP 400; ticket code required |
| API-05 | POST /api/demo-payment with empty body | HTTP 400; ticket code required |

## Manual end-to-end regression checklist
Use a disposable test event and test attendee. Do not delete real records or use personal contact information.

| ID | Action | Expected result |
|---|---|---|
| UI-01 | Open public home page | Events load without a blank/error page |
| UI-02 | Submit valid registration | Registration succeeds and unique Ticket ID appears |
| UI-03 | Register same email for same event again | Duplicate registration is rejected |
| UI-04 | View digital ticket | Ticket details and QR code are visible |
| UI-05 | Print ticket | Browser print dialog opens |
| UI-06 | Complete demo payment for a paid ticket | UI says demo; status becomes Paid; no money is charged |
| UI-07 | Scan Paid ticket QR or enter Ticket ID | First check-in succeeds and attendee becomes Present |
| UI-08 | Validate same ticket again | Duplicate check-in is rejected |
| UI-09 | Validate random/invalid Ticket ID | Invalid ticket is rejected |
| UI-10 | Admin creates, edits and deletes a disposable test event | Each change is reflected in event list |
| UI-11 | Search registrations and open a ticket | Matching record and ticket are shown |
| UI-12 | Open Reports & Analytics | Counts and charts render |
| UI-13 | Export registrations CSV | CSV downloads and opens in spreadsheet software |
| UI-14 | Sign out and open admin workspace | Admin authentication is required |

## Previously observed during project walkthrough
The user previously confirmed successful registration, demo-payment status showing Paid, successful manual Ticket ID check-in, and rejection of a second check-in. The user also confirmed the CSV export control was visible on Reports & Analytics. These are conversation-reported checks, not a fresh automated test execution.

## Result recording
Do not mark a test as passed until it has been run on the current deployment. Record date, browser, test ID, actual result and pass/fail status after running the suite and manual checklist.
