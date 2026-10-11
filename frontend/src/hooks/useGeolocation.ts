import { useState, useEffect, useCallback } from "react";

interface GeolocationState {
  location: GeolocationPosition | null;
  error: string | null;
  requestLocation: () => void;
  isLoading: boolean;
}

interface ExtendedGeolocationPosition extends GeolocationPosition {
  city?: string;
  neighborhood?: string;
}

const CACHE_TTL = 5 * 60 * 1000;

export function useGeolocation(): GeolocationState {
  const [location, setLocation] = useState<ExtendedGeolocationPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getCachedLocation = useCallback(() => {
    try {
      const cached = localStorage.getItem("geocache");
      if (!cached) return null;
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_TTL) {
        return parsed.position;
      }
    } catch {}
    return null;
  }, []);

  const resolveCity = async (lat: number, lng: number) => {
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
        { headers: { "User-Agent": "ReportaYa/1.0" } }
      );
      const data = await resp.json();
      return {
        city: data.address?.city || data.address?.town || data.address?.village || "Maracaibo",
        neighborhood: data.address?.suburb || data.address?.neighbourhood || "",
      };
    } catch {
      return { city: "Maracaibo", neighborhood: "" };
    }
  };

  const requestLocation = useCallback(() => {
    setIsLoading(true);
    setError(null);

    const cached = getCachedLocation();
    if (cached) {
      setLocation(cached);
      setIsLoading(false);
      return;
    }

    if (!navigator.geolocation) {
      setError("Geolocalizacion no disponible en este navegador");
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const geo = await resolveCity(pos.coords.latitude, pos.coords.longitude);
        const extended = { ...pos, city: geo.city, neighborhood: geo.neighborhood };
        setLocation(extended);
        localStorage.setItem("geocache", JSON.stringify({
          position: extended,
          timestamp: Date.now(),
        }));
        setIsLoading(false);
      },
      (err) => {
        setError("Permiso de ubicacion denegado. Activa el GPS para reportar.");
        setIsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [getCachedLocation]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return { location, error, requestLocation, isLoading };
}
