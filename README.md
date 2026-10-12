# Skycast — Weather Application (Pure Node.js)

A full-stack weather app built with **zero npm dependencies**: only Node.js built-in modules (`http`, `fs`, `path`, `url`) and the built-in `fetch`. Search any city to see current conditions and a 5-day forecast.

## Features

- City search with geocoding (handles spelling, accents, multi-word names)
- Current conditions: temperature, feels-like, humidity, wind (with compass direction), pressure, cloud cover, precipitation, UV index, sunrise/sunset, local time
- 5-day forecast with high/low, condition icon and rain probability
- °C / °F toggle (remembered between visits)
- Recent searches and last-city memory (localStorage)
- UI theme and animated background change with the weather (clear day/night, cloudy, rain, snow, storm, fog)
- Responsive glassmorphism design (desktop, tablet, mobile), respects reduced-motion
- Server-side: response caching (10 min), per-IP rate limiting, input validation, timeouts, security headers, path-traversal-safe static serving, graceful shutdown

## Requirements

- Node.js **18 or newer** (uses the built-in `fetch`)
- Internet access (to reach the Open-Meteo API). **No API key needed.**

## Run it

```bash
cd weather-app
npm start            # or: node server.js
# open http://localhost:3000
```

Optional: `PORT=8080 npm start` to change the port, `npm run dev` for auto-restart on changes.

## Project structure

```
weather-app/
├── package.json              # scripts + metadata (no dependencies)
├── server.js                 # entry point: creates the HTTP server
├── README.md
├── src/
│   ├── config.js             # port, API URLs, timeouts, cache/rate-limit settings
│   ├── router.js             # request handling: API routes + static files + security headers
│   ├── staticServer.js       # serves /public safely (MIME types, traversal protection)
│   ├── services/
│   │   └── weatherService.js # geocoding + forecast calls, validation, normalisation, caching
│   └── utils/
│       ├── cache.js          # in-memory TTL cache
│       ├── rateLimiter.js    # per-IP fixed-window rate limiter
│       ├── weatherCodes.js   # WMO weather code -> label / icon / UI theme
│       ├── errors.js         # AppError with HTTP status codes
│       └── logger.js         # timestamped logging
└── public/                   # frontend
    ├── index.html
    ├── css/styles.css
    └── js/app.js
```

## API

| Endpoint | Description |
| --- | --- |
| `GET /api/weather?city=Paris&units=metric` | Current weather + 5-day forecast. `units` = `metric` (default) or `imperial` |
| `GET /api/health` | Health check |

Error responses are JSON: `{ "error": "message" }` with status `400` (bad input), `404` (city not found), `429` (rate limited), `502/504` (upstream problem).

## How it works

1. The browser sends the city to **our** Node server (`/api/weather`), never directly to the weather API.
2. The server validates the input, geocodes the city (Open-Meteo Geocoding API), then fetches the forecast (Open-Meteo Forecast API).
3. The service normalises the raw data into a clean JSON shape (with labels and icons) and caches it.
4. The frontend renders the result and switches the visual theme to match the weather.

## Switching to another weather provider

All provider-specific logic lives in `src/services/weatherService.js`. To use OpenWeatherMap instead, keep the exported `getWeatherByCity` signature and the normalised response shape, store the key in an environment variable (e.g. `OPENWEATHER_API_KEY`) and read it in `config.js`.
