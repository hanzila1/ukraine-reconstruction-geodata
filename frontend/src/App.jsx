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
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Building2,
  ShieldAlert,
  Info,
  Check,
  Eye,
  EyeOff,
  Filter,
  Maximize2,
  X
} from 'lucide-react';

/* ==========================================================================
   LAB BRAND COLOR PALETTE (From GeoinnovationLab+ Flyer)
   Primary Navy: #00364e | Deep Navy: #002233 | Accent Green (+): #16a34a / #22c55e
   Secondary Petrol: #0284c7 | Soft Slate: #f8fafc | Border: #e2e8f0
   ========================================================================== */

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
  'Destroyed': { color: '#ef4444', count: 45, label: 'Destroyed', desc: 'Structure flattened / total collapse' },
  'Severe Damage': { color: '#f97316', count: 149, label: 'Severe Damage', desc: 'Major wall collapse / roof failure' },
  'Moderate Damage': { color: '#eab308', count: 236, label: 'Moderate Damage', desc: 'Impact craters / facade blast damage' },
  'Possible Damage': { color: '#94a3b8', count: 59, label: 'Possible Damage', desc: 'Surrounding structural debris' },
  'Impact Crater / Field': { color: '#a855f7', count: 29, label: 'Impact Crater', desc: 'Direct munition impact crater' }
};

const BASEMAPS = {
  satellite: {
    name: 'Satellite Hybrid',
    subtitle: 'Esri VHR Imagery + Labels',
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    ],
    overlayLabels: [
      'https://a.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}@2x.png'
    ],
    attribution: 'Tiles © Esri — Maxar, Earthstar Geographics'
  },
  voyager: {
    name: 'Terrain & Streets',
    subtitle: 'Daylight Cartography',
    tiles: [
      'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
      'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
      'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'
    ],
    attribution: '© OpenStreetMap contributors © CARTO'
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
    subtitle: 'Carto Positron Light',
    tiles: [
      'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
      'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png'
    ],
    attribution: '© OpenStreetMap contributors © CARTO'
  },
  topo: {
    name: 'Topographic Relief',
    subtitle: 'Elevation Contours',
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
  '#0284c7'
];

function createInitialStyle() {
  const sources = {
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
    'bm-voyager': {
      type: 'raster',
      tiles: BASEMAPS.voyager.tiles,
      tileSize: 256,
      attribution: BASEMAPS.voyager.attribution
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
    // 1. Basemap Raster Layers (Satellite is default)
    { id: 'layer-satellite', type: 'raster', source: 'bm-satellite', layout: { visibility: 'visible' } },
    { id: 'layer-satellite-labels', type: 'raster', source: 'bm-satellite-labels', layout: { visibility: 'visible' } },
    { id: 'layer-voyager', type: 'raster', source: 'bm-voyager', layout: { visibility: 'none' } },
    { id: 'layer-osm', type: 'raster', source: 'bm-osm', layout: { visibility: 'none' } },
    { id: 'layer-positron', type: 'raster', source: 'bm-positron', layout: { visibility: 'none' } },
    { id: 'layer-topo', type: 'raster', source: 'bm-topo', layout: { visibility: 'none' } },

    // 2. Heatmap Layer (Bellingcat Incidents)
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
          0, 'rgba(0, 54, 78, 0)',
          0.2, 'rgba(2, 132, 199, 0.45)',
          0.45, 'rgba(22, 163, 74, 0.72)',
          0.7, 'rgba(234, 179, 8, 0.88)',
          0.9, 'rgba(239, 68, 68, 0.95)',
          1, 'rgba(254, 240, 138, 1)'
        ],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 4, 14, 10, 26, 14, 38],
        'heatmap-opacity': 0.88
      }
    },

    // 3. Bellingcat Incidents: Proportional Lab-Navy Cluster Halo & Circles
    {
      id: 'cluster-halo',
      type: 'circle',
      source: 'damage-clustered',
      filter: ['has', 'point_count'],
      layout: { visibility: 'visible' },
      paint: {
        'circle-color': '#00364e',
        'circle-opacity': 0.3,
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
        'circle-color': '#00364e',
        'circle-opacity': 0.88,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#22c55e',
        'circle-stroke-opacity': 0.95,
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

    // 4. Bellingcat Individual Unclustered Points (Round Incident Markers)
    {
      id: 'unclustered-point-halo',
      type: 'circle',
      source: 'damage-clustered',
      filter: ['!', ['has', 'point_count']],
      layout: { visibility: 'visible' },
      paint: {
        'circle-color': COLOR_MATCH_EXPR,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 8, 12, 12, 16, 16],
        'circle-opacity': 0.28
      }
    },
    {
      id: 'unclustered-point',
      type: 'circle',
      source: 'damage-clustered',
      filter: ['!', ['has', 'point_count']],
      layout: { visibility: 'visible' },
      paint: {
        'circle-color': COLOR_MATCH_EXPR,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 4.5, 12, 6.5, 16, 8.5],
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.95
      }
    },

    // 5. Bellingcat All Points Direct (In 'points' view mode)
    {
      id: 'all-points-direct',
      type: 'circle',
      source: 'damage-raw',
      layout: { visibility: 'none' },
      paint: {
        'circle-color': COLOR_MATCH_EXPR,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 4, 10, 6, 15, 8],
        'circle-stroke-width': 1.2,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.9
      }
    },

    // 6. PILLAR 2: UNOSAT BUILDING-LEVEL DAMAGE (Visual Disambiguation)
    // Styled as Tactical High-Contrast Building Badges with Black Outlines & Outer Target Rings
    {
      id: 'unosat-buildings-target',
      type: 'circle',
      source: 'unosat-damage',
      layout: { visibility: 'visible' },
      paint: {
        'circle-color': 'rgba(0,0,0,0)',
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 6, 14, 11, 17, 18],
        'circle-stroke-width': 1.5,
        'circle-stroke-color': ['get', 'damage_color'],
        'circle-stroke-opacity': 0.85
      }
    },
    {
      id: 'unosat-buildings-halo',
      type: 'circle',
      source: 'unosat-damage',
      layout: { visibility: 'visible' },
      paint: {
        'circle-color': ['get', 'damage_color'],
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 4, 14, 8, 17, 14],
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
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 3, 14, 5.5, 17, 9.5],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#000000',
        'circle-opacity': 1.0
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

  // UI & Drawer States
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [timelineOpen, setTimelineOpen] = useState(false); // Collapsible Timeline
  const [basemapOpen, setBasemapOpen] = useState(false); // Collapsible Basemap Picker
  const [legendOpen, setLegendOpen] = useState(true); // Collapsible Legend

  // Map & Filter States
  const [activePreset, setActivePreset] = useState('kharkiv_city');
  const [basemap, setBasemap] = useState('satellite'); // DEFAULT: Satellite Hybrid
  const [layerVisibility, setLayerVisibility] = useState('both'); // 'both' | 'bellingcat' | 'unosat'
  const [scope, setScope] = useState('kharkiv'); // 'all' or 'kharkiv'
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [vizMode, setVizMode] = useState('clusters'); // 'clusters' | 'points' | 'heatmap'
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
      center: CAMERA_PRESETS.kharkiv_city.center,
      zoom: CAMERA_PRESETS.kharkiv_city.zoom,
      pitch: CAMERA_PRESETS.kharkiv_city.pitch,
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
        zoom: zoom + 0.6,
        duration: 650
      });
    });

    // Click individual Bellingcat incident point
    const handleBellingcatClick = (e) => {
      if (!e.features || !e.features.length) return;
      const feat = e.features[0];
      const coords = feat.geometry.coordinates.slice();
      setSelectedEvent({
        ...feat.properties,
        dataset_source: 'bellingcat',
        coordinates: coords
      });
      map.easeTo({ center: coords, duration: 450 });
    };

    map.on('click', 'unclustered-point', handleBellingcatClick);
    map.on('click', 'all-points-direct', handleBellingcatClick);

    // Click UNOSAT building damage point
    map.on('click', 'unosat-buildings', (e) => {
      if (!e.features || !e.features.length) return;
      const feat = e.features[0];
      const coords = feat.geometry.coordinates.slice();
      setSelectedEvent({
        ...feat.properties,
        dataset_source: 'unosat',
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

  // Update layer visibilities when vizMode or layerVisibility changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const applyVis = () => {
      const setVis = (id, vis) => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', vis ? 'visible' : 'none');
        }
      };

      const showBellingcat = layerVisibility === 'both' || layerVisibility === 'bellingcat';
      const showUnosat = layerVisibility === 'both' || layerVisibility === 'unosat';

      // Bellingcat Layers
      setVis('damage-heat', showBellingcat && vizMode === 'heatmap');
      setVis('cluster-halo', showBellingcat && vizMode === 'clusters');
      setVis('clusters', showBellingcat && vizMode === 'clusters');
      setVis('cluster-count', showBellingcat && vizMode === 'clusters');
      setVis('unclustered-point-halo', showBellingcat && vizMode === 'clusters');
      setVis('unclustered-point', showBellingcat && vizMode === 'clusters');
      setVis('all-points-direct', showBellingcat && vizMode === 'points');

      // UNOSAT Layers
      setVis('unosat-buildings-target', showUnosat);
      setVis('unosat-buildings-halo', showUnosat);
      setVis('unosat-buildings', showUnosat);
    };

    if (mapLoadedRef.current) {
      applyVis();
    } else {
      map.once('load', applyVis);
    }
  }, [vizMode, layerVisibility]);

  // Switch Basemap instantaneously
  const handleBasemapChange = (newKey) => {
    setBasemap(newKey);
    setBasemapOpen(false); // Close dropdown on selection
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;

    const mapping = {
      satellite: ['layer-satellite', 'layer-satellite-labels'],
      voyager: ['layer-voyager'],
      osm: ['layer-osm'],
      positron: ['layer-positron'],
      topo: ['layer-topo']
    };

    const activeLayers = mapping[newKey] || ['layer-satellite', 'layer-satellite-labels'];
    ['layer-satellite', 'layer-satellite-labels', 'layer-voyager', 'layer-osm', 'layer-positron', 'layer-topo'].forEach(
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
    a.download = `kharkiv_recovery_dataset_${filteredGeoJSON.features.length}_events.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxMonthCount = Math.max(1, ...stats.monthsList.map((m) => m.count));

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#001f2e] select-none text-slate-800">
      {/* Fullscreen MapLibre Canvas */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Top Floating Navigation & Brand Header (Styled with Salzburg Lab Palette) */}
      <header className="absolute top-3.5 left-3.5 right-3.5 z-20 flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
        
        {/* Lab Brand Badge: Deep Navy #00364e + Emerald Green '+' */}
        <div className="pointer-events-auto flex items-center gap-3 bg-[#002b3d]/95 backdrop-blur-md border border-[#004b6b] shadow-xl rounded-2xl px-4 py-2.5 text-white">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#16a34a] to-[#0d9488] text-white font-black text-sm tracking-tight shadow-md border border-white/20">
            Z+
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm tracking-tight flex items-center">
                geoInnovation:lab<span className="text-[#22c55e] font-black ml-0.5 text-base">+</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#16a34a]/25 text-[#4ade80] border border-[#16a34a]/40 uppercase tracking-wide">
                Ukraine Recovery
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium">
              Z_GIS University of Salzburg × O.M. Beketov Urban Economy University Kharkiv
            </p>
          </div>
        </div>

        {/* Central View Presets & Layer Filter Pills */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl rounded-2xl p-1.5">
          {Object.entries(CAMERA_PRESETS).map(([key, preset]) => {
            const isActive = activePreset === key;
            return (
              <button
                key={key}
                onClick={() => handlePresetClick(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#00364e] text-white shadow-sm ring-1 ring-[#16a34a]'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {preset.label}
              </button>
            );
          })}

          <div className="h-5 w-px bg-slate-200 mx-1" />

          {/* Layer Source Disambiguation Selector */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setLayerVisibility('both')}
              className={`px-2.5 py-1 rounded-lg transition-all text-[11px] font-semibold ${
                layerVisibility === 'both'
                  ? 'bg-white text-[#00364e] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Layers
            </button>
            <button
              onClick={() => setLayerVisibility('bellingcat')}
              className={`px-2.5 py-1 rounded-lg transition-all text-[11px] font-semibold flex items-center gap-1 ${
                layerVisibility === 'bellingcat'
                  ? 'bg-white text-[#0284c7] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Show only Macro Civilian Incidents (Bellingcat)"
            >
              <span className="w-2 h-2 rounded-full bg-[#0284c7]" />
              <span>Incidents (789)</span>
            </button>
            <button
              onClick={() => setLayerVisibility('unosat')}
              className={`px-2.5 py-1 rounded-lg transition-all text-[11px] font-semibold flex items-center gap-1 ${
                layerVisibility === 'unosat'
                  ? 'bg-white text-rose-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Show only UNOSAT Building-Level Damage (Saltivka VHR Satellite)"
            >
              <span className="w-2 h-2 bg-rose-500 rounded-sm border border-black" />
              <span>UNOSAT Buildings (520)</span>
            </button>
          </div>

          <div className="h-5 w-px bg-slate-200 mx-1" />

          <button
            onClick={handleExportGeoJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#16a34a]/10 text-[#15803d] border border-[#16a34a]/30 hover:bg-[#16a34a] hover:text-white transition-all shadow-sm"
            title="Download currently filtered events as GeoJSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export ({stats.total})</span>
          </button>
        </div>

        {/* Collapsible Basemap Trigger Button (Right Dock) */}
        <div className="pointer-events-auto relative">
          <button
            onClick={() => setBasemapOpen(!basemapOpen)}
            className="flex items-center gap-2 bg-[#002b3d]/95 backdrop-blur-md text-white border border-[#004b6b] hover:border-[#16a34a] shadow-xl rounded-2xl px-3.5 py-2 text-xs font-semibold transition-all"
          >
            <Layers className="w-3.5 h-3.5 text-[#22c55e]" />
            <span>{BASEMAPS[basemap]?.name || 'Basemap'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${basemapOpen ? 'rotate-180 text-[#22c55e]' : 'text-slate-400'}`} />
          </button>

          {/* Dropdown Menu for Basemaps */}
          {basemapOpen && (
            <div className="absolute top-12 right-0 w-52 bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl p-2 z-30 animate-in fade-in slide-in-from-top-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 mb-1">
                Select Base Cartography
              </div>
              {Object.entries(BASEMAPS).map(([key, bm]) => {
                const active = basemap === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleBasemapChange(key)}
                    className={`w-full flex flex-col text-left px-2.5 py-1.5 rounded-xl transition-all ${
                      active
                        ? 'bg-[#00364e] text-white shadow-sm ring-1 ring-[#16a34a]'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold">{bm.name}</span>
                      {active && <Check className="w-3.5 h-3.5 text-[#22c55e]" />}
                    </div>
                    <span className={`text-[10px] ${active ? 'text-slate-300' : 'text-slate-400'}`}>
                      {bm.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {/* Left Floating Collapsible Analytics Drawer */}
      <aside
        className={`absolute top-20 bottom-14 left-3.5 z-20 flex transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-[364px]'
        }`}
      >
        <div className="w-[356px] h-full bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-2xl rounded-2xl flex flex-col overflow-hidden">
          
          {/* Header Strip with Lab Branding */}
          <div className="px-4 py-2.5 bg-gradient-to-r from-[#00364e] to-[#004b6b] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
              <span className="text-xs font-bold tracking-tight">Recovery Decision Support</span>
            </div>
            <span className="text-[10px] font-semibold bg-white/15 px-2 py-0.5 rounded-full border border-white/20 text-slate-100">
              {scope === 'kharkiv' ? 'Kharkiv Focus' : 'National'}
            </span>
          </div>

          {/* Quick Metrics Grid */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/70">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Verified Civilian Incidents
                </div>
                <div className="text-lg font-black text-[#00364e] mt-0.5">
                  {loading ? '...' : stats.total.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500">
                  Macro damage events
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-[#16a34a]/40 shadow-sm bg-gradient-to-br from-emerald-50/40 to-white">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#15803d]">
                  UNOSAT VHR Buildings
                </div>
                <div className="text-lg font-black text-[#15803d] mt-0.5">
                  520
                </div>
                <div className="text-[10px] text-slate-500">
                  North Saltivka footprints
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Residential Housing
                </div>
                <div className="text-base font-bold text-rose-600 mt-0.5">
                  {stats.residentialCount.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500">
                  Primary recovery need
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Schools & Hospitals
                </div>
                <div className="text-base font-bold text-amber-600 mt-0.5">
                  {stats.socialInfraCount.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500">
                  Critical social assets
                </div>
              </div>
            </div>
          </div>

          {/* Filters & Map Representation */}
          <div className="p-3.5 border-b border-slate-100 space-y-2.5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Incident Representation
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setVizMode('clusters')}
                  className={`flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-semibold transition-all ${
                    vizMode === 'clusters'
                      ? 'bg-[#00364e] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CircleDot className="w-3 h-3 text-[#22c55e]" />
                  <span>Clusters</span>
                </button>
                <button
                  onClick={() => setVizMode('points')}
                  className={`flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-semibold transition-all ${
                    vizMode === 'points'
                      ? 'bg-[#00364e] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MapPin className="w-3 h-3 text-[#22c55e]" />
                  <span>All Points</span>
                </button>
                <button
                  onClick={() => setVizMode('heatmap')}
                  className={`flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-semibold transition-all ${
                    vizMode === 'heatmap'
                      ? 'bg-[#00364e] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Flame className="w-3 h-3 text-amber-400" />
                  <span>Heatmap</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Scope
                </label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00364e]"
                >
                  <option value="kharkiv">Kharkiv Focus (789)</option>
                  <option value="all">All Ukraine (2,512)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Incident Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00364e]"
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
                placeholder="Search Saltivka, hospital, bridge, school..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#00364e]"
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

          {/* Interactive Sector Breakdown */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Impacted Civilian Sectors
                </span>
                {(selectedSector !== 'ALL' || selectedYear !== 'ALL' || searchQuery || scope !== 'kharkiv') && (
                  <button
                    onClick={() => {
                      setSelectedSector('ALL');
                      setSelectedYear('ALL');
                      setSearchQuery('');
                      setScope('kharkiv');
                    }}
                    className="flex items-center gap-1 text-[10px] font-bold text-[#16a34a] hover:text-[#15803d]"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              <div className="space-y-1">
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
                          ? 'bg-[#00364e]/5 border-[#00364e] shadow-sm ring-1 ring-[#00364e]'
                          : 'bg-white hover:bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="flex items-center gap-2 font-semibold text-slate-700 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cfg.color }}
                          />
                          <span className="truncate text-[11px]">{cfg.label}</span>
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 shrink-0 ml-2">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
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

        {/* Drawer Collapse Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="self-start mt-3.5 ml-1.5 bg-[#002b3d]/95 backdrop-blur-md border border-[#004b6b] text-white shadow-xl rounded-xl p-2 hover:bg-[#00364e] transition-all"
          title={sidebarOpen ? 'Hide Drawer' : 'Show Drawer'}
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4 text-[#22c55e]" /> : <ChevronRight className="w-4 h-4 text-[#22c55e]" />}
        </button>
      </aside>

      {/* Selected Incident Inspector Modal Card */}
      {selectedEvent && (
        <div className="absolute bottom-20 right-16 z-30 w-84 bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-start justify-between gap-2 mb-2">
            {selectedEvent.dataset_source === 'unosat' ? (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm"
                style={{ backgroundColor: selectedEvent.damage_color || '#e11d48' }}
              >
                <Building2 className="w-3 h-3" />
                <span>UNOSAT: {selectedEvent.damage_grade}</span>
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm"
                style={{
                  backgroundColor:
                    SECTOR_CONFIG[selectedEvent.primary_sector]?.color || '#0284c7'
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                <span>{SECTOR_CONFIG[selectedEvent.primary_sector]?.label || selectedEvent.primary_sector}</span>
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
            {selectedEvent.dataset_source === 'unosat' ? `Assessed Structure ${selectedEvent.id}` : (selectedEvent.location || 'Kharkiv Region')}
          </h3>

          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{selectedEvent.assessment_date || selectedEvent.date}</span>
            <span>•</span>
            <span className="font-mono text-[10px] text-slate-600">
              {selectedEvent.dataset_source === 'unosat' ? `Confidence: ${selectedEvent.confidence}` : `ID: ${selectedEvent.id}`}
            </span>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3">
            {selectedEvent.dataset_source === 'unosat'
              ? (selectedEvent.damage_description || 'High-resolution satellite imagery verified structural building damage.')
              : (selectedEvent.description || 'Verified civilian infrastructure damage incident.')}
          </p>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <span>
              Coords: {selectedEvent.coordinates[1].toFixed(4)}, {selectedEvent.coordinates[0].toFixed(4)}
            </span>
            {selectedEvent.dataset_source === 'unosat' ? (
              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                UNOSAT CE20220223UKR
              </span>
            ) : (
              selectedEvent.source_url && (
                <a
                  href={selectedEvent.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-[#00364e] hover:text-[#16a34a]"
                >
                  <span>Verification Source</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )
            )}
          </div>
        </div>
      )}

      {/* Floating Collapsible Dual Legend (Disambiguating Bellingcat vs UNOSAT) */}
      <div className="absolute bottom-14 right-3.5 z-20">
        {legendOpen ? (
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl rounded-2xl p-3.5 w-64 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#00364e]">
                Data Visual Disambiguation
              </span>
              <button
                onClick={() => setLegendOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-[10px]"
              >
                Hide
              </button>
            </div>

            {/* UNOSAT Buildings Legend */}
            <div className="mb-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-800 mb-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 border border-black" />
                <span>UNOSAT Building Footprints (VHR)</span>
              </div>
              <div className="space-y-1 pl-4 text-[10px]">
                {Object.entries(UNOSAT_GRADES).map(([grade, info]) => (
                  <div key={grade} className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full border border-black" style={{ backgroundColor: info.color }} />
                      <span>{info.label}</span>
                    </span>
                    <span className="font-bold text-slate-800">{info.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bellingcat Incidents Legend */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#00364e] mb-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7] border-2 border-white" />
                <span>Civilian Incident Reports</span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 pl-4 text-[10px] text-slate-600">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-600" /> Residential
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Education
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-600" /> Healthcare
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-600" /> Transport
                </span>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setLegendOpen(true)}
            className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-lg rounded-2xl px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-[#00364e] flex items-center gap-1.5"
          >
            <Info className="w-3.5 h-3.5 text-[#16a34a]" />
            <span>Map Legend</span>
          </button>
        )}
      </div>

      {/* Bottom Collapsible Temporal Bar (Bellingcat Style) */}
      <div className="absolute bottom-3 left-3.5 right-3.5 z-20">
        {timelineOpen ? (
          <div className="bg-[#002b3d]/95 backdrop-blur-md text-white border border-[#004b6b] shadow-2xl rounded-2xl px-5 py-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-200">
                  Showing <strong className="text-white">{stats.total.toLocaleString()}</strong> verified civilian incidents
                </span>
                <span className="text-[10px] font-bold tracking-wide text-[#4ade80] bg-[#16a34a]/20 border border-[#16a34a]/40 px-2 py-0.5 rounded-md">
                  FEB 2022 – SEP 2025
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {['ALL', '2022', '2023', '2024', '2025'].map((yr) => (
                    <button
                      key={yr}
                      onClick={() => setSelectedYear(yr)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                        selectedYear === yr
                          ? 'bg-[#16a34a] text-white shadow-sm'
                          : 'text-slate-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {yr === 'ALL' ? 'All' : yr}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setTimelineOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 ml-2"
                  title="Minimize Timeline"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Monthly Histogram Bars */}
            <div className="flex items-end gap-1 h-9 pt-1">
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
                          ? 'bg-[#22c55e] group-hover:bg-[#4ade80]'
                          : 'bg-slate-600 opacity-40 group-hover:opacity-80'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between pointer-events-none">
            <button
              onClick={() => setTimelineOpen(true)}
              className="pointer-events-auto bg-[#002b3d]/95 backdrop-blur-md text-white border border-[#004b6b] hover:border-[#16a34a] shadow-xl rounded-2xl px-3.5 py-1.5 text-xs font-semibold flex items-center gap-2 hover:bg-[#00364e] transition-all"
            >
              <Calendar className="w-3.5 h-3.5 text-[#22c55e]" />
              <span>Timeline (2022–2025)</span>
              <ChevronUp className="w-3.5 h-3.5 text-[#22c55e]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
