import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api/v1";

const client = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.detail || err.message || "Error de conexion";
    return Promise.reject(new Error(message));
  }
);

export const apiReportar = {
  reportIncident: async (data: {
    category: string;
    description?: string;
    latitude: number;
    longitude: number;
    photo_url: string;
    city?: string;
    neighborhood?: string;
  }) => {
    const res = await client.post("/incidents", data);
    return res.data;
  },

  validateIncident: async (incidentId: string, data: {
    is_confirmed: boolean;
    latitude: number;
    longitude: number;
  }) => {
    const res = await client.post(`/incidents/${incidentId}/validate`, data);
    return res.data;
  },

  getActiveIncidentsGeoJSON: async () => {
    const res = await client.get("/incidents/geojson");
    return res.data as any;
  },

  getIncident: async (id: string) => {
    const res = await client.get(`/incidents/${id}`);
    return res.data;
  },

  getIncidents: async (skip = 0, limit = 50) => {
    const res = await client.get(`/incidents?skip=${skip}&limit=${limit}`);
    return res.data;
  },

  admin: {
    login: async (email: string, password: string) => {
      const encoded = btoa(`${email}:${password}`);
      const res = await client.post("/auth/login", {}, { headers: { Authorization: `Basic ${encoded}` } });
      const token = res.data.access_token;
      localStorage.setItem("admin_token", token);
      client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      return res.data;
    },

    getMetrics: async () => {
      const res = await client.get("/incidents/metrics/summary");
      return res.data;
    },

    updateStatus: async (id: string, status: string, notes?: string) => {
      const res = await client.put(`/incidents/${id}/status`, { status, closure_notes: notes });
      return res.data;
    },
  },
};