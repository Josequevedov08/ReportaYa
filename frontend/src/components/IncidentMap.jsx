import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9/dist/images/marker-shadow.png",
});

interface IncidentMapProps {
  incidents: any[];
  onIncidentClick?: (incident: any) => void;
  userLocation?: { lat: number; lng: number } | null;
  validationLocation?: { lat: number; lng: number } | null;
  validationRadiusM?: number;
}

export default function IncidentMap({
  incidents,
  onIncidentClick,
  userLocation,
  validationLocation,
  validationRadiusM = 200,
}: IncidentMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const circlesRef = useRef<L.Circle[]>([]);

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map("incident-map", {
        center: [10.6388, -71.6583],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
        maxZoom: 18,
        tileSize: 512,
        zoomSnap: 0.25,
      }).addTo(mapRef.current);
      L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);
    }

    markersRef.current.forEach((m) => mapRef.current?.removeLayer(m));
    markersRef.current = [];

    incidents.forEach((inc) => {
      const coords = inc.location?.coordinates || [0, 0];
      const marker = L.marker([coords[1], coords[0]], {
        title: inc.category,
      }).addTo(mapRef.current!);
      marker.bindPopup(`
        <div class="popup">
          <strong>${inc.category.replace(/_/g, " ").toUpperCase()}</strong>
          <p>${inc.description || "Sin descripcion"}</p>
          <small>${new Date(inc.created_at).toLocaleDateString()}</small>
        </div>
      `);
      if (onIncidentClick) {
        marker.on("click", () => onIncidentClick(inc));
      }
      markersRef.current.push(marker);
    });

    circlesRef.current.forEach((c) => mapRef.current?.removeLayer(c));
    circlesRef.current = [];

    if (validationLocation) {
      const circle = L.circle([validationLocation.lat, validationLocation.lng], {
        color: "#2563eb",
        fillColor: "#2563eb",
        fillOpacity: 0.1,
        radius: validationRadiusM,
      }).addTo(mapRef.current!);
      circlesRef.current.push(circle);

      L.marker([validationLocation.lat, validationLocation.lng], {
        icon: L.divIcon({
          className: "user-location-marker",
          html: "<div class='user-dot'></div>",
          iconSize: [20, 20],
        }),
      }).addTo(mapRef.current!);
    }

    return () => {};
  }, [incidents, onIncidentClick, userLocation, validationLocation, validationRadiusM]);

  return <div id="incident-map" className="incident-map"></div>;
}
