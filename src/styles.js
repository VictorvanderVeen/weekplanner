export const COLORS = {
  bg: "#ECEAF2",
  cardBg: "#FEFEFE",
  accent: "#EDB90A",
  accentLight: "#FBF0C4",
  accentDark: "#C99A08",
  green: "#22C982",
  greenLight: "#E0F7ED",
  red: "#E04848",
  redLight: "#FCE8E8",
  text: "#1E2240",
  textMuted: "#6B7194",
  textSecondary: "#8C91AD",
  border: "#D8D8E3",
  borderLight: "#E8E8F0",
  shadow: "0 2px 12px rgba(30,34,64,0.08), 0 1px 3px rgba(30,34,64,0.06)",
  shadowHover: "0 8px 28px rgba(30,34,64,0.14)",
  todayBg: "#FFFDF5",
};

export const inputStyle = {
  padding: "9px 12px",
  borderRadius: 10,
  border: `1px solid ${COLORS.border}`,
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
  background: "#F8F8FB",
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
