import axios from "axios";
import { API_BASE_URL } from "./apiBase";
import { getFirebaseToken } from "./authToken";

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(
  async (config) => {
    const token = await getFirebaseToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;

    return config;
  },
  (error) => Promise.reject(error)
);

export const managerApi = {
  dashboard: () => api.get("/manager/dashboard"),
  attendance: (date) =>
    api.get("/manager/attendance", { params: date ? { date } : {} }),
  location: (date) =>
    api.get("/manager/location", { params: date ? { date } : {} }),
  locationCheckin: (employeeId) => api.post("/manager/location/checkin", { employeeId }),
  employees: (params) => api.get("/manager/employees", { params: params || {} }),
  activity: (params) => api.get("/manager/activity", { params: params || {} }),
  announcements: () => api.get("/manager/announcements"),
  updateEmployee: (employeeId, payload) => api.put(`/manager/employees/${employeeId}`, payload),
  reportsWeekly: () => api.get("/manager/reports/weekly"),
  reportsMonthly: () => api.get("/manager/reports/monthly"),
};

export default api;
