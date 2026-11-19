
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { QRCodeSVG } from "qrcode.react";
import {
  LayoutDashboard, CalendarDays, Users, Ticket,
  Plus, Trash2, CheckCircle, LogOut
} from "lucide-react";
import "./App.css";

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [page, setPage] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [ticket, setTicket] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadData();
  }, [session]);

  async function login(e) {
    e.preventDefault();
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) setMessage(error.message);
  }

  async function logout() {
    await supabase.auth.signOut();
    setEvents([]);
    setRegistrations([]);
    setTicket(null);
  }

  async function loadData() {
    const { data: eventData, error: eventError } =
      await supabase.from("events").select("*").order("id");

    const { data: registrationData, error: regError } =
      await supabase.from("registrations").select("*").order("id", {
        ascending: false
      });

    if (eventError || regError) {
      setMessage(eventError?.message || regError?.message);
      return;
    }

    setEvents(eventData || []);
    setRegistrations(registrationData || []);
  }

  async function addEvent(e) {
    e.preventDefault();
    const form = new FormData(e.target);

    const { error } = await supabase.from("events").insert([{
      name: form.get("name"),
      event_date: form.get("date"),
      venue: form.get("venue"),
      ticket_price: Number(form.get("price"))
    }]);

    if (error) {
      setMessage(error.message);
      return;
    }

    e.target.reset();
    setShowForm(false);
    loadData();
  }

  async function deleteEvent(id) {
    if (!window.confirm("Delete this event and its registrations?")) return;

    const { error } = await supabase.from("events").delete().eq("id", id);

    if (error) setMessage(error.message);
    else loadData();
  }

  async function registerStudent(e, event) {
    e.preventDefault();
    const form = new FormData(e.target);
    const code = "TKT-" + Date.now();

    const { error } = await supabase.from("registrations").insert([{
      ticket_code: code,
      event_id: event.id,
      student_name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone"),
      payment_status: "Pending",
      attendance_status: "Absent"
    }]);

    if (error) {
      setMessage(error.message);
      return;
    }

    setTicket({
      id: code,
      name: form.get("name"),
      event: event.name
    });

    e.target.reset();
    loadData();
  }

  async function updateRegistration(id, field, value) {
    const column = field === "payment"
      ? "payment_status"
      : "attendance_status";

    const { error } = await supabase
      .from("registrations")
      .update({ [column]: value })
      .eq("id", id);

    if (error) setMessage(error.message);
    else loadData();
  }

  async function deleteRegistration(id) {
    if (!window.confirm("Delete this registration?")) return;

    const { error } = await supabase
      .from("registrations")
      .delete()
      .eq("id", id);

    if (error) setMessage(error.message);
    else loadData();
  }

  if (loading) return <h2>Loading EventHub...</h2>;

  if (!session) {
    return (
      <div className="login-page">
        <form className="panel login-form" onSubmit={login}>
          <h2>EventHub Admin Login</h2>
          <p>Login to manage college events</p>

          <input
            type="email"
            placeholder="Admin Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          <button className="primary">Login</button>
          {message && <p>{message}</p>}
        </form>
      </div>
    );
  }

  const navItems = [
    ["Dashboard", LayoutDashboard],
    ["Events", CalendarDays],
    ["Registrations", Users],
    ["Tickets", Ticket]
  ];

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>Event<span>Hub</span></h2>
        <p className="side-label">MAIN MENU</p>

        {navItems.map(([name, Icon]) => (
          <button
            key={name}
            className={page === name ? "nav active" : "nav"}
            onClick={() => {
              setPage(name);
              setTicket(null);
            }}
          >
            <Icon size={19} /> {name}
          </button>
        ))}

        <div className="side-bottom">
          <button className="nav" onClick={logout}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h2>{page}</h2>
            <p>Manage your college events and tickets</p>
          </div>
          <span className="admin">Admin</span>
        </header>

        {message && <p className="empty">{message}</p>}

        {page === "Dashboard" && (
          <>
            <div className="welcome">
              <div>
                <h1>Welcome to EventHub 👋</h1>
                <p>Manage events, registrations and tickets.</p>
              </div>
              <button className="primary" onClick={() => {
                setPage("Events");
                setShowForm(true);
              }}>
                <Plus size={18} /> Create Event
              </button>
            </div>

            <div className="stats">
              <Stat title="Total Events" value={events.length}
                icon={<CalendarDays />} />
              <Stat title="Registrations" value={registrations.length}
                icon={<Users />} />
              <Stat title="Paid Tickets"
                value={registrations.filter(r =>
                  r.payment_status === "Paid").length}
                icon={<Ticket />} />
              <Stat title="Attendance"
                value={registrations.filter(r =>
                  r.attendance_status === "Present").length}
                icon={<CheckCircle />} />
            </div>

            <section className="panel">
              <h3>Recent Events</h3>
              <EventList events={events.slice(0, 5)}
                onDelete={deleteEvent} />
            </section>
          </>
        )}

        {page === "Events" && (
          <section className="panel">
            <div className="panel-heading">
              <h3>Manage Events</h3>
              <button className="primary"
                onClick={() => setShowForm(!showForm)}>
                <Plus size={18} /> Add Event
              </button>
            </div>

            {showForm && (
              <form className="form-grid" onSubmit={addEvent}>
                <input name="name" placeholder="Event Name" required />
                <input name="date" type="date" required />
                <input name="venue" placeholder="Venue" required />
                <input name="price" type="number" min="0"
                  placeholder="Ticket Price (₹)" required />
                <button className="primary">Save Event</button>
              </form>
            )}

            <EventList events={events} onDelete={deleteEvent} />
          </section>
        )}

        {page === "Registrations" && (
          <section className="panel">
            <div className="panel-heading">
              <h3>Student Registrations</h3>
              <input className="search"
                placeholder="Search student..."
                value={search}
                onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Event</th>
                    <th>Payment</th>
                    <th>Attendance</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.filter(r =>
                    r.student_name.toLowerCase().includes(
                      search.toLowerCase()
                    )
                  ).map(r => (
                    <tr key={r.id}>
                      <td>
                        {r.student_name}
                        <small>{r.email}</small>
                      </td>
                      <td>{events.find(e => e.id === r.event_id)?.name || "Event"}</td>
                      <td>
                        <select value={r.payment_status}
                          onChange={e => updateRegistration(
                            r.id, "payment", e.target.value
                          )}>
                          <option>Pending</option>
                          <option>Paid</option>
                        </select>
                      </td>
                      <td>
                        <select value={r.attendance_status}
                          onChange={e => updateRegistration(
                            r.id, "attendance", e.target.value
                          )}>
                          <option>Absent</option>
                          <option>Present</option>
                        </select>
                      </td>
                      <td>
                        <button className="delete"
                          onClick={() => deleteRegistration(r.id)}>
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {registrations.length === 0 &&
                <p className="empty">No registrations yet.</p>}
            </div>
          </section>
        )}

        {page === "Tickets" && (
          <section className="panel">
            <h3>Event Registration & Tickets</h3>

            {events.map(event => (
              <div className="register-card" key={event.id}>
                <div>
                  <h3>{event.name}</h3>
                  <p>{event.event_date} · {event.venue}</p>
                  <b>Ticket: ₹{event.ticket_price}</b>
                </div>

                <form onSubmit={e => registerStudent(e, event)}>
                  <input name="name" placeholder="Student Name" required />
                  <input name="email" type="email"
                    placeholder="Email Address" required />
                  <input name="phone" placeholder="Phone Number" required />
                  <button className="primary">
                    Register & Generate Ticket
                  </button>
                </form>
              </div>
            ))}

            {events.length === 0 &&
              <p className="empty">Create an event first.</p>}
          </section>
        )}

        {ticket && (
          <section className="ticket">
            <h2>Registration Successful!</h2>
            <p>Your ticket has been generated.</p>
            <QRCodeSVG value={ticket.id} size={150} />
            <h3>{ticket.event}</h3>
            <p>Student: {ticket.name}</p>
            <p>Ticket ID: <b>{ticket.id}</b></p>
            <button className="primary" onClick={() => window.print()}>
              Print Ticket
            </button>
            <button className="secondary"
              onClick={() => setTicket(null)}>Close</button>
          </section>
        )}
      </main>
    </div>
  );
}

function Stat({ title, value, icon }) {
  return (
    <div className="stat">
      <div className="stat-icon">{icon}</div>
      <p>{title}</p>
      <h2>{value}</h2>
    </div>
  );
}

function EventList({ events, onDelete }) {
  return (
    <div className="event-list">
      {events.map(event => (
        <div className="event-row" key={event.id}>
          <div>
            <b>{event.name}</b>
            <small>{event.event_date} · {event.venue}</small>
          </div>
          <strong>₹{event.ticket_price}</strong>
          <button className="delete" onClick={() => onDelete(event.id)}>
            <Trash2 size={18} />
          </button>
        </div>
      ))}
      {events.length === 0 &&
        <p className="empty">No events added yet.</p>}
    </div>
  );
}
