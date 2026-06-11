/**
 * GeoJSON/TopoJSON 地图渲染器（Leaflet）
 */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import registry from './renderer-registry.js';

function computeBounds(geojson) {
  let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;
  function processCoords(coords) {
    if (typeof coords === 'number') return;
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      minLng = Math.min(minLng, coords[0]);
      maxLng = Math.max(maxLng, coords[0]);
      minLat = Math.min(minLat, coords[1]);
      maxLat = Math.max(maxLat, coords[1]);
    } else if (Array.isArray(coords)) {
      for (let i = 0; i < coords.length; i++) processCoords(coords[i]);
    }
  }
  if (geojson.type === 'FeatureCollection' && geojson.features) {
    for (const f of geojson.features) {
      if (f.geometry) processCoords(f.geometry.coordinates);
    }
  } else if (geojson.type === 'Feature' && geojson.geometry) {
    processCoords(geojson.geometry.coordinates);
  } else if (geojson.coordinates) {
    processCoords(geojson.coordinates);
  }
  return { minLng, maxLng, minLat, maxLat };
}

registry.registerStandalone({
  id: 'geojson',
  name: 'GeoJSON 地图',
  filePattern: '\\.(geojson|topojson)$',

  async renderStandalone(rawContent, ctx) {
    let geojson;
    try {
      geojson = JSON.parse(rawContent);
    } catch (e) {
      throw new Error('无法解析 GeoJSON: ' + e.message);
    }

    const container = ctx.container || document.body;
    container.innerHTML = '';
    container.style.padding = '0';
    container.style.margin = '0';
    container.style.overflow = 'hidden';

    // 创建地图容器
    const mapContainer = document.createElement('div');
    mapContainer.id = 'ainote-geojson-map';
    mapContainer.style.cssText = 'width:100%;height:70vh;';
    container.appendChild(mapContainer);

    const map = L.map('ainote-geojson-map', { zoomControl: true });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    const geoLayer = L.geoJSON(geojson, {
      style: { color: '#3388ff', weight: 2, opacity: 0.7 },
    }).addTo(map);

    const bounds = computeBounds(geojson);
    const hasBounds = bounds.minLng <= bounds.maxLng && bounds.minLat <= bounds.maxLat;

    if (hasBounds) {
      map.fitBounds([[bounds.minLat, bounds.minLng], [bounds.maxLat, bounds.maxLng]]);
    } else {
      map.fitBounds(geoLayer.getBounds());
    }
  },
});
