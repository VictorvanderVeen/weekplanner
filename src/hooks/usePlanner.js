import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export function usePlanner(weekStart) {
  const { user } = useAuth();
  const [todos, setTodos] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTodos = useCallback(async () => {
    if (!user || !weekStart) return;
    const { data, error } = await supabase
      .from("planner_taken")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_start", weekStart);

    if (error) {
      setError(error.message);
      return;
    }
    setTodos(
      (data || []).map((row) => ({
        id: row.id,
        task: row.task,
        client: row.client,
        hours: parseFloat(row.hours),
        day: row.day,
        priority: row.priority,
        completed: row.completed,
      }))
    );
  }, [user, weekStart]);

  const loadClients = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("planner_klanten")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      setError(error.message);
      return;
    }
    setClients((data || []).map((row) => row.naam));
  }, [user]);

  // Load data when user or weekStart changes
  useEffect(() => {
    if (!user || !weekStart) return;
    setLoading(true);
    setError(null);
    Promise.all([loadTodos(), loadClients()]).finally(() => setLoading(false));
  }, [user, weekStart, loadTodos, loadClients]);

  const addTodo = async (todo) => {
    if (!user) return;
    const row = {
      user_id: user.id,
      task: todo.task,
      client: todo.client,
      hours: todo.hours,
      day: todo.day,
      priority: todo.priority,
      completed: false,
      week_start: weekStart,
    };
    const { data, error } = await supabase
      .from("planner_taken")
      .insert(row)
      .select()
      .single();

    if (error) {
      setError(error.message);
      return;
    }
    setTodos((prev) => [
      ...prev,
      {
        id: data.id,
        task: data.task,
        client: data.client,
        hours: parseFloat(data.hours),
        day: data.day,
        priority: data.priority,
        completed: data.completed,
      },
    ]);
  };

  const updateTodo = async (id, updates) => {
    if (!user) return;
    const { error } = await supabase
      .from("planner_taken")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      setError(error.message);
      return;
    }
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const removeTodo = async (id) => {
    if (!user) return;
    const { error } = await supabase
      .from("planner_taken")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      setError(error.message);
      return;
    }
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const addClient = async (naam) => {
    if (!user) return;
    const { error } = await supabase
      .from("planner_klanten")
      .insert({ user_id: user.id, naam });

    if (error) {
      // Ignore duplicate errors
      if (error.code === "23505") return;
      setError(error.message);
      return;
    }
    setClients((prev) => [...prev, naam]);
  };

  // Migrate localStorage data to Supabase (one-time)
  const migrateFromLocalStorage = async () => {
    if (!user) return;

    const MIGRATION_KEY = "weekplanner-migrated-to-supabase";
    if (localStorage.getItem(MIGRATION_KEY)) return;

    try {
      // Collect all week keys from localStorage
      const weekKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("weekplanner-") && key !== "weekplanner-clients" && key !== "weekplanner-data" && key !== MIGRATION_KEY) {
          weekKeys.push(key);
        }
      }

      // Migrate clients
      const clientsRaw = localStorage.getItem("weekplanner-clients");
      if (clientsRaw) {
        const localClients = JSON.parse(clientsRaw);
        if (Array.isArray(localClients) && localClients.length > 0) {
          const clientRows = localClients.map((naam) => ({
            user_id: user.id,
            naam,
          }));
          await supabase
            .from("planner_klanten")
            .upsert(clientRows, { onConflict: "user_id,naam", ignoreDuplicates: true });
        }
      }

      // Migrate todos per week
      for (const key of weekKeys) {
        const weekDate = key.replace("weekplanner-", ""); // e.g. "2025-01-06"
        const raw = localStorage.getItem(key);
        if (!raw) continue;

        const data = JSON.parse(raw);
        if (!data.todos || !Array.isArray(data.todos)) continue;

        const completedSet = new Set(data.completedIds || []);
        const todoRows = data.todos.map((t) => ({
          user_id: user.id,
          task: t.task,
          client: t.client,
          hours: t.hours,
          day: t.day,
          priority: t.priority || "medium",
          completed: completedSet.has(t.id),
          week_start: weekDate,
        }));

        if (todoRows.length > 0) {
          await supabase.from("planner_taken").insert(todoRows);
        }
      }

      // Also migrate old single-key format
      const oldData = localStorage.getItem("weekplanner-data");
      if (oldData) {
        const data = JSON.parse(oldData);
        if (data.todos && Array.isArray(data.todos)) {
          const completedSet = new Set(data.completedIds || []);
          const todoRows = data.todos.map((t) => ({
            user_id: user.id,
            task: t.task,
            client: t.client,
            hours: t.hours,
            day: t.day,
            priority: t.priority || "medium",
            completed: completedSet.has(t.id),
            week_start: weekStart, // current week as fallback
          }));
          if (todoRows.length > 0) {
            await supabase.from("planner_taken").insert(todoRows);
          }
        }
      }

      // Mark migration as done and clean up localStorage
      localStorage.setItem(MIGRATION_KEY, "true");

      // Remove old localStorage data
      for (const key of weekKeys) {
        localStorage.removeItem(key);
      }
      localStorage.removeItem("weekplanner-clients");
      localStorage.removeItem("weekplanner-data");

      // Reload data from Supabase
      await Promise.all([loadTodos(), loadClients()]);
    } catch (e) {
      console.error("Migration from localStorage failed:", e);
    }
  };

  return {
    todos,
    clients,
    loading,
    error,
    addTodo,
    updateTodo,
    removeTodo,
    addClient,
    migrateFromLocalStorage,
    reload: () => Promise.all([loadTodos(), loadClients()]),
  };
}
