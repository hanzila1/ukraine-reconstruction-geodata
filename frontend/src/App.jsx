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
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Building2,
  Info,
  Check,
  Crosshair,
  SlidersHorizontal,
  Map as MapIcon,
  ShieldAlert,
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
    shortLabel: 'Ukraine',
    center: [34.2, 48.35],
    zoom: 5.3,
    pitch: 0
  },
  kharkiv_oblast: {
    label: 'Kharkiv Oblast',
    shortLabel: 'Oblast',
    center: [36.55, 49.55],
    zoom: 7.4,
    pitch: 0
  },
  kharkiv_city: {
    label: 'Kharkiv Districts',
    shortLabel: 'City Districts',
    center: [36.265, 49.995],
    zoom: 11.1,
    pitch: 12
  },
  saltivka: {
    label: 'North Saltivka',
    shortLabel: 'Saltivka',
    center: [36.352, 50.041],
    zoom: 14.1,
    pitch: 28
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
    // Administrative Boundaries
    'main-boundaries': {
      type: 'geojson',
      data: '/data/kharkiv_main_boundaries.geojson'
    },
    'urban-districts': {
      type: 'geojson',
      data: '/data/kharkiv_urban_districts.geojson'
    },
    // Damage Datasets
    'damage-clustered': {
      type: 'geojson',
      data: '/data/ukraine_civilian_damage.geojson',
      cluster: true,
      clusterMaxZoom: 13,
      clusterRadius: 46
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
    // 1. Basemap Raster Layers (Satellite Hybrid Default)
    { id: 'layer-satellite', type: 'raster', source: 'bm-satellite', layout: { visibility: 'visible' } },
    { id: 'layer-voyager', type: 'raster', source: 'bm-voyager', layout: { visibility: 'none' } },
    { id: 'layer-osm', type: 'raster', source: 'bm-osm', layout: { visibility: 'none' } },
    { id: 'layer-positron', type: 'raster', source: 'bm-positron', layout: { visibility: 'none' } },
    { id: 'layer-topo', type: 'raster', source: 'bm-topo', layout: { visibility: 'none' } },

    // 2. ADMINISTRATIVE BOUNDARIES (Oblast, City Municipality, and 9 Urban Districts)
    // 2a. Kharkiv Oblast Subtle Fill & Outer Dashed Perimeter
    {
      id: 'oblast-fill',
      type: 'fill',
      source: 'main-boundaries',
      filter: ['==', ['get', 'boundary_type'], 'oblast'],
      maxzoom: 9.5,
      paint: {
        'fill-color': '#22c55e',
        'fill-opacity': 0.06
      }
    },
    {
      id: 'oblast-outline-glow',
      type: 'line',
      source: 'main-boundaries',
      filter: ['==', ['get', 'boundary_type'], 'oblast'],
      paint: {
        'line-color': '#00364e',
        'line-width': 5,
        'line-opacity': 0.65
      }
    },
    {
      id: 'oblast-outline',
      type: 'line',
      source: 'main-boundaries',
      filter: ['==', ['get', 'boundary_type'], 'oblast'],
      paint: {
        'line-color': '#22c55e',
        'line-width': 2.5,
        'line-dasharray': [3, 2],
        'line-opacity': 0.95
      }
    },

    // 2b. 9 Kharkiv City Urban Districts (Interactive Choropleth + Crisp Borders)
    {
      id: 'districts-fill',
      type: 'fill',
      source: 'urban-districts',
      paint: {
        'fill-color': ['get', 'fill_color'],
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          0.34,
          ['boolean', ['feature-state', 'selected'], false],
          0.38,
          0.16
        ]
      }
    },
    {
      id: 'districts-outline-casing',
      type: 'line',
      source: 'urban-districts',
      paint: {
        'line-color': '#001f2e',
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          5,
          3
        ],
        'line-opacity': 0.8
      }
    },
    {
      id: 'districts-outline',
      type: 'line',
      source: 'urban-districts',
      paint: {
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          '#4ade80',
          ['boolean', ['feature-state', 'hover'], false],
          '#38bdf8',
          '#e2e8f0'
        ],
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          3,
          ['boolean', ['feature-state', 'hover'], false],
          2.5,
          1.4
        ],
        'line-opacity': 0.95
      }
    },

    // 2c. Main Kharkiv City Outer Municipal Ring
    {
      id: 'city-outline',
      type: 'line',
      source: 'main-boundaries',
      filter: ['==', ['get', 'boundary_type'], 'city'],
      paint: {
        'line-color': '#22c55e',
        'line-width': 2.5,
        'line-opacity': 0.9
      }
    },

    // Satellite Hybrid Labels (Placed above district polygons so street/district names remain sharp)
    { id: 'layer-satellite-labels', type: 'raster', source: 'bm-satellite-labels', layout: { visibility: 'visible' } },

    // 3. Heatmap Layer (Calibrated Kernel so isolated points stay tight inside polygon borders)
    {
      id: 'damage-heat',
      type: 'heatmap',
      source: 'damage-raw',
      layout: { visibility: 'none' },
      paint: {
        'heatmap-weight': 1,
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 4, 0.35, 8, 0.7, 11, 1.25, 14, 2.0],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(0, 54, 78, 0)',
          0.18, 'rgba(2, 132, 199, 0.48)',
          0.42, 'rgba(22, 163, 74, 0.75)',
          0.68, 'rgba(234, 179, 8, 0.9)',
          0.88, 'rgba(239, 68, 68, 0.96)',
          1, 'rgba(254, 240, 138, 1)'
        ],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 4, 8, 7, 13, 10, 19, 14, 28],
        'heatmap-opacity': 0.88
      }
    },

    // 4. Bellingcat Incidents: Proportional Lab-Navy Cluster Halo & Circles
    {
      id: 'cluster-halo',
      type: 'circle',
      source: 'damage-clustered',
      filter: ['has', 'point_count'],
      layout: { visibility: 'visible' },
      paint: {
        'circle-color': '#00364e',
        'circle-opacity': 0.28,
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['get', 'point_count'],
          2, 17,
          25, 26,
          100, 38,
          400, 52,
          800, 66
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
        'circle-opacity': 0.9,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#22c55e',
        'circle-stroke-opacity': 0.95,
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['get', 'point_count'],
          2, 12,
          25, 19,
          100, 29,
          400, 42,
          800, 52
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

    // 5. Bellingcat Individual Unclustered Points (White-Bordered Soft Halo Circles)
    {
      id: 'unclustered-point-halo',
      type: 'circle',
      source: 'damage-clustered',
      filter: ['!', ['has', 'point_count']],
      layout: { visibility: 'visible' },
      paint: {
        'circle-color': COLOR_MATCH_EXPR,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 7, 12, 11, 16, 15],
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
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 4, 12, 6, 16, 8.5],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.95
      }
    },

    // 6. Bellingcat All Points Direct (In 'points' view mode)
    {
      id: 'all-points-direct',
      type: 'circle',
      source: 'damage-raw',
      layout: { visibility: 'none' },
      paint: {
        'circle-color': COLOR_MATCH_EXPR,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 3.5, 10, 5.5, 15, 8],
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.9
      }
    },

    // 7. PILLAR 2: UNOSAT BUILDING-LEVEL DAMAGE
    {
      id: 'unosat-buildings-target',
      type: 'circle',
      source: 'unosat-damage',
      minzoom: 12.5,
      layout: { visibility: 'visible' },
      paint: {
        'circle-color': 'rgba(0,0,0,0)',
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 12.5, 5, 14.5, 10, 17, 17],
        'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 12.5, 1, 15, 1.8],
        'circle-stroke-color': ['get', 'damage_color'],
        'circle-stroke-opacity': 0.85
      }
    },
    {
      id: 'unosat-buildings',
      type: 'circle',
      source: 'unosat-damage',
      layout: { visibility: 'visible' },
      paint: {
        'circle-color': ['get', 'damage_color'],
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 2, 11.5, 3.2, 14, 5.5, 17, 9.5],
        'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 8, 0.8, 12, 1.5, 15, 2.2],
        'circle-stroke-color': '#090d16',
        'circle-opacity': 0.96
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
  const hoveredDistrictIdRef = useRef(null);
  const selectedDistrictNumRef = useRef(null);

  const [allFeatures, setAllFeatures] = useState([]);
  const [unosatFeatures, setUnosatFeatures] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Layout Dock States (Zero Overlap Flex Architecture)
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('districts'); // 'districts' | 'incidents' | 'unosat'
  const [timelineOpen, setTimelineOpen] = useState(true);
  const [basemapOpen, setBasemapOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(true);

  // Map & Filter States
  const [activePreset, setActivePreset] = useState('kharkiv_city');
  const [basemap, setBasemap] = useState('satellite');
  const [boundaryMode, setBoundaryMode] = useState('choropleth'); // 'choropleth' | 'outlines' | 'off'
  const [layerVisibility, setLayerVisibility] = useState('both'); // 'both' | 'bellingcat' | 'unosat'
  const [scope, setScope] = useState('kharkiv');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [selectedUnosatGrade, setSelectedUnosatGrade] = useState('ALL');
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [vizMode, setVizMode] = useState('clusters');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null);

  // Fetch All Datasets
  useEffect(() => {
    Promise.all([
      fetch('/data/ukraine_civilian_damage.geojson').then((r) => r.json()),
      fetch('/data/unosat_kharkiv_building_damage.geojson').then((r) => r.json()),
      fetch('/data/kharkiv_urban_districts.geojson').then((r) => r.json())
    ])
      .then(([ukrData, unosatData, distData]) => {
        setAllFeatures(ukrData.features || []);
        setUnosatFeatures(unosatData.features || []);
        setDistrictsList(distData.features || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load GeoJSON datasets:', err);
        setLoading(false);
      });
  }, []);

  // Filtered Bellingcat GeoJSON & Analytics (Strictly Clipped to Polygon Boundaries)
  const { filteredGeoJSON, stats } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matched = [];
    const sectorCounts = {};
    const monthCounts = {};
    let kharkivTotal = 0;
    let residentialCount = 0;
    let socialInfraCount = 0;

    const targetDistrictId = selectedDistrict?.id || null;

    for (const f of allFeatures) {
      const p = f.properties || {};
      const inOblast = Boolean(p.in_kharkiv_oblast || p.is_kharkiv);
      const inCity = Boolean(p.in_kharkiv_city || p.district_id);

      if (inOblast) kharkivTotal++;

      // Strict Polygon Boundary Scope Filtering
      if (targetDistrictId) {
        if (p.district_id !== targetDistrictId) continue;
      } else if (scope === 'kharkiv_city') {
        if (!inCity) continue;
      } else if (scope === 'kharkiv') {
        if (!inOblast) continue;
      }

      if (selectedSector !== 'ALL' && !(p.sectors || '').includes(selectedSector)) continue;
      if (selectedYear !== 'ALL' && !(p.date || '').startsWith(selectedYear)) continue;

      if (q) {
        const hay = `${p.location || ''} ${p.description || ''} ${p.sectors || ''} ${p.district_name || ''} ${p.id || ''}`.toLowerCase();
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
        kharkivPct: allFeatures.length ? ((kharkivTotal / allFeatures.length) * 100).toFixed(1) : '22.1',
        residentialCount,
        socialInfraCount,
        sortedSectors,
        monthsList
      }
    };
  }, [allFeatures, scope, selectedSector, selectedYear, searchQuery, selectedDistrict]);

  // Filtered UNOSAT Building Damage GeoJSON (Strictly Clipped to District Polygon when Selected)
  const filteredUnosatGeoJSON = useMemo(() => {
    const targetDistrictId = selectedDistrict?.id || null;
    const matched = unosatFeatures.filter((f) => {
      const p = f.properties || {};
      if (selectedUnosatGrade !== 'ALL' && p.damage_grade !== selectedUnosatGrade) {
        return false;
      }
      if (targetDistrictId) {
        return p.district_id === targetDistrictId;
      }
      if (scope === 'kharkiv_city') {
        return Boolean(p.in_kharkiv_city || p.district_id);
      }
      return true;
    });
    return {
      type: 'FeatureCollection',
      features: matched
    };
  }, [unosatFeatures, selectedUnosatGrade, selectedDistrict, scope]);

  // Highlight selected district on map
  const setDistrictHighlightOnMap = (districtNum) => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;

    if (selectedDistrictNumRef.current !== null) {
      map.setFeatureState(
        { source: 'urban-districts', id: selectedDistrictNumRef.current },
        { selected: false }
      );
    }
    if (districtNum !== null) {
      map.setFeatureState(
        { source: 'urban-districts', id: districtNum },
        { selected: true }
      );
    }
    selectedDistrictNumRef.current = districtNum;
  };

  // Select a District from Sidebar or Map Click
  const handleSelectDistrict = (distProps) => {
    if (!distProps) {
      setSelectedDistrict(null);
      setDistrictHighlightOnMap(null);
      return;
    }

    // Toggle off if clicking same district
    if (selectedDistrict && selectedDistrict.id === distProps.id) {
      setSelectedDistrict(null);
      setDistrictHighlightOnMap(null);
      return;
    }

    const parsedBbox =
      typeof distProps.bbox === 'string' ? JSON.parse(distProps.bbox) : distProps.bbox;
    const normalized = { ...distProps, bbox: parsedBbox };

    setSelectedDistrict(normalized);
    setSelectedEvent(null);
    setDistrictHighlightOnMap(distProps.district_num);

    const map = mapRef.current;
    if (map && parsedBbox && parsedBbox.length === 4) {
      map.fitBounds(
        [
          [parsedBbox[0], parsedBbox[1]],
          [parsedBbox[2], parsedBbox[3]]
        ],
        { padding: 65, duration: 1100, pitch: 18 }
      );
    }
  };

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
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 110, unit: 'metric' }), 'bottom-right');

    map.on('load', () => {
      mapLoadedRef.current = true;
    });

    // Hover & Click on Urban Districts Polygons
    map.on('mousemove', 'districts-fill', (e) => {
      if (!e.features || !e.features.length) return;

      // Check if cursor is over a point/cluster first so point tooltips take priority
      const topPoint = map.queryRenderedFeatures(e.point, {
        layers: ['clusters', 'unclustered-point', 'all-points-direct', 'unosat-buildings']
      });
      if (topPoint.length > 0) return;

      map.getCanvas().style.cursor = 'pointer';
      const feat = e.features[0];
      if (hoveredDistrictIdRef.current !== null && hoveredDistrictIdRef.current !== feat.id) {
        map.setFeatureState(
          { source: 'urban-districts', id: hoveredDistrictIdRef.current },
          { hover: false }
        );
      }
      hoveredDistrictIdRef.current = feat.id;
      map.setFeatureState({ source: 'urban-districts', id: feat.id }, { hover: true });

      const p = feat.properties;
      setHoverInfo({
        x: e.point.x,
        y: e.point.y,
        isDistrict: true,
        title: `${p.name_en} (${p.name_uk})`,
        subtitle: `${p.bellingcat_count} Civilian Incidents • ${p.unosat_count} UNOSAT Damaged Buildings`,
        color: p.fill_color || '#22c55e'
      });
    });

    map.on('mouseleave', 'districts-fill', () => {
      if (hoveredDistrictIdRef.current !== null) {
        map.setFeatureState(
          { source: 'urban-districts', id: hoveredDistrictIdRef.current },
          { hover: false }
        );
      }
      hoveredDistrictIdRef.current = null;
      map.getCanvas().style.cursor = '';
      setHoverInfo(null);
    });

    map.on('click', 'districts-fill', (e) => {
      // Do not trigger district click if user clicked directly on an incident/building dot
      const topPoint = map.queryRenderedFeatures(e.point, {
        layers: ['clusters', 'unclustered-point', 'all-points-direct', 'unosat-buildings']
      });
      if (topPoint.length > 0) return;

      if (!e.features || !e.features.length) return;
      const p = e.features[0].properties;
      handleSelectDistrict(p);
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

    // Live Hover Tooltip for Points
    const interactiveLayers = ['unclustered-point', 'all-points-direct', 'unosat-buildings'];
    interactiveLayers.forEach((layerId) => {
      map.on('mousemove', layerId, (e) => {
        map.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const f = e.features[0];
          const isUnosat = layerId === 'unosat-buildings';
          setHoverInfo({
            x: e.point.x,
            y: e.point.y,
            isUnosat,
            title: isUnosat ? f.properties.damage_grade : f.properties.primary_sector,
            subtitle: isUnosat ? f.properties.id : `${f.properties.location || 'Ukraine'} (${f.properties.date})`,
            color: isUnosat
              ? (f.properties.damage_color || '#ef4444')
              : (SECTOR_CONFIG[f.properties.primary_sector]?.color || '#0284c7')
          });
        }
      });
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
        setHoverInfo(null);
      });
    });

    map.on('mouseenter', 'clusters', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'clusters', () => {
      map.getCanvas().style.cursor = '';
    });

    mapRef.current = map;

    return () => {
      mapLoadedRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Resize MapLibre canvas smoothly whenever sidebar or timeline docks toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const timer = setTimeout(() => {
      map.resize();
    }, 60);
    return () => clearTimeout(timer);
  }, [sidebarOpen, timelineOpen]);

  // Update Bellingcat GeoJSON sources whenever filters change
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

  // Update UNOSAT GeoJSON source whenever UNOSAT grade filter changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || loading) return;

    const applyUnosat = () => {
      const sUnosat = map.getSource('unosat-damage');
      if (sUnosat) sUnosat.setData(filteredUnosatGeoJSON);
    };

    if (mapLoadedRef.current) {
      applyUnosat();
    } else {
      map.once('load', applyUnosat);
    }
  }, [filteredUnosatGeoJSON, loading]);

  // Update layer visibilities when vizMode, layerVisibility, or boundaryMode changes
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

      setVis('damage-heat', showBellingcat && vizMode === 'heatmap');
      setVis('cluster-halo', showBellingcat && vizMode === 'clusters');
      setVis('clusters', showBellingcat && vizMode === 'clusters');
      setVis('cluster-count', showBellingcat && vizMode === 'clusters');
      setVis('unclustered-point-halo', showBellingcat && vizMode === 'clusters');
      setVis('unclustered-point', showBellingcat && vizMode === 'clusters');
      setVis('all-points-direct', showBellingcat && vizMode === 'points');

      setVis('unosat-buildings-target', showUnosat);
      setVis('unosat-buildings', showUnosat);

      // Administrative Boundaries Visibility
      const showOutlines = boundaryMode === 'choropleth' || boundaryMode === 'outlines';
      const showFill = boundaryMode === 'choropleth';

      setVis('oblast-fill', showFill);
      setVis('oblast-outline-glow', showOutlines);
      setVis('oblast-outline', showOutlines);
      setVis('city-outline', showOutlines);
      setVis('districts-fill', showFill);
      setVis('districts-outline-casing', showOutlines);
      setVis('districts-outline', showOutlines);
    };

    if (mapLoadedRef.current) {
      applyVis();
    } else {
      map.once('load', applyVis);
    }
  }, [vizMode, layerVisibility, boundaryMode]);

  // Switch Basemap instantaneously
  const handleBasemapChange = (newKey) => {
    setBasemap(newKey);
    setBasemapOpen(false);
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
    setSelectedDistrict(null);
    setDistrictHighlightOnMap(null);

    const preset = CAMERA_PRESETS[key];
    if (!preset || !mapRef.current) return;

    if (key === 'ukraine') {
      setScope('all');
    } else if (key === 'kharkiv_city' || key === 'saltivka') {
      setScope('kharkiv_city');
    } else {
      setScope('kharkiv');
    }

    if (key === 'saltivka') {
      setSidebarTab('unosat');
    } else if (key === 'kharkiv_city') {
      setSidebarTab('districts');
    }

    mapRef.current.flyTo({
      center: preset.center,
      zoom: preset.zoom,
      pitch: preset.pitch,
      duration: 1250,
      essential: true
    });
  };

  // Zoom directly to selected rooftop / incident
  const zoomToSelectedFeature = () => {
    if (!selectedEvent || !mapRef.current) return;
    mapRef.current.flyTo({
      center: selectedEvent.coordinates,
      zoom: 16.8,
      pitch: 35,
      duration: 900
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
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-[#001f2e] select-none text-slate-800">
      {/* ====================================================================
          1. DEDICATED TOP NAVBAR (Never wraps or overlaps sidebar/map)
         ==================================================================== */}
      <header className="h-14 shrink-0 bg-[#002b3d] border-b border-[#004b6b] px-3.5 flex items-center justify-between gap-3 z-30 shadow-md">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#00364e] hover:bg-[#004b6b] text-[#22c55e] border border-[#004b6b] transition-colors shrink-0"
            title={sidebarOpen ? 'Collapse Left Panel' : 'Expand Left Panel'}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#16a34a] to-[#0d9488] text-white font-black text-xs tracking-tight shadow-sm border border-white/20 shrink-0">
            Z+
          </div>

          <div className="truncate">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm tracking-tight flex items-center">
                geoInnovation:lab<span className="text-[#22c55e] font-black ml-0.5">+</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#16a34a]/25 text-[#4ade80] border border-[#16a34a]/40 uppercase tracking-wide">
                Kharkiv Recovery
              </span>
            </div>
            <p className="text-[10px] text-slate-300 truncate hidden md:block">
              Z_GIS University of Salzburg × O.M. Beketov National University of Urban Economy
            </p>
          </div>
        </div>

        {/* Center: Region Quick-Zoom Pills */}
        <div className="flex items-center gap-1 bg-[#001f2e]/80 p-1 rounded-xl border border-[#004b6b]">
          {Object.entries(CAMERA_PRESETS).map(([key, preset]) => {
            const isActive = activePreset === key && !selectedDistrict;
            return (
              <button
                key={key}
                onClick={() => handlePresetClick(key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#16a34a] text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="hidden lg:inline">{preset.label}</span>
                <span className="lg:hidden">{preset.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Right: District Boundary Toggle, Layer Disambiguation, Basemap & Export */}
        <div className="flex items-center gap-2 shrink-0">
          {/* District Boundary Style Cycle Pill */}
          <button
            onClick={() => {
              const next =
                boundaryMode === 'choropleth'
                  ? 'outlines'
                  : boundaryMode === 'outlines'
                  ? 'off'
                  : 'choropleth';
              setBoundaryMode(next);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              boundaryMode !== 'off'
                ? 'bg-[#00364e] text-[#4ade80] border-[#22c55e]/50'
                : 'bg-[#001f2e] text-slate-400 border-[#004b6b]'
            }`}
            title="Click to cycle District Boundaries: Choropleth -> Outlines Only -> Off"
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              Districts: {boundaryMode === 'choropleth' ? 'Choropleth' : boundaryMode === 'outlines' ? 'Outlines' : 'Off'}
            </span>
          </button>

          {/* Layer Source Disambiguation Segmented Pill */}
          <div className="hidden xl:flex items-center bg-[#001f2e]/80 p-1 rounded-xl border border-[#004b6b] text-[11px] font-semibold">
            <button
              onClick={() => setLayerVisibility('both')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                layerVisibility === 'both'
                  ? 'bg-[#00364e] text-white border border-[#22c55e]/60'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setLayerVisibility('bellingcat')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                layerVisibility === 'bellingcat'
                  ? 'bg-[#00364e] text-[#38bdf8] border border-[#38bdf8]/60'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#38bdf8] ring-1 ring-white" />
              <span>Incidents ({stats.total})</span>
            </button>
            <button
              onClick={() => setLayerVisibility('unosat')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                layerVisibility === 'unosat'
                  ? 'bg-[#00364e] text-rose-400 border border-rose-400/60'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 ring-1 ring-black" />
              <span>UNOSAT ({filteredUnosatGeoJSON.features.length})</span>
            </button>
          </div>

          {/* Basemap Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => setBasemapOpen(!basemapOpen)}
              className="flex items-center gap-1.5 bg-[#00364e] hover:bg-[#004b6b] text-white border border-[#004b6b] rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
            >
              <Layers className="w-3.5 h-3.5 text-[#22c55e]" />
              <span className="hidden sm:inline">{BASEMAPS[basemap]?.name}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${basemapOpen ? 'rotate-180 text-[#22c55e]' : 'text-slate-300'}`} />
            </button>

            {basemapOpen && (
              <div className="absolute top-11 right-0 w-52 bg-white border border-slate-200 shadow-2xl rounded-2xl p-2 z-50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                  Base Cartography
                </div>
                {Object.entries(BASEMAPS).map(([key, bm]) => {
                  const active = basemap === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleBasemapChange(key)}
                      className={`w-full flex flex-col text-left px-2.5 py-1.5 rounded-xl transition-all ${
                        active
                          ? 'bg-[#00364e] text-white shadow-sm'
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

          {/* Export Button */}
          <button
            onClick={handleExportGeoJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#16a34a] hover:bg-[#15803d] text-white transition-all shadow-sm"
            title="Export filtered GeoJSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Export</span>
          </button>
        </div>
      </header>

      {/* ====================================================================
          2. MAIN WORKSPACE: DOCKABLE LEFT SIDEBAR + RIGHT MAP/TIMELINE COLUMN
         ==================================================================== */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* DOCKED LEFT SIDEBAR */}
        {sidebarOpen && (
          <aside className="w-[356px] shrink-0 h-full bg-white border-r border-slate-200 flex flex-col z-20 shadow-lg">
            {/* Top KPI Summary Cards */}
            <div className="p-3 bg-slate-50 border-b border-slate-200">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setSidebarTab('incidents');
                    setLayerVisibility('both');
                  }}
                  className={`text-left p-2.5 rounded-xl border transition-all ${
                    sidebarTab === 'incidents'
                      ? 'bg-white border-[#00364e] ring-1 ring-[#00364e] shadow-sm'
                      : 'bg-white/70 border-slate-200 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Civilian Incidents
                    </span>
                    <span className="w-2 h-2 rounded-full bg-[#0284c7]" />
                  </div>
                  <div className="text-lg font-black text-[#00364e] mt-0.5">
                    {loading ? '...' : stats.total.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {selectedDistrict
                      ? `In ${selectedDistrict.short_name} Boundary`
                      : scope === 'kharkiv_city'
                      ? 'Inside Kharkiv City Boundary'
                      : scope === 'kharkiv'
                      ? 'Inside Kharkiv Oblast Boundary'
                      : 'All Ukraine'}
                  </div>
                </button>

                <button
                  onClick={() => {
                    setSidebarTab('unosat');
                    handlePresetClick('saltivka');
                  }}
                  className={`text-left p-2.5 rounded-xl border transition-all ${
                    sidebarTab === 'unosat'
                      ? 'bg-rose-50/60 border-rose-500 ring-1 ring-rose-500 shadow-sm'
                      : 'bg-white/70 border-slate-200 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                      UNOSAT Buildings
                    </span>
                    <span className="w-2 h-2 rounded-full bg-rose-500 ring-1 ring-black" />
                  </div>
                  <div className="text-lg font-black text-rose-700 mt-0.5">
                    {filteredUnosatGeoJSON.features.length}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {selectedDistrict ? `In ${selectedDistrict.short_name} Boundary` : 'VHR Satellite Assessed'}
                  </div>
                </button>
              </div>
            </div>

            {/* Always-Visible Map Mode & Polygon Clip Control Bar */}
            <div className="px-3 pt-2.5 pb-2 border-b border-slate-100 space-y-2">
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setVizMode('clusters')}
                  className={`flex items-center justify-center gap-1 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    vizMode === 'clusters'
                      ? 'bg-white text-[#00364e] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CircleDot className="w-3 h-3 text-[#16a34a]" />
                  <span>Clusters</span>
                </button>
                <button
                  onClick={() => setVizMode('points')}
                  className={`flex items-center justify-center gap-1 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    vizMode === 'points'
                      ? 'bg-white text-[#00364e] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MapPin className="w-3 h-3 text-[#0284c7]" />
                  <span>All Points</span>
                </button>
                <button
                  onClick={() => setVizMode('heatmap')}
                  className={`flex items-center justify-center gap-1 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    vizMode === 'heatmap'
                      ? 'bg-white text-rose-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Flame className="w-3 h-3 text-amber-500" />
                  <span>Heatmap</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    Polygon Boundary Clip
                  </label>
                  <select
                    value={scope}
                    onChange={(e) => {
                      setSelectedDistrict(null);
                      setDistrictHighlightOnMap(null);
                      setScope(e.target.value);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-800 focus:outline-none focus:border-[#00364e]"
                  >
                    <option value="kharkiv">Kharkiv Oblast (554)</option>
                    <option value="kharkiv_city">Kharkiv City (328)</option>
                    <option value="all">All Ukraine (2,512)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    Incident Year
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-800 focus:outline-none focus:border-[#00364e]"
                  >
                    <option value="ALL">All Years (2022–25)</option>
                    <option value="2022">2022</option>
                    <option value="2023">2023</option>
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 3-Tab Switcher inside Sidebar: Districts (9) | Sectors | UNOSAT */}
            <div className="grid grid-cols-3 bg-slate-100 p-1 mx-3 mt-2 rounded-xl border border-slate-200 text-[11px] font-bold">
              <button
                onClick={() => setSidebarTab('districts')}
                className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                  sidebarTab === 'districts'
                    ? 'bg-[#00364e] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MapIcon className="w-3 h-3 text-[#22c55e]" />
                <span>Districts (9)</span>
              </button>
              <button
                onClick={() => setSidebarTab('incidents')}
                className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                  sidebarTab === 'incidents'
                    ? 'bg-[#00364e] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CircleDot className="w-3 h-3 text-[#38bdf8]" />
                <span>Sectors</span>
              </button>
              <button
                onClick={() => setSidebarTab('unosat')}
                className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                  sidebarTab === 'unosat'
                    ? 'bg-[#00364e] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3 h-3 text-rose-400" />
                <span>UNOSAT</span>
              </button>
            </div>

            {/* TAB 1: KHARKIV 9 URBAN DISTRICTS (RAIONS) EXPLORER */}
            {sidebarTab === 'districts' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Kharkiv Urban Raions by Priority
                  </span>
                  {selectedDistrict && (
                    <button
                      onClick={() => handleSelectDistrict(null)}
                      className="flex items-center gap-1 text-[10px] font-bold text-[#16a34a] hover:underline"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>All Districts</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {districtsList.map((feat) => {
                    const d = feat.properties;
                    const isSelected = selectedDistrict?.id === d.id;
                    const maxBurden = 527;
                    const pct = Math.min(100, Math.max(5, Math.round((d.total_burden / maxBurden) * 100)));

                    return (
                      <button
                        key={d.id}
                        onClick={() => handleSelectDistrict(d)}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-[#00364e]/5 border-[#00364e] ring-1 ring-[#00364e] shadow-sm'
                            : 'bg-white hover:bg-slate-50 border-slate-200/80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: d.fill_color }}
                              />
                              <span>{d.name_en}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 pl-4">{d.name_uk}</div>
                          </div>

                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: d.fill_color }}
                          >
                            {d.priority_tier.replace(' Priority', '')}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 my-1.5 pl-4 text-[10px]">
                          <div className="bg-slate-50 px-2 py-1 rounded border border-slate-100">
                            <span className="text-slate-400 block">Incidents</span>
                            <strong className="text-[#00364e] text-xs">{d.bellingcat_count}</strong>
                          </div>
                          <div className="bg-slate-50 px-2 py-1 rounded border border-slate-100">
                            <span className="text-slate-400 block">UNOSAT Bldgs</span>
                            <strong className="text-rose-600 text-xs">{d.unosat_count}</strong>
                          </div>
                          <div className="bg-slate-50 px-2 py-1 rounded border border-slate-100">
                            <span className="text-slate-400 block">Housing/Soc</span>
                            <strong className="text-amber-600 text-xs">
                              {d.residential_incidents + d.social_incidents}
                            </strong>
                          </div>
                        </div>

                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${pct}%`, backgroundColor: d.fill_color }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: BELLINGCAT CIVILIAN INCIDENTS & SECTORS */}
            {sidebarTab === 'incidents' && (
              <>
                <div className="p-3 border-b border-slate-100">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter by keyword (hospital, school, Saltivka)..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#00364e]"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Sector List */}
                <div className="flex-1 overflow-y-auto p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Click Sector to Filter Map
                    </span>
                    {(selectedSector !== 'ALL' || selectedYear !== 'ALL' || searchQuery || selectedDistrict) && (
                      <button
                        onClick={() => {
                          setSelectedSector('ALL');
                          setSelectedYear('ALL');
                          setSearchQuery('');
                          handleSelectDistrict(null);
                        }}
                        className="flex items-center gap-1 text-[10px] font-bold text-[#16a34a] hover:underline"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
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
                              ? 'bg-[#00364e]/5 border-[#00364e] ring-1 ring-[#00364e]'
                              : 'bg-white hover:bg-slate-50 border-slate-100'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="flex items-center gap-2 font-semibold text-slate-700 truncate">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0 border border-white shadow-sm"
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
              </>
            )}

            {/* TAB 3: UNOSAT BUILDING-LEVEL DAMAGE GRADES */}
            {sidebarTab === 'unosat' && (
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="text-xs font-bold text-[#00364e] mb-1">
                    UNOSAT Comprehensive Damage Assessment
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
                    520 structure locations in Northern Kharkiv & Saltivka inspected via Very High Resolution (VHR) satellite imagery (`CE20220223UKR`).
                  </p>
                  <button
                    onClick={() => handlePresetClick('saltivka')}
                    className="w-full py-1.5 px-3 rounded-lg bg-[#00364e] hover:bg-[#004b6b] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Crosshair className="w-3.5 h-3.5 text-[#22c55e]" />
                    <span>Fly to North Saltivka Buildings</span>
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Filter by Structural Damage Grade
                  </span>
                  {selectedUnosatGrade !== 'ALL' && (
                    <button
                      onClick={() => setSelectedUnosatGrade('ALL')}
                      className="flex items-center gap-1 text-[10px] font-bold text-rose-600 hover:underline"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Show All 520</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {Object.entries(UNOSAT_GRADES).map(([grade, info]) => {
                    const isSelected = selectedUnosatGrade === grade;
                    const pct = Math.round((info.count / 520) * 100);
                    return (
                      <button
                        key={grade}
                        onClick={() => setSelectedUnosatGrade(isSelected ? 'ALL' : grade)}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-rose-50/70 border-rose-500 ring-1 ring-rose-500 shadow-sm'
                            : 'bg-white hover:bg-slate-50 border-slate-200/80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="flex items-center gap-2 font-bold text-xs text-slate-800">
                            <span
                              className="w-3 h-3 rounded-full border-2 border-slate-900 shrink-0"
                              style={{ backgroundColor: info.color }}
                            />
                            <span>{info.label}</span>
                          </span>
                          <span className="text-xs font-black text-slate-800">
                            {info.count} <span className="text-[10px] font-normal text-slate-500">({pct}%)</span>
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 pl-5 mb-1.5">{info.desc}</p>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: info.color }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>
        )}

        {/* ==================================================================
            3. RIGHT COLUMN: MAP CANVAS (Top) + DOCKED TIMELINE BAR (Bottom)
           ================================================================== */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          {/* MAP CANVAS CONTAINER */}
          <div className="flex-1 relative w-full overflow-hidden">
            <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

            {/* Live Hover Tooltip */}
            {hoverInfo && (
              <div
                className="pointer-events-none absolute z-30 bg-[#002233]/95 text-white px-2.5 py-1.5 rounded-lg shadow-xl border border-white/15 text-[11px] max-w-xs"
                style={{
                  left: Math.min(hoverInfo.x + 14, window.innerWidth - 280),
                  top: Math.max(hoverInfo.y - 38, 10)
                }}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: hoverInfo.color }}
                  />
                  <span>
                    {hoverInfo.isDistrict
                      ? hoverInfo.title
                      : hoverInfo.isUnosat
                      ? `UNOSAT: ${hoverInfo.title}`
                      : hoverInfo.title}
                  </span>
                </div>
                <div className="text-[10px] text-slate-300 truncate">{hoverInfo.subtitle}</div>
              </div>
            )}

            {/* SELECTED DISTRICT RECOVERY PROFILE CARD — Anchored TOP-RIGHT */}
            {selectedDistrict && !selectedEvent && (
              <div className="absolute top-3 right-3 z-20 w-80 bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm"
                    style={{ backgroundColor: selectedDistrict.fill_color }}
                  >
                    <ShieldAlert className="w-3 h-3" />
                    <span>{selectedDistrict.priority_tier}</span>
                  </span>
                  <button
                    onClick={() => handleSelectDistrict(null)}
                    className="text-slate-400 hover:text-slate-700 p-0.5"
                    title="Clear District Selection"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="font-bold text-slate-900 text-sm">{selectedDistrict.name_en}</h3>
                <div className="text-xs text-slate-500 mb-3">{selectedDistrict.name_uk} • Kharkiv City</div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Civilian Incidents</div>
                    <div className="text-base font-black text-[#00364e]">{selectedDistrict.bellingcat_count}</div>
                    <div className="text-[10px] text-slate-500">
                      {selectedDistrict.residential_incidents} Housing • {selectedDistrict.social_incidents} Social
                    </div>
                  </div>
                  <div className="bg-rose-50/50 p-2 rounded-xl border border-rose-100">
                    <div className="text-[10px] font-bold uppercase text-rose-700">UNOSAT Buildings</div>
                    <div className="text-base font-black text-rose-700">{selectedDistrict.unosat_count}</div>
                    <div className="text-[10px] text-rose-600">
                      {selectedDistrict.unosat_destroyed} Destroyed • {selectedDistrict.unosat_severe} Severe
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-600 pt-2 border-t border-slate-100">
                  <span>
                    Primary Impact: <strong className="text-slate-900">{selectedDistrict.top_sector}</strong>
                  </span>
                  <button
                    onClick={() => handleSelectDistrict(null)}
                    className="text-[11px] font-bold text-[#16a34a] hover:underline"
                  >
                    Show All City
                  </button>
                </div>
              </div>
            )}

            {/* SELECTED FEATURE INSPECTOR CARD — Anchored TOP-RIGHT */}
            {selectedEvent && (
              <div className="absolute top-3 right-3 z-20 w-80 bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl p-4">
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
                  {selectedEvent.dataset_source === 'unosat'
                    ? `Assessed Structure ${selectedEvent.id}`
                    : (selectedEvent.location || 'Kharkiv Region')}
                </h3>

                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedEvent.assessment_date || selectedEvent.date}</span>
                  <span>•</span>
                  <span className="font-mono text-[10px] text-slate-600">
                    {selectedEvent.dataset_source === 'unosat'
                      ? `Confidence: ${selectedEvent.confidence}`
                      : `ID: ${selectedEvent.id}`}
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3">
                  {selectedEvent.dataset_source === 'unosat'
                    ? (selectedEvent.damage_description || 'High-resolution satellite imagery verified structural building damage.')
                    : (selectedEvent.description || 'Verified civilian infrastructure damage incident.')}
                </p>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={zoomToSelectedFeature}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#00364e] hover:text-[#16a34a] bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Crosshair className="w-3 h-3" />
                    <span>Zoom Rooftop (17x)</span>
                  </button>

                  {selectedEvent.dataset_source === 'unosat' ? (
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      UNOSAT VHR
                    </span>
                  ) : (
                    selectedEvent.source_url && (
                      <a
                        href={selectedEvent.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0284c7] hover:underline"
                      >
                        <span>Evidence</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )
                  )}
                </div>
              </div>
            )}

            {/* COMPACT LEGEND — Anchored BOTTOM-LEFT of map canvas */}
            <div className="absolute bottom-3 left-3 z-20">
              {legendOpen ? (
                <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl rounded-2xl p-3 w-64">
                  <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#00364e]">
                      Map Symbol Guide
                    </span>
                    <button
                      onClick={() => setLegendOpen(false)}
                      className="text-slate-400 hover:text-slate-700 text-[10px] font-semibold"
                    >
                      Minimize
                    </button>
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                      <span className="flex items-center gap-2 font-semibold text-slate-800">
                        <span className="w-3 h-3 rounded-full bg-rose-500 border-2 border-slate-950 shrink-0" />
                        <span>UNOSAT Building (Black Ring)</span>
                      </span>
                      <span className="text-[10px] font-bold text-rose-600">520</span>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                      <span className="flex items-center gap-2 font-semibold text-slate-800">
                        <span className="w-3 h-3 rounded-full bg-[#0284c7] border-2 border-white shadow shrink-0" />
                        <span>Civilian Incident (White Ring)</span>
                      </span>
                      <span className="text-[10px] font-bold text-[#00364e]">{stats.total}</span>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                      <span className="flex items-center gap-2 font-semibold text-slate-800">
                        <span className="w-3 h-2 rounded-sm bg-emerald-500/30 border border-emerald-500 shrink-0" />
                        <span>9 Urban Districts + Oblast</span>
                      </span>
                      <span className="text-[10px] font-bold text-[#16a34a]">Click</span>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setLegendOpen(true)}
                  className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-lg rounded-xl px-3 py-1.5 text-xs font-semibold text-[#00364e] hover:bg-white flex items-center gap-1.5"
                >
                  <Info className="w-3.5 h-3.5 text-[#16a34a]" />
                  <span>Symbol Guide</span>
                </button>
              )}
            </div>
          </div>

          {/* ================================================================
              4. DOCKED BOTTOM TIMELINE BAR
             ================================================================ */}
          {timelineOpen ? (
            <div className="h-24 shrink-0 bg-[#002233] text-white border-t border-[#004b6b] px-4 py-2 flex flex-col justify-between z-20">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold text-slate-200">
                    Temporal Distribution (<strong className="text-[#4ade80]">{stats.total.toLocaleString()}</strong> incidents)
                  </span>
                  <span className="hidden sm:inline-block text-[10px] font-bold text-slate-300 bg-white/10 px-2 py-0.5 rounded">
                    FEB 2022 – SEP 2025
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {['ALL', '2022', '2023', '2024', '2025'].map((yr) => (
                    <button
                      key={yr}
                      onClick={() => setSelectedYear(yr)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                        selectedYear === yr
                          ? 'bg-[#16a34a] text-white'
                          : 'text-slate-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {yr === 'ALL' ? 'All Years' : yr}
                    </button>
                  ))}

                  <button
                    onClick={() => setTimelineOpen(false)}
                    className="ml-2 text-slate-400 hover:text-white p-1 rounded hover:bg-white/10"
                    title="Collapse Timeline Bar"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Monthly Histogram Bars */}
              <div className="flex items-end gap-1 h-11 pt-1">
                {stats.monthsList.map((item) => {
                  const heightPct = Math.max(8, Math.round((item.count / maxMonthCount) * 100));
                  const isYearActive = selectedYear === 'ALL' || selectedYear === item.year;
                  return (
                    <div
                      key={item.ym}
                      onClick={() => setSelectedYear(selectedYear === item.year ? 'ALL' : item.year)}
                      title={`${item.ym}: ${item.count} verified civilian incidents`}
                      className="flex-1 h-full flex items-end cursor-pointer group"
                    >
                      <div
                        className={`w-full rounded-t-sm transition-all ${
                          isYearActive
                            ? 'bg-[#22c55e] group-hover:bg-[#4ade80]'
                            : 'bg-slate-600 opacity-35 group-hover:opacity-75'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-8 shrink-0 bg-[#002233] text-white border-t border-[#004b6b] px-4 flex items-center justify-between text-xs z-20">
              <span className="text-[11px] text-slate-300">
                Timeline Collapsed • Showing <strong className="text-[#4ade80]">{stats.total}</strong> Civilian Incidents & <strong className="text-rose-400">{filteredUnosatGeoJSON.features.length}</strong> UNOSAT Buildings
              </span>
              <button
                onClick={() => setTimelineOpen(true)}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#4ade80] hover:underline"
              >
                <Calendar className="w-3 h-3" />
                <span>Expand Timeline</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
