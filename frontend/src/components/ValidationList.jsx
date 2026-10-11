import { useState, useEffect } from "react";
import { useGeolocation } from "../hooks/useGeolocation";
import { apiReportar } from "../services/api";
import { Incident } from "../types";
import IncidentMap from "./IncidentMap";
import { getSeverityLabel, SEVERITY_COLORS, STATUS_LABELS } from "../types";

const VALIDATION_RADIUS_M = 200;

interface ValidationListProps {
  incidentId: string;
}

export default function ValidationList({ incidentId }: ValidationListProps) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const { location: userLocation, error: geoError, requestLocation } = useGeolocation();

  useEffect(() => {
    apiReportar.getIncident(incidentId)
      .then(setIncident)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [incidentId]);

  useEffect(() => {
    if (!userLocation) {
      requestLocation();
    }
  }, [userLocation, requestLocation]);

  const checkValidationPermission = () => {
    if (!incident || !userLocation) return { allowed: false, distance: null };

    const [lng, lat] = incident.location.coordinates;
    const R = 6371000;
    const dLat = (userLocation.latitude - lat) * Math.PI / 180;
    const dLon = (userLocation.longitude - lng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat * Math.PI / 180) * Math.cos(userLocation.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return {
      allowed: distance <= VALIDATION_RADIUS_M,
      distance: Math.round(distance),
    };
  };

  const handleValidate = async (isConfirmed: boolean) => {
    if (!incident) return;

    const { allowed, distance } = checkValidationPermission();
    if (!allowed) {
      setActionStatus(
        `Debes estar a menos de ${VALIDATION_RADIUS_M}m del reporte para validar. ` +
        `Tu distancia actual es ${distance}m.`
      );
      return;
    }

    try {
      await apiReportar.validateIncident(incident.id, {
        is_confirmed: isConfirmed,
        latitude: userLocation!.latitude,
        longitude: userLocation!.longitude,
      });
      setActionStatus(isConfirmed ? "Confirmacion registrada" : "Reporte marcado como no verificado");
      const updated = await apiReportar.getIncident(incidentId);
      setIncident(updated);
    } catch (err: any) {
      setActionStatus(err.message || "Error al validar");
    }
  };

  if (loading) return <div className="validation-list">Cargando...</div>;
  if (error) return <div className="validation-list">Error: {error}</div>;
  if (!incident) return <div className="validation-list">Incidente no encontrado</div>;

  const severity = getSeverityLabel(incident.severity_days);
  const { allowed, distance } = checkValidationPermission();

  return (
    <div className="validation-list">
      <IncidentMap
        incidents={[incident]}
        validationLocation={userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : null}
        validationRadiusM={VALIDATION_RADIUS_M}
      />

      <div className="validation-details">
        <h3>{incident.category.replace(/_/g, " ").toUpperCase()}</h3>
        <span className="severity-badge" style={{ backgroundColor: SEVERITY_COLORS[severity] }}>
          {severity === "reciente" ? "Reciente" : severity === "en_espera" ? "En Espera" : "Critico"}
        </span>
        <p className="diagnosis">
          Registrado el {new Date(incident.created_at).toLocaleDateString()} | {incident.severity_days} dias sin solucion
        </p>
        <p className="validations-count">
          Validaciones: {incident.validation_count}
        </p>

        {geoError && <p className="form-note--error">{geoError}</p>}
        {actionStatus && <p className="action-status">{actionStatus}</p>}

        <div className="validation-actions">
          <button
            onClick={() => handleValidate(true)}
            className="btn btn--primary"
            disabled={!allowed}
            title={!allowed ? `Necesitas estar a ${VALIDATION_RADIUS_M}m del reporte. Actual: ${distance}m` : ""}
          >
            Confirmar falla
          </button>
          <button
            onClick={() => handleValidate(false)}
            className="btn btn--secondary"
            disabled={!allowed}
            title={!allowed ? `Necesitas estar a ${VALIDATION_RADIUS_M}m del reporte. Actual: ${distance}m` : ""}
          >
            Marcar como arreglado
          </button>
        </div>
      </div>
    </div>
  );
}

export { STATUS_LABELS };