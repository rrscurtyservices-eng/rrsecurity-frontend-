const rawBaseUrl =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5050";

const normalizeBaseUrl = (value) => {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/$/, "").replace(/\/api$/, "");
};

export const API_URL = normalizeBaseUrl(rawBaseUrl);
