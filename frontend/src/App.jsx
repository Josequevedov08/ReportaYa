import React, { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import IncidentMap from './componentes/IncidentMap'
import { AdminDashboard } from './components/AdminDashboard'
import './ui/estilos.css'
import './components/AdminDashboard.css'

export function App() {
  const [acceptedLegal, setAcceptedLegal] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const hasAccepted = localStorage.getItem('legal_accepted')
    if (hasAccepted) {
      setAcceptedLegal(true)
    }
  }, [])

  const acceptLegal = () => {
    localStorage.setItem('legal_accepted', 'true')
    setAcceptedLegal(true)
  }

  if (!acceptedLegal && location.pathname !== '/admin') {
    return <LegalGate onAccept={acceptLegal} />
  }

  return (
    <div className="app-root">
      <Header />
      <main style={{ paddingTop: '4rem' }}>
        <Routes>
          <Route path="/" element={<IncidentMap />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </main>
    </div>
  )
}

function LegalGate({ onAccept }) {
  const [showLegal, setShowLegal] = useState(false)

  return (
    <div className="legal-gate">
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
        <h1>ReportaYa</h1>
        <p className="text-secondary">Plataforma ciudadana anónima para reportar problemas viales, aseo urbano y alumbrado público en Maracaibo.</p>
        
        <div style={{ margin: '1.5rem 0', padding: '1rem', background: 'var(--color-bg-alt)', borderRadius: '8px', textAlign: 'left' }}>
          <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Antes de continuar:</h3>
          <ul style={{ fontSize: '0.85rem', padding: 0, margin: 0 }}>
            <li style={{ marginBottom: '0.4rem' }}>No es un servicio de emergencias. Llama al 171 para emergencias.</li>
            <li style={{ marginBottom: '0.4rem' }}>Manten la privacidad de tu ubicacion.</li>
            <li style={{ marginBottom: '0.4rem' }}>No recopilamos datos personales identificables.</li>
            <li style={{ marginBottom: '0.4rem' }}>
              <a href="#" onClick={(e) => { e.preventDefault(); setShowLegal(true) }} style={{ color: 'var(--color-primary)' }}>
                Terminos y Condiciones y Politica de Privacidad
              </a>
            </li>
          </ul>
        </div>
        
        <button 
          className="btn btn-primary"
          style={{ width: '100%', padding: '0.875rem' }}
          onClick={onAccept}
        >
          Aceptar y continuar
        </button>
      </div>
      
      {showLegal && (
        <div className="modal-overlay">
          <div className="card" style={{ maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>Documentos legales</h2>
              <button className="btn btn-outline btn-sm" onClick={() => setShowLegal(false)}>
                Cerrar
              </button>
            </div>
            <div style={{ fontSize: '0.85rem', lineHeight: '1.6' }}>
              <p><strong>Terminos y Condiciones:</strong> ReportaYa es una plataforma ciudadana. No somos una autoridad publica.</p>
              <p><strong>Politica de Privacidad:</strong> No recopilamos datos personales identificables.</p>
              <p><strong>Politica de Cookies:</strong> Solo usamos cookies esenciales para la PWA.</p>
              <p><strong>Descargo de Responsabilidad:</strong> La informacion no es verificada oficialmente.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Header() {
  const location = useLocation()
  return (
    <header className="dashboard-header" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'var(--color-bg)', borderBottom: '3px solid var(--color-primary)' }}>
      <div className="dashboard-container">
        <div className="flex flex-between">
          <h1 style={{ fontSize: '1.25rem', margin: 0 }}>ReportaYa</h1>
          <nav style={{ display: 'flex', gap: '1rem' }}>
            <Link to="/" style={{ color: location.pathname === '/' ? 'var(--color-primary)' : 'var(--color-gray-600)' }}>
              Mapa de Reportes
            </Link>
            <Link to="/admin" style={{ color: location.pathname === '/admin' ? 'var(--color-primary)' : 'var(--color-gray-600)' }}>
              Panel Admin
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}

// Estilos globales
const globalStyles = `
.app-root {
  min-height: 100vh;
  background: var(--color-bg);
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
`

if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style')
  styleEl.textContent = globalStyles
  document.head.appendChild(styleEl)
}
