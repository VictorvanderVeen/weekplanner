import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { COLORS, inputStyle, smallBtnStyle } from "../styles";

export function Auth() {
  const { user, loading, signIn, signUp, resetPassword } = useAuth();
  const [activeTab, setActiveTab] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [message, setMessage] = useState(null);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const handleSignIn = async (e) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        setMessage({
          text:
            error.message === "Invalid login credentials"
              ? "Onjuiste inloggegevens"
              : error.message,
          type: "error",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setMessage(null);
    if (password !== confirmPassword) {
      setMessage({ text: "Wachtwoorden komen niet overeen", type: "error" });
      return;
    }
    if (password.length < 6) {
      setMessage({
        text: "Wachtwoord moet minimaal 6 tekens zijn",
        type: "error",
      });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await signUp(email, password);
      if (error) {
        setMessage({ text: error.message, type: "error" });
      } else {
        setMessage({
          text: "Account aangemaakt! Controleer je e-mail om je account te bevestigen.",
          type: "success",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setMessage(null);
    if (!email) {
      setMessage({ text: "Voer je e-mailadres in", type: "error" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (error) {
        setMessage({ text: error.message, type: "error" });
      } else {
        setMessage({
          text: "Reset link verzonden! Controleer je e-mail.",
          type: "success",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fullWidthBtn = {
    ...smallBtnStyle,
    width: "100%",
    padding: "12px 0",
    borderRadius: 10,
    fontSize: 15,
    background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`,
    opacity: isLoading ? 0.7 : 1,
    cursor: isLoading ? "default" : "pointer",
  };

  const tabStyle = (isActive) => ({
    flex: 1,
    padding: "10px 0",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "inherit",
    cursor: "pointer",
    background: isActive ? COLORS.accent : "transparent",
    color: isActive ? "#fff" : COLORS.textMuted,
    transition: "all 0.2s",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <div
        style={{
          width: "100%",
          maxWidth: 420,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 48,
              height: 3,
              borderRadius: 2,
              background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.green})`,
              margin: "0 auto 8px",
            }}
          />
          <h1
            style={{
              margin: 0,
              fontSize: 36,
              fontWeight: 700,
              background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.green}, #4D94F7)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              lineHeight: 1.2,
            }}
          >
            Me-Planner
          </h1>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 14,
              color: COLORS.textMuted,
            }}
          >
            Plan je taken, beheers je week
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: COLORS.cardBg,
            borderRadius: 16,
            padding: 28,
            boxShadow: COLORS.shadow,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          {showResetForm ? (
            /* Password Reset Form */
            <form onSubmit={handleResetPassword}>
              <h3
                style={{
                  margin: "0 0 16px",
                  fontSize: 16,
                  fontWeight: 600,
                  color: COLORS.text,
                }}
              >
                Wachtwoord vergeten
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: COLORS.textMuted,
                  margin: "0 0 16px",
                }}
              >
                Voer je e-mailadres in en we sturen je een reset link.
              </p>

              {message && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    marginBottom: 12,
                    fontSize: 13,
                    background:
                      message.type === "error"
                        ? COLORS.redLight
                        : COLORS.greenLight,
                    color:
                      message.type === "error" ? COLORS.red : COLORS.green,
                    border: `1px solid ${message.type === "error" ? COLORS.red : COLORS.green}20`,
                  }}
                >
                  {message.text}
                </div>
              )}

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mailadres"
                required
                style={{ ...inputStyle, width: "100%", marginBottom: 12 }}
              />

              <button type="submit" disabled={isLoading} style={fullWidthBtn}>
                {isLoading ? "Verzenden..." : "Reset link versturen"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowResetForm(false);
                  setMessage(null);
                }}
                style={{
                  width: "100%",
                  padding: "10px 0",
                  border: "none",
                  background: "none",
                  color: COLORS.textMuted,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  marginTop: 8,
                }}
              >
                Terug naar inloggen
              </button>
            </form>
          ) : (
            <>
              {/* Tabs */}
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  background: "#f3f4f6",
                  borderRadius: 10,
                  padding: 3,
                  marginBottom: 24,
                }}
              >
                <button
                  onClick={() => {
                    setActiveTab("signin");
                    setMessage(null);
                  }}
                  style={tabStyle(activeTab === "signin")}
                >
                  Inloggen
                </button>
                <button
                  onClick={() => {
                    setActiveTab("signup");
                    setMessage(null);
                  }}
                  style={tabStyle(activeTab === "signup")}
                >
                  Registreren
                </button>
              </div>

              {/* Message */}
              {message && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    marginBottom: 16,
                    fontSize: 13,
                    background:
                      message.type === "error"
                        ? COLORS.redLight
                        : COLORS.greenLight,
                    color:
                      message.type === "error" ? COLORS.red : COLORS.green,
                    border: `1px solid ${message.type === "error" ? COLORS.red : COLORS.green}20`,
                  }}
                >
                  {message.text}
                </div>
              )}

              {/* Sign In Form */}
              {activeTab === "signin" && (
                <form onSubmit={handleSignIn}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 13,
                          fontWeight: 500,
                          color: COLORS.text,
                          marginBottom: 4,
                        }}
                      >
                        E-mailadres
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="naam@voorbeeld.nl"
                        required
                        style={{ ...inputStyle, width: "100%" }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 13,
                          fontWeight: 500,
                          color: COLORS.text,
                          marginBottom: 4,
                        }}
                      >
                        Wachtwoord
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Wachtwoord"
                        required
                        style={{ ...inputStyle, width: "100%" }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      style={fullWidthBtn}
                    >
                      {isLoading ? "Inloggen..." : "Inloggen"}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetForm(true);
                      setMessage(null);
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 0",
                      border: "none",
                      background: "none",
                      color: COLORS.textMuted,
                      fontSize: 13,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      marginTop: 4,
                    }}
                  >
                    Wachtwoord vergeten?
                  </button>
                </form>
              )}

              {/* Sign Up Form */}
              {activeTab === "signup" && (
                <form onSubmit={handleSignUp}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 13,
                          fontWeight: 500,
                          color: COLORS.text,
                          marginBottom: 4,
                        }}
                      >
                        E-mailadres
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="naam@voorbeeld.nl"
                        required
                        style={{ ...inputStyle, width: "100%" }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 13,
                          fontWeight: 500,
                          color: COLORS.text,
                          marginBottom: 4,
                        }}
                      >
                        Wachtwoord
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimaal 6 tekens"
                        required
                        minLength={6}
                        style={{ ...inputStyle, width: "100%" }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 13,
                          fontWeight: 500,
                          color: COLORS.text,
                          marginBottom: 4,
                        }}
                      >
                        Bevestig wachtwoord
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Herhaal wachtwoord"
                        required
                        style={{ ...inputStyle, width: "100%" }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      style={fullWidthBtn}
                    >
                      {isLoading ? "Account aanmaken..." : "Account aanmaken"}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
