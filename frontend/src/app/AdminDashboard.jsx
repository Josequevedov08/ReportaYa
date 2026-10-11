import { useState, useEffect } from "react";
import AdminHeatmap from "./AdminHeatmap";
import { apiReportar } from "../services/api";
import { CATEGORIES } from "../types";

interface AdminIncident {
  id: string;
  category: string;
  status: string;
  severity_days: number;
  created_at: string;
  location: { type: "Point"; coordinates: [number, number] };
  photo_url?: string;
  closure_photo_url?: string;
  validation_count: number;
  assigned_to?: string | null;
  closed_at?: string | null;
  closure_notes?: string;
}

const STATUS_FILTERS = [
  { value: "", label: "Todos" },
  { value: "pendiente", label: "Pendiente" },
  { value: "en_inspeccion", label: "En Inspeccion" },
  { value: "en_reparacion", label: "En Reparacion" },
  { value: "solucionado", label: "Solucionado" },
];

export default function AdminDashboard() {
  const [incidents, setIncidents] = useState<AdminIncident[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [selectedIncident, setSelectedIncident] = useState<AdminIncident | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [incs, mets] = await Promise.all([
        apiReportar.admin.getMetrics(),
        apiReportar.admin.getMetrics(),
      ]);
      const all = await fetchAllIncidents();
      setIncidents(all || []);
      setMetrics(mets);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllIncidents = async (category?: string, status?: string) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (status) params.set("status", status);
    const res = await fetch(`/api/v1/incidents/all?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("admin_token") || ""}`,
      },
    });
    return await res.json();
  };

  useEffect(() => {
    fetchAll();
  }, [activeFilter, activeCategory]);

  useEffect(() => {
    if (activeFilter || activeCategory) {
      fetchAllIncidents(activeCategory, activeFilter).then(setIncidents);
    }
  }, [activeFilter, activeCategory]);

  const handleCloseIncident = async (id: string) => {
    try {
      await apiReportar.admin.updateStatus(id, "solucionado", "Reparacion confirmada por inspector");
      setSelectedIncident(null);
      fetchAll();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const avgHours = metrics?.avg_resolution_seconds ? (metrics.avg_resolution_seconds / 3600).toFixed(1) : "0";

  return (
    <div className="admin-dashboard">
      <h1>Dashboard ReportaYa</h1>

      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Total reportes</h3>
          <div className="value">{metrics?.total_incidents || 0}</div>
        </div>
        <div className="metric-card">
          <h3>Tiempo promedio de resolucion</h3>
          <div className="value">{avgHours}h</div>
        </div>
        <div className="metric-card">
          <h3>Pendientes</h3>
          <div className="value">{metrics?.by_status?.pendiente || 0}</div>
        </div>
        <div className="metric-card">
          <h3>Solucionados</h3>
          <div className="value">{metrics?.by_status?.solucionado || 0}</div>
        </div>
      </div>

      <div className="filter-bar">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            className={activeFilter === f.value ? "active" : ""}
            onClick={() => setActiveFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            className={activeCategory === c.value ? "active" : ""}
            onClick={() => setActiveCategory(c.value)}
            style={{ borderLeft: `4px solid ${c.color}` }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <AdminHeatmap incidents={incidents} />

      <div style={{ marginTop: "1.5rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>Reportes recientes</h2>
        <div className="incident-list">
          {loading ? (
            <p>Cargando...</p>
          ) : (
            incidents.map((inc) => (
              <div key={inc.id} className="incident-row">
                <div className="info">
                  <div className="category">{inc.category.replace(/_/g, " ")}</div>
                  <div className="date">
                    {new Date(inc.created_at).toLocaleDateString()} · {inc.severity_days} dias
                  </div>
                </div>
                <span
                  className="severity"
                  style={{
                    backgroundColor:
                      inc.severity_days > 45
                        ? "#dc2626"
                        : inc.severity_days > 15
                        ? "#ca8a04"
                        : "#16a34a",
                  }}
                >
                  {inc.severity_days}d
                </span>
                <button
                  onClick={() => setSelectedIncident(inc)}
                  className="btn btn--secondary"
                  style={{ fontSize: "0.75rem", padding: "0.5rem 1rem", marginLeft: "0.5rem" }}
                >
                  Ver
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedIncident && (
        <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)" }}>
          <div className="modal" style={{ background: "#fff", padding: "2rem", borderRadius: "8px", maxWidth: "600px", margin: "2rem auto" }}>
            <h3>{selectedIncident.category.replace(/_/g, " ")}</h3>
            <p>Estado: {selectedIncident.status}</p>
            <p>Dias sin solucion: {selectedIncident.severity_days}</p>
            {selectedIncident.photo_url && (
              <img src={selectedIncident.photo_url} alt="Reporte" style={{ maxWidth: "100%", borderRadius: "4px", marginBottom: "1rem" }} />
            )}
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
              <button onClick={() => setSelectedIncident(null)} className="btn btn--secondary">
                Cerrar
              </button>
              <button
                onClick={() => handleCloseIncident(selectedIncident.id)}
                className="btn btn--primary"
              >
                Marcar como solucionado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}