export type IncidentCategory = "vialidad_alcantarillado" | "aseo_urbano" | "alumbrado_publico";
export type IncidentStatus = "pendiente" | "en_inspeccion" | "en_reparacion" | "solucionado" | "rechazado";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Incident {
  id: string;
  category: IncidentCategory;
  status: IncidentStatus;
  description?: string | null;
  photo_url?: string | null;
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  city?: string | null;
  neighborhood?: string | null;
  created_at: string;
  updated_at: string;
  severity_days: number;
  validation_count: number;
}

export interface CategoryOption {
  value: IncidentCategory;
  label: string;
  icon: string;
  color: string;
}

export const CATEGORIES: CategoryOption[] = [
  { value: "vialidad_alcantarillado", label: "Vialidad y Alcantarillado", icon: "road", color: "#2563eb" },
  { value: "aseo_urbano", label: "Aseo Urbano", icon: "cleanup", color: "#16a34a" },
  { value: "alumbrado_publico", label: "Alumbrado Publico", icon: "light", color: "#ca8a04" },
];

export const SEVERITY_COLORS = {
  reciente: "#16a34a",
  en_espera: "#ca8a04",
  critico: "#dc2626",
};

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  pendiente: "Pendiente",
  en_inspeccion: "En Inspeccion",
  en_reparacion: "En Reparacion",
  solucionado: "Solucionado",
  rechazado: "Rechazado",
};

export const getSeverityLabel = (days: number): "reciente" | "en_espera" | "critico" => {
  if (days <= 15) return "reciente";
  if (days <= 45) return "en_espera";
  return "critico";
};
