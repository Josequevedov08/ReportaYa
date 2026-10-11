import React, { useState, useEffect, useRef } from 'react'
import '../components/AdminDashboard.css'

/**
 * Dashboard Administrativo de ReportaYa
 * - Heatmap de incidentes
 * - Filtros por estado/categoría
 * - Métricas de gestión
 * - Purga rápida con un solo clic
 * - Subida de foto de reparación y cierre
 * Diseño sobrio, institucional - Colores: azul (#003049) y rojo (#D62828)
 */

const STATUS_FILTERS = [
  { value: 'all', label: 'Todos', color: '#003049' },
  { value: 'pendiente', label: 'Pendientes', color: '#2d8c2d' },
  { value: 'confirmado', label: 'Confirmados', color: '#003049' },
  { value: 'en_inspeccion', label: 'En inspección', color: '#0065cc' },
  { value: 'en_reparacion', label: 'En reparación', color: '#0065cc' },
  { value: 'solucionado', label: 'Solucionados', color: '#2d8c2d' },
  { value: 'rechazado', label: 'Rechazados', color: '#d62828' }
]

const CATEGORY_FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'vialidad_alcantarillado', label: 'Vialidad y Alcantarillado' },
  { value: 'aseo_urbano', label: 'Aseo Urbano' },
  { value: 'alumbrado_publico', label: 'Alumbrado Público' }
]

export function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [incidents, setIncidents] = useState([])
  const [filters, setFilters] = useState({ status: 'all', category: 'all' })
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState(null)
  const [showClosureModal, setShowClosureModal] = useState(false)
  const [closurePhoto, setClosurePhoto] = useState(null)
  const [closureNotes, setClosureNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [blockedDevices, setBlockedDevices] = useState([])
  const mapRef = useRef(null)

  useEffect(() => {
    fetchStats()
    fetchIncidents()
    fetchBlockedDevices()
  }, [filters])

  const API_BASE = 'http://localhost:8000/api/v1'

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/moderation/stats`)
      const data = await response.json()
      setStats(data)
    } catch (error) {
      // Mock stats para desarrollo
      setStats({
        approved_count: 42,
        pending_count: 8,
        rejected_count: 3,
        total_validations: 38
      })
    }
  }

  const fetchIncidents = async () => {
    setLoading(true)
    try {
      let url = `${API_BASE}/incidents/all`
      const params = new URLSearchParams()
      if (filters.status !== 'all') params.append('status', filters.status)
      if (filters.category !== 'all') params.append('category', filters.category)
      
      const response = await fetch(`${url}?${params}`)
      const data = await response.json()
      setIncidents(data)
    } catch (error) {
      // Mock data para desarrollo
      setIncidents([
        {
          id: 'a1b2c3d4-e5f6-7890',
          category: 'vialidad_alcantarillado',
          status: 'confirmado',
          description: 'Hoyo grande en la calle causando riesgo',
          photo_url: null,
          location: { type: 'Point', coordinates: [-71.6085, 10.6382] },
          city: 'Maracaibo',
          neighborhood: 'Centro',
          created_at: '2024-01-15T10:30:00',
          updated_at: '2024-01-15T10:30:00',
          severity_days: 5,
          validation_count: 3,
          assigned_to: 'admin@alcaldiademaracaibo.gob.ve'
        },
        {
          id: 'b2c3d4e5-f6a7-8901',
          category: 'aseo_urbano',
          status: 'en_reparacion',
          description: 'Basura acumulada en esquina',
          photo_url: null,
          location: { type: 'Point', coordinates: [-71.6100, 10.6390] },
          city: 'Maracaibo',
          neighborhood: 'Los Caobos',
          created_at: '2024-01-10T08:00:00',
          updated_at: '2024-01-15T14:00:00',
          severity_days: 12,
          validation_count: 5,
          assigned_to: 'admin@alcaldiademaracaibo.gob.ve'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const fetchBlockedDevices = async () => {
    try {
      const response = await fetch(`${API_BASE}/moderation/blocked`)
      const data = await response.json()
      setBlockedDevices(data)
    } catch {
      // Mock data
      setBlockedDevices([])
    }
  }

  // Acciones del dashboard
  const handleApprove = async (id) => {
    try {
      await fetch(`${API_BASE}/incidents/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmado' })
      })
      fetchIncidents()
    } catch (error) {
      alert('Error al aprobar el reporte')
    }
  }

  const handleReject = async (id) => {
    const reason = prompt('Motivo del rechazo:')
    if (!reason) return
    try {
      await fetch(`${API_BASE}/incidents/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rechazado' })
      })
      fetchIncidents()
    } catch (error) {
      alert('Error al rechazar el reporte')
    }
  }

  // RECOMENDACIÓN #4: Purga rápida con un solo clic
  const handlePurge = async (id, fingerprint) => {
    if (!window.confirm('¿Estás seguro de eliminar permanentemente este reporte y bloquear al usuario?')) return
    
    try {
      const response = await fetch(`${API_BASE}/incidents/${id}`, {
        method: 'DELETE'
      })
      const result = await response.json()
      
      if (result.success) {
        alert('Reporte eliminado y usuario bloqueado temporalmente.')
        fetchIncidents()
        fetchBlockedDevices()
      }
    } catch (error) {
      alert('Error al purgar el reporte')
    }
  }

  // Subir foto de reparación
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setClosurePhoto(event.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // Cerrar reporte con foto de reparación
  const handleCloseReport = async () => {
    if (!closurePhoto) {
      alert('Debes subir una foto de la reparación')
      return
    }
    
    try {
      await fetch(`${API_BASE}/incidents/${selectedIncident.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'solucionado',
          closure_photo_url: closurePhoto,
          closure_notes: closureNotes
        })
      })
      alert('Reporte cerrado correctamente.')
      setShowClosureModal(false)
      setClosurePhoto(null)
      setClosureNotes('')
      fetchIncidents()
    } catch (error) {
      alert('Error al cerrar el reporte')
    }
  }

  // Renderizar heatmap en el mapa
  const initHeatmap = () => {
    if (!mapRef.current) return
    
    // Cargar Leaflet.heat dinámicamente
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet.heat/dist/leaflet-heat.js'
    script.onload = () => {
      const heatData = incidents
        .filter(inc => inc.location && inc.location.coordinates)
        .map(inc => [
          inc.location.coordinates[1], // lat
          inc.location.coordinates[0], // lng
          0.5 // intensidad
        ])
      
      // En un entorno real, inicializaríamos con react-leaflet-heat
      console.log('Heatmap data points:', heatData.length)
    }
    document.head.appendChild(script)
  }

  // Obtener color de severidad
  const getSeverityColor = (days) => {
    if (days <= 15) return 'severity-green'
    if (days <= 45) return 'severity-yellow'
    return 'severity-red'
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-container">
        {/* Header institucional */}
        <div className="dashboard-header">
          <h1>Panel de Administración - Alcaldía de Maracaibo</h1>
          <p className="text-secondary">Gestión de reportes ciudadanos</p>
        </div>

        {/* Estadísticas generales */}
        <div className="dashboard-section">
          <h2>Métricas de Gestión</h2>
          <div className="stats-grid">
            <div className="stat-card stat-primary">
              <div className="stat-value">{stats?.approved_count || 0}</div>
              <div className="stat-label">Reportes Confirmados</div>
            </div>
            <div className="stat-card stat-warning">
              <div className="stat-value">{stats?.pending_count || 0}</div>
              <div className="stat-label">Pendientes de Revisión</div>
            </div>
            <div className="stat-card stat-red">
              <div className="stat-value">{stats?.rejected_count || 0}</div>
              <div className="stat-label">Rechazados</div>
            </div>
            <div className="stat-card stat-primary">
              <div className="stat-value">{stats?.total_validations || 0}</div>
              <div className="stat-label">Validaciones Ciudadanas</div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="dashboard-section">
          <h2>Filtros</h2>
          <div className="filters-row">
            <div className="filter-group">
              <label>Estado</label>
              <div className="filter-tags">
                {STATUS_FILTERS.map(status => (
                  <button
                    key={status.value}
                    className={`filter-tag ${filters.status === status.value ? 'active' : ''}`}
                    style={{ borderColor: status.color }}
                    onClick={() => setFilters({...filters, status: status.value})}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <label>Categoría</label>
              <div className="filter-tags">
                {CATEGORY_FILTERS.map(cat => (
                  <button
                    key={cat.value}
                    className={`filter-tag ${filters.category === cat.value ? 'active' : ''}`}
                    onClick={() => setFilters({...filters, category: cat.value})}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <label>Vista de mapa</label>
              <div className="filter-tags">
                <button
                  className={`filter-tag ${showHeatmap ? 'active' : ''}`}
                  onClick={() => setShowHeatmap(!showHeatmap)}
                >
                  Heatmap
                </button>
                <button
                  className={`filter-tag ${!showHeatmap ? 'active' : ''}`}
                  onClick={() => setShowHeatmap(false)}
                >
                  Marcadores
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mapa interactivo */}
        <div className="dashboard-section">
          <h2>Mapa de Incidentes</h2>
          <div className="map-wrapper">
            <div ref={mapRef} className="admin-map">
              {/* Mapa de Leaflet se renderizará aquí */}
              <div className="map-placeholder">
                <p>Mapa de incidentes cargado</p>
                <p className="text-secondary">{incidents.length} incidentes en el mapa</p>
                
                {/* Visualización simple de incidentes */}
                <div className="incidents-map-view">
                  {incidents.map(incident => {
                    const coords = incident.location?.coordinates || [0, 0]
                    return (
                      <div
                        key={incident.id}
                        className="incident-map-pin"
                        style={{
                          left: `${Math.min(100, Math.max(0, (coords[0] + 72) * 3))}%`,
                          top: `${Math.min(100, Math.max(0, (coords[1] - 9) * 5))}%`,
                          backgroundColor: getStatusColor(incident.status)
                        }}
                        onClick={() => setSelectedIncident(incident)}
                        title={`${incident.category} - ${incident.status}`}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de incidentes */}
        <div className="dashboard-section">
          <h2>Incidentes ({incidents.length})</h2>
          {loading && <div className="loading">Cargando...</div>}
          
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Categoría</th>
                  <th>Estado</th>
                  <th>Severidad</th>
                  <th>Fecha</th>
                  <th>Validaciones</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map(incident => (
                  <tr key={incident.id}>
                    <td className="mono">{incident.id.substring(0, 8)}...</td>
                    <td>{getCategoryLabel(incident.category)}</td>
                    <td>
                      <span className={`status-chip status-${incident.status}`}>
                        {incident.status}
                      </span>
                    </td>
                    <td>
                      {incident.severity_days !== undefined && (
                        <span className={`severity-badge ${getSeverityColor(incident.severity_days)}`}>
                          {incident.severity_days}d
                        </span>
                      )}
                    </td>
                    <td>{new Date(incident.created_at).toLocaleDateString()}</td>
                    <td>{incident.validation_count || 0}</td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleApprove(incident.id)}
                          title="Aprobar"
                        >
                          Aprobar
                        </button>
                        <button
                          className="btn btn-sm btn-red"
                          onClick={() => handleReject(incident.id)}
                          title="Rechazar"
                        >
                          Rechazar
                        </button>
                        <button
                          className="btn btn-sm btn-red btn-purge"
                          onClick={() => handlePurge(incident.id, incident.reporter_fingerprint)}
                          title="Purgar permanentemente y bloquear"
                        >
                          Purgar
                        </button>
                        {(incident.status === 'confirmado' || incident.status === 'en_inspeccion') && (
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => {
                              setSelectedIncident(incident)
                              setShowClosureModal(true)
                            }}
                            title="Cerrar con foto de reparación"
                          >
                            Cerrar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de cierre con foto de reparación */}
      {showClosureModal && selectedIncident && (
        <div className="modal-overlay">
          <div className="closure-modal card">
            <h3>Cerrar reporte: {selectedIncident.id.substring(0, 8)}...</h3>
            
            <div className="form-group">
              <label>Foto de reparación</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="input"
              />
              {closurePhoto && (
                <img src={closurePhoto} alt="Vista previa" className="closure-preview" />
              )}
            </div>

            <div className="form-group">
              <label>Notas de cierre</label>
              <textarea
                className="input"
                rows="3"
                value={closureNotes}
                onChange={(e) => setClosureNotes(e.target.value)}
                placeholder="Describe la reparación realizada..."
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-primary"
                onClick={handleCloseReport}
              >
                Confirmar cierre
              </button>
              <button
                className="btn btn-outline"
                onClick={() => setShowClosureModal(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalles del incidente */}
      {selectedIncident && !showClosureModal && incidents.find(i => i.id === selectedIncident.id) !== undefined && (
        <div className="modal-overlay" onClick={() => setSelectedIncident(null)}>
          <div className="incident-detail card" onClick={e => e.stopPropagation()}>
            <h3>Detalle del reporte</h3>
            <p><strong>ID:</strong> {selectedIncident.id}</p>
            <p><strong>Categoría:</strong> {getCategoryLabel(selectedIncident.category)}</p>
            <p><strong>Estado:</strong> {selectedIncident.status}</p>
            <p><strong>Descripción:</strong> {selectedIncident.description || 'Sin descripción'}</p>
            <p><strong>Barrio:</strong> {selectedIncident.neighborhood || 'N/D'}</p>
            <p><strong>Fecha de reporte:</strong> {new Date(selectedIncident.created_at).toLocaleString()}</p>
            <p><strong>Validaciones:</strong> {selectedIncident.validation_count || 0}</p>
            <p><strong>Denuncias ciudadanas:</strong> {selectedIncident.negative_report_count || 0}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper functions
function getCategoryLabel(category) {
  const labels = {
    'vialidad_alcantarillado': 'Vialidad y Alcantarillado',
    'aseo_urbano': 'Aseo Urbano',
    'alumbrado_publico': 'Alumbrado Público'
  }
  return labels[category] || category
}

function getStatusColor(status) {
  const colors = {
    'pendiente': '#6b7280',
    'confirmado': '#003049',
    'en_inspeccion': '#0065cc',
    'en_reparacion': '#0065cc',
    'solucionado': '#2d8c2d',
    'rechazado': '#d62828'
  }
  return colors[status] || '#6b7280'
}

function getSeverityColor(days) {
  if (days <= 15) return 'severity-green'
  if (days <= 45) return 'severity-yellow'
  return 'severity-red'
}