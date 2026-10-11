// src/components/Header.jsx - Header institucional
import { Link } from 'react-router-dom'

export function Header() {
  return (
    <header className="header">
      <div className="container header-content">
        <Link to="/" className="logo">
          <span className="logo-text">ReportaYa</span>
        </Link>
        
        <nav className="nav">
          <ul className="nav-list">
            <li><a href="#mapa">Mapa</a></li>
            <li><a href="#categorias">Categorias</a></li>
            <li><a href="/admin">Admin</a></li>
          </ul>
        </nav>
        
        <div className="header-actions">
          <button className="btn btn-secondary">
            Sobre mí
          </button>
        </div>
      </div>
    </header>
  )
}