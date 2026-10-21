"use client";

import { useQuery } from "@tanstack/react-query";

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

/**
 * shortcut: maps a WMO weather code to one of this app's fixed weather_category names
 * (Clear, Partly cloudy, Overcast, Light rain, Heavy rain, Thunderstorm, Fog, Windy,
 * Dust / haze, Extreme heat). There is no snow category since projects run in Kenya; upgrade
 * this if that ever changes. Temperature/wind overrides take priority over the sky code,
 * since "extreme heat" and "windy" are observed conditions rather than WMO codes.
 */
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
