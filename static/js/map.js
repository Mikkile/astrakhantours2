const PANEL_WIDTH = 400;

let attractions = [];
const markers = [];

const map = new maplibregl.Map({
    container: 'map',
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: [48.043, 46.3545],
    zoom: 15
});

map.addControl(new maplibregl.NavigationControl(), 'top-right');
map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');

const esc = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function buildPanelBody(place) {
    const metaRows = [];
    if (place.address)   metaRows.push(`<div><span class="meta-label">📍</span><span>${esc(place.address)}</span></div>`);
    if (place.year)      metaRows.push(`<div><span class="meta-label">📅</span><span>${esc(place.year)}</span></div>`);
    if (place.architect) metaRows.push(`<div><span class="meta-label">👤</span><span>${esc(place.architect)}</span></div>`);
    if (place.style)     metaRows.push(`<div><span class="meta-label">🎨</span><span>${esc(place.style)}</span></div>`);

    return `
        ${place.type ? `<span class="panel-type" style="--pin-color:${esc(place.color)}">${esc(place.type)}</span>` : ''}
        <h2>${esc(place.name)}</h2>
        <p>${esc(place.full || '')}</p>
        ${metaRows.length ? `<div class="panel-meta">${metaRows.join('')}</div>` : ''}
    `;
}

const panel = document.getElementById('sidePanel');
const panelBody = document.getElementById('panelBody');
const panelClose = document.getElementById('panelClose');
const panelBackdrop = document.getElementById('panelBackdrop');

const galleryTrack = document.getElementById('galleryTrack');
const galleryDots  = document.getElementById('galleryDots');
const galleryPrev  = document.getElementById('galleryPrev');
const galleryNext  = document.getElementById('galleryNext');

let galleryIndex = 0;
let galleryCount = 0;

function buildGallery(images) {
    galleryTrack.innerHTML = '';
    galleryDots.innerHTML = '';
    galleryIndex = 0;
    galleryCount = images.length;

    images.forEach((img, i) => {
        const slide = document.createElement('div');
        slide.className = 'gallery-slide';
        slide.style.backgroundImage = `url('/static/src/${encodeURIComponent(img)}')`;
        galleryTrack.appendChild(slide);

        const dot = document.createElement('span');
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToSlide(i));
        galleryDots.appendChild(dot);
    });

    updateGallery();
}

function updateGallery() {
    galleryTrack.style.transform = `translateX(-${galleryIndex * 100}%)`;
    [...galleryDots.children].forEach((d, i) => {
        d.classList.toggle('active', i === galleryIndex);
    });
    galleryPrev.style.display = galleryIndex === 0 ? 'none' : 'flex';
    galleryNext.style.display = galleryIndex === galleryCount - 1 ? 'none' : 'flex';
}

function goToSlide(i) {
    if (i < 0 || i >= galleryCount) return;
    galleryIndex = i;
    updateGallery();
}

galleryPrev.addEventListener('click', () => goToSlide(galleryIndex - 1));
galleryNext.addEventListener('click', () => goToSlide(galleryIndex + 1));

const audioPlayer      = document.getElementById('audioPlayer');
const audioPlayBtn     = document.getElementById('audioPlayBtn');
const audioTitle       = document.getElementById('audioTitle');
const audioProgress    = document.getElementById('audioProgress');
const audioProgressBar = document.getElementById('audioProgressBar');
const audioTime        = document.getElementById('audioTime');

const audio = new Audio();
audio.preload = 'metadata';
let audioForPlace = null;
let audioFailed = false;

const ICON_PLAY  = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 2l10 6-10 6V2z"/></svg>';
const ICON_PAUSE = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="3" y="2" width="4" height="12"/><rect x="9" y="2" width="4" height="12"/></svg>';

function fmtTime(s) {
    if (!isFinite(s) || s < 0) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
}

function updatePlayBtn() {
    audioPlayBtn.innerHTML = audio.paused ? ICON_PLAY : ICON_PAUSE;
}

function resetAudioUI() {
    audioProgressBar.style.width = '0%';
    audioTime.textContent = '0:00';
    updatePlayBtn();
}

function setAudioFor(place) {
    if (audioForPlace === place) return;
    audioForPlace = place;
    audioFailed = false;

    audio.pause();
    audio.removeAttribute('src');
    try { audio.load(); } catch (_) {}
    audio.currentTime = 0;
    resetAudioUI();

    if (!place.audio) {
        audioPlayer.classList.remove('visible');
        return;
    }

    audioPlayer.classList.add('visible');
    audioPlayer.style.setProperty('--pin-color', place.color || '#e63946');
    audioTitle.textContent = 'Аудиорассказ · ' + place.name;
    audio.src = `/static/src/${encodeURIComponent(place.audio)}`;
    audio.load();
}

audioPlayBtn.addEventListener('click', () => {
    if (audioFailed) return;
    if (!audio.src) return;
    if (audio.paused) {
        audio.play().catch(err => console.warn('Не удалось воспроизвести аудио:', err));
    } else {
        audio.pause();
    }
});

audio.addEventListener('play',  updatePlayBtn);
audio.addEventListener('pause', updatePlayBtn);

audio.addEventListener('loadedmetadata', () => {
    audioTime.textContent = `0:00 / ${fmtTime(audio.duration)}`;
});

audio.addEventListener('timeupdate', () => {
    if (audio.duration && isFinite(audio.duration)) {
        const p = (audio.currentTime / audio.duration) * 100;
        audioProgressBar.style.width = p + '%';
        audioTime.textContent = `${fmtTime(audio.currentTime)} / ${fmtTime(audio.duration)}`;
    }
});

audio.addEventListener('ended', () => {
    updatePlayBtn();
    audio.currentTime = 0;
    audioProgressBar.style.width = '0%';
});

audio.addEventListener('error', () => {
    audioFailed = true;
    console.warn('Аудиофайл не найден:', audio.src);
    audioTitle.textContent = 'Аудио недоступно';
    audioTime.textContent = '—';
    audioProgressBar.style.width = '0%';
    updatePlayBtn();
});

audioProgress.addEventListener('click', (e) => {
    if (audioFailed || !audio.duration || !isFinite(audio.duration)) return;
    const rect = audioProgress.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
});

function openPanel(place) {
    buildGallery(place.images?.length ? place.images : ['placeholder.png']);
    panelBody.innerHTML = buildPanelBody(place);
    panelBody.scrollTop = 0;
    panel.classList.add('open');
    panelBackdrop.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    setAudioFor(place);
}

function closePanel() {
    panel.classList.remove('open');
    panelBackdrop.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    audio.pause();
    panelOpen = false;
}

panelClose.addEventListener('click', closePanel);
panelBackdrop.addEventListener('click', closePanel);

const tourPrev  = document.getElementById('tourPrev');
const tourNext  = document.getElementById('tourNext');
const tourInfo  = document.getElementById('tourInfo');
const tourCounter = document.getElementById('tourCounter');
const tourName  = document.getElementById('tourName');

let currentIndex = -1;
let panelOpen = false;

function goTo(index, opts = {}) {
    const { fly = true, open = true } = opts;
    if (index < 0 || index >= attractions.length) return;

    if (currentIndex >= 0 && markers[currentIndex]) {
        markers[currentIndex].element.classList.remove('active');
    }

    currentIndex = index;
    const { element, place } = markers[index];
    element.classList.add('active');

    tourCounter.textContent = `${index + 1} / ${attractions.length}`;
    tourName.textContent = place.name;

    tourPrev.disabled = index === 0;
    tourNext.disabled = index === attractions.length - 1;

    if (open) {
        openPanel(place);
        panelOpen = true;
    }

    if (fly) {
        const isNarrow = window.innerWidth <= 480;
        map.flyTo({
            center: place.coords,
            zoom: Math.max(map.getZoom(), 15),
            padding: isNarrow
                ? { top: 0, bottom: 0, left: 0, right: 0 }
                : { top: 0, bottom: 0, left: 0, right: PANEL_WIDTH },
            duration: 800,
            essential: true
        });
    }
}

function next() { if (currentIndex < attractions.length - 1) goTo(currentIndex + 1); }
function prev() { if (currentIndex > 0) goTo(currentIndex - 1); }

tourNext.addEventListener('click', next);
tourPrev.addEventListener('click', prev);

tourInfo.addEventListener('click', () => {
    if (currentIndex < 0) { goTo(0); return; }
    if (panelOpen) { closePanel(); }
    else { openPanel(markers[currentIndex].place); panelOpen = true; }
});

document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    if (e.key === 'ArrowLeft')  { e.preventDefault(); prev(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    if (e.key === 'Escape')     { if (panelOpen) closePanel(); }
    if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); next(); }
});

async function init() {
    try {
        const resp = await fetch('/api/attractions');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        attractions = await resp.json();
    } catch (err) {
        console.error('Не удалось загрузить данные:', err);
        tourName.textContent = 'Ошибка загрузки данных';
        return;
    }

    attractions.forEach((place, index) => {
        const el = document.createElement('div');
        el.className = 'custom-marker';
        el.title = place.name;
        el.style.setProperty('--pin-color', place.color || '#e63946');

        const inner = document.createElement('div');
        inner.className = 'marker-inner';

        const pin = document.createElement('div');
        pin.className = 'marker-pin';

        const img = document.createElement('div');
        img.className = 'marker-image';
        const firstImg = place.images?.[0] || 'placeholder.png';
        img.style.backgroundImage = `url('/static/src/${encodeURIComponent(firstImg)}')`;

        pin.appendChild(img);
        inner.appendChild(pin);
        el.appendChild(inner);

        new maplibregl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat(place.coords)
            .addTo(map);

        markers.push({ element: el, place });

        el.addEventListener('click', (e) => {
            e.stopPropagation();

            if (routeState.mode === 'custom') {
                addWaypoint(place.coords, place.name);
                return;
            }
            goTo(index, { fly: true, open: true });
        });
    });

    if (attractions.length > 0) {
        tourCounter.textContent = `1 / ${attractions.length}`;
        tourName.textContent = attractions[0].name;
        tourPrev.disabled = true;
        tourNext.disabled = attractions.length < 2;
    }
}

map.on('load', init);
const ROUTE_PROFILE = 'foot';
const OSRM_BASE = `https://routing.openstreetmap.de/routed-${ROUTE_PROFILE}/route/v1/${ROUTE_PROFILE}`;

const RECOMMENDED_ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const routeState = {
    mode: 'off',      
    waypoints: [],       
    labels: [],         
    markers: [],      
    layersReady: false,
    requestId: 0
};

const routePanel    = document.getElementById('routePanel');
const routeHint     = document.getElementById('routeHint');
const routeActions  = document.getElementById('routeActions');
const routeInfo     = document.getElementById('routeInfo');
const routeDistance = document.getElementById('routeDistance');
const routeDuration = document.getElementById('routeDuration');
const routeUndo     = document.getElementById('routeUndo');
const routeClear    = document.getElementById('routeClear');
const modeButtons   = [...document.querySelectorAll('.route-mode-btn')];

function ensureRouteLayers() {
    if (routeState.layersReady) return;

    if (!map.getSource('route')) {
        map.addSource('route', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });
    }
    if (!map.getLayer('route-outline')) {
        map.addLayer({
            id: 'route-outline',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.9 }
        });
    }
    if (!map.getLayer('route-line')) {
        map.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#e63946', 'line-width': 5, 'line-opacity': 0.9 }
        });
    }
    routeState.layersReady = true;
}

async function fetchRoute(waypoints) {
    if (waypoints.length < 2) return null;
    const coords = waypoints.map(w => `${w[0]},${w[1]}`).join(';');
    const url = `${OSRM_BASE}/${coords}?overview=full&geometries=geojson`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`OSRM HTTP ${resp.status}`);
    const data = await resp.json();
    if (!data.routes || !data.routes.length) throw new Error('Маршрут не найден');
    return data.routes[0];
}

function drawRoute(geometry) {
    ensureRouteLayers();
    const feature = geometry
        ? { type: 'Feature', geometry, properties: {} }
        : null;
    map.getSource('route').setData({
        type: 'FeatureCollection',
        features: feature ? [feature] : []
    });
}

function clearWaypointMarkers() {
    routeState.markers.forEach(m => m.remove());
    routeState.markers = [];
}

function addWaypointMarker(coord, index, label) {
    const el = document.createElement('div');
    el.className = 'route-waypoint';
    el.textContent = String(index + 1);

    el.title = label
        ? `${label} — клик, чтобы удалить точку`
        : 'Клик, чтобы удалить точку';

    const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(coord)
        .addTo(map);

    ['mousedown', 'touchstart', 'pointerdown'].forEach(evt =>
        el.addEventListener(evt, (e) => e.stopPropagation())
    );

    el.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        removeWaypointAt(index);
    });

    routeState.markers.push(marker);
}

function removeWaypointAt(index) {
    if (index < 0 || index >= routeState.waypoints.length) return;

    routeState.waypoints.splice(index, 1);
    routeState.labels.splice(index, 1);

    updateUndoState();
    rebuildRoute();
}

async function rebuildRoute({ fit = false } = {}) {
    const myId = ++routeState.requestId;

    clearWaypointMarkers();
    routeState.waypoints.forEach((wp, i) => addWaypointMarker(wp, i, routeState.labels[i]));

    if (routeState.waypoints.length < 2) {
        drawRoute(null);
        routeInfo.hidden = true;
        return;
    }

    try {
        const route = await fetchRoute(routeState.waypoints);
        if (myId !== routeState.requestId) return; 
        if (!route) return;

        drawRoute(route.geometry);

        const km  = (route.distance / 1000).toFixed(1);
        const min = Math.round(route.duration / 60);
        routeDistance.textContent = `${km} км`;
        routeDuration.textContent = `~${min} мин`;
        routeInfo.hidden = false;

        if (fit) {
            const coords = route.geometry.coordinates;
            const bounds = coords.reduce(
                (b, c) => b.extend(c),
                new maplibregl.LngLatBounds(coords[0], coords[0])
            );
            map.fitBounds(bounds, { padding: 90, duration: 700 });
        }
    } catch (err) {
        console.warn('Маршрут не построен:', err);
        routeDistance.textContent = 'Маршрут не найден';
        routeDuration.textContent = '';
        routeInfo.hidden = false;
    }
}

function addWaypoint(coord, label = null) {
    routeState.waypoints.push(coord);
    routeState.labels.push(label);
    updateUndoState();
    rebuildRoute();
}

function clearRoute() {
    routeState.waypoints = [];
    routeState.labels = [];
    routeState.requestId++;     
    clearWaypointMarkers();
    drawRoute(null);
    routeInfo.hidden = true;
    updateUndoState();
}

function updateUndoState() {
    routeUndo.disabled = routeState.waypoints.length === 0;
}

function setMode(mode) {
    if (routeState.mode === mode) return;

    clearRoute();
    routeState.mode = mode;

    modeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    if (mode === 'recommended') {
        routeState.waypoints = RECOMMENDED_ORDER.map(i => attractions[i].coords);
        routeState.labels = RECOMMENDED_ORDER.map(i => attractions[i].name);
        routeHint.hidden = true;
        routeActions.hidden = false;          
        updateUndoState();
        rebuildRoute({ fit: true });
    } else if (mode === 'custom') {
        routeHint.hidden = false;
        routeActions.hidden = false;
        updateUndoState();
    }
}

modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        setMode(routeState.mode === mode ? 'off' : mode);
    });
});

routeUndo.addEventListener('click', () => {
    routeState.waypoints.pop();
    routeState.labels.pop();
    updateUndoState();
    rebuildRoute();
});

routeClear.addEventListener('click', clearRoute);

map.on('click', (e) => {
    if (routeState.mode !== 'custom') return;
    addWaypoint([e.lngLat.lng, e.lngLat.lat]);
});
map.on('error', (e) => console.error('Ошибка MapLibre:', e.error));
