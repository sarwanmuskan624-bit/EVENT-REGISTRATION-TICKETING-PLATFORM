import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
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

const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
const razorpayConfigured = Boolean(razorpayKeyId && razorpayKeySecret);
function razorpayAuthHeader() {
  return "Basic " + Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64");
}


app.get("/", (_req, res) => {
  res.json({
    message: "EventHub Backend API is running!",
    status: "healthy"
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ success: true, service: "EventHub API" });
});

app.get("/api/events", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true });

    if (error) {
      console.error("EVENTS ERROR:", error.message);
      return res.status(500).json({ error: "Unable to load events right now." });
    }

    return res.json(data || []);
  } catch (error) {
    console.error("EVENTS ERROR:", error);
    return res.status(500).json({ error: "Unable to load events right now." });
  }
});

app.post("/api/registrations", async (req, res) => {
  try {
    const eventId = Number(req.body?.event_id);
    const studentName = String(req.body?.student_name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const phone = String(req.body?.phone || "").replace(/[^0-9+]/g, "");

    if (!Number.isSafeInteger(eventId) || eventId <= 0) {
      return res.status(400).json({ error: "Please select a valid event." });
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
      .eq("id", eventId)
      .maybeSingle();

    if (eventError) {
      console.error("EVENT LOOKUP ERROR:", eventError.message);
      return res.status(500).json({ error: "Could not verify the selected event." });
    }
    if (!event) {
      return res.status(404).json({ error: "The selected event no longer exists." });
    }
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

// Razorpay Test Mode order creation. Secret credentials remain on the backend.
app.post("/api/payments/create-order", async (req, res) => {
  try {
    if (!razorpayConfigured) return res.status(503).json({ error: "Razorpay is not configured. Add Test Mode keys to the Render backend environment." });
    const ticketCode = String(req.body?.ticket_code || "").trim();
    if (!ticketCode) return res.status(400).json({ error: "Ticket ID is required." });
    const { data: registration, error: registrationError } = await supabase
      .from("registrations").select("id, event_id, ticket_code, payment_status")
      .eq("ticket_code", ticketCode).maybeSingle();
    if (registrationError) return res.status(500).json({ error: "Could not find this registration." });
    if (!registration) return res.status(404).json({ error: "Ticket not found." });
    if (registration.payment_status === "Paid") return res.status(409).json({ error: "This ticket is already paid." });

    const { data: event, error: eventError } = await supabase
      .from("events").select("name, ticket_price").eq("id", registration.event_id).maybeSingle();
    if (eventError || !event) return res.status(404).json({ error: "The event for this ticket could not be found." });
    const amount = Math.round(Number(event.ticket_price) * 100);
    if (!Number.isSafeInteger(amount) || amount < 100) return res.status(400).json({ error: "This event does not require online payment." });

    const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: razorpayAuthHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ amount, currency: "INR", receipt: ticketCode.slice(0, 40), notes: { ticket_code: ticketCode, event_name: event.name } })
    });
    const orderData = await orderResponse.json();
    if (!orderResponse.ok || !orderData.id) {
      console.error("RAZORPAY ORDER ERROR:", orderData.error?.description || "Order creation failed");
      return res.status(502).json({ error: orderData.error?.description || "Razorpay could not create the payment order." });
    }
    const { error: saveError } = await supabase.from("registrations")
      .update({ razorpay_order_id: orderData.id }).eq("id", registration.id).eq("payment_status", "Pending");
    if (saveError) {
      console.error("ORDER SAVE ERROR:", saveError.message);
      return res.status(500).json({ error: "Payment order could not be linked. Apply the Supabase payment migration and try again." });
    }
    return res.json({ key_id: razorpayKeyId, order_id: orderData.id, amount: orderData.amount, currency: orderData.currency });
  } catch (error) {
    console.error("RAZORPAY ORDER ERROR:", error);
    return res.status(500).json({ error: "Could not start the payment process." });
  }
});

// Verify Razorpay signature and captured payment before changing ticket status.
app.post("/api/payments/verify", async (req, res) => {
  try {
    if (!razorpayConfigured) return res.status(503).json({ error: "Razorpay is not configured on the backend." });
    const ticketCode = String(req.body?.ticket_code || "").trim();
    const orderId = String(req.body?.razorpay_order_id || "").trim();
    const paymentId = String(req.body?.razorpay_payment_id || "").trim();
    const signature = String(req.body?.razorpay_signature || "").trim();
    if (!ticketCode || !orderId || !paymentId || !signature) return res.status(400).json({ error: "Required payment verification details are missing." });

    const expected = createHmac("sha256", razorpayKeySecret).update(`${orderId}|${paymentId}`).digest("hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    const receivedBuffer = Buffer.from(signature, "hex");
    if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
      return res.status(400).json({ error: "Payment signature is invalid. Ticket remains Pending." });
    }
    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: razorpayAuthHeader() }
    });
    const paymentData = await paymentResponse.json();
    if (!paymentResponse.ok || paymentData.order_id !== orderId) return res.status(400).json({ error: "Razorpay payment could not be verified against this order." });
    if (paymentData.status !== "captured") return res.status(409).json({ error: "Payment is not captured yet. Ticket remains Pending." });

    const { data: registration, error: findError } = await supabase.from("registrations")
      .select("id, ticket_code, payment_status, razorpay_order_id").eq("ticket_code", ticketCode).maybeSingle();
    if (findError) return res.status(500).json({ error: "Could not load the ticket for payment verification." });
    if (!registration) return res.status(404).json({ error: "Ticket not found." });
    if (registration.payment_status === "Paid") return res.json({ success: true, payment_status: "Paid", message: "This ticket is already marked Paid." });
    if (registration.razorpay_order_id !== orderId) return res.status(400).json({ error: "This payment order does not belong to the supplied ticket." });

    const { data: updated, error: updateError } = await supabase.from("registrations")
      .update({ payment_status: "Paid", razorpay_payment_id: paymentId })
      .eq("id", registration.id).eq("razorpay_order_id", orderId).eq("payment_status", "Pending")
      .select("id").maybeSingle();
    if (updateError) {
      console.error("PAYMENT STATUS UPDATE ERROR:", updateError.message);
      return res.status(500).json({ error: "Payment was verified, but ticket status could not be saved." });
    }
    if (!updated) return res.status(409).json({ error: "Ticket payment status changed already. Refresh and check the ticket." });
    return res.json({ success: true, payment_status: "Paid", message: "Payment verified successfully." });
  } catch (error) {
    console.error("RAZORPAY VERIFY ERROR:", error);
    return res.status(500).json({ error: "Payment verification failed." });
  }
});

app.post("/api/validate-ticket", async (req, res) => {
  try {
    const ticketCode = String(req.body?.ticket_code || "").trim();
    if (!ticketCode) {
      return res.status(400).json({ success: false, message: "Ticket code is required." });
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
