import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SubscriptionGate } from "./components/SubscriptionGate";
import { SyncToObsidianButton } from "./components/SyncToObsidianButton";
import { Auth } from "./pages/Auth";
import { useAuth } from "./hooks/useAuth";
import { usePlanner } from "./hooks/usePlanner";
import { COLORS, inputStyle, smallBtnStyle } from "./styles";

const cardStyle = {
  background: COLORS.cardBg,
  borderRadius: 16,
  boxShadow: COLORS.shadow,
  border: `1px solid ${COLORS.borderLight}`,
};

const DAYS = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag"];
const DAY_CAPACITY = 7;

const CLIENT_COLORS = [
  "#EDB90A", "#22C982", "#4D94F7", "#8B5CF6", "#EC4899",
  "#F97316", "#14B8A6", "#E04848", "#6366F1", "#84CC16",
];

function getClientColor(clientName, clients) {
  const idx = clients.indexOf(clientName);
  return CLIENT_COLORS[idx % CLIENT_COLORS.length];
}

function formatHours(h) {
  if (h === 0) return "0u";
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  if (mins === 0) return `${hours}u`;
  if (hours === 0) return `${mins}m`;
  return `${hours}u${mins}m`;
}

function toLocalDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getMondayOfWeek(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getWeekDates(offset = 0) {
  const monday = getMondayOfWeek(offset);
  return DAYS.map((name, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      name,
      date: d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" }),
      full: toLocalDateString(d),
    };
  });
}

function getWeekNumber(offset = 0) {
  const monday = getMondayOfWeek(offset);
  const yearStart = new Date(monday.getFullYear(), 0, 1);
  const diff = monday - yearStart;
  const oneWeek = 604800000;
  return Math.ceil((diff / oneWeek + yearStart.getDay() / 7));
}

function getWeekStart(offset = 0) {
  return toLocalDateString(getMondayOfWeek(offset));
}

function getTodayDayName() {
  const dayIndex = new Date().getDay();
  // Sunday = 0, Monday = 1, etc. Map to DAYS array (Mon-Fri)
  if (dayIndex === 0 || dayIndex === 6) return null; // Weekend
  return DAYS[dayIndex - 1];
}

const iconBtnStyle = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: 16,
  color: "#616882",
  padding: "2px 4px",
  borderRadius: 4,
  lineHeight: 1,
  transition: "color 0.15s",
};

function makeSubtaskId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `st-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

// Notitie-/deeltaken-editor voor het "Taak Toevoegen"-formulier.
// Gedeeld tussen de mobiele en desktop-layout zodat beide gelijk blijven.
function SubtaskEditor({ subtasks, setSubtasks, fontSize = 13 }) {
  const [input, setInput] = useState("");

  const addSubtask = () => {
    const text = input.trim();
    if (!text) return;
    setSubtasks([...subtasks, { id: makeSubtaskId(), text, done: false }]);
    setInput("");
  };

  const removeSubtask = (id) => setSubtasks(subtasks.filter((s) => s.id !== id));
  const toggleSubtask = (id) =>
    setSubtasks(subtasks.map((s) => (s.id === id ? { ...s, done: !s.done } : s)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {subtasks.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {subtasks.map((s) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={s.done}
                onChange={() => toggleSubtask(s.id)}
                style={{ width: 14, height: 14, cursor: "pointer", accentColor: COLORS.green, flexShrink: 0 }}
              />
              <span style={{
                flex: 1, fontSize, color: s.done ? COLORS.textSecondary : COLORS.text,
                textDecoration: s.done ? "line-through" : "none", wordBreak: "break-word",
              }}>
                {s.text}
              </span>
              <button
                onClick={() => removeSubtask(s.id)}
                title="Verwijder deeltaak"
                style={{ ...iconBtnStyle, color: COLORS.red }}
              >×</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
          placeholder="Deeltaak toevoegen…"
          style={{ ...inputStyle, flex: 1, fontSize }}
        />
        <button
          onClick={addSubtask}
          disabled={!input.trim()}
          title="Deeltaak toevoegen"
          style={{ ...smallBtnStyle, background: input.trim() ? COLORS.accent : "#e5e7eb", color: input.trim() ? "#fff" : "#9ca3af", cursor: input.trim() ? "pointer" : "default" }}
        >+</button>
      </div>
    </div>
  );
}

function TaskModal({ todo, clients, onClose, onToggleSubtask }) {
  if (!todo) return null;
  const clientColor = getClientColor(todo.client, clients);
  const subtasks = todo.subtasks || [];
  const doneCount = subtasks.filter((s) => s.done).length;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(30,34,64,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: COLORS.cardBg, borderRadius: 16, width: "100%", maxWidth: 520,
          maxHeight: "85vh", display: "flex", flexDirection: "column",
          boxShadow: COLORS.shadowHover, borderLeft: `5px solid ${clientColor}`, overflow: "hidden",
        }}
      >
        <div style={{ padding: "20px 22px 14px", borderBottom: `1px solid ${COLORS.borderLight}` }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: COLORS.text, lineHeight: 1.3, flex: 1 }}>
              {todo.task}
            </h2>
            <button onClick={onClose} title="Sluiten" style={{ ...iconBtnStyle, fontSize: 20, color: COLORS.textMuted }}>×</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: clientColor, background: `${clientColor}14`, padding: "3px 8px", borderRadius: 5 }}>
              {todo.client}
            </span>
            <span style={{ fontSize: 11, color: COLORS.textSecondary, fontWeight: 500 }}>{formatHours(todo.hours)}</span>
            {subtasks.length > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 600, marginLeft: "auto",
                color: doneCount === subtasks.length ? COLORS.green : COLORS.textSecondary,
              }}>
                {doneCount}/{subtasks.length} afgerond
              </span>
            )}
          </div>
        </div>
        <div style={{ padding: "12px 22px 22px", overflowY: "auto" }}>
          {subtasks.length === 0 ? (
            <p style={{ color: COLORS.textMuted, fontSize: 14 }}>Geen deeltaken.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {subtasks.map((s) => (
                <label key={s.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer",
                  padding: "9px 6px", borderRadius: 8,
                }}>
                  <input
                    type="checkbox"
                    checked={s.done}
                    onChange={() => onToggleSubtask(todo.id, s.id)}
                    style={{ width: 18, height: 18, marginTop: 1, cursor: "pointer", accentColor: COLORS.green, flexShrink: 0 }}
                  />
                  <span style={{
                    fontSize: 14, lineHeight: 1.45, color: s.done ? COLORS.textSecondary : COLORS.text,
                    textDecoration: s.done ? "line-through" : "none",
                  }}>
                    {s.text}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TodoCard({ todo, clients, onDragStart, onDragEnd, onRemove, onToggleComplete, onToggleSubtask, onOpen, isCompleted, isDragging, compact, onMoveToInbox, onMoveToToday }) {
  const clientColor = getClientColor(todo.client, clients);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, todo.id)}
      onDragEnd={onDragEnd}
      style={{
        background: isDragging ? COLORS.accentLight : COLORS.cardBg,
        border: `1px solid ${isDragging ? COLORS.accent : COLORS.borderLight}`,
        borderRadius: 10,
        padding: compact ? "10px 12px" : "12px 14px",
        cursor: "grab",
        opacity: isDragging ? 0.5 : isCompleted ? 0.45 : 1,
        transition: "all 0.15s",
        borderLeft: `4px solid ${clientColor}`,
        position: "relative",
        boxShadow: "0 1px 4px rgba(30,34,64,0.05)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <button
          onClick={() => onToggleComplete(todo.id)}
          style={{
            width: 18, height: 18, borderRadius: 5,
            border: `2px solid ${isCompleted ? COLORS.green : "#d1d5db"}`,
            background: isCompleted ? COLORS.green : "transparent",
            cursor: "pointer", flexShrink: 0, marginTop: 1,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 11, lineHeight: 1, transition: "all 0.15s",
          }}
        >
          {isCompleted && "✓"}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: compact ? 13 : 14,
            fontWeight: 600,
            textDecoration: isCompleted ? "line-through" : "none",
            color: isCompleted ? COLORS.textSecondary : COLORS.text,
            lineHeight: 1.35,
            wordBreak: "break-word",
            letterSpacing: "-0.01em",
          }}>
            {todo.task}
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 5, marginTop: 5, flexWrap: "wrap",
          }}>
            <span style={{
              fontSize: 10, fontWeight: 600, color: clientColor,
              background: `${clientColor}14`,
              padding: "2px 6px", borderRadius: 4, letterSpacing: "0.01em",
            }}>
              {todo.client}
            </span>
            <span style={{
              fontSize: 10, color: COLORS.textSecondary, fontWeight: 500,
            }}>
              {formatHours(todo.hours)}
            </span>
            {todo.subtasks?.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); onOpen && onOpen(todo.id); }}
                onMouseDown={(e) => e.stopPropagation()}
                title="Open deeltaken"
                style={{
                  fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  border: "none", display: "inline-flex", alignItems: "center", gap: 3,
                  color: todo.subtasks.every((s) => s.done) ? COLORS.green : COLORS.textSecondary,
                  background: todo.subtasks.every((s) => s.done) ? COLORS.greenLight : "#f1f1f6",
                  padding: "2px 7px", borderRadius: 4,
                }}
              >
                ☑ {todo.subtasks.filter((s) => s.done).length}/{todo.subtasks.length} ›
              </button>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
          {onMoveToToday && (
            <button onClick={() => onMoveToToday(todo.id)} title="Plan voor vandaag" style={{ ...iconBtnStyle, color: COLORS.accent }}>☀</button>
          )}
          {onMoveToInbox && (
            <button onClick={() => onMoveToInbox(todo.id)} title="Terug naar inbox" style={iconBtnStyle}>↩</button>
          )}
          <button onClick={() => onRemove(todo.id)} title="Verwijderen" style={{ ...iconBtnStyle, color: COLORS.red }}>×</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <SubscriptionGate>
              <WeekPlanner />
            </SubscriptionGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <SubscriptionGate>
              <WeekPlanner />
            </SubscriptionGate>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function WeekPlanner() {
  const { signOut, user } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const weekStart = getWeekStart(weekOffset);
  const {
    todos,
    inboxTodos,
    clients,
    loading,
    error,
    addTodo: addTodoToDb,
    updateTodo,
    removeTodo: removeTodoFromDb,
    addClient: addClientToDb,
    migrateFromLocalStorage,
  } = usePlanner(weekStart);

  const [newTask, setNewTask] = useState("");
  const [newClient, setNewClient] = useState("");
  const [newHours, setNewHours] = useState("");

  const [newSubtasks, setNewSubtasks] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [newClientName, setNewClientName] = useState("");
  const [showAddClient, setShowAddClient] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [dragOverDay, setDragOverDay] = useState(null);
  const [planForToday, setPlanForToday] = useState(false);

  // Migrate localStorage data on first load
  useEffect(() => {
    if (user) {
      migrateFromLocalStorage();
    }
  }, [user]);

  const weekDates = getWeekDates(weekOffset);
  const inbox = inboxTodos;
  const getDayTodos = (dayName) => todos.filter((t) => t.day === dayName);
  const getDayTotal = (dayName) => getDayTodos(dayName).reduce((s, t) => s + t.hours, 0);

  const addTodo = () => {
    if (!newTask.trim() || !newClient || !newHours) return;
    const targetDay = planForToday ? getTodayDayName() : null;
    
    addTodoToDb({
      task: newTask.trim(),
      client: newClient,
      hours: parseFloat(newHours),
      day: targetDay,
      priority: "medium",
      subtasks: newSubtasks,
    });
    setNewTask("");
    setNewHours("");
    setNewSubtasks([]);
  };

  const addClient = () => {
    if (!newClientName.trim() || clients.includes(newClientName.trim())) return;
    addClientToDb(newClientName.trim());
    setNewClient(newClientName.trim());
    setNewClientName("");
    setShowAddClient(false);
  };

  const removeTodo = (id) => {
    removeTodoFromDb(id);
  };

  const toggleComplete = (id) => {
    const todo = todos.find((t) => t.id === id) || inboxTodos.find((t) => t.id === id);
    if (todo) {
      updateTodo(id, { completed: !todo.completed });
    }
  };

  const toggleSubtask = (todoId, subtaskId) => {
    const todo = todos.find((t) => t.id === todoId) || inboxTodos.find((t) => t.id === todoId);
    if (!todo) return;
    const subtasks = (todo.subtasks || []).map((s) =>
      s.id === subtaskId ? { ...s, done: !s.done } : s
    );
    updateTodo(todoId, { subtasks });
  };

  const moveTodo = (id, day) => {
    if (day) {
      updateTodo(id, { day, week_start: weekStart });
    } else {
      updateTodo(id, { day: null });
    }
  };

  const moveToInbox = (id) => moveTodo(id, null);
  const moveToToday = (id) => {
    const todayName = getTodayDayName();
    if (todayName) moveTodo(id, todayName);
  };

  const handleDragStart = (e, id) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e, dayName) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDay(dayName);
  };

  const handleDrop = (e, dayName) => {
    e.preventDefault();
    if (dragId) moveTodo(dragId, dayName);
    setDragId(null);
    setDragOverDay(null);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDragOverDay(null);
  };

  const handleInboxDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDay("inbox");
  };

  const handleInboxDrop = (e) => {
    e.preventDefault();
    if (dragId) moveToInbox(dragId);
    setDragId(null);
    setDragOverDay(null);
  };

  const weekClientTotals = {};
  todos.filter((t) => t.day !== null).forEach((t) => {
    weekClientTotals[t.client] = (weekClientTotals[t.client] || 0) + t.hours;
  });
  const weekTotal = Object.values(weekClientTotals).reduce((a, b) => a + b, 0);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") addTodo();
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: COLORS.bg,
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      color: COLORS.text,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{
        background: COLORS.cardBg,
        borderBottom: `1px solid ${COLORS.borderLight}`,
        padding: isMobile ? "12px 16px" : "16px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 2px 8px rgba(30,34,64,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative" }}>
            <div style={{
              width: isMobile ? 24 : 32, height: 3, borderRadius: 2,
              background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.green})`,
              marginBottom: 4,
            }} />
            <h1 style={{
              margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 700,
              background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.green}, #4D94F7)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              lineHeight: 1.2,
            }}>Me-Planner</h1>
            {!isMobile && (
              <p style={{ margin: "4px 0 0", fontSize: 13, color: COLORS.textMuted }}>
                Plan je taken, beheers je week
              </p>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!isMobile && (
            <>
              <button
                onClick={() => setWeekOffset(weekOffset - 1)}
                style={{
                  ...smallBtnStyle,
                  background: COLORS.accentLight,
                  color: COLORS.accentDark,
                  fontSize: 16,
                  padding: "6px 10px",
                  lineHeight: 1,
                }}
                title="Vorige week"
              >‹</button>
              <div style={{
                background: COLORS.accentLight,
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                color: COLORS.accentDark,
                minWidth: 180,
                textAlign: "center",
              }}>
                Week {getWeekNumber(weekOffset)} • {weekTotal > 0 ? `${formatHours(weekTotal)} gepland` : "Nog niets gepland"}
              </div>
              <button
                onClick={() => setWeekOffset(weekOffset + 1)}
                style={{
                  ...smallBtnStyle,
                  background: COLORS.accentLight,
                  color: COLORS.accentDark,
                  fontSize: 16,
                  padding: "6px 10px",
                  lineHeight: 1,
                }}
                title="Volgende week"
              >›</button>
              {weekOffset !== 0 && (
                <button
                  onClick={() => setWeekOffset(0)}
                  style={{
                    ...smallBtnStyle,
                    background: COLORS.accent,
                    fontSize: 12,
                    padding: "6px 10px",
                  }}
                  title="Terug naar huidige week"
                >Vandaag</button>
              )}
              <div style={{ width: 1, height: 24, background: COLORS.border, margin: "0 4px" }} />
            </>
          )}
          <SyncToObsidianButton />
          <button
            onClick={signOut}
            style={{
              ...smallBtnStyle,
              background: "transparent",
              color: COLORS.textMuted,
              border: `1px solid ${COLORS.border}`,
              fontSize: 12,
              padding: "6px 12px",
            }}
            title={user?.email}
          >Uitloggen</button>
        </div>
      </header>

      {/* Loading state */}
      {loading && (
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "60px 0",
          color: COLORS.textMuted,
          fontSize: 15,
        }}>
          Laden...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={{
          maxWidth: 1600,
          margin: "16px auto",
          padding: "0 24px",
        }}>
          <div style={{
            background: COLORS.redLight,
            color: COLORS.red,
            padding: "12px 16px",
            borderRadius: 10,
            fontSize: 14,
          }}>
            Er is een fout opgetreden: {error}
          </div>
        </div>
      )}

      {/* Mobile Layout */}
      {!loading && isMobile && (() => {
        const todayName = getTodayDayName();
        const todayTodos = todayName ? getDayTodos(todayName) : [];
        const todayTotal = todayName ? getDayTotal(todayName) : 0;
        const todayDate = new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long" });

        return (
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Add Todo */}
            <div style={{ ...cardStyle, padding: 16 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 5, height: 18, borderRadius: 3, background: COLORS.accent, display: "inline-block" }} />
                Taak Toevoegen
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Wat moet je doen?"
                  style={{ ...inputStyle, fontSize: 16 }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <select value={newClient} onChange={(e) => {
                    if (e.target.value === "__add__") { setShowAddClient(true); setNewClient(""); }
                    else setNewClient(e.target.value);
                  }} style={{ ...inputStyle, flex: 1, cursor: "pointer", fontSize: 16 }}>
                    <option value="">Klant</option>
                    {clients.map((c) => <option key={c} value={c}>{c}</option>)}
                    <option value="__add__">+ Nieuwe klant</option>
                  </select>
                  <input
                    value={newHours}
                    onChange={(e) => setNewHours(e.target.value)}
                    placeholder="Uren"
                    type="number"
                    step="0.25"
                    min="0.25"
                    style={{ ...inputStyle, width: 70, fontSize: 16 }}
                    onKeyDown={handleKeyDown}
                  />
                </div>
                {showAddClient && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="Klantnaam"
                      style={{ ...inputStyle, flex: 1, fontSize: 16 }}
                      onKeyDown={(e) => { if (e.key === "Enter") addClient(); }}
                      autoFocus
                    />
                    <button onClick={addClient} style={smallBtnStyle}>✓</button>
                    <button onClick={() => setShowAddClient(false)} style={{ ...smallBtnStyle, background: "#f3f4f6", color: COLORS.textMuted }}>✕</button>
                  </div>
                )}
                <div style={{ marginTop: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMuted, display: "block", marginBottom: 6 }}>
                    Notitie / deeltaken
                  </span>
                  <SubtaskEditor subtasks={newSubtasks} setSubtasks={setNewSubtasks} fontSize={14} />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: COLORS.text, cursor: "pointer", marginTop: 4 }}>
                  <input
                    type="checkbox"
                    checked={planForToday}
                    onChange={(e) => setPlanForToday(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: "pointer", accentColor: COLORS.accent }}
                  />
                  Plan in voor vandaag
                </label>
                <button
                  onClick={addTodo}
                  disabled={!newTask.trim() || !newClient || !newHours}
                  style={{
                    padding: "12px 0",
                    borderRadius: 10,
                    border: "none",
                    background: (!newTask.trim() || !newClient || !newHours) ? "#e5e7eb" : `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`,
                    color: (!newTask.trim() || !newClient || !newHours) ? "#9ca3af" : "#fff",
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: (!newTask.trim() || !newClient || !newHours) ? "default" : "pointer",
                    transition: "all 0.2s",
                    fontFamily: "inherit",
                  }}
                >
                  Toevoegen
                </button>
              </div>
            </div>

            {/* Today */}
            {todayName && (
              <div style={{
                ...cardStyle,
                background: COLORS.todayBg,
                border: `2px solid ${COLORS.accent}`,
                boxShadow: "0 2px 16px rgba(237,185,10,0.12), 0 1px 4px rgba(30,34,64,0.06)",
                padding: 16,
              }}>
                <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 5, height: 18, borderRadius: 3, background: COLORS.accent, display: "inline-block" }} />
                  Vandaag
                  <span style={{ fontSize: 12, fontWeight: 400, color: COLORS.textMuted }}>{todayDate}</span>
                  {todayTotal > 0 && (
                    <span style={{
                      marginLeft: "auto", fontSize: 12, fontWeight: 600, color: COLORS.accentDark,
                    }}>{formatHours(todayTotal)}</span>
                  )}
                </h3>
                {todayTodos.length === 0 ? (
                  <p style={{ color: COLORS.textMuted, fontSize: 13, padding: "12px 0", margin: 0 }}>
                    Geen taken voor vandaag
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                    {todayTodos.map((todo) => (
                      <TodoCard
                        key={todo.id}
                        todo={todo}
                        clients={clients}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onRemove={removeTodo}
                        onToggleComplete={toggleComplete}
                        onToggleSubtask={toggleSubtask}
                        onOpen={setOpenId}
                        isCompleted={todo.completed}
                        isDragging={false}
                        compact
                        onMoveToInbox={moveToInbox}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Inbox */}
            <div style={{ ...cardStyle, padding: 16 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 5, height: 18, borderRadius: 3, background: COLORS.green, display: "inline-block" }} />
                Inbox
                <span style={{
                  marginLeft: "auto", fontSize: 12, color: COLORS.textMuted,
                  background: "#f3f4f6", padding: "2px 8px", borderRadius: 10,
                }}>{inbox.length}</span>
              </h3>
              {inbox.length === 0 ? (
                <p style={{ color: COLORS.textMuted, fontSize: 13, textAlign: "center", padding: "16px 0" }}>
                  Alle taken zijn ingepland! 🎉
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {inbox.map((todo) => (
                    <TodoCard
                      key={todo.id}
                      todo={todo}
                      clients={clients}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onRemove={removeTodo}
                      onToggleComplete={toggleComplete}
                      onToggleSubtask={toggleSubtask}
                        onOpen={setOpenId}
                      isCompleted={todo.completed}
                      isDragging={false}
                      onMoveToToday={todayName ? moveToToday : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Desktop Layout */}
      {!loading && !isMobile && (
        <div style={{
          display: "flex",
          gap: 24,
          padding: "24px 24px",
          maxWidth: 1600,
          margin: "0 auto",
          alignItems: "stretch",
        }}>
          {/* LEFT: Inbox */}
          <div style={{
            width: 340,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}>
            {/* Add Todo Card */}
            <div style={{
              ...cardStyle,
              padding: 20,
            }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 5, height: 18, borderRadius: 3, background: COLORS.accent, display: "inline-block" }} />
                Taak Toevoegen
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Wat moet je doen?"
                  style={inputStyle}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <select value={newClient} onChange={(e) => {
                    if (e.target.value === "__add__") { setShowAddClient(true); setNewClient(""); }
                    else setNewClient(e.target.value);
                  }} style={{ ...inputStyle, flex: 1, cursor: "pointer" }}>
                    <option value="">Klant</option>
                    {clients.map((c) => <option key={c} value={c}>{c}</option>)}
                    <option value="__add__">+ Nieuwe klant</option>
                  </select>
                  <input
                    value={newHours}
                    onChange={(e) => setNewHours(e.target.value)}
                    placeholder="Uren"
                    type="number"
                    step="0.25"
                    min="0.25"
                    style={{ ...inputStyle, width: 70 }}
                    onKeyDown={handleKeyDown}
                  />
                </div>
                {showAddClient && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="Klantnaam"
                      style={{ ...inputStyle, flex: 1 }}
                      onKeyDown={(e) => { if (e.key === "Enter") addClient(); }}
                      autoFocus
                    />
                    <button onClick={addClient} style={smallBtnStyle}>✓</button>
                    <button onClick={() => setShowAddClient(false)} style={{ ...smallBtnStyle, background: "#f3f4f6", color: COLORS.textMuted }}>✕</button>
                  </div>
                )}
                
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMuted, display: "block", marginBottom: 6 }}>
                    Notitie / deeltaken
                  </span>
                  <SubtaskEditor subtasks={newSubtasks} setSubtasks={setNewSubtasks} fontSize={13} />
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: COLORS.text, cursor: "pointer", marginTop: 4 }}>
                  <input
                    type="checkbox"
                    checked={planForToday}
                    onChange={(e) => setPlanForToday(e.target.checked)}
                    style={{ width: 15, height: 15, cursor: "pointer", accentColor: COLORS.accent }}
                  />
                  Plan in voor vandaag
                </label>

                <button
                  onClick={addTodo}
                  disabled={!newTask.trim() || !newClient || !newHours}
                  style={{
                    padding: "10px 0",
                    borderRadius: 10,
                    border: "none",
                    background: (!newTask.trim() || !newClient || !newHours) ? "#e5e7eb" : `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`,
                    color: (!newTask.trim() || !newClient || !newHours) ? "#9ca3af" : "#fff",
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: (!newTask.trim() || !newClient || !newHours) ? "default" : "pointer",
                    transition: "all 0.2s",
                    fontFamily: "inherit",
                  }}
                >
                  Toevoegen
                </button>
              </div>
            </div>

            {/* Inbox */}
            <div
              onDragOver={handleInboxDragOver}
              onDrop={handleInboxDrop}
              style={{
                ...cardStyle,
                background: dragOverDay === "inbox" ? COLORS.accentLight : COLORS.cardBg,
                border: `1px solid ${dragOverDay === "inbox" ? COLORS.accent : COLORS.borderLight}`,
                padding: 20,
                transition: "all 0.2s",
                minHeight: 120,
                flex: 1,
              }}
            >
              <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 5, height: 18, borderRadius: 3, background: COLORS.green, display: "inline-block" }} />
                Inbox
                <span style={{
                  marginLeft: "auto", fontSize: 12, color: COLORS.textMuted,
                  background: "#f3f4f6", padding: "2px 8px", borderRadius: 10,
                }}>{inbox.length}</span>
              </h3>
              {inbox.length === 0 ? (
                <p style={{ color: COLORS.textMuted, fontSize: 13, textAlign: "center", padding: "16px 0" }}>
                  Alle taken zijn ingepland! 🎉
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {inbox.map((todo) => (
                    <TodoCard
                      key={todo.id}
                      todo={todo}
                      clients={clients}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onRemove={removeTodo}
                      onToggleComplete={toggleComplete}
                      onToggleSubtask={toggleSubtask}
                        onOpen={setOpenId}
                      isCompleted={todo.completed}
                      isDragging={dragId === todo.id}

                    />
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT: Week Days */}
          <div style={{
            flex: 1,
            display: "flex",
            gap: 12,
            minWidth: 0,
            alignItems: "stretch",
          }}>
            {weekDates.map((wd) => {
              const dayTodos = getDayTodos(wd.name);
              const dayTotal = getDayTotal(wd.name);
              const isOver = dayTotal > DAY_CAPACITY;
              const pct = Math.min((dayTotal / DAY_CAPACITY) * 100, 100);
              const isToday = wd.full === toLocalDateString(new Date());
              const isDropTarget = dragOverDay === wd.name;

              return (
                <div
                  key={wd.name}
                  onDragOver={(e) => handleDragOver(e, wd.name)}
                  onDrop={(e) => handleDrop(e, wd.name)}
                  onDragLeave={() => setDragOverDay(null)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: isDropTarget ? COLORS.accentLight : isToday ? COLORS.todayBg : COLORS.cardBg,
                    borderRadius: 16,
                    padding: 16,
                    boxShadow: isToday ? "0 2px 16px rgba(237,185,10,0.12), 0 1px 4px rgba(30,34,64,0.06)" : COLORS.shadow,
                    border: isDropTarget ? `2px solid ${COLORS.accent}` : isToday ? `2px solid ${COLORS.accent}` : `1px solid ${COLORS.borderLight}`,
                    transition: "all 0.2s",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div style={{ marginBottom: 12 }}>
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4,
                    }}>
                      <span style={{
                        fontWeight: 700, fontSize: 15,
                        color: isToday ? COLORS.accentDark : COLORS.text,
                      }}>
                        {wd.name}
                      </span>
                      {isToday && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: "#fff",
                          background: COLORS.accent, padding: "2px 8px",
                          borderRadius: 6, textTransform: "uppercase",
                        }}>Vandaag</span>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: COLORS.textMuted }}>{wd.date}</span>

                    <div style={{
                      marginTop: 8, height: 6, borderRadius: 3,
                      background: "#f3f4f6", overflow: "hidden",
                    }}>
                      <div style={{
                        height: "100%", borderRadius: 3,
                        width: `${pct}%`,
                        background: isOver
                          ? `linear-gradient(90deg, ${COLORS.red}, #ef4444)`
                          : pct > 80
                            ? `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accentDark})`
                            : `linear-gradient(90deg, ${COLORS.green}, #34d399)`,
                        transition: "width 0.3s, background 0.3s",
                      }} />
                    </div>
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      fontSize: 11, color: isOver ? COLORS.red : COLORS.textMuted, marginTop: 3,
                    }}>
                      <span>{formatHours(dayTotal)}</span>
                      <span>{formatHours(DAY_CAPACITY)}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                    {dayTodos.length === 0 && (
                      <div style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#c5c8d6", fontSize: 12, fontStyle: "italic",
                        border: "2px dashed #d8d8e3", borderRadius: 10,
                        minHeight: 80,
                      }}>
                        Sleep taken hierheen
                      </div>
                    )}
                    {dayTodos.map((todo) => (
                      <TodoCard
                        key={todo.id}
                        todo={todo}
                        clients={clients}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onRemove={removeTodo}
                        onToggleComplete={toggleComplete}
                        onToggleSubtask={toggleSubtask}
                        onOpen={setOpenId}
                        isCompleted={todo.completed}
                        isDragging={dragId === todo.id}
                        compact
                        onMoveToInbox={moveToInbox}

                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week Summary - full width (desktop only) */}
      {!loading && !isMobile && weekTotal > 0 && (
        <div style={{
          maxWidth: 1600,
          margin: "0 auto",
          padding: "0 24px 24px",
        }}>
          <div style={{
            ...cardStyle,
            padding: 20,
          }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 5, height: 18, borderRadius: 3, background: "#3B82F6", display: "inline-block" }} />
              Weekoverzicht
            </h3>
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
            }}>
              {Object.entries(weekClientTotals).sort((a, b) => b[1] - a[1]).map(([client, hours]) => (
                <div key={client} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#F5F5FA",
                  borderRadius: 10,
                  padding: "8px 14px",
                  border: `1px solid ${COLORS.borderLight}`,
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: getClientColor(client, clients),
                  }} />
                  <span style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>{client}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.accentDark }}>{formatHours(hours)}</span>
                </div>
              ))}
              <div style={{
                marginLeft: "auto",
                fontWeight: 700,
                fontSize: 15,
                color: COLORS.accentDark,
                padding: "8px 16px",
                background: COLORS.accentLight,
                borderRadius: 10,
              }}>
                Totaal: {formatHours(weekTotal)}
              </div>
            </div>
          </div>
        </div>
      )}

      {openId && (
        <TaskModal
          todo={todos.find((t) => t.id === openId) || inboxTodos.find((t) => t.id === openId) || null}
          clients={clients}
          onClose={() => setOpenId(null)}
          onToggleSubtask={toggleSubtask}
        />
      )}
    </div>
  );
}
