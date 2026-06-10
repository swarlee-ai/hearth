import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  paramsSerializer: (params) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        v.forEach((item) => sp.append(k, item));
      } else if (v !== undefined && v !== null) {
        sp.append(k, String(v));
      }
    });
    return sp.toString();
  },
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg = err.response?.data?.detail || err.message || "Something went wrong";
    return Promise.reject(new Error(msg));
  }
);

export default api;
