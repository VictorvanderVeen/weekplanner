import { useSubscription } from "../hooks/useSubscription";
import { COLORS } from "../styles";

export function SubscriptionGate({ children }) {
  const { isActive, loading } = useSubscription();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: COLORS.bg,
          fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: `3px solid ${COLORS.border}`,
              borderTopColor: COLORS.accent,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <p style={{ color: COLORS.textMuted, fontSize: 14, margin: 0 }}>
            Laden...
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!isActive) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: COLORS.bg,
          fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
          padding: 24,
        }}
      >
        <div
          style={{
            background: COLORS.cardBg,
            borderRadius: 16,
            padding: 32,
            maxWidth: 420,
            textAlign: "center",
            boxShadow: COLORS.shadow,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <h2 style={{ margin: "0 0 12px", color: COLORS.text }}>
            Abonnement verlopen
          </h2>
          <p
            style={{
              color: COLORS.textMuted,
              fontSize: 14,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Je abonnement is niet meer actief. Neem contact op om je
            abonnement te verlengen.
          </p>
          {/* Toekomst: Stripe checkout button hier */}
        </div>
      </div>
    );
  }

  return children;
}
