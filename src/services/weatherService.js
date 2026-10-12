'use strict';

const config = require('../config');
const TTLCache = require('../utils/cache');
const { AppError } = require('../utils/errors');
const { describe } = require('../utils/weatherCodes');

const cache = new TTLCache(config.cacheTtlMs);

const UNIT_SETS = {
  metric: { temperature_unit: 'celsius', wind_speed_unit: 'kmh', labels: { temp: '°C', wind: 'km/h', precip: 'mm', pressure: 'hPa' } },
  imperial: { temperature_unit: 'fahrenheit', wind_speed_unit: 'mph', labels: { temp: '°F', wind: 'mph', precip: 'mm', pressure: 'hPa' } },
};

const CITY_PATTERN = /^[\p{L}\p{M}\s.,'’\-]+$/u;

/** Fetch JSON with a timeout and friendly error mapping. */
async function fetchJson(url, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new AppError(502, `${label} responded with status ${res.status}`);
    return await res.json();
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err.name === 'AbortError') throw new AppError(504, `${label} timed out. Please try again.`);
    throw new AppError(502, `Unable to reach ${label}. Check your internet connection.`);
  } finally {
    clearTimeout(timer);
  }
}

function validateCity(raw) {
  const city = String(raw || '').trim().replace(/\s+/g, ' ');
  if (city.length < 2 || city.length > 80) {
    throw new AppError(400, 'Please enter a city name between 2 and 80 characters.');
  }
  if (!CITY_PATTERN.test(city)) {
    throw new AppError(400, 'City name contains invalid characters.');
  }
  return city;
}

async function geocode(city) {
  const url = new URL(config.geocodingUrl);
  url.searchParams.set('name', city);
  url.searchParams.set('count', '1');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');

  const data = await fetchJson(url, 'the geocoding service');
  if (!data.results || data.results.length === 0) {
    throw new AppError(404, `No city found matching "${city}". Check the spelling and try again.`);
  }
  const r = data.results[0];
  return {
    name: r.name,
    region: r.admin1 || '',
    country: r.country || '',
    countryCode: r.country_code || '',
    latitude: r.latitude,
    longitude: r.longitude,
  };
}

async function fetchForecast(place, units) {
  const set = UNIT_SETS[units];
  const url = new URL(config.forecastUrl);
  url.searchParams.set('latitude', place.latitude);
  url.searchParams.set('longitude', place.longitude);
  url.searchParams.set(
    'current',
    [
      'temperature_2m', 'relative_humidity_2m', 'apparent_temperature', 'is_day',
      'precipitation', 'weather_code', 'cloud_cover', 'pressure_msl',
      'wind_speed_10m', 'wind_direction_10m',
    ].join(',')
  );
  url.searchParams.set(
    'daily',
    [
      'weather_code', 'temperature_2m_max', 'temperature_2m_min',
      'precipitation_probability_max', 'precipitation_sum', 'sunrise', 'sunset',
      'uv_index_max', 'wind_speed_10m_max',
    ].join(',')
  );
  url.searchParams.set('temperature_unit', set.temperature_unit);
  url.searchParams.set('wind_speed_unit', set.wind_speed_unit);
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '5');

  const data = await fetchJson(url, 'the weather service');
  if (!data.current || !data.daily) {
    throw new AppError(502, 'Weather service returned an unexpected response.');
  }
  return data;
}

const round = (n) => (typeof n === 'number' ? Math.round(n) : null);

function normalize(place, raw, units) {
  const c = raw.current;
  const d = raw.daily;
  const isDay = c.is_day === 1;

  const forecast = d.time.map((date, i) => ({
    date,
    max: round(d.temperature_2m_max[i]),
    min: round(d.temperature_2m_min[i]),
    precipProbability: d.precipitation_probability_max[i],
    precipSum: d.precipitation_sum[i],
    uvIndex: d.uv_index_max[i],
    windMax: round(d.wind_speed_10m_max[i]),
    sunrise: d.sunrise[i],
    sunset: d.sunset[i],
    condition: describe(d.weather_code[i], true),
  }));

  return {
    location: { ...place, timezone: raw.timezone },
    units: { system: units, ...UNIT_SETS[units].labels },
    current: {
      time: c.time,
      temperature: round(c.temperature_2m),
      feelsLike: round(c.apparent_temperature),
      humidity: c.relative_humidity_2m,
      pressure: round(c.pressure_msl),
      windSpeed: round(c.wind_speed_10m),
      windDirection: c.wind_direction_10m,
      cloudCover: c.cloud_cover,
      precipitation: c.precipitation,
      isDay,
      condition: describe(c.weather_code, isDay),
    },
    today: {
      sunrise: d.sunrise[0],
      sunset: d.sunset[0],
      uvIndex: d.uv_index_max[0],
    },
    forecast,
  };
}

/** Public API: get current weather + 5-day forecast for a city name. */
async function getWeatherByCity(rawCity, rawUnits) {
  const city = validateCity(rawCity);
  const units = UNIT_SETS[rawUnits] ? rawUnits : 'metric';

  const cacheKey = `${city.toLowerCase()}|${units}`;
  const cached = cache.get(cacheKey);
  if (cached) return { ...cached, cached: true };

  const place = await geocode(city);
  const raw = await fetchForecast(place, units);
  const result = normalize(place, raw, units);

  cache.set(cacheKey, result);
  return { ...result, cached: false };
}

module.exports = { getWeatherByCity };
