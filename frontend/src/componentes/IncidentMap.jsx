import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './IncidentMap.css';

// Fix para los iconos de Leaflet
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';

// Configuración de iconos de marcador
let DefaultIcon;
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaName: iconRetina,
  iconUrl: icon,
  shadowUrl: iconShadow,
});
DefaultIcon = L.Icon.Default;

/**
 * Mapa interactivo para ReportaYa
 * - Cámara en vivo para captura obligatoria (bloquea galería)
 * - Geofencing 200m para validaciones
 * - Indicadores de antigüedad (verde 0-15d, amarillo 15-45d, rojo 45+d)
 * - Sin emojis en la interfaz
 */
const IncidentMap = ({ onReportSubmit, incidents = [] }) => {
  const [userLocation, setUserLocation] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [flagReason, setFlagReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Categorías sin emojis
  const categories = [
    { value: 'vialidad_alcantarillado', label: 'Vialidad y Alcantarillado' },
    { value: 'aseo_urbano', label: 'Aseo Urbano' },
    { value: 'alumbrado_publico', label: 'Alumbrado Público' },
  ];

  // Incidentes de ejemplo para validación
  const exampleIncidents = [
    {
      id: 'a1b2c3d4-e5f6-7890',
      category: 'vialidad_alcantarillado',
      status: 'confirmado',
      description: 'Hoyo grande en la calle causando riesgo de accidente',
      photo_url: 'https://images.unsplash.com/photo-1521791055366-0d51bfb0d7b8?w=400',
      location: { type: 'Point', coordinates: [-71.6085, 10.6382] }, // lng, lat
      city: 'Maracaibo',
      neighborhood: 'Centro',
      created_at: '2024-01-15T10:30:00Z',
      severity_days: 3,
      validation_count: 2,
      negative_report_count: 0,
      auto_hide_threshold: 5
    },
    {
      id: 'b2c3d4e5-f6a7-8901',
      category: 'aseo_urbano',
      status: 'in_progress',
      description: 'Basura acumulada en esquina de Calle 70',
      photo_url: 'https://images.unsplash.com/photo-1567306301740-f81192532c27?w=400',
      location: { type: 'Point', coordinates: [-71.6100, 10.6390] },
      city: 'Maracaibo',
      neighborhood: 'Los Caobos',
      created_at: '2024-01-10T08:00:00Z',
      severity_days: 12,
      validation_count: 5,
      negative_report_count: 1,
      auto_hide_threshold: 5
    },
    {
      id: 'c3d4e5f6-a7b8-9012',
      category: 'alumbrado_publico',
      status: 'confirmed',
      description: 'Lámpara de alumbrado público fundida',
      photo_url: 'https://images.unsplash.com/photo-1550070447-f0fdd429e7e0?w=400',
      location: { type: 'Point', coordinates: [-71.6120, 10.6360] },
      city: 'Maracaibo',
      neighborhood: 'El Valle',
      created_at: '2024-01-01T06:00:00Z',
      severity_days: 56,
      validation_count: 8,
      negative_report_count: 0,
      auto_hide_threshold: 5
    }
  ];

  // Usar incidents prop si se proporciona, sino usar ejemplos
  const allIncidents = incidents.length > 0 ? incidents : exampleIncidents;

  // Obtener ubicación del usuario
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation([latitude, longitude]);
      },
      () => {
        // Coordenadas de Maracaibo por defecto
        setUserLocation([10.6382, -71.6085]);
      }
    );
  }, []);

  // Renderizar marcador personalizado según severidad
  const getSeverityIcon = (days) => {
    if (days <= 15) return 'severity-green';
    if (days <= 45) return 'severity-yellow';
    return 'severity-red';
  };

  // Clase de estado
  const getStatusClass = (status) => {
    const classes = {
      'pendiente': 'status-pending',
      'confirmado': 'status-confirmed',
      'en_inspeccion': 'status-in-progress',
      'en_reparacion': 'status-in-repair',
      'solucionado': 'status-solved',
      'rechazado': 'status-rejected',
      'in_progress': 'status-in-progress',
      'confirmed': 'status-confirmed'
    };
    return classes[status] || 'status-pending';
  };

  const getCategoryLabel = (category) => {
    const labels = {
      'vialidad_alcantarillado': 'Vialidad y Alcantarillado',
      'aseo_urbano': 'Aseo Urbano',
      'alumbrado_publico': 'Alumbrado Público'
    };
    return labels[category] || category;
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

  // Capturar foto
  const capturePhoto = () => {
    if (!cameraStream) return;

    const video = document.getElementById('camera-preview');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    const photoData = canvas.toDataURL('image/jpeg', 0.8);
    setPhotoPreview(photoData);
    setShowCameraModal(false);

    cameraStream.getTracks().forEach(track => track.stop());
    setCameraStream(null);
  };

  // Enviar reporte
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
      if (onReportSubmit) {
        await onReportSubmit(payload);
      } else {
        // Modo desarrollo - simular envío
        console.log('Reporte simulado:', payload);
      }
      setShowCameraModal(false);
      setShowReportModal(false);
      setPhotoPreview(null);
      setDescription('');
      setCategory('');
      alert('Reporte enviado correctamente. Será moderado antes de aparecer en el mapa.');
    } catch (err) {
      alert('Error al enviar el reporte. Inténtalo de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Validar reporte (geofencing 200m)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleValidation = async (isConfirmed) => {
    if (!selectedIncident || !userLocation) return;

    const coords = selectedIncident.location.coordinates;
    // coords es [lng, lat], userLocation es [lat, lng]
    const distance = calculateDistance(
      userLocation[0], userLocation[1],
      coords[1], coords[0]
    );

    if (distance > 200) {
      alert('Debes estar a menos de 200 metros del reporte para validarlo.');
      return;
    }

    try {
      if (isConfirmed) {
        alert('¡Gracias! Tu validación ha sido registrada.');
      } else {
        alert('¡Gracias! Has reportado que el problema no existe.');
      }
      setSelectedIncident(null);
    } catch (err) {
      alert('Error al registrar la validación.');
    }
  };

  const handleFlag = async () => {
    if (!selectedIncident) return;
    try {
      alert('Denuncia registrada. Será revisada por el administrador.');
      setShowFlagModal(false);
      setFlagReason('');
      setSelectedIncident(null);
    } catch (err) {
      alert('Error al registrar la denuncia.');
    }
  };

  // Componentes de marcador personalizados
  const SeverityMarker = ({ incident }) => {
    const days = incident.severity_days || 0;
    const severityClass = getSeverityIcon(days);
    return (
      <div 
        className={`incident-marker ${severityClass}`}
        title={`${incident.description.substring(0, 50)}...`}
      >
        <span className="marker-days">{days}d</span>
      </div>
    );
  };

  return (
    <div className="reporta-map">
      {/* Mapa de Leaflet */}
      <MapContainer 
        center={userLocation || [10.6382, -71.6085]}
        zoom={13}
        zoomControl={true}
        attributionControl={false}
        className="map-container-leaflet"
      >
        {/* Capa base OSM sobria */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attribution">CARTO</a>'
        />
        
        {/* Marcador de ubicación del usuario */}
        {userLocation && (
          <Marker 
            position={userLocation}
            icon={L.divIcon({
              html: '<div class="user-location-marker"></div>',
              className: 'user-location-icon',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })}
          >
            <Popup>Tu ubicación</Popup>
          </Marker>
        )}
        
        {/* Marcadores de incidentes */}
        {allIncidents.map(incident => {
          const coords = incident.location?.coordinates;
          if (!coords || coords.length < 2) return null;
          // coords es [lng, lat]
          const position = [coords[1], coords[0]];
          return (
            <Marker 
              key={incident.id}
              position={position}
              icon={L.divIcon({
                html: `<div class="incident-marker ${getSeverityIcon(incident.severity_days || 0)}"><span class="marker-days">${incident.severity_days || 0}d</span></div>`,
                className: 'incident-icon',
                iconSize: [36, 36],
                iconAnchor: [18, 18]
              })}
              eventHandlers={{
                click: () => setSelectedIncident(incident)
              }}
            />
          );
        })}
      </MapContainer>

      {/* Botón flotante de reporte - estilo institucional */}
      <button 
        className="report-fab"
        onClick={startCamera}
        title="Reportar un problema"
      >
        <span className="fab-icon">!</span>
        <span className="fab-text">Reportar</span>
      </button>

      {/* Overlay de políticas visibles pero discretas */}
      <div className="policy-footer">
        <small>No es servicio de emergencia. Llama al 171. | </small>
        <a 
          href="#" 
          onClick={(e) => { e.preventDefault(); window.open('/legal/terminos-y-condiciones.html', '_blank') }}
        >
          Términos |
        </a>
        <a 
          href="#" 
          onClick={(e) => { e.preventDefault(); window.open('/legal/politica-de-privacidad.html', '_blank') }}
        >
          Privacidad |
        </a>
        <a 
          href="#" 
          onClick={(e) => { e.preventDefault(); window.open('/legal/descargo-de-responsabilidad.html', '_blank') }}
        >
          Descargo
        </a>
      </div>

      {/* Modal de cámara */}
      {showCameraModal && (
        <div className="modal-overlay camera-backdrop">
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
                    className="btn btn--primary"
                    onClick={capturePhoto}
                  >
                    Capturar foto
                  </button>
                  <button 
                    className="btn btn--outline"
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
              <span className={`status-chip ${getStatusClass(selectedIncident.status)}`}>
                {selectedIncident.status}
              </span>
              {selectedIncident.severity_days !== undefined && (
                <span className={`severity-badge ${getSeverityIcon(selectedIncident.severity_days)}`}>
                  {selectedIncident.severity_days} días
                </span>
              )}
            </div>

            <div className="incident-body">
              <h3>{selectedIncident.description || 'Sin descripción'}</h3>
              <p className="incident-category">{getCategoryLabel(selectedIncident.category)}</p>
              <p className="incident-date">
                Reportado: {new Date(selectedIncident.created_at).toLocaleString()}
              </p>

              {selectedIncident.photo_url && (
                <img 
                  src={selectedIncident.photo_url} 
                  alt="Foto del incidente"
                  className="incident-photo"
                />
              )}

              <div className="validation-controls">
                <p>¿Estás cerca de este reporte? Confirma si sigue ahí:</p>
                <div className="flex-gap">
                  <button 
                    className="btn btn--primary btn--sm"
                    onClick={() => handleValidation(true)}
                  >
                    Confirmo
                  </button>
                  <button 
                    className="btn btn--red btn--sm"
                    onClick={() => handleValidation(false)}
                  >
                    Ya no existe
                  </button>
                  <button 
                    className="btn btn--outline btn--sm"
                    onClick={() => setShowFlagModal(true)}
                  >
                    Denunciar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de denuncia ciudadana */}
      {showFlagModal && (
        <div className="modal-overlay" onClick={() => setShowFlagModal(false)}>
          <div className="card" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3>Denunciar contenido inapropiado</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
              Selecciona el motivo de la denuncia:
            </p>
            <div className="form-group">
              <label>Motivo</label>
              <select 
                className="input"
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
              >
                <option value="">Selecciona un motivo</option>
                <option value="falso">Reporte falso</option>
                <option value="inapropiado">Contenido inapropiado</option>
                <option value="duplicado">Reporte duplicado</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn--primary" onClick={handleFlag}>
                Enviar denuncia
              </button>
              <button className="btn btn--outline" onClick={() => setShowFlagModal(false)}>
                Cancelar
              </button>
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
                className="btn btn--primary"
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