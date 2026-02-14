import { useState } from "react";

const DAYS = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag"];
const DAY_CAPACITY = 7;

const COLORS = {
  bg: "#FFF9F0",
  cardBg: "#FFFFFF",
  accent: "#E8B931",
  accentLight: "#F5E6B8",
  accentDark: "#C99E1C",
  green: "#2EA44F",
  greenLight: "#E6F4EA",
  red: "#D93025",
  redLight: "#FCE8E6",
  text: "#1A1A1A",
  textMuted: "#6B7280",
  border: "#F0E6D3",
  shadow: "0 2px 12px rgba(0,0,0,0.06)",
  shadowHover: "0 4px 20px rgba(0,0,0,0.1)",
};

const CLIENT_COLORS = [
  "#E8B931", "#2EA44F", "#3B82F6", "#8B5CF6", "#EC4899",
  "#F97316", "#14B8A6", "#EF4444", "#6366F1", "#84CC16",
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

function getWeekDates() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  return DAYS.map((name, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      name,
      date: d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" }),
      full: d.toISOString().slice(0, 10),
    };
  });
}

function getWeekNumber() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start;
  const oneWeek = 604800000;
  return Math.ceil((diff / oneWeek) + start.getDay() / 7);
}

let idCounter = 0;
const uid = () => `todo-${Date.now()}-${++idCounter}`;

const STORAGE_KEY = "weekplanner-data";

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return data;
    }
  } catch (e) { /* ignore */ }
  return null;
}

function saveData(todos, clients, completedIds) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      todos,
      clients,
      completedIds: [...completedIds],
      savedAt: new Date().toISOString(),
    }));
  } catch (e) { /* ignore */ }
}

const defaultClients = ["UAF", "Amref", "Follow This", "Mindwize", "Lezen & Schrijven", "HospitaalBroeders"];

const inputStyle = {
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid #F0E6D3",
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
  background: "#FAFAFA",
  transition: "border-color 0.15s",
  color: "#1A1A1A",
  boxSizing: "border-box",
};

const smallBtnStyle = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "none",
  background: "#E8B931",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 14,
  fontFamily: "inherit",
};

const iconBtnStyle = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: 16,
  color: "#6B7280",
  padding: "2px 4px",
  borderRadius: 4,
  lineHeight: 1,
  transition: "color 0.15s",
};

function TodoCard({ todo, clients, onDragStart, onDragEnd, onRemove, onToggleComplete, isCompleted, isDragging, compact, onMoveToInbox, priorityIcon }) {
  const clientColor = getClientColor(todo.client, clients);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, todo.id)}
      onDragEnd={onDragEnd}
      style={{
        background: isDragging ? COLORS.accentLight : "#fff",
        border: `1px solid ${isDragging ? COLORS.accent : COLORS.border}`,
        borderRadius: 12,
        padding: compact ? "10px 12px" : "12px 14px",
        cursor: "grab",
        opacity: isDragging ? 0.5 : isCompleted ? 0.5 : 1,
        transition: "all 0.15s",
        borderLeft: `4px solid ${clientColor}`,
        position: "relative",
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
            fontWeight: 500,
            textDecoration: isCompleted ? "line-through" : "none",
            color: isCompleted ? COLORS.textMuted : COLORS.text,
            lineHeight: 1.3,
            wordBreak: "break-word",
          }}>
            {todo.task}
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap",
          }}>
            <span style={{
              fontSize: 11, fontWeight: 600, color: clientColor,
              background: `${clientColor}18`,
              padding: "1px 6px", borderRadius: 4,
            }}>
              {todo.client}
            </span>
            <span style={{
              fontSize: 11, color: COLORS.textMuted,
              background: "#f3f4f6", padding: "1px 6px", borderRadius: 4,
            }}>
              {formatHours(todo.hours)}
            </span>
            <span style={{ fontSize: 10 }}>{priorityIcon(todo.priority)}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
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
  const saved = loadData();
  const [todos, setTodos] = useState(saved?.todos || []);
  const [clients, setClients] = useState(saved?.clients || defaultClients);
  const [completedIds, setCompletedIds] = useState(new Set(saved?.completedIds || []));
  const [newTask, setNewTask] = useState("");
  const [newClient, setNewClient] = useState("");
  const [newHours, setNewHours] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newClientName, setNewClientName] = useState("");
  const [showAddClient, setShowAddClient] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [dragOverDay, setDragOverDay] = useState(null);

  const weekDates = getWeekDates();
  const inbox = todos.filter((t) => t.day === null);
  const getDayTodos = (dayName) => todos.filter((t) => t.day === dayName);
  const getDayTotal = (dayName) => getDayTodos(dayName).reduce((s, t) => s + t.hours, 0);

  // Auto-save
  const updateTodos = (fn) => {
    setTodos((prev) => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      setTimeout(() => saveData(next, clients, completedIds), 0);
      return next;
    });
  };

  const updateCompleted = (fn) => {
    setCompletedIds((prev) => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      setTimeout(() => saveData(todos, clients, next), 0);
      return next;
    });
  };

  const addTodo = () => {
    if (!newTask.trim() || !newClient || !newHours) return;
    updateTodos((prev) => [
      ...prev,
      { id: uid(), task: newTask.trim(), client: newClient, hours: parseFloat(newHours), day: null, priority: newPriority },
    ]);
    setNewTask("");
    setNewHours("");
    setNewPriority("medium");
  };

  const addClient = () => {
    if (!newClientName.trim() || clients.includes(newClientName.trim())) return;
    const updated = [...clients, newClientName.trim()];
    setClients(updated);
    setNewClient(newClientName.trim());
    setNewClientName("");
    setShowAddClient(false);
    setTimeout(() => saveData(todos, updated, completedIds), 0);
  };

  const removeTodo = (id) => {
    updateTodos((prev) => prev.filter((t) => t.id !== id));
    updateCompleted((prev) => { const n = new Set(prev); n.delete(id); return n; });
  };

  const toggleComplete = (id) => {
    updateCompleted((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const moveTodo = (id, day) => {
    updateTodos((prev) => prev.map((t) => (t.id === id ? { ...t, day } : t)));
  };

  const moveToInbox = (id) => moveTodo(id, null);

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

  const priorityIcon = (p) => {
    if (p === "high") return "🔴";
    if (p === "medium") return "🟡";
    return "🟢";
  };

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
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{
        background: COLORS.cardBg,
        borderBottom: `2px solid ${COLORS.border}`,
        padding: "20px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 700, fontSize: 18,
            fontFamily: "'Playfair Display', serif",
          }}>W</div>
          <div>
            <h1 style={{
              margin: 0, fontSize: 22, fontWeight: 700,
              fontFamily: "'Playfair Display', serif",
              color: COLORS.accentDark,
            }}>Weekplanner</h1>
            <p style={{ margin: 0, fontSize: 13, color: COLORS.textMuted }}>
              Plan je taken, beheers je week
            </p>
          </div>
        </div>
        <div style={{
          background: COLORS.accentLight,
          padding: "8px 16px",
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          color: COLORS.accentDark,
        }}>
          Week {getWeekNumber()} • {weekTotal > 0 ? `${formatHours(weekTotal)} gepland` : "Nog niets gepland"}
        </div>
      </header>

      <div style={{
        display: "flex",
        gap: 24,
        padding: "24px 24px",
        maxWidth: 1600,
        margin: "0 auto",
        alignItems: "flex-start",
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
            background: COLORS.cardBg,
            borderRadius: 16,
            padding: 20,
            boxShadow: COLORS.shadow,
            border: `1px solid ${COLORS.border}`,
          }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 20, borderRadius: 3, background: COLORS.accent, display: "inline-block" }} />
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
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: COLORS.textMuted, marginRight: 4 }}>Prioriteit:</span>
                {["high", "medium", "low"].map((p) => (
                  <button key={p} onClick={() => setNewPriority(p)} style={{
                    border: newPriority === p ? `2px solid ${COLORS.accent}` : "2px solid transparent",
                    background: newPriority === p ? COLORS.accentLight : "#f9fafb",
                    borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 13,
                    transition: "all 0.15s", fontFamily: "inherit",
                  }}>
                    {priorityIcon(p)} {p === "high" ? "Hoog" : p === "medium" ? "Midden" : "Laag"}
                  </button>
                ))}
              </div>
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
              background: dragOverDay === "inbox" ? COLORS.accentLight : COLORS.cardBg,
              borderRadius: 16,
              padding: 20,
              boxShadow: COLORS.shadow,
              border: `1px solid ${dragOverDay === "inbox" ? COLORS.accent : COLORS.border}`,
              transition: "all 0.2s",
              minHeight: 120,
            }}
          >
            <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 20, borderRadius: 3, background: COLORS.green, display: "inline-block" }} />
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
                    isCompleted={completedIds.has(todo.id)}
                    isDragging={dragId === todo.id}
                    priorityIcon={priorityIcon}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Week Summary */}
          {weekTotal > 0 && (
            <div style={{
              background: COLORS.cardBg,
              borderRadius: 16,
              padding: 20,
              boxShadow: COLORS.shadow,
              border: `1px solid ${COLORS.border}`,
            }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 6, height: 20, borderRadius: 3, background: "#3B82F6", display: "inline-block" }} />
                Weekoverzicht
              </h3>
              {Object.entries(weekClientTotals).sort((a, b) => b[1] - a[1]).map(([client, hours]) => (
                <div key={client} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "6px 0", borderBottom: `1px solid ${COLORS.border}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: getClientColor(client, clients),
                    }} />
                    <span style={{ fontSize: 13 }}>{client}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{formatHours(hours)}</span>
                </div>
              ))}
              <div style={{
                display: "flex", justifyContent: "space-between",
                padding: "10px 0 0", fontWeight: 700, fontSize: 14,
              }}>
                <span>Totaal</span>
                <span style={{ color: COLORS.accentDark }}>{formatHours(weekTotal)}</span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Week Days */}
        <div style={{
          flex: 1,
          display: "flex",
          gap: 12,
          overflowX: "auto",
          paddingBottom: 8,
        }}>
          {weekDates.map((wd) => {
            const dayTodos = getDayTodos(wd.name);
            const dayTotal = getDayTotal(wd.name);
            const isOver = dayTotal > DAY_CAPACITY;
            const pct = Math.min((dayTotal / DAY_CAPACITY) * 100, 100);
            const isToday = wd.full === new Date().toISOString().slice(0, 10);
            const isDropTarget = dragOverDay === wd.name;

            return (
              <div
                key={wd.name}
                onDragOver={(e) => handleDragOver(e, wd.name)}
                onDrop={(e) => handleDrop(e, wd.name)}
                onDragLeave={() => setDragOverDay(null)}
                style={{
                  flex: 1,
                  minWidth: 190,
                  background: isDropTarget ? COLORS.accentLight : COLORS.cardBg,
                  borderRadius: 16,
                  padding: 16,
                  boxShadow: isToday ? `0 0 0 2px ${COLORS.accent}, ${COLORS.shadow}` : COLORS.shadow,
                  border: `1px solid ${isDropTarget ? COLORS.accent : isToday ? COLORS.accent : COLORS.border}`,
                  transition: "all 0.2s",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 400,
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
                      color: "#d1d5db", fontSize: 13, fontStyle: "italic",
                      border: "2px dashed #e5e7eb", borderRadius: 12,
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
                      isCompleted={completedIds.has(todo.id)}
                      isDragging={dragId === todo.id}
                      compact
                      onMoveToInbox={moveToInbox}
                      priorityIcon={priorityIcon}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
