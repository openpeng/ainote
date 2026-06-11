// ========== GeoJSON 地图渲染器 ==========
// 将 .geojson / .topojson 文件渲染为 Leaflet 交互式地图
(function() {
  'use strict';

  // 计算 GeoJSON 要素的边界
  function computeBounds(geojson) {
    var minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;
    function processCoords(coords) {
      if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
        minLng = Math.min(minLng, coords[0]);
        maxLng = Math.max(maxLng, coords[0]);
        minLat = Math.min(minLat, coords[1]);
        maxLat = Math.max(maxLat, coords[1]);
      } else if (Array.isArray(coords)) {
        for (var i = 0; i < coords.length; i++) processCoords(coords[i]);
      }
    }
    if (geojson.type === 'FeatureCollection' && geojson.features) {
      for (var f = 0; f < geojson.features.length; f++) {
        if (geojson.features[f].geometry) {
          processCoords(geojson.features[f].geometry.coordinates);
        }
      }
    } else if (geojson.type === 'Feature' && geojson.geometry) {
      processCoords(geojson.geometry.coordinates);
    } else if (geojson.coordinates) {
      processCoords(geojson.coordinates);
    }
    return { minLng: minLng, maxLng: maxLng, minLat: minLat, maxLat: maxLat };
  }

  AINoteRenderers.registerStandalone({
    id: 'geojson',
    name: 'GeoJSON 地图',
    filePattern: '\\.(geojson|topojson)$',
    dependencies: [
      'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'
    ],
    cssDependencies: [
      'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css'
    ],

    renderStandalone: async function(rawContent, ctx) {
      var geojson;
      try {
        geojson = JSON.parse(rawContent);
      } catch (e) {
        throw new Error('无法解析 GeoJSON: ' + e.message);
      }

      if (typeof L === 'undefined') {
        throw new Error('Leaflet 地图库未加载');
      }

      var bounds = computeBounds(geojson);
      var hasValidBounds = bounds.minLng <= bounds.maxLng && bounds.minLat <= bounds.maxLat;

      // 构建页面
      document.body.innerHTML = '';
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.body.style.overflow = 'hidden';

      // 地图容器
      var mapContainer = document.createElement('div');
      mapContainer.id = 'ainote-geojson-map';
      mapContainer.style.cssText = 'width:100vw;height:100vh;';
      document.body.appendChild(mapContainer);

      // Leaflet 地图
      var map = L.map('ainote-geojson-map', {
        zoomControl: true,
        attributionControl: true
      });

      // 底图（OpenStreetMap）
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
      }).addTo(map);

      // 添加 GeoJSON 图层
      var layer = L.geoJSON(geojson, {
        style: function(feature) {
          return {
            color: '#1a73e8',
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.2
          };
        },
        pointToLayer: function(feature, latlng) {
          return L.circleMarker(latlng, {
            radius: 6,
            fillColor: '#1a73e8',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
          });
        },
        onEachFeature: function(feature, layer) {
          // 弹出属性面板
          if (feature.properties) {
            var props = feature.properties;
            var popupHtml = '<div style="max-height:200px;overflow-y:auto;font-size:12px;">';
            var keys = Object.keys(props);
            for (var k = 0; k < Math.min(keys.length, 20); k++) {
              popupHtml += '<b>' + ctx.escapeHtml(keys[k]) + '</b>: ' +
                ctx.escapeHtml(String(props[keys[k]])) + '<br>';
            }
            if (keys.length > 20) popupHtml += '<i>... 还有 ' + (keys.length - 20) + ' 个属性</i>';
            popupHtml += '</div>';
            layer.bindPopup(popupHtml);
          }
        }
      }).addTo(map);

      // 缩放至数据边界
      if (hasValidBounds) {
        map.fitBounds([
          [bounds.minLat, bounds.minLng],
          [bounds.maxLat, bounds.maxLng]
        ], { padding: [30, 30] });
      } else {
        map.setView([0, 0], 2);
      }
    }
  });

})();
