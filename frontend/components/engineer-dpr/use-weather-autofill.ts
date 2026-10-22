"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportError } from "@/lib/toast";
import { useWeatherCategories } from "./use-dpr-wizard-data";
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
export function useCurrentWeather(lat: number | null, lng: number | null) {
  return useQuery({
    queryKey: ["open-meteo", lat, lng],
    queryFn: async (): Promise<CurrentWeather> => {
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
    },
    enabled: lat !== null && lng !== null,
    staleTime: 10 * 60_000,
    retry: 1,
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
 * Fills in whichever of weather/temp/humidity/wind the draft is still missing, from the live
 * forecast for the project's site — once per mount, and only the fields that are actually
 * empty, so a DPR that already has some of these (its own saved reading, or a partial manual
 * entry) never gets a field overwritten. Shared by the new and edit wizards: a resumed draft
 * missing weather because it was started before the location loaded (or saved before this
 * feature existed) gets it filled in just the same as a brand-new one.
 */
export function useAutofillWeather(
  project: { site_lat: number | null; site_lng: number | null } | null | undefined,
  draft: Pick<DprDraftInput, "weather_category_id" | "temp_min_c" | "temp_max_c" | "humidity_pct" | "wind">,
  update: (patch: Partial<DprDraftInput>) => void,
  enabled: boolean,
) {
  const { data: weather } = useCurrentWeather(project?.site_lat ?? null, project?.site_lng ?? null);
  const { data: weatherCategories } = useWeatherCategories();
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current || !enabled || !weather || !weatherCategories?.length) return;
    const full = buildWeatherPatch(weather, weatherCategories);
    const patch: Partial<DprDraftInput> = {};
    if (draft.weather_category_id === null) patch.weather_category_id = full.weather_category_id;
    if (draft.temp_min_c === null) patch.temp_min_c = full.temp_min_c;
    if (draft.temp_max_c === null) patch.temp_max_c = full.temp_max_c;
    if (draft.humidity_pct === null) patch.humidity_pct = full.humidity_pct;
    if (draft.wind === null) patch.wind = full.wind;
    applied.current = true;
    if (Object.keys(patch).length > 0) update(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weather, weatherCategories, enabled]);
}

/**
 * The "Auto" weather option: fetches the live forecast for the project's site and fills
 * weather/temp/humidity/wind — overwriting whatever's there, since picking it is an explicit
 * request to replace the reading, unlike the passive fill-if-missing above.
 */
export function useAutoWeatherFill(
  project: { site_lat: number | null; site_lng: number | null } | null | undefined,
  update: (patch: Partial<DprDraftInput>) => void,
) {
  const hasCoords = project?.site_lat != null && project?.site_lng != null;
  const { data: weather, isFetching, refetch } = useCurrentWeather(
    project?.site_lat ?? null,
    project?.site_lng ?? null,
  );
  const { data: weatherCategories } = useWeatherCategories();

  async function fill() {
    if (!hasCoords) {
      reportError("This project has no site location set, so weather can't be looked up.");
      return;
    }
    const result = weather ? { data: weather } : await refetch();
    if (!result.data || !weatherCategories?.length) {
      reportError("Could not load today's weather");
      return;
    }
    update(buildWeatherPatch(result.data, weatherCategories));
  }

  return { fill, loading: isFetching, hasCoords };
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
