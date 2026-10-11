import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "./styles.css";
import ReportForm from "./components/ReportForm";
import IncidentMap from "./components/IncidentMap";
import ValidationList from "./components/ValidationList";
import AdminDashboard from "./AdminDashboard";
import AdminHeatmap from "./components/AdminHeatmap";
import { apiReportar } from "./services/api";
import { Incident, getSeverityLabel, SEVERITY_COLORS } from "./types";

function NavLink({ to, children }) {
  const location = useLocation();
  return (
    <Link to={to} className={location.pathname === to ? "active" : ""}>
      {children}
    </Link>
  );
}

function HomePage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiReportar.getActiveIncidentsGeoJSON()
      .then((geojson) => {
        const features = geojson.features || [];
        setIncidents(features);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="app-container">
      <header className="header">
        <Link to="/" className="header__logo">
          <span className="header__logo-dot"></span>
          ReportaYa
        </Link>
      </header>

      <nav className="nav">
        <NavLink to="/">Incidencias</NavLink>
        <NavLink to="/reportar">Reportar</NavLink>
        <NavLink to="/validar">Validar</NavLink>
      </nav>

      {loading ? (
        <p className="form-note">Cargando incidencias...</p>
      ) : (
        <IncidentMap incidents={incidents} />
      )}

      <div className="bottom-nav">
        <NavLink to="/">Incidencias</NavLink>
        <NavLink to="/reportar">Reportar</NavLink>
        <NavLink to="/validar">Validar</NavLink>
      </div>
    </div>
  );
}

function ReportPage() {
  return (
    <div className="app-container">
      <header className="header">
        <Link to="/" className="header__logo">
          <span className="header__logo-dot"></span>
          ReportaYa
        </Link>
      </header>

      <nav className="nav">
        <NavLink to="/">Incidencias</NavLink>
        <NavLink to="/reportar">Reportar</NavLink>
        <NavLink to="/validar">Validar</NavLink>
      </nav>

      <ReportForm onSuccess={(id) => {
        alert("Reporte enviado. ID: " + id);
      }} />
    </div>
  );
}

function ValidatePage() {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    apiReportar.getActiveIncidentsGeoJSON()
      .then((geojson) => {
        setIncidents(geojson.features || []);
      });
  }, []);

  if (selectedIncident) {
    return (
      <div className="app-container">
        <header className="header">
          <button onClick={() => setSelectedIncident(null)} className="btn btn--secondary" style={{ fontSize: "0.75rem", padding: "0.5rem 1rem" }}>
            Atras
          </button>
        </header>
        <ValidationList incidentId={selectedIncident.id} />
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <Link to="/" className="header__logo">
          <span className="header__logo-dot"></span>
          ReportaYa
        </Link>
      </header>

      <nav className="nav">
        <NavLink to="/">Incidencias</NavLink>
        <NavLink to="/reportar">Reportar</NavLink>
        <NavLink to="/validar">Validar</NavLink>
      </nav>

      <h2>Ultimas incidencias</h2>
      <div className="incident-list">
        {incidents.map((inc) => {
          const severity = getSeverityLabel(inc.severity_days);
          return (
            <div key={inc.id} className="incident-row">
              <div className="info">
                <div className="category">{inc.category.replace(/_/g, " ")}</div>
                <div className="date">
                  Registrado {new Date(inc.created_at).toLocaleDateString()} · {inc.severity_days} dias
                </div>
              </div>
              <span className="severity" style={{ backgroundColor: SEVERITY_COLORS[severity] }}>
                {severity === "reciente" ? "Reciente" : severity === "en_espera" ? "En Espera" : "Critico"}
              </span>
              <button
                onClick={() => setSelectedIncident(inc)}
                className="btn btn--secondary"
                style={{ fontSize: "0.75rem", padding: "0.5rem 1rem", marginLeft: "0.5rem" }}
              >
                Validar
              </button>
            </div>
          );
        })}
      </div>

      <div className="bottom-nav">
        <NavLink to="/">Incidencias</NavLink>
        <NavLink to="/reportar">Reportar</NavLink>
        <NavLink to="/validar">Validar</NavLink>
      </div>
    </div>
  );
}

function App() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const RequireAdmin = ({ children }: { children: JSX.Element }) => {
    const token = localStorage.getItem("admin_token");
    if (!token) return <Navigate to="/admin" replace />;
    return children;
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/reportar" element={<ReportPage />} />
        <Route path="/validar" element={<ValidatePage />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={
          <RequireAdmin>
            <AdminDashboard />
          </RequireAdmin>
        } />
      </Routes>
    </Router>
  );
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      await apiReportar.admin.login(email, password);
      window.location.href = "/admin/dashboard";
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="app-container">
      <div className="admin-login">
        <h2>Acceso Administrativo</h2>
        <form className="admin-form" onSubmit={(e) => {
          e.preventDefault();
          handleLogin();
        }}>
          <input
            type="email"
            placeholder="Correo institucional"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Contrasena"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="btn btn--primary">
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;