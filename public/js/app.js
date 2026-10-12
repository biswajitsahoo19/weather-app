'use strict';

(() => {
  const $ = (id) => document.getElementById(id);

  const els = {
    form: $('search-form'),
    input: $('city-input'),
    button: $('search-btn'),
    recent: $('recent'),
    status: $('status'),
    weather: $('weather'),
    placeName: $('place-name'),
    placeSub: $('place-sub'),
    localTime: $('local-time'),
    icon: $('current-icon'),
    temp: $('current-temp'),
    tempUnit: $('temp-unit'),
    condition: $('current-condition'),
    feels: $('feels-like'),
    humidity: $('d-humidity'),
    wind: $('d-wind'),
    pressure: $('d-pressure'),
    cloud: $('d-cloud'),
    sunrise: $('d-sunrise'),
    sunset: $('d-sunset'),
    uv: $('d-uv'),
    precip: $('d-precip'),
    forecast: $('forecast'),
    unitButtons: document.querySelectorAll('.unit-btn'),
  };

  const STORAGE = { recent: 'skycast.recent', units: 'skycast.units', last: 'skycast.last' };
  const DEFAULT_CITY = 'Bhubaneswar';

  const state = {
    units: safeGet(STORAGE.units) || 'metric',
    city: null,
    requestId: 0,
  };

  /* ---------- storage helpers (fail-safe) ---------- */
  function safeGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
  }
  function getRecent() {
    try { return JSON.parse(safeGet(STORAGE.recent)) || []; } catch { return []; }
  }
  function pushRecent(city) {
    const list = [city, ...getRecent().filter((c) => c.toLowerCase() !== city.toLowerCase())].slice(0, 5);
    safeSet(STORAGE.recent, JSON.stringify(list));
    renderRecent();
  }

  /* ---------- formatting helpers ---------- */
  // Open-Meteo returns "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm" in the city's own timezone.
  const parseLocal = (s) => {
    const [datePart, timePart = '00:00'] = s.split('T');
    const [y, m, d] = datePart.split('-').map(Number);
    const [hh, mm] = timePart.split(':').map(Number);
    return new Date(y, m - 1, d, hh, mm);
  };
  const fmtTime = (s) =>
    parseLocal(s).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const fmtLongDate = (s) =>
    parseLocal(s).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
  const fmtWeekday = (s) => parseLocal(s).toLocaleDateString([], { weekday: 'short' });
  const fmtShortDate = (s) => parseLocal(s).toLocaleDateString([], { day: 'numeric', month: 'short' });

  function compass(deg) {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(deg / 45) % 8];
  }

  function uvLabel(uv) {
    if (uv == null) return '--';
    const v = Math.round(uv);
    const level = v <= 2 ? 'Low' : v <= 5 ? 'Moderate' : v <= 7 ? 'High' : v <= 10 ? 'Very high' : 'Extreme';
    return `${v} · ${level}`;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---------- UI state ---------- */
  function showLoading() {
    els.status.className = 'status loading';
    els.status.innerHTML = '<div class="spinner" aria-hidden="true"></div><span>Fetching the latest weather…</span>';
    els.status.hidden = false;
    els.weather.hidden = true;
    els.button.disabled = true;
  }
  function showError(message) {
    els.status.className = 'status error';
    els.status.textContent = message;
    els.status.hidden = false;
    els.weather.hidden = true;
    els.button.disabled = false;
  }
  function hideStatus() {
    els.status.hidden = true;
    els.button.disabled = false;
  }

  function renderRecent() {
    const list = getRecent();
    els.recent.innerHTML = list
      .map((c) => `<button type="button" class="chip" data-city="${escapeHtml(c)}">${escapeHtml(c)}</button>`)
      .join('');
  }

  function render(data) {
    const { location, units, current, today, forecast } = data;

    document.body.dataset.theme = current.condition.theme;
    document.title = `${current.temperature}${units.temp} in ${location.name} — Skycast`;

    els.placeName.textContent = location.name;
    els.placeSub.textContent = [location.region, location.country].filter(Boolean).join(', ');
    els.localTime.textContent = `Local time · ${fmtLongDate(current.time)}, ${fmtTime(current.time)}`;

    els.icon.textContent = current.condition.icon;
    els.temp.textContent = current.temperature;
    els.tempUnit.textContent = units.temp;
    els.condition.textContent = current.condition.label;
    els.feels.textContent = `${current.feelsLike}${units.temp}`;

    els.humidity.textContent = `${current.humidity}%`;
    els.wind.textContent = `${current.windSpeed} ${units.wind} ${compass(current.windDirection)}`;
    els.pressure.textContent = `${current.pressure} ${units.pressure}`;
    els.cloud.textContent = `${current.cloudCover}%`;
    els.sunrise.textContent = fmtTime(today.sunrise);
    els.sunset.textContent = fmtTime(today.sunset);
    els.uv.textContent = uvLabel(today.uvIndex);
    els.precip.textContent = `${current.precipitation} ${units.precip}`;

    els.forecast.innerHTML = forecast
      .map((d, i) => `
        <article class="day glass">
          <div class="day-name">${i === 0 ? 'Today' : fmtWeekday(d.date)}</div>
          <div class="day-date">${fmtShortDate(d.date)}</div>
          <div class="day-icon" aria-hidden="true">${d.condition.icon}</div>
          <div class="day-cond">${escapeHtml(d.condition.label)}</div>
          <div class="day-temps">${d.max}°<span class="lo">${d.min}°</span></div>
          <div class="day-rain">💧 ${d.precipProbability ?? 0}% rain</div>
        </article>`)
      .join('');

    // Stagger card entrance (set via CSSOM so it works under a strict CSP)
    els.forecast.querySelectorAll('.day').forEach((card, i) => {
      card.style.animationDelay = `${i * 70}ms`;
    });

    els.weather.hidden = false;
    // restart entrance animation
    els.weather.style.animation = 'none';
    void els.weather.offsetHeight;
    els.weather.style.animation = '';
  }

  /* ---------- data loading ---------- */
  async function loadWeather(city) {
    const id = ++state.requestId;
    showLoading();
    try {
      const url = `/api/weather?city=${encodeURIComponent(city)}&units=${state.units}`;
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      if (id !== state.requestId) return; // a newer search superseded this one
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');

      state.city = city;
      render(data);
      hideStatus();
      pushRecent(data.location.name);
      safeSet(STORAGE.last, data.location.name);
      els.input.value = data.location.name;
    } catch (err) {
      if (id !== state.requestId) return;
      const offline = err instanceof TypeError;
      showError(offline ? 'Cannot reach the server. Is it running?' : err.message);
    }
  }

  /* ---------- events ---------- */
  els.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const city = els.input.value.trim();
    if (city) loadWeather(city);
  });

  els.recent.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip) {
      els.input.value = chip.dataset.city;
      loadWeather(chip.dataset.city);
    }
  });

  els.unitButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.units === state.units) return;
      state.units = btn.dataset.units;
      safeSet(STORAGE.units, state.units);
      syncUnitButtons();
      if (state.city) loadWeather(state.city);
    });
  });

  function syncUnitButtons() {
    els.unitButtons.forEach((b) => b.classList.toggle('active', b.dataset.units === state.units));
  }

  /* ---------- init ---------- */
  syncUnitButtons();
  renderRecent();
  loadWeather(safeGet(STORAGE.last) || DEFAULT_CITY);
})();
