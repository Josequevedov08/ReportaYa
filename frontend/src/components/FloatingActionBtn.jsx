// src/components/FloatingActionBtn.jsx - Botón flotante para reportar
import { useState } from 'react'

export function FloatingActionBtn({ onClick, active }) {
  return (
    <button
      className={`fab ${active ? 'fab-active' : ''}`}
      onClick={onClick}
      aria-label="Crear nuevo reporte"
    >
      <span className="fab-icon">📍</span>
      <span className="fab-label">Reportar</span>
    </button>
  )
}