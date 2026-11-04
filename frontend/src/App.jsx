import React, { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import {
  Layers,
  MapPin,
  Download,
  Search,
  Flame,
  CircleDot,
  Calendar,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Building,
  ShieldAlert,
  Info,
  X
} from 'lucide-react';

const SECTOR_CONFIG = {
  'Residential': { color: '#e11d48', label: 'Residential & Housing' },
  'School or childcare': { color: '#d97706', label: 'Schools, Uni & Childcare' },
  'Healthcare': { color: '#dc2626', label: 'Healthcare & Hospitals' },
  'Commercial': { color: '#0284c7', label: 'Commercial & Urban Economy' },
  'Roads/Highways/Transport': { color: '#7c3aed', label: 'Roads, Transport & Bridges' },
  'Administrative': { color: '#059669', label: 'Administrative & Municipal' },
  'Cultural': { color: '#0d9488', label: 'Cultural & Heritage' },
  'Industrial': { color: '#4f46e5', label: 'Industrial & Energy' },
  'Food/Food Infrastructure': { color: '#65a30d', label: 'Food & Agriculture Infra' },
  'Religious': { color: '#ca8a04', label: 'Religious & Community' },
  'Humanitarian': { color: '#0891b2', label: 'Humanitarian Facilities' },
  'Unclassified Civilian': { color: '#64748b', label: 'Other Civilian Infrastructure' }
};

const UNOSAT_GRADES = {
  'Destroyed': { color: '#e11d48', count: 45, label: 'Destroyed (Flattened/Collapsed)' },
  'Severe Damage': { color: '#ea580c', count: 149, label: 'Severe (Major Wall/Roof Failure)' },
  'Moderate Damage': { color: '#eab308', count: 236, label: 'Moderate (Facade/Impact Damage)' },
  'Possible Damage': { color: '#64748b', count: 59, label: 'Possible Structural Damage' },
  'Impact Crater / Field': { color: '#8b5cf6', count: 29, label: 'Direct Impact Crater' }
};

const BASEMAPS = {
  voyager: {
    name: 'Terrain & Streets',
    subtitle: 'Bellingcat Style',
    tiles: [
      'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
      'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
      'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'
    ],
    attribution: '© OpenStreetMap contributors © CARTO'
  },
  satellite: {
    name: 'Satellite Hybrid',
    subtitle: 'Esri VHR + Labels',
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    ],
    overlayLabels: [
      'https://a.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}@2x.png'
    ],
    attribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics'
  },
  osm: {
    name: 'OpenStreetMap',
    subtitle: 'Street & Building Level',
    tiles: [
      'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
      'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png'
    ],
    attribution: '© OpenStreetMap contributors'
  },
  positron: {
    name: 'Clean Light GIS',
    subtitle: 'Carto Positron',
    tiles: [
      'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
      'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png'
    ],
    attribution: '© OpenStreetMap contributors © CARTO'
  },
  topo: {
    name: 'Topographic',
    subtitle: 'Elevation & Relief',
    tiles: [
      'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
      'https://b.tile.opentopomap.org/{z}/{x}/{y}.png'
    ],
    attribution: '© OpenTopoMap (CC-BY-SA)'
  }
};

const CAMERA_PRESETS = {
  ukraine: {
    label: 'Ukraine Overview',
    center: [34.2, 48.35],
    zoom: 5.3,
    pitch: 0
  },
  kharkiv_oblast: {
    label: 'Kharkiv Oblast',
    center: [36.55, 49.65],
    zoom: 7.7,
    pitch: 0
  },
  kharkiv_city: {
    label: 'Kharkiv Urban Core',
    center: [36.245, 49.998],
    zoom: 11.4,
    pitch: 15
  },
  saltivka: {
    label: 'North Saltivka Hotspot',
    center: [36.356, 50.037],
    zoom: 13.8,
    pitch: 25
  }
};

const COLOR_MATCH_EXPR = [
  'match',
  ['get', 'primary_sector'],
  'Residential', '#e11d48',
  'School or childcare', '#d97706',
  'Healthcare', '#dc2626',
  'Commercial', '#0284c7',
  'Roads/Highways/Transport', '#7c3aed',
  'Administrative', '#059669',
  'Cultural', '#0d9488',
  'Industrial', '#4f46e5',
  'Food/Food Infrastructure', '#65a30d',
  'Religious', '#ca8a04',
  'Humanitarian', '#0891b2',
  '#7c3aed'
];

function createInitialStyle() {
  const sources = {
    'bm-voyager': {
      type: 'raster',
      tiles: BASEMAPS.voyager.tiles,
      tileSize: 256,
      attribution: BASEMAPS.voyager.attribution
    },
    'bm-satellite': {
      type: 'raster',
      tiles: BASEMAPS.satellite.tiles,
      tileSize: 256,
      attribution: BASEMAPS.satellite.attribution
    },
    'bm-satellite-labels': {
      type: 'raster',
      tiles: BASEMAPS.satellite.overlayLabels,
      tileSize: 256
    },
    'bm-osm': {
      type: 'raster',
      tiles: BASEMAPS.osm.tiles,
      tileSize: 256,
      attribution: BASEMAPS.osm.attribution
    },
    'bm-positron': {
      type: 'raster',
      tiles: BASEMAPS.positron.tiles,
      tileSize: 256,
      attribution: BASEMAPS.positron.attribution
    },
    'bm-topo': {
      type: 'raster',
      tiles: BASEMAPS.topo.tiles,
      tileSize: 256,
      attribution: BASEMAPS.topo.attribution
    },
    'damage-clustered': {
      type: 'geojson',
      data: '/data/ukraine_civilian_damage.geojson',
      cluster: true,
      clusterMaxZoom: 13,
      clusterRadius: 48
    },
    'damage-raw': {
      type: 'geojson',
      data: '/data/ukraine_civilian_damage.geojson'
    },
    'unosat-damage': {
      type: 'geojson',
      data: '/data/unosat_kharkiv_building_damage.geojson'
    }
  };

  const layers = [
    // Basemap Raster Layers
    { id: 'layer-voyager', type: 'raster', source: 'bm-voyager', layout: { visibility: 'visible' } },
    { id: 'layer-satellite', type: 'raster', source: 'bm-satellite', layout: { visibility: 'none' } },
    { id: 'layer-satellite-labels', type: 'raster', source: 'bm-satellite-labels', layout: { visibility: 'none' } },
    { id: 'layer-osm', type: 'raster', source: 'bm-osm', layout: { visibility: 'none' } },
    { id: 'layer-positron', type: 'raster', source: 'bm-positron', layout: { visibility: 'none' } },
    { id: 'layer-topo', type: 'raster', source: 'bm-topo', layout: { visibility: 'none' } },

    // 1. Heatmap Layer
    {
      id: 'damage-heat',
      type: 'heatmap',
      source: 'damage-raw',
      layout: { visibility: 'none' },
      paint: {
        'heatmap-weight': 1,
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 4, 0.8, 13, 2.5],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(124, 58, 237, 0)',
          0.2, 'rgba(139, 92, 246, 0.45)',
          0.45, 'rgba(168, 85, 247, 0.72)',
          0.7, 'rgba(236, 72, 153, 0.88)',
          0.9, 'rgba(244, 63, 94, 0.95)',
          1, 'rgba(254, 240, 138, 1)'
        ],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 4, 14, 10, 26, 14, 38],
        'heatmap-opacity': 0.88
      }
    },

    // 2. Bellingcat-Style Proportional Purple Cluster Halo & Circles
    {
      id: 'cluster-halo',
      type: 'circle',
      source: 'damage-clustered',
      filter: ['has', 'point_count'],
      layout: { visibility: 'visible' },
      paint: {
        'circle-color': '#7c3aed',
        'circle-opacity': 0.24,
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['get', 'point_count'],
          2, 18,
          25, 28,
          100, 42,
          400, 58,
          800, 72
        ]
      }
    },
    {
      id: 'clusters',
      type: 'circle',
      source: 'damage-clustered',
      filter: ['has', 'point_count'],
      layout: { visibility: 'visible' },
      paint: {
        'circle-color': '#7c3aed',
        'circle-opacity': 0.76,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 0.9,
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['get', 'point_count'],
          2, 13,
          25, 21,
          100, 32,
          400, 45,
          800, 56
        ]
      }
    },
    {
      id: 'cluster-count',
      type: 'symbol',
      source: 'damage-clustered',
      filter: ['has', 'point_count'],
      layout: {
        visibility: 'visible',
        'text-field': '{point_count_abbreviated}',
        'text-font': ['Open Sans Semibold'],
        'text-size': 12
      },
      paint: {
        'text-color': '#ffffff'
      }
    },

    // 3. Individual Unclustered Points (in cluster mode)
    {
      id: 'unclustered-point',
      type: 'circle',
      source: 'damage-clustered',
      filter: ['!', ['has', 'point_count']],
      layout: { visibility: 'visible' },
      paint: {
        'circle-color': COLOR_MATCH_EXPR,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 5, 12, 7.5, 16, 10],
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.92
      }
    },

    // 4. All Points Direct Layer (when in 'points' mode without clustering)
    {
      id: 'all-points-direct',
      type: 'circle',
      source: 'damage-raw',
      layout: { visibility: 'none' },
      paint: {
        'circle-color': COLOR_MATCH_EXPR,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 4.5, 10, 6.5, 15, 9],
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.88
      }
    },

    // 5. UNOSAT Pillar 2: High-Resolution Building-Level Damage Layer (Ground Truth)
    {
      id: 'unosat-buildings-halo',
      type: 'circle',
      source: 'unosat-damage',
      layout: { visibility: 'visible' },
      paint: {
        'circle-color': ['get', 'damage_color'],
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3, 13, 8, 16, 16],
        'circle-opacity': 0.35
      }
    },
    {
      id: 'unosat-buildings',
      type: 'circle',
      source: 'unosat-damage',
      layout: { visibility: 'visible' },
      paint: {
        'circle-color': ['get', 'damage_color'],
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 2, 13, 5, 16, 9],
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.95
      }
    }
  ];

  return {
    version: 8,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources,
    layers
  };
}

export default function App() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const mapLoadedRef = useRef(false);

  const [allFeatures, setAllFeatures] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI & Filter States
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePreset, setActivePreset] = useState('ukraine');
  const [basemap, setBasemap] = useState('voyager');
  const [scope, setScope] = useState('all'); // 'all' or 'kharkiv'
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [vizMode, setVizMode] = useState('clusters'); // 'clusters' | 'points' | 'heatmap'
  const [showUnosat, setShowUnosat] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Fetch GeoJSON for React state & filtering
  useEffect(() => {
    fetch('/data/ukraine_civilian_damage.geojson')
      .then((res) => res.json())
      .then((data) => {
        setAllFeatures(data.features || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load GeoJSON:', err);
        setLoading(false);
      });
  }, []);

  // Filtered GeoJSON & Analytics
  const { filteredGeoJSON, stats } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matched = [];
    const sectorCounts = {};
    const monthCounts = {};
    let kharkivTotal = 0;
    let residentialCount = 0;
    let socialInfraCount = 0;

    for (const f of allFeatures) {
      const p = f.properties || {};
      if (p.is_kharkiv) kharkivTotal++;

      if (scope === 'kharkiv' && !p.is_kharkiv) continue;
      if (selectedSector !== 'ALL' && !(p.sectors || '').includes(selectedSector)) continue;
      if (selectedYear !== 'ALL' && !(p.date || '').startsWith(selectedYear)) continue;
      if (q) {
        const hay = `${p.location || ''} ${p.description || ''} ${p.sectors || ''} ${p.id || ''}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }

      matched.push(f);

      const sec = p.primary_sector || 'Unclassified Civilian';
      sectorCounts[sec] = (sectorCounts[sec] || 0) + 1;

      if ((p.sectors || '').includes('Residential')) residentialCount++;
      if ((p.sectors || '').includes('School or childcare') || (p.sectors || '').includes('Healthcare')) {
        socialInfraCount++;
      }

      if (p.date && p.date.length >= 7) {
        const ym = p.date.substring(0, 7);
        monthCounts[ym] = (monthCounts[ym] || 0) + 1;
      }
    }

    const sortedSectors = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]);

    const monthsList = [];
    for (let y = 2022; y <= 2025; y++) {
      for (let m = 1; m <= 12; m++) {
        if (y === 2022 && m < 2) continue;
        if (y === 2025 && m > 9) continue;
        const ym = `${y}-${String(m).padStart(2, '0')}`;
        monthsList.push({ ym, year: String(y), count: monthCounts[ym] || 0 });
      }
    }

    return {
      filteredGeoJSON: {
        type: 'FeatureCollection',
        features: matched
      },
      stats: {
        total: matched.length,
        nationalTotal: allFeatures.length,
        kharkivTotal,
        kharkivPct: allFeatures.length ? ((kharkivTotal / allFeatures.length) * 100).toFixed(1) : '31.4',
        residentialCount,
        socialInfraCount,
        sortedSectors,
        monthsList
      }
    };
  }, [allFeatures, scope, selectedSector, selectedYear, searchQuery]);

  // Initialize MapLibre Map once
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: createInitialStyle(),
      center: CAMERA_PRESETS.ukraine.center,
      zoom: CAMERA_PRESETS.ukraine.zoom,
      pitch: 0,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-right');

    map.on('load', () => {
      mapLoadedRef.current = true;
    });

    // Click cluster to zoom in
    map.on('click', 'clusters', async (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      if (!features.length) return;
      const clusterId = features[0].properties.cluster_id;
      const zoom = await map.getSource('damage-clustered').getClusterExpansionZoom(clusterId);
      map.easeTo({
        center: features[0].geometry.coordinates,
        zoom: zoom + 0.5,
        duration: 650
      });
    });

    // Click individual incident point
    const handlePointClick = (e) => {
      if (!e.features || !e.features.length) return;
      const feat = e.features[0];
      const coords = feat.geometry.coordinates.slice();
      setSelectedEvent({
        ...feat.properties,
        is_unosat: false,
        coordinates: coords
      });
      map.easeTo({ center: coords, duration: 450 });
    };

    map.on('click', 'unclustered-point', handlePointClick);
    map.on('click', 'all-points-direct', handlePointClick);

    // Click UNOSAT building damage point
    map.on('click', 'unosat-buildings', (e) => {
      if (!e.features || !e.features.length) return;
      const feat = e.features[0];
      const coords = feat.geometry.coordinates.slice();
      setSelectedEvent({
        ...feat.properties,
        is_unosat: true,
        coordinates: coords
      });
      map.easeTo({ center: coords, duration: 450 });
    });

    ['clusters', 'unclustered-point', 'all-points-direct', 'unosat-buildings'].forEach((layerId) => {
      map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
      });
    });

    mapRef.current = map;

    return () => {
      mapLoadedRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update GeoJSON sources whenever filters change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || loading) return;

    const applyUpdate = () => {
      const sCluster = map.getSource('damage-clustered');
      const sRaw = map.getSource('damage-raw');
      if (sCluster) sCluster.setData(filteredGeoJSON);
      if (sRaw) sRaw.setData(filteredGeoJSON);
    };

    if (mapLoadedRef.current) {
      applyUpdate();
    } else {
      map.once('load', applyUpdate);
    }
  }, [filteredGeoJSON, loading]);

  // Update layer visibilities when vizMode or showUnosat changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const applyVis = () => {
      const setVis = (id, vis) => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', vis ? 'visible' : 'none');
        }
      };
      setVis('damage-heat', vizMode === 'heatmap');
      setVis('cluster-halo', vizMode === 'clusters');
      setVis('clusters', vizMode === 'clusters');
      setVis('cluster-count', vizMode === 'clusters');
      setVis('unclustered-point', vizMode === 'clusters');
      setVis('all-points-direct', vizMode === 'points');

      // UNOSAT Layers
      setVis('unosat-buildings-halo', showUnosat);
      setVis('unosat-buildings', showUnosat);
    };

    if (mapLoadedRef.current) {
      applyVis();
    } else {
      map.once('load', applyVis);
    }
  }, [vizMode, showUnosat]);

  // Switch Basemap instantaneously without resetting GeoJSON sources
  const handleBasemapChange = (newKey) => {
    setBasemap(newKey);
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;

    const mapping = {
      voyager: ['layer-voyager'],
      satellite: ['layer-satellite', 'layer-satellite-labels'],
      osm: ['layer-osm'],
      positron: ['layer-positron'],
      topo: ['layer-topo']
    };

    const activeLayers = mapping[newKey] || ['layer-voyager'];
    ['layer-voyager', 'layer-satellite', 'layer-satellite-labels', 'layer-osm', 'layer-positron', 'layer-topo'].forEach(
      (lid) => {
        if (map.getLayer(lid)) {
          map.setLayoutProperty(lid, 'visibility', activeLayers.includes(lid) ? 'visible' : 'none');
        }
      }
    );
  };

  // Camera Preset FlyTo
  const handlePresetClick = (key) => {
    setActivePreset(key);
    const preset = CAMERA_PRESETS[key];
    if (!preset || !mapRef.current) return;

    if (key === 'ukraine') {
      setScope('all');
    } else {
      setScope('kharkiv');
    }

    mapRef.current.flyTo({
      center: preset.center,
      zoom: preset.zoom,
      pitch: preset.pitch,
      duration: 1300,
      essential: true
    });
  };

  // Export GeoJSON
  const handleExportGeoJSON = () => {
    const blob = new Blob([JSON.stringify(filteredGeoJSON, null, 2)], {
      type: 'application/geo+json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kharkiv_ukraine_damage_${filteredGeoJSON.features.length}_events.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxMonthCount = Math.max(1, ...stats.monthsList.map((m) => m.count));

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-stone-100 select-none">
      {/* Fullscreen MapLibre Canvas */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Top Floating Navigation & Region Switcher Bar */}
      <header className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-lg rounded-xl px-4 py-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-700 text-white font-bold text-xs tracking-wider shadow-sm">
            Z_GIS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm tracking-tight">
                geoInnovation:lab+
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200">
                Ukraine & Kharkiv Recovery
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              PLUS University of Salzburg × O. M. Beketov National University of Urban Economy in Kharkiv
            </p>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-lg rounded-xl p-1.5">
          {Object.entries(CAMERA_PRESETS).map(([key, preset]) => {
            const isActive = activePreset === key;
            return (
              <button
                key={key}
                onClick={() => handlePresetClick(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {preset.label}
              </button>
            );
          })}

          <div className="h-5 w-px bg-slate-200 mx-1" />

          {/* UNOSAT Building Layer Toggle Button */}
          <button
            onClick={() => setShowUnosat(!showUnosat)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              showUnosat
                ? 'bg-rose-50 text-rose-700 border border-rose-300 shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
            title="Toggle UNOSAT Building-Level Damage Layer (VHR Satellite Analysis)"
          >
            <Building className="w-3.5 h-3.5 text-rose-600" />
            <span>UNOSAT Buildings (520)</span>
          </button>

          <button
            onClick={handleExportGeoJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-all"
            title="Download currently filtered events as GeoJSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export ({stats.total})</span>
          </button>
        </div>
      </header>

      {/* Left Floating Collapsible Analytics & Filter Panel */}
      <aside
        className={`absolute top-20 bottom-28 left-3 z-20 flex transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-[364px]'
        }`}
      >
        <div className="w-[356px] h-full bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl rounded-2xl flex flex-col overflow-hidden">
          {/* UNOSAT Ground-Truth Banner */}
          <div className="px-4 py-2 bg-gradient-to-r from-rose-50 to-orange-50 border-b border-rose-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-800">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>UNOSAT VHR Building Damage Active</span>
            </div>
            <button
              onClick={() => handlePresetClick('saltivka')}
              className="text-[10px] font-semibold text-rose-700 hover:underline"
            >
              Zoom Saltivka →
            </button>
          </div>

          <div className="p-4 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Civilian Harm & Recovery Overview
              </span>
              <span className="text-[11px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-200">
                {scope === 'kharkiv' ? 'Kharkiv Focus' : 'All Ukraine'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-sm">
                <div className="text-[10px] font-semibold uppercase text-slate-400">
                  Verified Incidents
                </div>
                <div className="text-xl font-bold text-slate-900 mt-0.5">
                  {loading ? '...' : stats.total.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500">
                  of {stats.nationalTotal.toLocaleString()} national
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-violet-200/90 shadow-sm">
                <div className="text-[10px] font-semibold uppercase text-violet-600">
                  Kharkiv Burden
                </div>
                <div className="text-xl font-bold text-violet-700 mt-0.5">
                  {stats.kharkivPct}%
                </div>
                <div className="text-[11px] text-slate-500">
                  {stats.kharkivTotal} events in Kharkiv
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-sm">
                <div className="text-[10px] font-semibold uppercase text-slate-400">
                  Residential / Housing
                </div>
                <div className="text-lg font-bold text-rose-600 mt-0.5">
                  {stats.residentialCount.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500">
                  Urban housing recovery
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-sm">
                <div className="text-[10px] font-semibold uppercase text-slate-400">
                  Schools & Healthcare
                </div>
                <div className="text-lg font-bold text-amber-600 mt-0.5">
                  {stats.socialInfraCount.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500">
                  Social infrastructure
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-slate-100 space-y-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Map Representation
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setVizMode('clusters')}
                  className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    vizMode === 'clusters'
                      ? 'bg-white text-violet-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CircleDot className="w-3.5 h-3.5" />
                  <span>Clusters</span>
                </button>
                <button
                  onClick={() => setVizMode('points')}
                  className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    vizMode === 'points'
                      ? 'bg-white text-violet-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>All Points</span>
                </button>
                <button
                  onClick={() => setVizMode('heatmap')}
                  className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    vizMode === 'heatmap'
                      ? 'bg-white text-rose-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Heatmap</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Study Area Filter
                </label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-violet-500"
                >
                  <option value="all">All Ukraine (2,512)</option>
                  <option value="kharkiv">Kharkiv Region (789)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-violet-500"
                >
                  <option value="ALL">All Years (2022–2025)</option>
                  <option value="2022">2022</option>
                  <option value="2023">2023</option>
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                </select>
              </div>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search location, hospital, school, Saltivka..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-violet-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* UNOSAT Building Assessment Card */}
            <div className="bg-white rounded-xl border border-rose-200/80 p-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                  UNOSAT Building Damage (520)
                </span>
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  North Kharkiv
                </span>
              </div>
              <div className="space-y-1">
                {Object.entries(UNOSAT_GRADES).map(([grade, info]) => (
                  <div key={grade} className="flex items-center justify-between text-xs py-0.5">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: info.color }} />
                      <span className="text-[11px] font-medium">{grade}</span>
                    </span>
                    <span className="font-bold text-slate-800 text-[11px]">{info.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Civilian Infrastructure Sectors
                </span>
                {(selectedSector !== 'ALL' || selectedYear !== 'ALL' || searchQuery || scope !== 'all') && (
                  <button
                    onClick={() => {
                      setSelectedSector('ALL');
                      setSelectedYear('ALL');
                      setSearchQuery('');
                      setScope('all');
                    }}
                    className="flex items-center gap-1 text-[11px] font-semibold text-violet-600 hover:text-violet-800"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                {stats.sortedSectors.map(([sec, count]) => {
                  const cfg = SECTOR_CONFIG[sec] || SECTOR_CONFIG['Unclassified Civilian'];
                  const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                  const isSelected = selectedSector === sec;

                  return (
                    <button
                      key={sec}
                      onClick={() => setSelectedSector(isSelected ? 'ALL' : sec)}
                      className={`w-full text-left p-2 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-violet-50/90 border-violet-300 shadow-sm'
                          : 'bg-white hover:bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="flex items-center gap-2 font-semibold text-slate-700 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cfg.color }}
                          />
                          <span className="truncate">{cfg.label}</span>
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500 shrink-0 ml-2">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.max(3, pct)}%`,
                            backgroundColor: cfg.color
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="self-start mt-4 ml-1.5 bg-white/95 backdrop-blur-md border border-slate-200 shadow-md rounded-xl p-2 text-slate-600 hover:text-slate-900"
          title={sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </aside>

      {/* Right Floating Basemap Switcher Card */}
      <div className="absolute top-20 right-3 z-20 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-lg rounded-2xl p-2 flex flex-col gap-1 w-48">
        <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <Layers className="w-3.5 h-3.5 text-violet-600" />
          <span>Basemap Layers</span>
        </div>
        {Object.entries(BASEMAPS).map(([key, bm]) => {
          const active = basemap === key;
          return (
            <button
              key={key}
              onClick={() => handleBasemapChange(key)}
              className={`flex flex-col text-left px-2.5 py-1.5 rounded-xl transition-all ${
                active
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <span className="text-xs font-semibold">{bm.name}</span>
              <span className={`text-[10px] ${active ? 'text-violet-100' : 'text-slate-400'}`}>
                {bm.subtitle}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Incident Inspector Modal Card */}
      {selectedEvent && (
        <div className="absolute bottom-28 right-16 z-30 w-84 bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            {selectedEvent.is_unosat ? (
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white shadow-sm"
                style={{ backgroundColor: selectedEvent.damage_color || '#e11d48' }}
              >
                UNOSAT: {selectedEvent.damage_grade}
              </span>
            ) : (
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white shadow-sm"
                style={{
                  backgroundColor:
                    SECTOR_CONFIG[selectedEvent.primary_sector]?.color || '#7c3aed'
                }}
              >
                {SECTOR_CONFIG[selectedEvent.primary_sector]?.label || selectedEvent.primary_sector}
              </span>
            )}
            <button
              onClick={() => setSelectedEvent(null)}
              className="text-slate-400 hover:text-slate-700 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h3 className="font-bold text-slate-900 text-sm mb-1">
            {selectedEvent.is_unosat ? `Structure #${selectedEvent.id}` : (selectedEvent.location || 'Ukraine')}
          </h3>

          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>{selectedEvent.assessment_date || selectedEvent.date}</span>
            <span>•</span>
            <span className="font-mono text-[11px]">
              {selectedEvent.is_unosat ? `Confidence: ${selectedEvent.confidence}` : `ID: ${selectedEvent.id}`}
            </span>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3">
            {selectedEvent.is_unosat
              ? (selectedEvent.damage_description || 'High-resolution satellite imagery verified structural building damage.')
              : (selectedEvent.description || 'Verified civilian infrastructure damage incident.')}
          </p>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Coords: {selectedEvent.coordinates[1].toFixed(4)}, {selectedEvent.coordinates[0].toFixed(4)}
            </span>
            {selectedEvent.is_unosat ? (
              <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                UNOSAT CE20220223UKR
              </span>
            ) : (
              selectedEvent.source_url && (
                <a
                  href={selectedEvent.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-violet-600 hover:text-violet-800"
                >
                  <span>Source</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )
            )}
          </div>
        </div>
      )}

      {/* Floating UNOSAT Damage Grade Legend on Bottom Right */}
      {showUnosat && (
        <div className="absolute bottom-28 right-3 z-20 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-lg rounded-2xl p-3 w-56">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            <Building className="w-3.5 h-3.5 text-rose-600" />
            <span>UNOSAT Damage Grades</span>
          </div>
          <div className="space-y-1.5">
            {Object.entries(UNOSAT_GRADES).map(([grade, info]) => (
              <div key={grade} className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: info.color }} />
                  <span>{grade}</span>
                </span>
                <span className="font-semibold text-slate-500">{info.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Timeline Scrubber Bar */}
      <div className="absolute bottom-3 left-3 right-14 z-20 bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 shadow-2xl rounded-2xl px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-300">
              Showing <strong className="text-white">{stats.total.toLocaleString()}</strong> verified civilian events
            </span>
            <span className="text-xs font-bold tracking-wide text-violet-300 bg-violet-950/80 border border-violet-700/60 px-2.5 py-0.5 rounded-md">
              01 FEB 2022 – 01 SEP 2025
            </span>
          </div>

          <div className="flex items-center gap-1">
            {['ALL', '2022', '2023', '2024', '2025'].map((yr) => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr)}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                  selectedYear === yr
                    ? 'bg-violet-500 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {yr === 'ALL' ? 'All Years' : yr}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-end gap-1 h-10 pt-1">
          {stats.monthsList.map((item) => {
            const heightPct = Math.max(8, Math.round((item.count / maxMonthCount) * 100));
            const isYearActive = selectedYear === 'ALL' || selectedYear === item.year;
            return (
              <div
                key={item.ym}
                onClick={() => setSelectedYear(selectedYear === item.year ? 'ALL' : item.year)}
                title={`${item.ym}: ${item.count} verified incidents`}
                className="flex-1 h-full flex items-end cursor-pointer group"
              >
                <div
                  className={`w-full rounded-t-sm transition-all ${
                    isYearActive
                      ? 'bg-violet-500 group-hover:bg-emerald-400'
                      : 'bg-slate-700 opacity-40 group-hover:opacity-80'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
