import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { QRCodeSVG } from "qrcode.react";
import {
  CalendarDays, Ticket, Users, LayoutDashboard, LogOut, Plus,
  Trash2, CheckCircle, ArrowRight, MapPin, Clock, Sparkles,
  Menu, X, ShieldCheck, Search, ChevronRight
} from "lucide-react";
import "./App.css";

const formatDate = (value) => {
  if (!value) return "Date to be announced";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });
};

export default function App() {
  const [session, setSession] = useState(null);
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [page, setPage] = useState("home");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [search, setSearch] = useState("");
  const [showEventForm, setShowEventForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setMessage(error.message);
      setSession(data?.session ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (session) loadAdminData();
  }, [session]);

  async function loadEvents() {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true });
    if (error) setMessage(`Could not load events: ${error.message}`);
    else setEvents(data || []);
  }

  async function loadAdminData() {
    const [{ data: eventData, error: eventError }, { data: regData, error: regError }] =
      await Promise.all([
        supabase.from("events").select("*").order("event_date", { ascending: true }),
        supabase.from("registrations").select("*").order("id", { ascending: false })
      ]);

    if (eventError || regError) {
      setMessage(eventError?.message || regError?.message || "Could not load dashboard data.");
      return;
    }
    setEvents(eventData || []);
    setRegistrations(regData || []);
  }

  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setMessage(error.message);
    else setPage("dashboard");
  }

  async function logout() {
    await supabase.auth.signOut();
    setPage("home");
    setRegistrations([]);
    setTicket(null);
    setMessage("");
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
    if (!window.confirm("Delete this event? Related registrations may prevent deletion.")) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) setMessage(error.message);
    else {
      await loadAdminData();
      setMessage("Event deleted.");
    }
  }

  async function registerForEvent(e, event) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(e.currentTarget);
    const code = `TKT-${Date.now()}`;
    const { error } = await supabase.from("registrations").insert([{
      ticket_code: code,
      event_id: event.id,
      student_name: String(form.get("name")).trim(),
      email: String(form.get("email")).trim(),
      phone: String(form.get("phone")).trim(),
      payment_status: "Pending",
      attendance_status: "Absent"
    }]);
    setBusy(false);
    if (error) {
      setMessage(`Registration could not be completed: ${error.message}`);
      return;
    }
    setTicket({
      id: code,
      name: String(form.get("name")).trim(),
      email: String(form.get("email")).trim(),
      event: event.name,
      date: event.event_date,
      venue: event.venue
    });
    e.currentTarget.reset();
    setSelectedEvent(null);
    setPage("ticket");
    await loadEvents();
  }

  async function updateRegistration(id, field, value) {
    const column = field === "payment" ? "payment_status" : "attendance_status";
    const { error } = await supabase.from("registrations").update({ [column]: value }).eq("id", id);
    if (error) setMessage(error.message);
    else await loadAdminData();
  }

  async function deleteRegistration(id) {
    if (!window.confirm("Delete this registration?")) return;
    const { error } = await supabase.from("registrations").delete().eq("id", id);
    if (error) setMessage(error.message);
    else await loadAdminData();
  }

  if (loading) return <div className="loading-screen"><div className="loader" /><p>Preparing EventHub…</p></div>;

  const filteredRegistrations = registrations.filter((r) =>
    `${r.student_name || ""} ${r.email || ""} ${r.ticket_code || ""}`
      .toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="site-shell">
      {page !== "dashboard" && page !== "events-admin" && page !== "registrations-admin" && page !== "login" && (
        <PublicHeader
          onHome={() => { setPage("home"); setTicket(null); }}
          onEvents={() => { setPage("home"); document.getElementById("events")?.scrollIntoView({ behavior: "smooth" }); }}
          onAdmin={() => { setPage("login"); setMessage(""); }}
          mobileMenu={mobileMenu}
          setMobileMenu={setMobileMenu}
        />
      )}

      {message && (
        <div className="notice" role="status">
          <span>{message}</span>
          <button onClick={() => setMessage("")} aria-label="Dismiss message"><X size={16} /></button>
        </div>
      )}

      {page === "home" && (
        <HomePage
          events={events}
          onRegister={(event) => { setSelectedEvent(event); setMessage(""); }}
          onAdmin={() => { setPage("login"); setMessage(""); }}
        />
      )}

      {selectedEvent && page === "home" && (
        <div className="modal-backdrop" onClick={() => setSelectedEvent(null)}>
          <section className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedEvent(null)} aria-label="Close"><X /></button>
            <span className="eyebrow">EVENT REGISTRATION</span>
            <h2>Book your spot</h2>
            <p className="muted">{selectedEvent.name} · {formatDate(selectedEvent.event_date)}</p>
            <form className="stack-form" onSubmit={(e) => registerForEvent(e, selectedEvent)}>
              <label>Full name<input name="name" placeholder="Enter your full name" required /></label>
              <label>Email address<input name="email" type="email" placeholder="you@example.com" required /></label>
              <label>Phone number<input name="phone" type="tel" placeholder="Enter phone number" required /></label>
              <button className="btn btn-primary full" disabled={busy}>{busy ? "Registering…" : "Register & generate ticket"} <ArrowRight size={17} /></button>
            </form>
            <p className="fine-print">Your registration will be saved with payment status marked as Pending.</p>
          </section>
        </div>
      )}

      {page === "ticket" && ticket && (
        <main className="ticket-page">
          <div className="success-mark"><CheckCircle size={30} /></div>
          <span className="eyebrow">REGISTRATION CONFIRMED</span>
          <h1>Your event pass is ready.</h1>
          <p className="muted">Keep this ticket safe and show the QR code at the event.</p>
          <TicketCard ticket={ticket} />
          <div className="ticket-actions">
            <button className="btn btn-primary" onClick={() => window.print()}>Print ticket</button>
            <button className="btn btn-ghost" onClick={() => { setTicket(null); setPage("home"); }}>Back to events</button>
          </div>
        </main>
      )}

      {page === "login" && (
        <main className="auth-page">
          <form className="auth-card" onSubmit={login}>
            <div className="brand-mark"><Ticket size={23} /></div>
            <span className="eyebrow">EVENTHUB ADMIN</span>
            <h1>Welcome back</h1>
            <p className="muted">Sign in to manage events, registrations and attendance.</p>
            <label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" required /></label>
            <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required /></label>
            <button className="btn btn-primary full" disabled={busy}>{busy ? "Signing in…" : "Sign in"} <ArrowRight size={17} /></button>
            <button type="button" className="text-button" onClick={() => { setPage("home"); setMessage(""); }}>← Back to website</button>
            <p className="fine-print">Admin accounts are managed in Supabase Authentication.</p>
          </form>
        </main>
      )}

      {page === "dashboard" && session && (
        <AdminLayout pageTitle="Dashboard" session={session} onNavigate={setPage} onLogout={logout}>
          <div className="admin-welcome">
            <div><span className="eyebrow">OVERVIEW</span><h1>Good to see you.</h1><p className="muted">Here’s what’s happening with your events.</p></div>
            <button className="btn btn-primary" onClick={() => { setPage("events-admin"); setShowEventForm(true); }}><Plus size={17} /> Create event</button>
          </div>
          <div className="stats-grid">
            <StatCard title="Total events" value={events.length} icon={<CalendarDays />} />
            <StatCard title="Registrations" value={registrations.length} icon={<Users />} />
            <StatCard title="Paid tickets" value={registrations.filter(r => r.payment_status === "Paid").length} icon={<Ticket />} />
            <StatCard title="Checked in" value={registrations.filter(r => r.attendance_status === "Present").length} icon={<CheckCircle />} />
          </div>
          <section className="admin-panel">
            <div className="section-heading"><div><span className="eyebrow">YOUR SCHEDULE</span><h2>Recent events</h2></div><button className="link-button" onClick={() => setPage("events-admin")}>View all <ChevronRight size={16} /></button></div>
            <EventTable events={events.slice(0, 5)} onDelete={deleteEvent} />
          </section>
        </AdminLayout>
      )}

      {page === "events-admin" && session && (
        <AdminLayout pageTitle="Manage events" session={session} onNavigate={setPage} onLogout={logout}>
          <div className="section-heading admin-page-heading"><div><span className="eyebrow">EVENT MANAGEMENT</span><h1>Your events</h1><p className="muted">Create and manage the events shown on your public website.</p></div><button className="btn btn-primary" onClick={() => setShowEventForm(!showEventForm)}><Plus size={17} /> Add event</button></div>
          {showEventForm && <form className="event-form admin-panel" onSubmit={addEvent}>
            <label>Event name<input name="name" placeholder="e.g. Annual Tech Fest" required /></label>
            <label>Date<input name="date" type="date" required /></label>
            <label>Venue<input name="venue" placeholder="College auditorium" required /></label>
            <label>Ticket price (₹)<input name="price" type="number" min="0" placeholder="0" required /></label>
            <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save event"}</button>
          </form>}
          <section className="admin-panel"><EventTable events={events} onDelete={deleteEvent} /></section>
        </AdminLayout>
      )}

      {page === "registrations-admin" && session && (
        <AdminLayout pageTitle="Registrations" session={session} onNavigate={setPage} onLogout={logout}>
          <div className="section-heading admin-page-heading"><div><span className="eyebrow">ATTENDEE MANAGEMENT</span><h1>Registrations</h1><p className="muted">Search attendees and update payment or attendance status.</p></div></div>
          <section className="admin-panel">
            <div className="search-box"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or ticket ID…" /></div>
            <div className="table-scroll"><table className="data-table"><thead><tr><th>Attendee</th><th>Event</th><th>Ticket ID</th><th>Payment</th><th>Attendance</th><th /></tr></thead>
              <tbody>{filteredRegistrations.map((r) => <tr key={r.id}>
                <td><strong>{r.student_name}</strong><small>{r.email}</small></td>
                <td>{events.find((ev) => ev.id === r.event_id)?.name || "Event"}</td>
                <td><code>{r.ticket_code}</code></td>
                <td><select value={r.payment_status || "Pending"} onChange={(e) => updateRegistration(r.id, "payment", e.target.value)}><option>Pending</option><option>Paid</option></select></td>
                <td><select value={r.attendance_status || "Absent"} onChange={(e) => updateRegistration(r.id, "attendance", e.target.value)}><option>Absent</option><option>Present</option></select></td>
                <td><button className="icon-button danger" onClick={() => deleteRegistration(r.id)} aria-label="Delete registration"><Trash2 size={17} /></button></td>
              </tr>)}</tbody></table>
              {filteredRegistrations.length === 0 && <p className="empty-state">No registrations found.</p>}
            </div>
          </section>
        </AdminLayout>
      )}
    </div>
  );
}

function PublicHeader({ onHome, onEvents, onAdmin, mobileMenu, setMobileMenu }) {
  return <header className="public-header"><button className="brand" onClick={onHome}><span className="brand-mark"><Ticket size={20} /></span>event<span>hub</span></button>
    <nav className={mobileMenu ? "public-nav open" : "public-nav"}><button onClick={onHome}>Home</button><button onClick={onEvents}>Explore events</button><button onClick={onAdmin}>Admin</button></nav>
    <button className="btn btn-primary header-cta" onClick={onEvents}>Explore events <ArrowRight size={16} /></button>
    <button className="mobile-toggle" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle menu">{mobileMenu ? <X /> : <Menu />}</button>
  </header>;
}

function HomePage({ events, onRegister }) {
  return <main>
    <section className="hero-section">
      <div className="hero-glow glow-one" /><div className="hero-glow glow-two" />
      <div className="hero-copy"><div className="hero-pill"><Sparkles size={14} /> MAKE MOMENTS HAPPEN</div>
        <h1>Discover events.<br /><span>Make memories.</span></h1>
        <p>Find your next experience, connect with your community, and book your place in just a few clicks.</p>
        <button className="btn btn-primary hero-button" onClick={() => document.getElementById("events")?.scrollIntoView({ behavior: "smooth" })}>Explore upcoming events <ArrowRight size={18} /></button>
        <div className="hero-proof"><div className="proof-icon"><Users size={17} /></div><div><strong>{events.length} events listed</strong><small>Experiences waiting for you</small></div></div>
      </div>
      <div className="hero-art"><div className="orbit orbit-a" /><div className="orbit orbit-b" /><div className="hero-ticket"><div className="ticket-top"><span>YOUR NEXT EXPERIENCE</span><Sparkles size={19} /></div><div className="ticket-visual"><CalendarDays size={42} /><span>LIVE<br />THE<br />MOMENT</span></div><div className="ticket-bottom"><div><small>DISCOVER SOMETHING</small><strong>UNFORGETTABLE</strong></div><Ticket size={28} /></div></div><div className="floating-chip chip-top"><CheckCircle size={16} /> Easy registration</div><div className="floating-chip chip-bottom"><Ticket size={16} /> Instant QR ticket</div></div>
    </section>
    <section className="trust-strip"><div><ShieldCheck size={19} /><span>Simple registration</span></div><div><Ticket size={19} /><span>Digital QR tickets</span></div><div><Users size={19} /><span>Made for communities</span></div></section>
    <section className="events-section" id="events"><div className="section-heading"><div><span className="eyebrow">FIND YOUR NEXT EXPERIENCE</span><h2>Upcoming events</h2><p className="muted">Explore what’s happening and reserve your spot.</p></div><span className="event-count">{events.length} available</span></div>
      {events.length ? <div className="event-grid">{events.map((event, index) => <article className="event-card" key={event.id}><div className={`event-art art-${index % 4}`}><span className="event-art-label">EVENTHUB EXPERIENCE</span><div className="art-symbol">{index % 2 === 0 ? <Sparkles size={45} /> : <CalendarDays size={45} />}</div><span className="art-number">0{index + 1}</span></div><div className="event-card-body"><div className="event-date"><CalendarDays size={14} /> {formatDate(event.event_date)}</div><h3>{event.name}</h3><p className="event-venue"><MapPin size={15} /> {event.venue}</p><div className="event-card-footer"><strong>{Number(event.ticket_price) === 0 ? "Free" : `₹${event.ticket_price}`}</strong><button className="btn btn-small btn-primary" onClick={() => onRegister(event)}>Register <ArrowRight size={15} /></button></div></div></article>)}</div> : <div className="empty-events"><div className="empty-icon"><CalendarDays size={28} /></div><h3>Events are coming soon</h3><p>There are no events published right now. Please check back later.</p></div>}
    </section>
    <section className="how-section"><span className="eyebrow">A FEW SIMPLE STEPS</span><h2>Your ticket, made easy.</h2><div className="steps-grid"><div className="step-card"><span>01</span><Ticket /><h3>Choose an event</h3><p>Find an experience that interests you.</p></div><div className="step-card"><span>02</span><Users /><h3>Register online</h3><p>Enter your details and reserve your place.</p></div><div className="step-card"><span>03</span><CheckCircle /><h3>Get your QR ticket</h3><p>Receive a digital pass ready to print.</p></div></div></section>
    <footer className="public-footer"><button className="brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><span className="brand-mark"><Ticket size={19} /></span>event<span>hub</span></button><p>Bringing people together, one event at a time.</p><small>© {new Date().getFullYear()} EventHub. All rights reserved.</small></footer>
  </main>;
}

function AdminLayout({ pageTitle, children, onNavigate, onLogout }) {
  const items = [["dashboard", "Overview", LayoutDashboard], ["events-admin", "Events", CalendarDays], ["registrations-admin", "Registrations", Users]];
  const active = items.find(([key]) => key === pageTitle.toLowerCase().replace("manage ", "") || key === (pageTitle === "Dashboard" ? "dashboard" : ""))?.[0];
  return <div className="admin-shell"><aside className="admin-sidebar"><button className="brand admin-brand" onClick={() => onNavigate("dashboard")}><span className="brand-mark"><Ticket size={20} /></span>event<span>hub</span></button><span className="sidebar-caption">WORKSPACE</span>{items.map(([key, label, Icon]) => <button key={key} className={`admin-nav ${((pageTitle === "Dashboard" && key === "dashboard") || (pageTitle === "Manage events" && key === "events-admin") || (pageTitle === "Registrations" && key === "registrations-admin")) ? "active" : ""}`} onClick={() => onNavigate(key)}><Icon size={18} />{label}</button>)}<div className="sidebar-bottom"><div className="admin-user"><div className="avatar">A</div><div><strong>Administrator</strong><small>Event manager</small></div></div><button className="admin-nav logout-nav" onClick={onLogout}><LogOut size={18} />Sign out</button><button className="back-site" onClick={() => onNavigate("home")}>← View public website</button></div></aside><main className="admin-main"><header className="admin-topbar"><div><span className="eyebrow">EVENTHUB WORKSPACE</span><h2>{pageTitle}</h2></div><div className="admin-top-user"><span className="online-dot" /> Admin workspace</div></header><div className="admin-content">{children}</div></main></div>;
}

function StatCard({ title, value, icon }) {
  return <article className="stat-card"><div className="stat-icon">{icon}</div><p>{title}</p><h2>{value}</h2><span className="stat-note">Updated just now</span></article>;
}

function EventTable({ events, onDelete }) {
  return <div className="table-scroll"><table className="data-table"><thead><tr><th>Event</th><th>Date</th><th>Venue</th><th>Ticket price</th><th /></tr></thead><tbody>{events.map((event) => <tr key={event.id}><td><strong>{event.name}</strong></td><td>{formatDate(event.event_date)}</td><td>{event.venue}</td><td>₹{event.ticket_price}</td><td><button className="icon-button danger" onClick={() => onDelete(event.id)} aria-label="Delete event"><Trash2 size={17} /></button></td></tr>)}</tbody></table>{events.length === 0 && <p className="empty-state">No events yet. Create your first event.</p>}</div>;
}

function TicketCard({ ticket }) {
  return <article className="digital-ticket"><div className="digital-ticket-main"><div className="ticket-brand"><span className="brand-mark"><Ticket size={17} /></span>event<span>hub</span><span className="pass-label">ENTRY PASS</span></div><span className="eyebrow">ADMIT ONE</span><h2>{ticket.event}</h2><div className="ticket-meta"><div><small>ATTENDEE</small><strong>{ticket.name}</strong></div><div><small>DATE</small><strong>{formatDate(ticket.date)}</strong></div><div><small>VENUE</small><strong>{ticket.venue}</strong></div></div><div className="ticket-id">TICKET ID <strong>{ticket.id}</strong></div></div><div className="digital-ticket-qr"><QRCodeSVG value={ticket.id} size={142} level="H" /><small>SCAN AT ENTRY</small></div></article>;
}
