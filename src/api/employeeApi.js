import axios from "axios";
import { API_BASE_URL } from "../services/apiBase";
import { getFirebaseToken } from "../services/authToken";

const API = axios.create({
  baseURL: API_BASE_URL,
});

API.interceptors.request.use(async (config) => {
  const token = await getFirebaseToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const employeeApi = {
  myAssignment: () => API.get("/employees/me/assignment"),
  punchIn: (payload) => API.post("/employees/attendance/punch-in", payload),
  punchOut: (payload) => API.post("/employees/attendance/punch-out", payload),
  uploadProfilePhoto: (payload) => API.post("/employees/me/profile-photo", payload),
};
