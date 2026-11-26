
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { QRCodeSVG } from "qrcode.react";
import { Html5QrcodeScanner } from "html5-qrcode";
import {
  CalendarDays, Ticket, Users, LayoutDashboard, LogOut, Plus,
  Trash2, Pencil, CheckCircle, ArrowRight, MapPin, Sparkles,
  Menu, X, ShieldCheck, Search, ChevronRight, QrCode, BarChart3, Download, Share2
} from "lucide-react";
import "./App.css";

const API_URL = "https://event-registration-ticketing-platform.onrender.com";

const formatDate = (value) => {
  if (!value) return "Date to be announced";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });
};

export default function App() {
  const [session, setSession] = useState(null);
  const [events, setEvents] = useState([]);
  const [publicEvents, setPublicEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [page, setPage] = useState("login");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState("signin");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [search, setSearch] = useState("");
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentResult, setPaymentResult] = useState("");

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setMessage(error.message);
      setSession(data?.session ?? null);
      const hasSharedRegistration = new URLSearchParams(window.location.search).has("register");
      setPage(hasSharedRegistration ? "register" : (data?.session ? "dashboard" : "login"));
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        if (event === "PASSWORD_RECOVERY") {
          setRecoveryMode(true);
          setPage("login");
          setPassword("");
          setMessage("Enter and save your new password below.");
        }
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const registerId = new URLSearchParams(window.location.search).get("register");
    if (!registerId) return;

    let active = true;
    setPage("register");

    async function loadSharedEvent() {
      try {
        const response = await fetch(`${API_URL}/api/public-events/${encodeURIComponent(registerId)}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "This registration link is not available.");
        if (active) setSelectedEvent(result);
      } catch (error) {
        if (active) setMessage(error.message || "Could not load this event.");
      }
    }

    loadSharedEvent();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    loadEvents();
  }, [session]);

  useEffect(() => {
    if (session) loadAdminData();
  }, [session]);

  // Signed-in users see only their own events. Logged-out visitors see no event list.
  async function loadEvents() {
    try {
      if (session?.user?.id) {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("owner_id", session.user.id)
          .order("event_date", { ascending: true });

        if (error) throw error;
        setPublicEvents(data || []);
        return;
      }

      setPublicEvents([]);
    } catch (error) {
      setMessage(`Could not load events: ${error.message}`);
    }
  }

  // Load only this signed-in user's events and registrations.
  // Supabase RLS remains the database-level security boundary.
  async function loadAdminData() {
    if (!session?.user?.id) {
      setEvents([]);
      setRegistrations([]);
      return;
    }

    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("owner_id", session.user.id)
      .order("event_date", { ascending: true });

    if (eventError) {
      setMessage(eventError.message || "Could not load your events.");
      return;
    }

    const ownedEvents = eventData || [];
    const ownedEventIds = ownedEvents.map((event) => event.id);

    let registrationData = [];
    if (ownedEventIds.length > 0) {
      const { data, error: registrationError } = await supabase
        .from("registrations")
        .select("*")
        .in("event_id", ownedEventIds)
        .order("id", { ascending: false });

      if (registrationError) {
        setMessage(registrationError.message || "Could not load your registrations.");
        return;
      }
      registrationData = data || [];
    }

    setEvents(ownedEvents);
    setPublicEvents(ownedEvents);
    setRegistrations(registrationData);
  }

  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setBusy(false);

    if (error) setMessage(error.message);
    else setPage("dashboard");
  }

  async function updatePassword(e) {
    e.preventDefault();
    if (password.length < 6) {
      setMessage("Password must be at least 6 characters long.");
      return;
    }
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    await supabase.auth.signOut();
    setSession(null);
    setRecoveryMode(false);
    setAuthMode("signin");
    setPassword("");
    setPage("login");
    setMessage("Password updated successfully. Please sign in with your new password.");
  }

  async function signUp(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password
    });

    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data.session) {
      setPage("dashboard");
      setMessage("Account created successfully. Welcome to EventHub!");
    } else {
      setAuthMode("signin");
      setMessage("Account created. Please check your email to confirm your account, then sign in.");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setPage("login");
    setPublicEvents([]);
    setEvents([]);
    setRegistrations([]);
    setTicket(null);
    setMessage("");
  }

  async function shareEvent(event) {
    if (!event.registration_token) {
      setMessage("This event does not have a registration link yet. Please refresh your events and try again.");
      return;
    }
    const registrationUrl = `${window.location.origin}${window.location.pathname}?register=${encodeURIComponent(event.registration_token)}`;
    try {
      await navigator.clipboard.writeText(registrationUrl);
      setMessage("Registration link copied. You can share it with attendees.");
    } catch {
      setMessage(`Copy this registration link: ${registrationUrl}`);
    }
  }

  async function addEvent(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    const form = new FormData(e.currentTarget);

    const { error } = await supabase.from("events").insert([{
      name: form.get("name"),
      event_date: form.get("date"),
      venue: form.get("venue"),
      ticket_price: Number(form.get("price"))
    }]);

    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    e.currentTarget.reset();
    setShowEventForm(false);
    await loadAdminData();
    setMessage("Event created successfully.");
  }

  async function deleteEvent(id) {
    if (!window.confirm("Delete this event? Related registrations may prevent deletion.")) {
      return;
    }

    const { data: deletedRows, error } = await supabase
      .from("events")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) {
      setMessage(`Could not delete event: ${error.message}`);
      return;
    }

    if (!deletedRows || deletedRows.length === 0) {
      setMessage("Event was not deleted. Supabase DELETE permission is missing for this account. Please enable the authenticated admin DELETE policy for the events table.");
      return;
    }

    await loadAdminData();
    setMessage("Event deleted successfully.");
  }

  async function updateEvent(e) {
    e.preventDefault();
    if (!editingEvent) return;

    setBusy(true);
    setMessage("");
    const form = new FormData(e.currentTarget);

    const { data: updatedRows, error } = await supabase
      .from("events")
      .update({
        name: String(form.get("name")).trim(),
        event_date: form.get("date"),
        venue: String(form.get("venue")).trim(),
        ticket_price: Number(form.get("price"))
      })
      .eq("id", editingEvent.id)
      .select("id");

    setBusy(false);

    if (error) {
      setMessage("Could not update event: " + error.message);
      return;
    }

    if (!updatedRows || updatedRows.length === 0) {
      setMessage("Event was not updated. Check the Supabase UPDATE policy for the events table.");
      return;
    }

    setEditingEvent(null);
    setShowEventForm(false);
    await loadAdminData();
    setMessage("Event updated successfully.");
  }

  // Student registration through Express backend API
  async function registerForEvent(e, event) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    const formElement = e.currentTarget;
    const form = new FormData(formElement);

    const studentName = String(form.get("name")).trim();
    const studentEmail = String(form.get("email")).trim();
    const studentPhone = String(form.get("phone")).trim();

    try {
      console.log("SENDING REGISTRATION TO:", API_URL);
      const response = await fetch(`${API_URL}/api/registrations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          registration_token: event.registration_token,
          student_name: studentName,
          email: studentEmail,
          phone: studentPhone
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Registration failed.");
      }

      if (!result.ticket_code) {
        throw new Error("Ticket code was not returned by the backend.");
      }

      setTicket({
        id: result.ticket_code,
        name: studentName,
        email: studentEmail,
        event: event.name,
        date: event.event_date,
        venue: event.venue,
        price: Number(event.ticket_price || 0),
        payment_status: Number(event.ticket_price || 0) <= 0 ? "Paid" : "Pending"
      });

      formElement.reset();
      setSelectedEvent(null);
      setPage("ticket");

      await loadEvents();

    } catch (error) {
      setMessage(
        `Registration could not be completed: ${error.message}`
      );
    } finally {
      setBusy(false);
    }
  }

  // Clearly labelled demo payment for college project presentation.
  async function completeDemoPayment() {
    if (!ticket?.id || Number(ticket.price || 0) <= 0) return;
    setPaymentBusy(true);
    setPaymentResult("");
    try {
      const response = await fetch(`${API_URL}/api/demo-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_code: ticket.id, email: ticket.email })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Demo payment could not be completed.");
      setTicket((current) => ({ ...current, payment_status: "Paid" }));
      setPaymentResult("Demo payment successful. This is a project simulation; no real money was charged.");
      if (session) await loadAdminData();
    } catch (error) {
      setPaymentResult(error.message || "Demo payment could not be completed.");
    } finally {
      setPaymentBusy(false);
    }
  }

  async function updateRegistration(id, field, value) {
    const column =
      field === "payment" ? "payment_status" : "attendance_status";

    const { error } = await supabase
      .from("registrations")
      .update({ [column]: value })
      .eq("id", id)
      .in("event_id", events.map((event) => event.id));

    if (error) setMessage(error.message);
    else await loadAdminData();
  }

  async function deleteRegistration(id) {
    if (!window.confirm("Delete this registration?")) return;

    const { error } = await supabase
      .from("registrations")
      .delete()
      .eq("id", id)
      .in("event_id", events.map((event) => event.id));

    if (error) setMessage(error.message);
    else await loadAdminData();
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader" />
        <p>Preparing EventHub…</p>
      </div>
    );
  }

  const filteredRegistrations = registrations.filter((r) =>
    `${r.student_name || ""} ${r.email || ""} ${r.ticket_code || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="site-shell">
      {page !== "dashboard" &&
        page !== "events-admin" &&
        page !== "registrations-admin" &&
        page !== "scanner-admin" &&
        page !== "reports-admin" &&
        page !== "login" &&
        page !== "register" &&
        page !== "ticket" && (
          <PublicHeader
            onHome={() => {
              setPage("home");
              setTicket(null);
            }}
            onEvents={() => {
              setPage("home");
              document.getElementById("events")?.scrollIntoView({
                behavior: "smooth"
              });
            }}
            onAdmin={() => {
              setPage("login");
              setMessage("");
            }}
            mobileMenu={mobileMenu}
            setMobileMenu={setMobileMenu}
          />
        )}

      {message && (
        <div className="notice" role="status">
          <span>{message}</span>
          <button
            onClick={() => setMessage("")}
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {page === "register" && (
        <main className="auth-page">
          <section className="auth-card">
            <div className="brand-mark"><Ticket size={23} /></div>
            <span className="eyebrow">EVENT REGISTRATION</span>
            {selectedEvent ? (
              <>
                <h1>Book your spot</h1>
                <h2>{selectedEvent.name}</h2>
                <p className="muted">{formatDate(selectedEvent.event_date)} · {selectedEvent.venue}</p>
                <p className="muted">Ticket price: ₹{Number(selectedEvent.ticket_price || 0).toLocaleString("en-IN")}</p>
                <form className="stack-form" onSubmit={(e) => registerForEvent(e, selectedEvent)}>
                  <label>Full name<input name="name" placeholder="Enter your full name" required /></label>
                  <label>Email address<input name="email" type="email" placeholder="you@example.com" required /></label>
                  <label>Phone number<input name="phone" type="tel" placeholder="Enter phone number" required /></label>
                  <button className="btn btn-primary full" disabled={busy}>
                    {busy ? "Registering…" : "Register & generate ticket"} <ArrowRight size={17} />
                  </button>
                </form>
                <p className="fine-print">
                  {Number(selectedEvent.ticket_price || 0) <= 0
                    ? "This is a free event. Your ticket will be confirmed without payment."
                    : "Your ticket will be created with Pending payment status. You can complete the demo payment on the next screen."}
                </p>
              </>
            ) : (
              <p className="muted">Loading event details… If this message remains, ask the event organizer for a new link.</p>
            )}
          </section>
        </main>
      )}

      {page === "home" && (
        <HomePage
          events={session ? publicEvents : []}
          onRegister={(event) => {
            setSelectedEvent(event);
            setMessage("");
          }}
          onAdmin={() => {
            setPage("login");
            setMessage("");
          }}
        />
      )}

      {selectedEvent && page === "home" && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedEvent(null)}
        >
          <section
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setSelectedEvent(null)}
              aria-label="Close"
            >
              <X />
            </button>

            <span className="eyebrow">EVENT REGISTRATION</span>
            <h2>Book your spot</h2>

            <p className="muted">
              {selectedEvent.name} · {formatDate(selectedEvent.event_date)}
            </p>

            <form
              className="stack-form"
              onSubmit={(e) => registerForEvent(e, selectedEvent)}
            >
              <label>
                Full name
                <input
                  name="name"
                  placeholder="Enter your full name"
                  required
                />
              </label>

              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label>
                Phone number
                <input
                  name="phone"
                  type="tel"
                  placeholder="Enter phone number"
                  required
                />
              </label>

              <button
                className="btn btn-primary full"
                disabled={busy}
              >
                {busy ? "Registering…" : "Register & generate ticket"}
                <ArrowRight size={17} />
              </button>
            </form>

            <p className="fine-print">
              {Number(selectedEvent.ticket_price || 0) <= 0
                ? "This is a free event. Your ticket will be confirmed without payment."
                : "Your ticket will be created with Pending payment status. You can complete the demo payment on the next screen."}
            </p>
          </section>
        </div>
      )}

      {page === "ticket" && ticket && (
        <main className="ticket-page">
          <div className="success-mark">
            <CheckCircle size={30} />
          </div>

          <span className="eyebrow">REGISTRATION CONFIRMED</span>
          <h1>Your event pass is ready.</h1>
          <p className="muted">
            Keep this ticket safe and show the QR code at the event.
          </p>

          <TicketCard ticket={ticket} />

          <section className="payment-demo-panel">
            <div>
              <span className="eyebrow">DEMO PAYMENT</span>
              <h2>Payment status: {ticket.payment_status || "Pending"}</h2>
              <p className="muted">
                {Number(ticket.price || 0) <= 0
                  ? "This is a free event. No payment is required."
                  : `Ticket amount: ₹${Number(ticket.price).toLocaleString("en-IN")}. This is a project demo; no real money is charged.`}
              </p>
            </div>
            {Number(ticket.price || 0) <= 0 ? (
              <p className="payment-success"><CheckCircle size={17} /> Free ticket — no payment required</p>
            ) : ticket.payment_status === "Paid" ? (
              <p className="payment-success"><CheckCircle size={17} /> Payment verified successfully</p>
            ) : (
              <div className="payment-demo-actions">
                <button className="btn btn-primary" disabled={paymentBusy} onClick={completeDemoPayment}>
                  {paymentBusy ? "Processing demo payment…" : "Complete demo payment"}
                </button>
              </div>
            )}
            {paymentResult && <p className="payment-result" role="status">{paymentResult}</p>}
          </section>

          <div className="ticket-actions">
            <button
              className="btn btn-primary"
              onClick={() => window.print()}
            >
              Print ticket
            </button>

            <button
              className="btn btn-ghost"
              onClick={() => {
                setTicket(null);
                setPage(session ? "dashboard" : "login");
              }}
            >
              Back to account
            </button>
          </div>
        </main>
      )}

      {page === "login" && (
        <main className="auth-page">
          <form className="auth-card" onSubmit={recoveryMode ? updatePassword : (authMode === "signup" ? signUp : login)}>
            <div className="brand-mark">
              <Ticket size={23} />
            </div>

            <span className="eyebrow">EVENTHUB ACCOUNT</span>
            <h1>{recoveryMode ? "Set a new password" : (authMode === "signup" ? "Create your account" : "Welcome back")}</h1>

            <p className="muted">
              {recoveryMode
                ? "Choose a new password for your EventHub account."
                : (authMode === "signup"
                  ? "Create your own workspace to manage your events and registrations."
                  : "Sign in to manage your events, registrations and attendance.")}
            </p>

            {!recoveryMode && (
              <label>
                Email address
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                />
              </label>
            )}

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={recoveryMode ? "Enter new password (at least 6 characters)" : "Your password"}
                minLength={6}
                required
              />
            </label>

            <button
              className="btn btn-primary full"
              disabled={busy}
            >
              {busy ? (recoveryMode ? "Updating password…" : (authMode === "signup" ? "Creating account…" : "Signing in…")) : (recoveryMode ? "Update password" : (authMode === "signup" ? "Create account" : "Sign in"))}
              <ArrowRight size={17} />
            </button>

            {!recoveryMode && (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setAuthMode(authMode === "signup" ? "signin" : "signup");
                  setMessage("");
                }}
              >
                {authMode === "signup" ? "Already have an account? Sign in" : "New to EventHub? Create an account"}
              </button>
            )}

            <p className="fine-print">
              Each account has its own event workspace. Confirm your email if prompted.
            </p>
          </form>
        </main>
      )}

      {page === "dashboard" && session && (
        <AdminLayout
          pageTitle="Dashboard"
          session={session}
          onNavigate={setPage}
          onLogout={logout}
        >
          <div className="admin-welcome">
            <div>
              <span className="eyebrow">OVERVIEW</span>
              <h1>Good to see you.</h1>
              <p className="muted">
                Here’s what’s happening with your events.
              </p>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => {
                setPage("events-admin");
                setShowEventForm(true);
              }}
            >
              <Plus size={17} /> Create event
            </button>
          </div>

          <div className="stats-grid">
            <StatCard
              title="Total events"
              value={events.length}
              icon={<CalendarDays />}
            />
            <StatCard
              title="Registrations"
              value={registrations.length}
              icon={<Users />}
            />
            <StatCard
              title="Paid tickets"
              value={registrations.filter(
                (r) => r.payment_status === "Paid"
              ).length}
              icon={<Ticket />}
            />
            <StatCard
              title="Checked in"
              value={registrations.filter(
                (r) => r.attendance_status === "Present"
              ).length}
              icon={<CheckCircle />}
            />
          </div>

          <section className="admin-panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">YOUR SCHEDULE</span>
                <h2>Recent events</h2>
              </div>

              <button
                className="link-button"
                onClick={() => setPage("events-admin")}
              >
                View all <ChevronRight size={16} />
              </button>
            </div>

            <EventTable
              events={events.slice(0, 5)}
              onShare={shareEvent}
              onDelete={deleteEvent}
              onEdit={(event) => {
                setEditingEvent(event);
                setShowEventForm(true);
                setPage("events-admin");
              }}
            />
          </section>
        </AdminLayout>
      )}

      {page === "events-admin" && session && (
        <AdminLayout
          pageTitle="Manage events"
          session={session}
          onNavigate={setPage}
          onLogout={logout}
        >
          <div className="section-heading admin-page-heading">
            <div>
              <span className="eyebrow">EVENT MANAGEMENT</span>
              <h1>Your events</h1>
              <p className="muted">
                Create and manage your events, then share individual registration links with attendees.
              </p>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => {
                setEditingEvent(null);
                setShowEventForm(!showEventForm);
              }}
            >
              <Plus size={17} /> Add event
            </button>
          </div>

          {showEventForm && (
            <form
              key={editingEvent?.id || "new-event"}
              className="event-form admin-panel"
              onSubmit={editingEvent ? updateEvent : addEvent}
            >
              <h2 className="event-form-title">
                {editingEvent ? "Edit event" : "Create a new event"}
              </h2>
              <label>
                Event name
                <input
                  name="name"
                  defaultValue={editingEvent?.name || ""}
                  placeholder="e.g. Annual Tech Fest"
                  required
                />
              </label>

              <label>
                Date
                <input
                  name="date"
                  type="date"
                  defaultValue={editingEvent?.event_date || ""}
                  required
                />
              </label>

              <label>
                Venue
                <input
                  name="venue"
                  defaultValue={editingEvent?.venue || ""}
                  placeholder="College auditorium"
                  required
                />
              </label>

              <label>
                Ticket price (₹)
                <input
                  name="price"
                  type="number"
                  min="0"
                  defaultValue={editingEvent?.ticket_price ?? ""}
                  placeholder="0"
                  required
                />
              </label>

              <div className="event-form-actions">
                <button className="btn btn-primary" disabled={busy}>
                  {busy ? "Saving…" : editingEvent ? "Save changes" : "Save event"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={() => {
                    setShowEventForm(false);
                    setEditingEvent(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <section className="admin-panel">
            <EventTable
              events={events}
              onShare={shareEvent}
              onDelete={deleteEvent}
              onEdit={(event) => {
                setEditingEvent(event);
                setShowEventForm(true);
              }}
            />
          </section>
        </AdminLayout>
      )}

      {page === "registrations-admin" && session && (
        <AdminLayout
          pageTitle="Registrations"
          session={session}
          onNavigate={setPage}
          onLogout={logout}
        >
          <div className="section-heading admin-page-heading">
            <div>
              <span className="eyebrow">ATTENDEE MANAGEMENT</span>
              <h1>Registrations</h1>
              <p className="muted">
                Search attendees and update payment or attendance status.
              </p>
            </div>
          </div>

          <section className="admin-panel">
            <div className="search-box">
              <Search size={17} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email or ticket ID…"
              />
            </div>

            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Attendee</th>
                    <th>Event</th>
                    <th>Ticket ID</th>
                    <th>Payment</th>
                    <th>Attendance</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRegistrations.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.student_name}</strong>
                        <small>{r.email}</small>
                      </td>

                      <td>
                        {events.find((ev) => ev.id === r.event_id)?.name || "Event"}
                      </td>

                      <td>
                        <code>{r.ticket_code}</code>
                      </td>

                      <td>
                        <select
                          value={r.payment_status || "Pending"}
                          onChange={(e) =>
                            updateRegistration(
                              r.id,
                              "payment",
                              e.target.value
                            )
                          }
                        >
                          <option>Pending</option>
                          <option>Paid</option>
                        </select>
                      </td>

                      <td>
                        <select
                          value={r.attendance_status || "Absent"}
                          onChange={(e) =>
                            updateRegistration(
                              r.id,
                              "attendance",
                              e.target.value
                            )
                          }
                        >
                          <option>Absent</option>
                          <option>Present</option>
                        </select>
                      </td>

                      <td>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <button
                            className="btn btn-small btn-primary"
                            onClick={() => {
                              const event = events.find(
                                (ev) => String(ev.id) === String(r.event_id)
                              );

                              setTicket({
                                id: r.ticket_code,
                                name: r.student_name,
                                email: r.email,
                                event: event?.name || "Event",
                                date: event?.event_date || "",
                                venue: event?.venue || "Venue not available",
                                price: Number(event?.ticket_price || 0),
                                payment_status: r.payment_status || "Pending"
                              });

                              setPage("ticket");
                            }}
                          >
                            <Ticket size={15} />
                            View Ticket
                          </button>

                          <button
                            className="icon-button danger"
                            onClick={() => deleteRegistration(r.id)}
                            aria-label="Delete registration"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredRegistrations.length === 0 && (
                <p className="empty-state">No registrations found.</p>
              )}
            </div>
          </section>
        </AdminLayout>
      )}
      {page === "reports-admin" && session && (
        <AdminLayout
          pageTitle="Reports & Analytics"
          session={session}
          onNavigate={setPage}
          onLogout={logout}
        >
          <ReportsPage events={events} registrations={registrations} />
        </AdminLayout>
      )}

      {page === "scanner-admin" && session && (
        <AdminLayout
          pageTitle="QR Ticket Scanner"
          session={session}
          onNavigate={setPage}
          onLogout={logout}
        >
          <QRScanner session={session} onValidated={loadAdminData} />
        </AdminLayout>
      )}

    </div>
  );
}

function PublicHeader({
  onHome,
  onEvents,
  onAdmin,
  mobileMenu,
  setMobileMenu
}) {
  return (
    <header className="public-header">
      <button className="brand" onClick={onHome}>
        <span className="brand-mark"><Ticket size={20} /></span>
        event<span>hub</span>
      </button>

      <nav className={mobileMenu ? "public-nav open" : "public-nav"}>
        <button onClick={onHome}>Home</button>
        <button onClick={onEvents}>Explore events</button>
        <button onClick={onAdmin}>Admin</button>
      </nav>

      <button className="btn btn-primary header-cta" onClick={onEvents}>
        Explore events <ArrowRight size={16} />
      </button>

      <button
        className="mobile-toggle"
        onClick={() => setMobileMenu(!mobileMenu)}
        aria-label="Toggle menu"
      >
        {mobileMenu ? <X /> : <Menu />}
      </button>
    </header>
  );
}

function HomePage({ events, onRegister }) {
  return (
    <main>
      <section className="hero-section">
        <div className="hero-glow glow-one" />
        <div className="hero-glow glow-two" />

        <div className="hero-copy">
          <div className="hero-pill">
            <Sparkles size={14} /> MAKE MOMENTS HAPPEN
          </div>

          <h1>
            Discover events.<br />
            <span>Make memories.</span>
          </h1>

          <p>
            Find your next experience, connect with your community,
            and book your place in just a few clicks.
          </p>

          <button
            className="btn btn-primary hero-button"
            onClick={() =>
              document.getElementById("events")?.scrollIntoView({
                behavior: "smooth"
              })
            }
          >
            Explore upcoming events <ArrowRight size={18} />
          </button>

          <div className="hero-proof">
            <div className="proof-icon"><Users size={17} /></div>
            <div>
              <strong>{events.length} events listed</strong>
              <small>Experiences waiting for you</small>
            </div>
          </div>
        </div>

        <div className="hero-art">
          <div className="orbit orbit-a" />
          <div className="orbit orbit-b" />

          <div className="hero-ticket">
            <div className="ticket-top">
              <span>YOUR NEXT EXPERIENCE</span>
              <Sparkles size={19} />
            </div>

            <div className="ticket-visual">
              <CalendarDays size={42} />
              <span>LIVE<br />THE<br />MOMENT</span>
            </div>

            <div className="ticket-bottom">
              <div>
                <small>DISCOVER SOMETHING</small>
                <strong>UNFORGETTABLE</strong>
              </div>
              <Ticket size={28} />
            </div>
          </div>

          <div className="floating-chip chip-top">
            <CheckCircle size={16} /> Easy registration
          </div>

          <div className="floating-chip chip-bottom">
            <Ticket size={16} /> Instant QR ticket
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <div><ShieldCheck size={19} /><span>Simple registration</span></div>
        <div><Ticket size={19} /><span>Digital QR tickets</span></div>
        <div><Users size={19} /><span>Made for communities</span></div>
      </section>

      <section className="events-section" id="events">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FIND YOUR NEXT EXPERIENCE</span>
            <h2>Upcoming events</h2>
            <p className="muted">
              Explore what’s happening and reserve your spot.
            </p>
          </div>

          <span className="event-count">{events.length} available</span>
        </div>

        {events.length ? (
          <div className="event-grid">
            {events.map((event, index) => (
              <article className="event-card" key={event.id}>
                <div className={`event-art art-${index % 4}`}>
                  <span className="event-art-label">EVENTHUB EXPERIENCE</span>
                  <div className="art-symbol">
                    {index % 2 === 0
                      ? <Sparkles size={45} />
                      : <CalendarDays size={45} />}
                  </div>
                  <span className="art-number">
                    0{index + 1}
                  </span>
                </div>

                <div className="event-card-body">
                  <div className="event-date">
                    <CalendarDays size={14} />
                    {formatDate(event.event_date)}
                  </div>

                  <h3>{event.name}</h3>

                  <p className="event-venue">
                    <MapPin size={15} /> {event.venue}
                  </p>

                  <div className="event-card-footer">
                    <strong>
                      {Number(event.ticket_price) === 0
                        ? "Free"
                        : `₹${event.ticket_price}`}
                    </strong>

                    <button
                      className="btn btn-small btn-primary"
                      onClick={() => onRegister(event)}
                    >
                      Register <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-events">
            <div className="empty-icon"><CalendarDays size={28} /></div>
            <h3>Events are coming soon</h3>
            <p>
              There are no events published right now.
              Please check back later.
            </p>
          </div>
        )}
      </section>

      <section className="how-section">
        <span className="eyebrow">A FEW SIMPLE STEPS</span>
        <h2>Your ticket, made easy.</h2>

        <div className="steps-grid">
          <div
            className="step-card"
            role="button"
            tabIndex={0}
            onClick={() =>
              document.getElementById("events")?.scrollIntoView({
                behavior: "smooth"
              })
            }
          >
            <span>01</span>
            <Ticket />
            <h3>Choose an event</h3>
            <p>Find an experience that interests you.</p>
          </div>

          <div
            className="step-card"
            role="button"
            tabIndex={0}
            onClick={() =>
              document.getElementById("events")?.scrollIntoView({
                behavior: "smooth"
              })
            }
          >
            <span>02</span>
            <Users />
            <h3>Register online</h3>
            <p>Enter your details and reserve your place.</p>
          </div>

          <div
            className="step-card"
            role="button"
            tabIndex={0}
            onClick={() =>
              document.getElementById("events")?.scrollIntoView({
                behavior: "smooth"
              })
            }
          >
            <span>03</span>
            <CheckCircle />
            <h3>Get your QR ticket</h3>
            <p>Receive a digital pass ready to print.</p>
          </div>
        </div>
      </section>

      <footer className="public-footer">
        <button
          className="brand"
          onClick={() =>
            window.scrollTo({ top: 0, behavior: "smooth" })
          }
        >
          <span className="brand-mark"><Ticket size={19} /></span>
          event<span>hub</span>
        </button>

        <p>Bringing people together, one event at a time.</p>

        <small>
          © {new Date().getFullYear()} EventHub. All rights reserved.
        </small>
      </footer>
    </main>
  );
}

function AdminLayout({ pageTitle, children, onNavigate, onLogout }) {
  
    const items = [
  ["dashboard", "Overview", LayoutDashboard],
  ["events-admin", "Events", CalendarDays],
  ["registrations-admin", "Registrations", Users],
  ["reports-admin", "Reports", BarChart3],
  ["scanner-admin", "QR Scanner", QrCode]
];

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <button
          className="brand admin-brand"
          onClick={() => onNavigate("dashboard")}
        >
          <span className="brand-mark"><Ticket size={20} /></span>
          event<span>hub</span>
        </button>

        <span className="sidebar-caption">WORKSPACE</span>

        {items.map(([key, label, Icon]) => (
          <button
            key={key}
            className={`admin-nav ${
              (
                (pageTitle === "Dashboard" && key === "dashboard") ||
                (pageTitle === "Manage events" && key === "events-admin") ||
                (pageTitle === "Registrations" && key === "registrations-admin") ||
                (pageTitle === "Reports & Analytics" && key === "reports-admin") ||
                (pageTitle === "QR Ticket Scanner" && key === "scanner-admin")
              ) ? "active" : ""
            }`}
            onClick={() => onNavigate(key)}
          >
            <Icon size={18} /> {label}
          </button>
        ))}

        <div className="sidebar-bottom">
          <div className="admin-user">
            <div className="avatar">A</div>
            <div>
              <strong>Administrator</strong>
              <small>Event manager</small>
            </div>
          </div>

          <button className="admin-nav logout-nav" onClick={onLogout}>
            <LogOut size={18} /> Sign out
          </button>

          <button
            className="back-site"
            onClick={() => onNavigate("home")}
          >
            ← View Homepage
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="eyebrow">EVENTHUB WORKSPACE</span>
            <h2>{pageTitle}</h2>
          </div>

          <div className="admin-top-user">
            <span className="online-dot" /> Admin workspace
          </div>
        </header>

        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <article className="stat-card">
      <div className="stat-icon">{icon}</div>
      <p>{title}</p>
      <h2>{value}</h2>
      <span className="stat-note">Updated just now</span>
    </article>
  );
}

function EventTable({ events, onDelete, onEdit, onShare }) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Event</th>
            <th>Date</th>
            <th>Venue</th>
            <th>Ticket price</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td><strong>{event.name}</strong></td>
              <td>{formatDate(event.event_date)}</td>
              <td>{event.venue}</td>
              <td>₹{event.ticket_price}</td>
              <td>
                <div className="event-row-actions">
                  <button
                    className="btn btn-small btn-ghost"
                    onClick={() => onShare(event)}
                    aria-label="Copy registration link"
                  >
                    <Share2 size={14} /> Share link
                  </button>
                  <button
                    className="btn btn-small btn-ghost"
                    onClick={() => onEdit(event)}
                    aria-label="Edit event"
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    className="icon-button danger"
                    onClick={() => onDelete(event.id)}
                    aria-label="Delete event"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {events.length === 0 && (
        <p className="empty-state">
          No events yet. Create your first event.
        </p>
      )}
    </div>
  );
}

function TicketCard({ ticket }) {
  return (
    <article className="digital-ticket">
      <div className="digital-ticket-main">
        <div className="ticket-brand">
          <span className="brand-mark"><Ticket size={17} /></span>
          event<span>hub</span>
          <span className="pass-label">ENTRY PASS</span>
        </div>

        <span className="eyebrow">ADMIT ONE</span>
        <h2>{ticket.event}</h2>

        <div className="ticket-meta">
          <div>
            <small>ATTENDEE</small>
            <strong>{ticket.name}</strong>
          </div>

          <div>
            <small>DATE</small>
            <strong>{formatDate(ticket.date)}</strong>
          </div>

          <div>
            <small>VENUE</small>
            <strong>{ticket.venue}</strong>
          </div>
        </div>

        <div className="ticket-id">
          TICKET ID <strong>{ticket.id}</strong>
        </div>
      </div>

      <div className="digital-ticket-qr">
        <QRCodeSVG value={ticket.id} size={142} level="H" />
        <small>SCAN AT ENTRY</small>
      </div>
    </article>
  );
}

function DonutChart({
  title,
  subtitle,
  firstLabel,
  firstValue,
  secondLabel,
  secondValue,
  firstColor,
  secondColor
}) {
  const total = firstValue + secondValue;
  const firstPercent = total > 0 ? (firstValue / total) * 100 : 0;
  const firstDegrees = firstPercent * 3.6;
  const chartStyle = {
    background: total > 0
      ? `conic-gradient(${firstColor} 0deg ${firstDegrees}deg, ${secondColor} ${firstDegrees}deg 360deg)`
      : "conic-gradient(#454052 0deg 360deg)"
  };

  return (
    <section className="admin-panel donut-chart-panel">
      <div className="chart-heading">
        <div>
          <h2>{title}</h2>
          <p className="muted">{subtitle}</p>
        </div>
      </div>
      <div className="donut-chart-content">
        <div
          className="donut-chart"
          style={chartStyle}
          role="img"
          aria-label={`${firstLabel}: ${firstValue}, ${secondLabel}: ${secondValue}`}
        >
          <div className="donut-chart-hole">
            <strong>{total}</strong>
            <span>Total</span>
          </div>
        </div>
        <div className="chart-legend">
          <div>
            <span className="legend-dot" style={{ background: firstColor }} />
            <span>{firstLabel}</span>
            <strong>{firstValue}</strong>
          </div>
          <div>
            <span className="legend-dot" style={{ background: secondColor }} />
            <span>{secondLabel}</span>
            <strong>{secondValue}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReportsPage({ events, registrations }) {
  const totalRegistrations = registrations.length;
  const paidCount = registrations.filter(
    (r) => r.payment_status === "Paid"
  ).length;
  const pendingCount = registrations.filter(
    (r) => (r.payment_status || "Pending") === "Pending"
  ).length;
  const presentCount = registrations.filter(
    (r) => r.attendance_status === "Present"
  ).length;
  const absentCount = registrations.filter(
    (r) => (r.attendance_status || "Absent") === "Absent"
  ).length;

  // Revenue is estimated from the event's ticket price for registrations
  // whose payment status is marked Paid in the admin panel.
  const paidRevenue = registrations.reduce((total, registration) => {
    if (registration.payment_status !== "Paid") return total;
    const event = events.find(
      (item) => String(item.id) === String(registration.event_id)
    );
    return total + Number(event?.ticket_price || 0);
  }, 0);

  const eventReports = events.map((event) => {
    const eventRegistrations = registrations.filter(
      (r) => String(r.event_id) === String(event.id)
    );
    return {
      ...event,
      total: eventRegistrations.length,
      paid: eventRegistrations.filter((r) => r.payment_status === "Paid").length,
      present: eventRegistrations.filter(
        (r) => r.attendance_status === "Present"
      ).length,
      absent: eventRegistrations.filter(
        (r) => (r.attendance_status || "Absent") === "Absent"
      ).length
    };
  });

  function exportRegistrations() {
    const columns = [
      "Event", "Student Name", "Email", "Phone", "Ticket ID",
      "Payment Status", "Attendance Status", "Registration Date"
    ];
    const safeCell = (value) => {
      let text = String(value ?? "");
      if (/^[=+@\\-]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    };
    const rows = registrations.map((r) => {
      const event = events.find((item) => String(item.id) === String(r.event_id));
      return [
        event?.name || "Event",
        r.student_name,
        r.email,
        r.phone,
        r.ticket_code,
        r.payment_status || "Pending",
        r.attendance_status || "Absent",
        r.created_at ? new Date(r.created_at).toLocaleString("en-IN") : ""
      ];
    });
    const csv = [columns, ...rows].map((row) => row.map(safeCell).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "eventhub-registrations.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="reports-page">
      <div className="section-heading admin-page-heading">
        <div>
          <span className="eyebrow">EVENT PERFORMANCE</span>
          <h1>Reports & Analytics</h1>
          <p className="muted">
            A summary of events, registrations, payments and attendance.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={exportRegistrations}
          disabled={registrations.length === 0}
        >
          <Download size={16} /> Export registrations CSV
        </button>
      </div>

      <div className="stats-grid reports-stats">
        <StatCard
          title="Total events"
          value={events.length}
          icon={<CalendarDays />}
        />
        <StatCard
          title="Total registrations"
          value={totalRegistrations}
          icon={<Users />}
        />
        <StatCard
          title="Paid registrations"
          value={paidCount}
          icon={<CheckCircle />}
        />
        <StatCard
          title="Pending payments"
          value={pendingCount}
          icon={<Ticket />}
        />
        <StatCard
          title="Present attendees"
          value={presentCount}
          icon={<CheckCircle />}
        />
        <StatCard
          title="Absent attendees"
          value={absentCount}
          icon={<Users />}
        />
      </div>

      <section className="admin-panel revenue-panel">
        <div>
          <span className="eyebrow">ESTIMATED PAID TICKET VALUE</span>
          <h2>₹{paidRevenue.toLocaleString("en-IN")}</h2>
          <p className="muted">
            Calculated using ticket prices for registrations marked as Paid.
            This is not a payment-gateway settlement report.
          </p>
        </div>
        <div className="revenue-icon">
          <BarChart3 size={28} />
        </div>
      </section>

      <div className="analytics-chart-grid">
        <DonutChart
          title="Payment Status"
          subtitle="Paid vs pending registrations"
          firstLabel="Paid"
          firstValue={paidCount}
          secondLabel="Pending"
          secondValue={pendingCount}
          firstColor="#9b78ff"
          secondColor="#e879b9"
        />
        <DonutChart
          title="Attendance Report"
          subtitle="Present vs absent attendees"
          firstLabel="Present"
          firstValue={presentCount}
          secondLabel="Absent"
          secondValue={absentCount}
          firstColor="#42c99a"
          secondColor="#f0a45d"
        />
      </div>

      <section className="admin-panel analytics-bar-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">REGISTRATION COMPARISON</span>
            <h2>Event Registrations</h2>
            <p className="muted">Number of registrations for each event.</p>
          </div>
          <BarChart3 size={25} />
        </div>
        {eventReports.length ? (
          <div className="event-bars">
            {eventReports.map((event) => {
              const maxRegistrations = Math.max(
                1,
                ...eventReports.map((item) => item.total)
              );
              const barWidth = (event.total / maxRegistrations) * 100;
              return (
                <div className="event-bar-row" key={event.id}>
                  <div className="event-bar-label" title={event.name}>
                    {event.name}
                  </div>
                  <div className="event-bar-track">
                    <div
                      className="event-bar-fill"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <strong>{event.total}</strong>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="empty-state">No event data available to display.</p>
        )}
      </section>

      <section className="admin-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">EVENT-WISE BREAKDOWN</span>
            <h2>Event performance</h2>
          </div>
        </div>

        <div className="table-scroll">
          <table className="data-table reports-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Registrations</th>
                <th>Paid</th>
                <th>Present</th>
                <th>Absent</th>
              </tr>
            </thead>
            <tbody>
              {eventReports.map((event) => (
                <tr key={event.id}>
                  <td><strong>{event.name}</strong></td>
                  <td>{event.total}</td>
                  <td>{event.paid}</td>
                  <td>{event.present}</td>
                  <td>{event.absent}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {eventReports.length === 0 && (
            <p className="empty-state">No event data available yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function QRScanner({ session, onValidated }) {
  const [scanKey, setScanKey] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ticketCode, setTicketCode] = useState("");

  async function validateTicketCode(code) {
    const normalizedCode = String(code || "").trim();
    if (!normalizedCode) {
      setError("Please enter a Ticket ID or scan its QR code.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch(`${API_URL}/api/validate-ticket`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`
        },
        body: JSON.stringify({ ticket_code: normalizedCode })
      });
      const data = await response.json();
      setResult({ ...data, status: response.status });
      if (response.ok && onValidated) onValidated();
    } catch (err) {
      setError(err.message || "Ticket validation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      `eventhub-qr-reader-${scanKey}`,
      {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      },
      false
    );

    let scanned = false;

    scanner.render(
      async (decodedText) => {
        if (scanned) return;
        scanned = true;
        setLoading(true);

        try {
          await scanner.clear();

          await validateTicketCode(decodedText);
        } catch (err) {
          setError(err.message || "Ticket validation failed");
        } finally {
          setLoading(false);
        }
      },
      () => {}
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [scanKey]);

  return (
    <div className="card" style={{ padding: "24px" }}>
      <h2>QR Ticket Scanner</h2>
      <p>Scan the attendee's EventHub ticket QR code.</p>

      <div
        id={`eventhub-qr-reader-${scanKey}`}
        style={{ maxWidth: "500px" }}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          validateTicketCode(ticketCode);
        }}
        style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "16px" }}
      >
        <input
          value={ticketCode}
          onChange={(e) => setTicketCode(e.target.value)}
          placeholder="Or enter Ticket ID manually"
          aria-label="Ticket ID"
          style={{ flex: "1 1 220px", minWidth: 0, padding: "12px", borderRadius: "8px" }}
        />
        <button className="btn btn-primary" type="submit" disabled={loading}>
          Verify Ticket
        </button>
      </form>

      {loading && <p>Verifying ticket...</p>}

      {error && (
        <p style={{ color: "red" }}>{error}</p>
      )}

      {result && (
        <div style={{ marginTop: "20px" }}>
          <h3>
            {result.success ? "Ticket Verified!" : "Verification Failed"}
          </h3>
          <p>{result.message}</p>

          {result.attendee && (
            <>
              <p>
                Attendee: {result.attendee.student_name}
              </p>
              <p>
                Ticket ID: {result.attendee.ticket_code}
              </p>
            </>
          )}
        </div>
      )}

      <button
        className="btn btn-primary"
        style={{ marginTop: "20px" }}
        onClick={() => {
          setResult(null);
          setError("");
          setTicketCode("");
          setScanKey((key) => key + 1);
        }}
      >
        Scan Another Ticket
      </button>
    </div>
  )
}
