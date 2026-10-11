import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import IncidentMap from './componentes/IncidentMap';
import AdminDashboard from './pages/AdminDashboard';
import './ui/estilos.css';
import './componentes/IncidentMap.css';

// Estilos globales
const globalStyles = `
.app-root {
  min-height: 100vh;
  background: var(--color-bg);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.legal-gate {
  position: fixed;
  inset: 0;
  background: var(--color-bg);
  z-index: 5000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.text-secondary {
  color: var(--color-text-secondary);
}
`;

if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.textContent = globalStyles;
  document.head.appendChild(styleEl);
}

export function App() {
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const hasAccepted = localStorage.getItem('legal_accepted');
    if (hasAccepted) {
      setAcceptedLegal(true);
    }
  }, []);

  const acceptLegal = () => {
    localStorage.setItem('legal_accepted', 'true');
    setAcceptedLegal(true);
  };

  // Ruta secreta para panel administrativo - NO enlazar en el menú principal
  if (!acceptedLegal && location.pathname !== '/MunicipioMcbo') {
    return <LegalGate onAccept={acceptLegal} />;
  }

  return (
    <div className="app-root">
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<IncidentMap />} />
          {/* Ruta secreta admin - no enlazar públicamente */}
          <Route path="/MunicipioMcbo" element={<AdminDashboard />} />
        </Routes>
      </main>
    </div>
  );
}

function LegalGate({ onAccept }) {
  const [showLegal, setShowLegal] = useState(false);

  return (
    <div className="legal-gate">
      <div className="card card--legal" style={{ maxWidth: '480px', width: '100%', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            background: 'var(--color-primary)', 
            borderRadius: '12px',
            margin: '0 auto 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ 
              width: '24px', 
              height: '24px', 
              border: '2px solid white', 
              borderRadius: '50%',
              display: 'block'
            }}></span>
          </div>
          <h1 style={{ 
            fontSize: '1.75rem', 
            fontWeight: '700', 
            margin: 0,
            color: 'var(--color-primary)'
          }}>
            ReportaYa
          </h1>
          <p className="text-secondary" style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>
            Plataforma ciudadana anónima para reportar problemas viales, aseo urbano y alumbrado público en Maracaibo.
          </p>
        </div>
        
        <div style={{ 
          margin: '1.5rem 0', 
          padding: '1.25rem', 
          background: 'var(--color-bg-alt)', 
          border: '1px solid var(--color-border)',
          borderRadius: '8px' 
        }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--color-text)' }}>
            Antes de continuar:
          </h3>
          <ul style={{ fontSize: '0.85rem', padding: 0, margin: 0, listStyle: 'none' }}>
            <li style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem' }}>
              <span style={{ color: 'var(--color-red)', fontSize: '1.1rem' }}>●</span>
              No es un servicio de emergencias. Llama al 171.
            </li>
            <li style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem' }}>
              <span style={{ color: 'var(--color-red)', fontSize: '1.1rem' }}>●</span>
              Mantén la privacidad de tu ubicación.
            </li>
            <li style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.5rem' }}>
              <span style={{ color: 'var(--color-red)', fontSize: '1.1rem' }}>●</span>
              No recopilamos datos personales identificables.
            </li>
          </ul>
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); setShowLegal(true) }} 
            style={{ 
              color: 'var(--color-primary)', 
              fontSize: '0.8rem', 
              textDecoration: 'none',
              display: 'block',
              marginTop: '0.5rem'
            }}
          >
            Términos y Condiciones y Política de Privacidad
          </a>
        </div>
        
        <button 
          className="btn btn--primary"
          style={{ width: '100%', padding: '1rem' }}
          onClick={onAccept}
        >
          Aceptar y continuar
        </button>
      </div>
      
      {showLegal && (
        <div className="modal-overlay">
          <div className="card" style={{ maxWidth: '560px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Documentos legales</h2>
              <button className="btn btn--outline btn--sm" onClick={() => setShowLegal(false)}>
                Cerrar
              </button>
            </div>
            <div style={{ fontSize: '0.85rem', lineHeight: '1.6' }}>
              <p><strong>Términos y Condiciones:</strong> ReportaYa es una plataforma ciudadana. No somos una autoridad pública.</p>
              <p><strong>Política de Privacidad:</strong> No recopilamos datos personales identificables.</p>
              <p><strong>Política de Cookies:</strong> Solo usamos cookies esenciales para la PWA.</p>
              <p><strong>Descargo de Responsabilidad:</strong> La información no es verificada oficialmente.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Header() {
  const location = useLocation();
  return (
    <header className="dashboard-header">
      <div className="container--fluid">
        <div className="flex-between">
          <div className="flex-center">
            <div style={{
              width: '32px',
              height: '32px',
              background: 'var(--color-primary)',
              borderRadius: '6px',
              marginRight: '0.75rem'
            }}>
              <span style={{
                width: '12px',
                height: '12px',
                border: '2px solid white',
                borderRadius: '50%',
                display: 'block',
                marginTop: '6px',
                marginLeft: '8px'
              }}></span>
            </div>
            <h1 style={{ fontSize: '1.25rem', margin: 0, fontWeight: '700', color: 'var(--color-primary)' }}>
              ReportaYa
            </h1>
          </div>
          <nav style={{ display: 'flex', gap: '1.25rem' }}>
            <Link 
              to="/" 
              style={{ 
                color: location.pathname === '/' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: location.pathname === '/' ? '600' : '400'
              }}
            >
              Mapa de Reportes
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default App;