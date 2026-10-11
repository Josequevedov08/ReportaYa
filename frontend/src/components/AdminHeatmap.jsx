import { useEffect, useState, useRef } from "react";
import L from "leaflet";
import "leaflet.heat";
import "leaflet/dist/leaflet.css";
import { apiReportar } from "../services/api";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9/dist/images/marker-shadow.png",
});

interface AdminIncident {
  id: string;
  category: string;
  status: string;
  severity_days: number;
  created_at: string;
  location: { type: "Point"; coordinates: [number, number] };
  photo_url?: string;
  closure_photo_url?: string;
  validation_count: number;
}

interface HeatmapProps {
  incidents: AdminIncident[];
}

export default function AdminHeatmap({ incidents }: HeatmapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const heatRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map("admin-map", {
        center: [10.6388, -71.6583],
        zoom: 13,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
        maxZoom: 18,
      }).addTo(mapRef.current);
    }

    const heatData = incidents.map((inc) => {
      const [lng, lat] = inc.location.coordinates;
      const intensity = inc.severity_days > 45 ? 1 : inc.severity_days > 15 ? 0.7 : 0.4;
      return [lat, lng, intensity];
    });

    if (heatRef.current) {
      (mapRef.current as any).removeLayer(heatRef.current);
    }

    // @ts-ignore
    heatRef.current = (L as any).heatLayer(heatData, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
    }).addTo(mapRef.current!);

    return () => {};
  }, [incidents]);

  return <div id="admin-map" style={{ height: "500px", borderRadius: "8px", border: "1px solid #e5e7eb" }}></div>;
}
