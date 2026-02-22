import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.warn("Geen subscription gevonden, standaard actief");
        setSubscription({ status: "active", current_period_end: null });
      } else {
        setSubscription(data);
      }
      setLoading(false);
    };

    fetchSubscription();
  }, [user]);

  const isActive =
    subscription?.status === "active" ||
    subscription?.status === "past_due";

  return {
    subscription,
    loading,
    isActive,
  };
}
