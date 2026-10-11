import React, { useState, useEffect, useRef, useCallback } from 'react';
import './IncidentMap.css';

/**
 * Mapa interactivo para ReportaYa
 * - Cámara en vivo para captura obligatoria (bloquea galería)
 * - Geofencing 200m para validaciones
 * - Indicadores de antigüedad (verde 0-15d, amarillo 15-45d, rojo 45+d)
 */
const IncidentMap = ({ onReportSubmit, incidents = [] }) => {
  const mapRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [mapboxMap, setMapboxMap] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Categorías de incidentes (sin emojis)
  const categories = [
    { value: 'vialidad_alcantarillado', label: 'Vialidad y Alcantarillado' },
    { value: 'aseo_urbano', label: 'Aseo Urbano' },
    { value: 'alumbrado_publico', label: 'Alumbrado Público' },
  ];

  // Inicializar el mapa
  useEffect(() => {
    // Cargar Leaflet dinámicamente
    const initMap = async () => {
      if (typeof window !== 'undefined' && !window.L) {
        // Cargar Leaflet CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        // Cargar Leaflet JS
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });

        // Cargar plugin de marcadores
        const markerLink = document.createElement('link');
        markerLink.rel = 'stylesheet';
        markerLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.4.1/MarkerCluster.css';
        document.head.appendChild(markerLink);
      }

      await initLeafletMap();
    };

    initMap();

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, []);

  // Inicializar mapa de Leaflet
  const initLeafletMap = async () => {
    if (!window.L) return;

    // Obtener ubicación del usuario
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation([latitude, longitude]);
      },
      (err) => {
        console.log('Geolocalización no disponible, usando ubicación por defecto');
        // Coordenadas de Maracaibo por defecto
        setUserLocation([10.6382, -71.6085]);
      }
    );

    // Crear mapa con coordenadas por defecto
    const mapCenter = userLocation || [10.6382, -71.6085];
    
    const map = window.L.map(mapRef.current, {
      center: mapCenter,
      zoom: 13,
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: true,
    });

    // Capa base OSM
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Agregar marcador de ubicación del usuario
    if (userLocation) {
      window.L.marker(userLocation, {
        title: 'Tu ubicación',
        icon: window.L.divIcon({
          html: '<div class="user-location-marker"></div>',
          className: '',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        })
      }).addTo(map);
    }

    setMapInstance(map);
  };

  // Renderizar incidentes en el mapa
  useEffect(() => {
    if (mapInstance && incidents.length > 0) {
      incidents.forEach(incident => {
        if (incident.geometry && incident.geometry.coordinates) {
          const [lng, lat] = incident.geometry.coordinates;
          const marker = window.L.marker([lat, lng], {
            icon: getSeverityIcon(incident)
          }).addTo(mapInstance);

          marker.on('click', () => setSelectedIncident(incident));
        }
      });
    }
  }, [mapInstance, incidents]);

  // Obtener icono de severidad basado en antigüedad (sin emojis)
  const getSeverityIcon = (incident) => {
    const days = incident.properties?.severity_days || 0;
    let severityClass;
    let label;

    if (days <= 15) {
      severityClass = 'severity-green';
      label = 'Reciente';
    } else if (days <= 45) {
      severityClass = 'severity-yellow';
      label = 'En espera';
    } else {
      severityClass = 'severity-red';
      label = 'Crítico';
    }

    return window.L.divIcon({
      html: `<div class="incident-marker ${severityClass}" title="${label}">${days}d</div>`,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
  };

  // Iniciar cámara para captura obligatoria
  const startCamera = async () => {
    try {
      setShowCameraModal(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      setCameraStream(stream);
    } catch (err) {
      alert('No se pudo acceder a la cámara. Por favor permite el acceso a la cámara para ReportaYa.');
    }
  };

  // Capturar foto desde la cámara
  const capturePhoto = async () => {
    if (!cameraStream) return;

    const video = document.getElementById('camera-preview');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    // Convertir a base64
    const photoData = canvas.toDataURL('image/jpeg', 0.8);
    setPhotoPreview(photoData);
    setShowCameraModal(false);

    // Detener la cámara
    cameraStream.getTracks().forEach(track => track.stop());
    setCameraStream(null);
  };

  // Enviar reporte con foto
  const handleSubmitReport = async () => {
    if (!photoPreview || !description || !category) {
      alert('Completa todos los campos y capta una foto con la cámara.');
      return;
    }

    setIsProcessing(true);
    
    const payload = {
      category,
      description,
      latitude: userLocation?.[0],
      longitude: userLocation?.[1],
      photo_url: photoPreview,
    };

    try {
      await onReportSubmit(payload);
      setShowCameraModal(false);
      setShowReportModal(false);
      setPhotoPreview(null);
      setDescription('');
      setCategory('');
      alert('¡Reporte enviado correctamente! Será moderado antes de aparecer en el mapa.');
    } catch (err) {
      alert('Error al enviar el reporte. Inténtalo de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Calcular distancia para geofencing 200m
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Validar reporte (geofencing 200m)
  const handleValidation = async (isConfirmed) => {
    if (!selectedIncident || !userLocation) return;

    const distance = calculateDistance(
      userLocation[0], userLocation[1],
      selectedIncident.geometry.coordinates[1],
      selectedIncident.geometry.coordinates[0]
    );

    if (distance > 200) {
      alert('Debes estar a menos de 200 metros del reporte para validarlo.');
      return;
    }

    try {
      await fetch('/api/v1/incidents/' + selectedIncident.properties.id + '/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_confirmed: isConfirmed,
          latitude: userLocation[0],
          longitude: userLocation[1]
        })
      });
      alert('¡Validación registrada!');
      setSelectedIncident(null);
    } catch (err) {
      alert('Error al validar el reporte.');
    }
  };

  return (
    <div className="reporta-map">
      {/* Mapa */}
      <div ref={mapRef} className="map-container"></div>

      {/* Botón flotante de reporte */}
      <button 
        className="report-fab"
        onClick={startCamera}
        title="Reportar un problema"
      >
        <span className="fab-icon">!</span>
        <span className="fab-text">Reportar</span>
      </button>

      {/* Modal de cámara (captura obligatoria) */}
      {showCameraModal && (
        <div className="modal-overlay">
          <div className="camera-modal">
            {cameraStream && (
              <>
                <video 
                  id="camera-preview"
                  autoPlay
                  playsInline
                  muted
                  className="camera-preview"
                />
                <div className="camera-controls">
                  <button 
                    className="btn btn-primary"
                    onClick={capturePhoto}
                  >
                    Capturar foto
                  </button>
                  <button 
                    className="btn btn-outline"
                    onClick={() => setShowCameraModal(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de detalles del reporte */}
      {selectedIncident && (
        <div className="modal-overlay" onClick={() => setSelectedIncident(null)}>
          <div className="incident-card-modal" onClick={e => e.stopPropagation()}>
            <div className="incident-header">
              <span className={`status-chip ${getStatusClass(selectedIncident.properties.status)}`}>
                {selectedIncident.properties.status}
              </span>
              {selectedIncident.properties.severity_days !== undefined && (
                <span className={`severity-badge ${getSeverityClass(selectedIncident.properties.severity_days)}`}>
                  {selectedIncident.properties.severity_days} días
                </span>
              )}
            </div>

            <div className="incident-body">
              <h3>{selectedIncident.properties.description || 'Sin descripción'}</h3>
              <p className="incident-category">{getCategoryLabel(selectedIncident.properties.category)}</p>
              <p className="incident-date">
                Reportado: {new Date(selectedIncident.properties.created_at).toLocaleString()}
              </p>

              {selectedIncident.properties.photo_url && (
                <img 
                  src={selectedIncident.properties.photo_url} 
                  alt="Foto del incidente"
                  className="incident-photo"
                />
              )}

              <div className="validation-controls">
                <p>¿Estás cerca de este reporte? Confirma si sigue ahí:</p>
                <div className="flex flex-gap">
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => handleValidation(true)}
                  >
                    Confirmo
                  </button>
                  <button 
                    className="btn btn-red btn-sm"
                    onClick={() => handleValidation(false)}
                  >
                    Ya no existe
                  </button>
                  <button 
                    className="btn btn-outline btn-sm"
                    onClick={() => setShowReportModal(true)}
                  >
                    Denunciar inapropiado
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de reporte con foto */}
      {showReportModal && photoPreview && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="report-modal" onClick={e => e.stopPropagation()}>
            <h3>Nuevo reporte</h3>
            
            <div className="form-group">
              <label>Categoría</label>
              <select 
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Selecciona una categoría</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Descripción</label>
              <textarea 
                className="input"
                rows="3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe el problema..."
              />
            </div>

            {photoPreview && (
              <img src={photoPreview} alt="Vista previa" className="preview-photo" />
            )}

            <div className="modal-actions">
              <button 
                className="btn btn-primary"
                disabled={isProcessing}
                onClick={handleSubmitReport}
              >
                {isProcessing ? 'Enviando...' : 'Enviar reporte'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentMap;

// Helper functions
function getSeverityClass(days) {
  if (days <= 15) return 'severity-green';
  if (days <= 45) return 'severity-yellow';
  return 'severity-red';
}

function getStatusClass(status) {
  const classes = {
    'pendiente': 'status-pending',
    'confirmado': 'status-confirmed',
    'en_inspeccion': 'status-in-progress',
    'en_reparacion': 'status-in-repair',
    'solucionado': 'status-solved',
    'rechazado': 'status-rejected'
  };
  return classes[status] || 'status-pending';
}

function getCategoryLabel(category) {
  const labels = {
    'vialidad_alcantarillado': 'Vialidad y Alcantarillado',
    'aseo_urbano': 'Aseo Urbano',
    'alumbrado_publico': 'Alumbrado Público'
  };
  return labels[category] || category;
}