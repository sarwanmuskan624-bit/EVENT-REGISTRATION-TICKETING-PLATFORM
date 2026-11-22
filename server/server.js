
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

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

// Home route
app.get("/", (req, res) => {
  res.json({
    message: "EventHub Backend API is running!"
  });
});

// Get all events
app.get("/api/events", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true });

    if (error) {
      console.error("EVENTS ERROR:", error.message);
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Student registration
app.post("/api/registrations", async (req, res) => {
  try {
    const {
      event_id,
      student_name,
      email,
      phone
    } = req.body;

    if (!event_id || !student_name || !email || !phone) {
      return res.status(400).json({
        error: "All registration fields are required"
      });
    }

    const ticket_code = `TKT-${Date.now()}`;

    const { error } = await supabase
      .from("registrations")
      .insert([{
        event_id: Number(event_id),
        student_name: String(student_name).trim(),
        full_name: String(student_name).trim(),
        email: String(email).trim(),
        phone: String(phone).trim(),
        ticket_code,
        payment_status: "Pending",
        attendance_status: "Absent"
      }]);

    if (error) {
      console.error("REGISTRATION ERROR:", error.message);
      return res.status(500).json({
        error: error.message
      });
    }

    res.status(201).json({
      message: "Registration successful",
      ticket_code
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

// Simulated Payment API
app.post("/api/simulate-payment", async (req, res) => {
  try {
    const { ticket_code, payment_result } = req.body;

    if (!ticket_code || !payment_result) {
      return res.status(400).json({
        success: false,
        message: "Ticket code and payment result are required"
      });
    }

    if (!["success", "failed"].includes(payment_result)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment result"
      });
    }

    // Find registration
    const { data: registration, error: findError } =
      await supabase
        .from("registrations")
        .select("*")
        .eq("ticket_code", String(ticket_code).trim())
        .maybeSingle();

    if (findError) {
      return res.status(500).json({
        success: false,
        message: findError.message
      });
    }

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found"
      });
    }

    if (registration.payment_status === "Paid") {
      return res.status(409).json({
        success: false,
        message: "Payment has already been completed"
      });
    }

    const newStatus =
      payment_result === "success" ? "Paid" : "Pending";

    const { data: updatedRegistration, error: updateError } =
      await supabase
        .from("registrations")
        .update({
          payment_status: newStatus
        })
        .eq("ticket_code", String(ticket_code).trim())
        .eq("payment_status", "Pending")
        .select()
        .maybeSingle();

    if (updateError) {
      return res.status(500).json({
        success: false,
        message: updateError.message
      });
    }

    if (!updatedRegistration) {
      return res.status(409).json({
        success: false,
        message: "Payment status could not be updated"
      });
    }

    res.json({
      success: payment_result === "success",
      message:
        payment_result === "success"
          ? "Simulated payment successful"
          : "Simulated payment failed",
      payment_status: newStatus,
      registration: updatedRegistration
    });

  } catch (error) {
    console.error("PAYMENT ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// QR Ticket Validation
app.post("/api/validate-ticket", async (req, res) => {
  try {
    const { ticket_code } = req.body;

    if (!ticket_code) {
      return res.status(400).json({
        success: false,
        message: "Ticket code is required"
      });
    }

    const { data: ticket, error } = await supabase
      .from("registrations")
      .select("*")
      .eq("ticket_code", String(ticket_code).trim())
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Invalid ticket"
      });
    }

    if (ticket.attendance_status === "Present") {
      return res.status(409).json({
        success: false,
        message: "Ticket already used",
        attendee: ticket
      });
    }

    const { data: updatedTicket, error: updateError } =
      await supabase
        .from("registrations")
        .update({
          attendance_status: "Present"
        })
        .eq("ticket_code", String(ticket_code).trim())
        .eq("attendance_status", "Absent")
        .select()
        .maybeSingle();

    if (updateError) {
      return res.status(500).json({
        success: false,
        message: updateError.message
      });
    }

    if (!updatedTicket) {
      return res.status(409).json({
        success: false,
        message: "Ticket already used"
      });
    }

    res.json({
      success: true,
      message: "Ticket verified successfully",
      attendee: updatedTicket
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`EventHub API running on port ${PORT}`);
});
