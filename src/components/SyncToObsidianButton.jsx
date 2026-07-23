import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { smallBtnStyle, COLORS } from "../styles";

const SYNC_SERVER_URL = "http://localhost:5760/sync";

export function SyncToObsidianButton() {
  const { user } = useAuth();
  const [status, setStatus] = useState("idle"); // idle | busy | done | error
  const [message, setMessage] = useState("");

  async function handleSync() {
    if (!user) return;
    setStatus("busy");
    setMessage("");
    try {
      const [{ data: tasks, error: tErr }, { data: clients, error: cErr }] = await Promise.all([
        supabase
          .from("planner_taken")
          .select("task,client,hours,priority,day,subtasks")
          .eq("user_id", user.id)
          .eq("completed", false),
        supabase.from("planner_klanten").select("naam").eq("user_id", user.id),
      ]);
      if (tErr || cErr) throw new Error((tErr || cErr).message);

      const res = await fetch(SYNC_SERVER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks, clientNames: (clients || []).map((c) => c.naam) }),
      });
      if (!res.ok) throw new Error(`sync-server antwoordde met ${res.status}`);
      const result = await res.json();

      let msg = `${result.updated.length} klant(en) bijgewerkt`;
      if (result.unmatched.length) msg += ` — geen match: ${result.unmatched.join(", ")}`;
      setMessage(msg);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setMessage(
        e instanceof TypeError
          ? "Sync-server niet bereikbaar — draai lokaal: node scripts/sync-server.mjs"
          : e.message
      );
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        onClick={handleSync}
        disabled={status === "busy"}
        style={{
          ...smallBtnStyle,
          background: COLORS.green,
          fontSize: 12,
          padding: "6px 12px",
          opacity: status === "busy" ? 0.6 : 1,
          cursor: status === "busy" ? "default" : "pointer",
        }}
        title="Stuur openstaande taken naar de cockpit-notities in Obsidian"
      >
        {status === "busy" ? "Syncen…" : "→ Obsidian"}
      </button>
      {message && (
        <span
          style={{
            fontSize: 11,
            color: status === "error" ? "#E04848" : COLORS.textMuted,
            maxWidth: 240,
          }}
        >
          {message}
        </span>
      )}
    </div>
  );
}
