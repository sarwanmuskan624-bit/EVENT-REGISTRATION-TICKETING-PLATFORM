import test from "node:test";
import assert from "node:assert/strict";

const API_URL = (process.env.API_URL || "https://event-registration-ticketing-platform.onrender.com").replace(/\/$/, "");

async function request(path, options) {
  const response = await fetch(`${API_URL}${path}`, options);
  const body = await response.json();
  return { response, body };
}

test("API health endpoint responds successfully", async () => {
  const { response, body } = await request("/api/health");
  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.service, "EventHub API");
});

test("events endpoint requires authentication", async () => {
  const { response, body } = await request("/api/events");
  assert.equal(response.status, 401);
  assert.match(body.error, /sign in/i);
});

test("registration rejects an empty request without creating a record", async () => {
  const { response, body } = await request("/api/registrations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  assert.equal(response.status, 400);
  assert.match(body.error, /event/i);
});

test("public event lookup rejects a malformed registration token", async () => {
  const { response, body } = await request("/api/public-events/not-a-valid-token");
  assert.equal(response.status, 400);
  assert.match(body.error, /invalid event link/i);
});

test("demo payment requires the registered email as well as the ticket code", async () => {
  const { response, body } = await request("/api/demo-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticket_code: "EHT-INVALID" })
  });
  assert.equal(response.status, 400);
  assert.match(body.error, /email/i);
});

test("ticket validation rejects an empty ticket code", async () => {
  const { response, body } = await request("/api/validate-ticket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  assert.equal(response.status, 400);
  assert.equal(body.success, false);
});

test("demo payment rejects a missing ticket code", async () => {
  const { response, body } = await request("/api/demo-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  assert.equal(response.status, 400);
  assert.match(body.error, /ticket/i);
});
