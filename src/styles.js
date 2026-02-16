export const COLORS = {
  bg: "#F5F4FA",
  cardBg: "#FFFFFF",
  accent: "#EDB90A",
  accentLight: "#FBF0C4",
  accentDark: "#C99A08",
  green: "#22C982",
  greenLight: "#E0F7ED",
  red: "#E04848",
  redLight: "#FCE8E8",
  text: "#1E2240",
  textMuted: "#616882",
  border: "#DCDCE5",
  shadow: "0 2px 8px rgba(30,34,64,0.06)",
  shadowHover: "0 8px 24px rgba(30,34,64,0.12)",
};

export const inputStyle = {
  padding: "9px 12px",
  borderRadius: 10,
  border: `1px solid ${COLORS.border}`,
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
  background: "#FAFAFA",
  transition: "border-color 0.15s",
  color: COLORS.text,
  boxSizing: "border-box",
};

export const smallBtnStyle = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "none",
  background: COLORS.accent,
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 14,
  fontFamily: "inherit",
};
