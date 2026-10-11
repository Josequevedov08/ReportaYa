// src/components/MapView.jsx - Mapa interactivo con markers
import { useState, useEffect, useRef } from 'react'
import { Marker, Popup, Map as LeafletMap, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix para iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const AGE_THRESHOLDS = {
  GREEN: 15,  // 0-15 días
  YELLOW: 45, // 15-45 días
}

export function MapView({ selectedCategory }) {
  const [incidents, setIncidents] = useState([])
  const [map, setMap] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchIncidents()
  }, [selectedCategory])

  const fetchIncidents = async () => {
    try {
      setIsLoading(true)
      
      // Obtener GeoJSON de incidencias
      let url = 'http://localhost:8000/api/v1/incidents/geojson'
      if (selectedCategory) {
        url += `?category=${selectedCategory.value}`
      }

      const response = await fetch(url.replace('localhost:8000', 'http://localhost:8000'))
      const data = await response.json()
      
      if (data.features && Array.isArray(data.features)) {
        const incidentsWithAge = data.features.map(feature => {
          const created = new Date(feature.properties.created_at)
          const now = new Date()
          const daysOld = Math.floor((now - created) / (1000 * 60 * 60 * 24))
          
          return {
            ...feature,
            properties: {
              ...feature.properties,
              age_days: daysOld,
              age_badge: getAgeBadge(daysOld)
            }
          }
        })
        setIncidents(incidentsWithAge)
      }
    } catch (error) {
      console.error('Error al cargar incidentes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getAgeBadge = (daysOld) => {
    if (daysOld <= AGE_THRESHOLDS.GREEN) return 'green'
    if (daysOld <= AGE_THRESHOLDS.YELLOW) return 'yellow'
    return 'red'
  }

  const getMarkerColor = (status, ageBadge) => {
    if (status === 'rechazado') return '#c53030'
    if (ageBadge === 'red') return '#c53030'
    if (ageBadge === 'yellow') return '#d69e2e'
    if (status === 'confirmado') return '#1a365d'
    return '#4a6496'
  }

  const handleMapCenter = () => {
    if (map && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const latlng = [pos.coords.latitude, pos.coords.longitude]
        map.setView(latlng, 13)
      })
    }
  }

  const formatDistance = (lat, lng) => {
    // Calcular distancia desde posición actual
    // Implementación simple - usar biblioteca haversine en producción
    return '200m'
  }

  if (isLoading) {
    return (
      <div className="map-loading">
        <p>Cargando mapa...</p>
      </div>
    )
  }

  return (
    <div className="map-container">
      <LeafletMap
        center={[10.5069, -74.8333]} // Maracaibo
        zoom={13}
        whenCreated={setMap}
        maxZoom={18}
        minZoom={5}
        attributionControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Incidentes */}
        {incidents.map(incident => {
          const coords = [
            incident.geometry.coordinates[1],
            incident.geometry.coordinates[0]
          ]
          
          const ageDays = incident.properties.age_days
          const status = incident.properties.status
          const ageBadge = incident.properties.age_badge
          
          return (
            <Marker
              key={incident.id}
              position={coords}
              icon={L.divIcon({
                className: 'custom-marker',
                html: `<div style="background-color: ${getMarkerColor(status, ageBadge)}; width: 30px; height: 30px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px;">${ageBadge === 'green' ? '🟢' : ageBadge === 'yellow' ? '🟡' : '🔴'}</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
              })}
            >
              <Popup>
                <div className="popup-content">
                  <h4>{incident.properties.category}</h4>
                  <p>{incident.properties.description}</p>
                  <div className="popup-meta">
                    <span className="age-badge age-{ageBadge}">
                      {ageDays} días
                    </span>
                    <span>Estado: {status}</span>
                  </div>
                  <div className="popup-actions">
                    <button className="btn btn-secondary btn-sm">Validar</button>
                    <button className="btn btn-accent btn-sm">Denunciar</button>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </LeafletMap>
    </div>
  )
}