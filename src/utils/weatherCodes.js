'use strict';

/**
 * Maps WMO weather interpretation codes (used by Open-Meteo)
 * to a human label, an icon and a UI theme.
 */
const CODES = {
  0: { label: 'Clear sky', day: '☀️', night: '🌙', theme: 'clear' },
  1: { label: 'Mainly clear', day: '🌤️', night: '🌙', theme: 'clear' },
  2: { label: 'Partly cloudy', day: '⛅', night: '☁️', theme: 'cloudy' },
  3: { label: 'Overcast', day: '☁️', night: '☁️', theme: 'cloudy' },
  45: { label: 'Fog', day: '🌫️', night: '🌫️', theme: 'fog' },
  48: { label: 'Rime fog', day: '🌫️', night: '🌫️', theme: 'fog' },
  51: { label: 'Light drizzle', day: '🌦️', night: '🌧️', theme: 'rain' },
  53: { label: 'Moderate drizzle', day: '🌦️', night: '🌧️', theme: 'rain' },
  55: { label: 'Dense drizzle', day: '🌧️', night: '🌧️', theme: 'rain' },
  56: { label: 'Freezing drizzle', day: '🌧️', night: '🌧️', theme: 'rain' },
  57: { label: 'Heavy freezing drizzle', day: '🌧️', night: '🌧️', theme: 'rain' },
  61: { label: 'Light rain', day: '🌦️', night: '🌧️', theme: 'rain' },
  63: { label: 'Moderate rain', day: '🌧️', night: '🌧️', theme: 'rain' },
  65: { label: 'Heavy rain', day: '🌧️', night: '🌧️', theme: 'rain' },
  66: { label: 'Freezing rain', day: '🌧️', night: '🌧️', theme: 'rain' },
  67: { label: 'Heavy freezing rain', day: '🌧️', night: '🌧️', theme: 'rain' },
  71: { label: 'Light snow', day: '🌨️', night: '🌨️', theme: 'snow' },
  73: { label: 'Moderate snow', day: '🌨️', night: '🌨️', theme: 'snow' },
  75: { label: 'Heavy snow', day: '❄️', night: '❄️', theme: 'snow' },
  77: { label: 'Snow grains', day: '❄️', night: '❄️', theme: 'snow' },
  80: { label: 'Light rain showers', day: '🌦️', night: '🌧️', theme: 'rain' },
  81: { label: 'Rain showers', day: '🌧️', night: '🌧️', theme: 'rain' },
  82: { label: 'Violent rain showers', day: '⛈️', night: '⛈️', theme: 'storm' },
  85: { label: 'Light snow showers', day: '🌨️', night: '🌨️', theme: 'snow' },
  86: { label: 'Heavy snow showers', day: '❄️', night: '❄️', theme: 'snow' },
  95: { label: 'Thunderstorm', day: '⛈️', night: '⛈️', theme: 'storm' },
  96: { label: 'Thunderstorm with hail', day: '⛈️', night: '⛈️', theme: 'storm' },
  99: { label: 'Severe thunderstorm with hail', day: '⛈️', night: '⛈️', theme: 'storm' },
};

const UNKNOWN = { label: 'Unknown', day: '🌡️', night: '🌡️', theme: 'cloudy' };

function describe(code, isDay = true) {
  const entry = CODES[code] || UNKNOWN;
  let theme = entry.theme;
  if (theme === 'clear') theme = isDay ? 'clear-day' : 'clear-night';
  return {
    code,
    label: entry.label,
    icon: isDay ? entry.day : entry.night,
    theme,
  };
}

module.exports = { describe };
