import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = new Set([
  "https://sarwanmuskan624-bit.github.io",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175"
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error("This website is not allowed to access the EventHub API."));
  }
}));
app.use(express.json({ limit: "20kb" }));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase environment variables are missing");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

app.get("/", (_req, res) => {
  res.json({
    message: "EventHub Backend API is running!",
    status: "healthy"
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ success: true, service: "EventHub API" });
});

app.get("/api/events", async (req, res) => {
  try {
    const authorization = String(req.headers.authorization || "");
    const accessToken = authorization.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";

    if (!accessToken) {
      return res.status(401).json({ error: "Please sign in to view your events." });
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData?.user) {
      return res.status(401).json({ error: "Your session is invalid. Please sign in again." });
    }

    const { data, error } = await supabase
      .from("events")
      .select("id, name, event_date, venue, ticket_price, registration_token")
      .eq("owner_id", authData.user.id)
      .order("event_date", { ascending: true });

    if (error) {
      console.error("EVENTS ERROR:", error.message);
      return res.status(500).json({ error: "Unable to load your events right now." });
    }

    return res.json(data || []);
  } catch (error) {
    console.error("EVENTS ERROR:", error);
    return res.status(500).json({ error: "Unable to load your events right now." });
  }
});

app.get("/api/public-events/:token", async (req, res) => {
  try {
    const registrationToken = String(req.params.token || "").trim();
    if (!/^[a-f0-9]{32}$/i.test(registrationToken)) {
      return res.status(400).json({ error: "Invalid event link." });
    }

    const { data: event, error } = await supabase
      .from("events")
      .select("id, name, event_date, venue, ticket_price, registration_token")
      .eq("registration_token", registrationToken)
      .maybeSingle();

    if (error) {
      console.error("PUBLIC EVENT LOOKUP ERROR:", error.message);
      return res.status(500).json({ error: "Could not load this event right now." });
    }
    if (!event) return res.status(404).json({ error: "This event link is invalid or the event was removed." });

    return res.json(event);
  } catch (error) {
    console.error("PUBLIC EVENT LOOKUP ERROR:", error);
    return res.status(500).json({ error: "Could not load this event right now." });
  }
});

app.post("/api/registrations", async (req, res) => {
  try {
    const registrationToken = String(req.body?.registration_token || "").trim();
    const studentName = String(req.body?.student_name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const phone = String(req.body?.phone || "").replace(/[^0-9+]/g, "");

    if (!/^[a-f0-9]{32}$/i.test(registrationToken)) {
      return res.status(400).json({ error: "Please open a valid event registration link." });
    }
    if (studentName.length < 2 || studentName.length > 100) {
      return res.status(400).json({ error: "Please enter a name between 2 and 100 characters." });
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }
    if (phone.replace(/\D/g, "").length < 10 || phone.replace(/\D/g, "").length > 15) {
      return res.status(400).json({ error: "Please enter a valid phone number." });
    }

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, name, event_date, ticket_price")
      .eq("registration_token", registrationToken)
      .maybeSingle();

    if (eventError) {
      console.error("EVENT LOOKUP ERROR:", eventError.message);
      return res.status(500).json({ error: "Could not verify the selected event." });
    }
    if (!event) {
      return res.status(404).json({ error: "This event registration link is invalid or the event was removed." });
    }

    const eventId = event.id;
    if (event.event_date) {
      const eventDate = new Date(`${event.event_date}T23:59:59`);
      if (!Number.isNaN(eventDate.getTime()) && eventDate < new Date()) {
        return res.status(400).json({ error: "Registration for this event has closed." });
      }
    }

    const { data: existingRegistration, error: duplicateError } = await supabase
      .from("registrations")
      .select("id")
      .eq("event_id", eventId)
      .ilike("email", email)
      .limit(1)
      .maybeSingle();

    if (duplicateError) {
      console.error("DUPLICATE CHECK ERROR:", duplicateError.message);
      return res.status(500).json({ error: "Could not verify your registration. Please try again." });
    }
    if (existingRegistration) {
      return res.status(409).json({
        error: "This email is already registered for this event. Please use your existing ticket."
      });
    }

    const ticket_code = `EHT-${randomBytes(5).toString("hex").toUpperCase()}`;
    const { error: insertError } = await supabase
      .from("registrations")
      .insert([{
        event_id: eventId,
        student_name: studentName,
        email,
        phone,
        ticket_code,
        payment_status: Number(event.ticket_price || 0) === 0 ? "Paid" : "Pending",
        attendance_status: "Absent"
      }]);

    if (insertError) {
      console.error("REGISTRATION ERROR:", insertError.message);
      if (insertError.code === "23505") {
        return res.status(409).json({ error: "A registration already exists for this event and email." });
      }
      return res.status(500).json({ error: "Registration could not be saved. Please try again." });
    }

    return res.status(201).json({
      message: "Registration successful",
      ticket_code
    });
  } catch (error) {
    console.error("REGISTRATION ERROR:", error);
    return res.status(500).json({ error: "Registration could not be completed. Please try again." });
  }
});

// Demo-only payment simulation for the college project.
// This endpoint does not contact a payment gateway or charge real money.
app.post("/api/demo-payment", async (req, res) => {
  try {
    const ticketCode = String(req.body?.ticket_code || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!ticketCode || !email) {
      return res.status(400).json({ error: "Ticket ID and registered email are required for demo payment." });
    }

    const { data: registration, error: findError } = await supabase
      .from("registrations")
      .select("id, ticket_code, email, payment_status, event_id")
      .eq("ticket_code", ticketCode)
      .maybeSingle();

    if (findError) return res.status(500).json({ error: "Could not find this registration." });
    if (!registration || String(registration.email || "").trim().toLowerCase() !== email) {
      return res.status(404).json({ error: "Ticket and registered email do not match." });
    }
    if (registration.payment_status === "Paid") {
      return res.json({ success: true, payment_status: "Paid", message: "This ticket is already marked Paid." });
    }

    const { data: updated, error: updateError } = await supabase
      .from("registrations")
      .update({ payment_status: "Paid" })
      .eq("id", registration.id)
      .eq("payment_status", "Pending")
      .select("id")
      .maybeSingle();

    if (updateError) return res.status(500).json({ error: "Could not save the demo payment status." });
    if (!updated) return res.status(409).json({ error: "Ticket status changed already. Refresh and check the ticket." });

    return res.json({
      success: true,
      payment_status: "Paid",
      demo: true,
      message: "Demo payment completed. No real money was charged."
    });
  } catch (error) {
    console.error("DEMO PAYMENT ERROR:", error);
    return res.status(500).json({ error: "Demo payment could not be completed." });
  }
});

app.post("/api/validate-ticket", async (req, res) => {
  try {
    const ticketCode = String(req.body?.ticket_code || "").trim();
    if (!ticketCode) {
      return res.status(400).json({ success: false, message: "Ticket code is required." });
    }

    const authorization = String(req.headers.authorization || "");
    const accessToken = authorization.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";

    if (!accessToken) {
      return res.status(401).json({ success: false, message: "Please sign in to scan tickets." });
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData?.user) {
      return res.status(401).json({ success: false, message: "Your session is invalid. Please sign in again." });
    }

    const { data: ticket, error } = await supabase
      .from("registrations")
      .select("id, student_name, email, event_id, ticket_code, payment_status, attendance_status")
      .eq("ticket_code", ticketCode)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ success: false, message: "Could not verify this ticket." });
    }
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Invalid ticket." });
    }

    const { data: eventOwner, error: ownerError } = await supabase
      .from("events")
      .select("owner_id")
      .eq("id", ticket.event_id)
      .maybeSingle();

    if (ownerError || !eventOwner) {
      return res.status(500).json({ success: false, message: "Could not verify event ownership." });
    }
    if (eventOwner.owner_id !== authData.user.id) {
      return res.status(403).json({ success: false, message: "You can only scan tickets for events in your own workspace." });
    }

    if (ticket.payment_status !== "Paid") {
      return res.status(402).json({
        success: false,
        message: "Payment is pending. This ticket cannot be checked in yet.",
        attendee: ticket
      });
    }
    if (ticket.attendance_status === "Present") {
      return res.status(409).json({
        success: false,
        message: "Ticket already used. This attendee has already checked in.",
        attendee: ticket
      });
    }

    const { data: updatedTicket, error: updateError } = await supabase
      .from("registrations")
      .update({ attendance_status: "Present" })
      .eq("id", ticket.id)
      .neq("attendance_status", "Present")
      .select("id, student_name, email, event_id, ticket_code, payment_status, attendance_status")
      .maybeSingle();

    if (updateError) {
      return res.status(500).json({ success: false, message: "Could not save the check-in." });
    }
    if (!updatedTicket) {
      return res.status(409).json({
        success: false,
        message: "Ticket already used. This attendee has already checked in.",
        attendee: ticket
      });
    }

    return res.json({
      success: true,
      message: "Ticket verified successfully. Attendee checked in.",
      attendee: updatedTicket
    });
  } catch (error) {
    console.error("TICKET VALIDATION ERROR:", error);
    return res.status(500).json({ success: false, message: "Ticket validation failed." });
  }
});

app.use((error, _req, res, _next) => {
  if (error?.message?.includes("not allowed to access")) {
    return res.status(403).json({ error: error.message });
  }
  console.error("API ERROR:", error);
  return res.status(500).json({ error: "Unexpected server error." });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`EventHub Backend API running on port ${PORT}`);
});
