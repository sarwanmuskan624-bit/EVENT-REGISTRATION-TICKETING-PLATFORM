
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


console.log("SUPABASE URL:", supabaseUrl);
console.log(
  "SUPABASE KEY TYPE:",
  supabaseKey.startsWith("sb_secret_")
    ? "Secret key"
    : supabaseKey.startsWith("sb_publishable_")
    ? "Publishable key"
    : supabaseKey.startsWith("eyJ")
    ? "Legacy JWT key"
    : "Other key"
);

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
      console.error("EVENTS ERROR:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error("EVENTS SERVER ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// Student registration
app.post("/api/registrations", async (req, res) => {
  console.log("REGISTRATION REQUEST RECEIVED");

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
      console.error("REGISTRATION ERROR:", error);

      return res.status(500).json({
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
    }

    console.log("REGISTRATION SUCCESS:", ticket_code);

    res.status(201).json({
      message: "Registration successful",
      ticket_code
    });

  } catch (error) {
    console.error("REGISTRATION SERVER ERROR:", error);

    res.status(500).json({
      error: error.message
    });
  }
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`EventHub API running on port ${PORT}`);
});
