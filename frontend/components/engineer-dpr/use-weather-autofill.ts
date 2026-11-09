"use client";

import { useState } from "react";
import { reportError } from "@/lib/toast";
import { api } from "@/lib/api-client";
import { useWeatherCategories } from "./use-dpr-wizard-data";
import { useProjectDetail } from "@/components/project-overview/use-project-data";
import type { DprDraftInput } from "./types";

export interface CurrentWeather {
  temp_min_c: number;
  temp_max_c: number;
  humidity_pct: number;
  wind_kph: number;
  wind_direction_deg: number;
  weather_code: number;
}

/** Open-Meteo: free, no API key, CORS-enabled for direct browser calls. */
async function fetchCurrentWeather(lat: number, lng: number): Promise<CurrentWeather> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not load today's weather");
  const data = await res.json();
  return {
    temp_min_c: data.daily.temperature_2m_min[0],
    temp_max_c: data.daily.temperature_2m_max[0],
    humidity_pct: data.current.relative_humidity_2m,
    wind_kph: data.current.wind_speed_10m,
    wind_direction_deg: data.current.wind_direction_10m,
    weather_code: data.current.weather_code,
  };
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not supported on this device"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10_000 });
  });
}

const COMPASS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];

export function compassDirection(deg: number): string {
  return COMPASS[Math.round(deg / 22.5) % 16];
}

type WeatherCategoryOption = { weather_category_id: number; name: string };

/** The full weather/temp/humidity/wind patch for a live forecast reading — every field,
 *  regardless of what the draft already has. */
function buildWeatherPatch(
  weather: CurrentWeather,
  weatherCategories: WeatherCategoryOption[],
): Partial<DprDraftInput> {
  const categoryName = weatherCategoryName(weather.weather_code, weather.temp_max_c, weather.wind_kph);
  const category = weatherCategories.find((c) => c.name === categoryName);
  return {
    weather_category_id: category?.weather_category_id ?? null,
    temp_min_c: Math.round(weather.temp_min_c),
    temp_max_c: Math.round(weather.temp_max_c),
    humidity_pct: Math.round(weather.humidity_pct),
    wind: `${Math.round(weather.wind_kph)} km/h ${compassDirection(weather.wind_direction_deg)}`,
  };
}

/**
 * The "Auto" weather option: on click, uses the project's stored site coordinates if set;
 * otherwise falls back to the engineer's current device location, and fills
 * weather/temp/humidity/wind from the live forecast there.
 */
export function useAutoWeatherFill(
  update: (patch: Partial<DprDraftInput>) => void,
  projectId?: string,
) {
  const [loading, setLoading] = useState(false);
  const { data: weatherCategories } = useWeatherCategories();
  const { data: projectData } = useProjectDetail(projectId ?? "");

  async function fill() {
    setLoading(true);
    try {
      let lat: number | null = null;
      let lng: number | null = null;

      let pLat = projectData?.project?.site_lat;
      let pLng = projectData?.project?.site_lng;

      // If not yet available from the hook cache, attempt a direct fetch if projectId was supplied
      if ((pLat === undefined || pLng === undefined) && projectId) {
        try {
          const res = await api.get<{
            project: { site_lat: number | null; site_lng: number | null };
          }>(`/projects/${projectId}`);
          if (res.status === "success" && res.data?.project) {
            pLat = res.data.project.site_lat;
            pLng = res.data.project.site_lng;
          }
        } catch {
          // ignore error and proceed to device location fallback
        }
      }

      if (
        typeof pLat === "number" &&
        !isNaN(pLat) &&
        typeof pLng === "number" &&
        !isNaN(pLng)
      ) {
        lat = pLat;
        lng = pLng;
      } else {
        const position = await getCurrentPosition();
        lat = position.coords.latitude;
        lng = position.coords.longitude;
      }

      const weather = await fetchCurrentWeather(lat, lng);
      if (!weatherCategories?.length) {
        reportError("Could not load today's weather");
        return;
      }
      update(buildWeatherPatch(weather, weatherCategories));
    } catch (err) {
      reportError(err instanceof Error ? err.message : "Could not load today's weather");
    } finally {
      setLoading(false);
    }
  }

  return { fill, loading };
}

export function weatherCategoryName(code: number, tempC: number, windKph: number): string {
  if (tempC >= 35) return "Extreme heat";
  if (windKph >= 30) return "Windy";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  if ([65, 66, 67, 71, 73, 75, 77, 82, 85, 86].includes(code)) return "Heavy rain";
  if ([51, 53, 55, 56, 57, 61, 63, 80, 81].includes(code)) return "Light rain";
  if ([45, 48].includes(code)) return "Fog";
  if (code === 3) return "Overcast";
  if (code === 1 || code === 2) return "Partly cloudy";
  return "Clear";
}
