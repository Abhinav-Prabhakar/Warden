"use client";

import React, { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface SmartwatchMapCardProps {
  isOpen: boolean;
  onClose: () => void;
  currentFloor?: number;
  isLightMode?: boolean;
}

// 100% Local Self-Contained Medical Campus GeoJSON (No External API Keys or Tiles Required)
const CAMPUS_PARCELS_GEOJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { type: "ground" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-122.4625, 37.7660],
            [-122.4530, 37.7660],
            [-122.4530, 37.7605],
            [-122.4625, 37.7605],
            [-122.4625, 37.7660],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { type: "garden" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-122.4586, 37.7630],
            [-122.4572, 37.7630],
            [-122.4572, 37.7624],
            [-122.4586, 37.7624],
            [-122.4586, 37.7630],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { type: "courtyard" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-122.4570, 37.7645],
            [-122.4560, 37.7645],
            [-122.4560, 37.7638],
            [-122.4570, 37.7638],
            [-122.4570, 37.7645],
          ],
        ],
      },
    },
  ],
};

const CAMPUS_ROADS_GEOJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { type: "primary" },
      geometry: {
        type: "LineString",
        coordinates: [
          [-122.4625, 37.7633],
          [-122.4530, 37.7633],
        ],
      },
    },
    {
      type: "Feature",
      properties: { type: "primary" },
      geometry: {
        type: "LineString",
        coordinates: [
          [-122.4578, 37.7660],
          [-122.4578, 37.7605],
        ],
      },
    },
    {
      type: "Feature",
      properties: { type: "secondary" },
      geometry: {
        type: "LineString",
        coordinates: [
          [-122.4600, 37.7648],
          [-122.4590, 37.7633],
          [-122.4590, 37.7618],
        ],
      },
    },
    {
      type: "Feature",
      properties: { type: "secondary" },
      geometry: {
        type: "LineString",
        coordinates: [
          [-122.4565, 37.7650],
          [-122.4554, 37.7640],
          [-122.4554, 37.7625],
          [-122.4565, 37.7615],
        ],
      },
    },
    {
      type: "Feature",
      properties: { type: "ambulance" },
      geometry: {
        type: "LineString",
        coordinates: [
          [-122.4605, 37.7636],
          [-122.4588, 37.7636],
          [-122.4588, 37.7628],
        ],
      },
    },
  ],
};

const HOSPITAL_CAMPUS_GEOJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        name: "Main Hospital Pavilion (Floor 1-12)",
        height: 80,
        base_height: 0,
        color: "#1E2A3C",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-122.4586, 37.7639],
            [-122.4572, 37.7639],
            [-122.4572, 37.7631],
            [-122.4586, 37.7631],
            [-122.4586, 37.7639],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "North Inpatient Ward Tower",
        height: 115,
        base_height: 0,
        color: "#16202E",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-122.4571, 37.7646],
            [-122.4559, 37.7646],
            [-122.4559, 37.7637],
            [-122.4571, 37.7637],
            [-122.4571, 37.7646],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Emergency & Trauma Resus Wing",
        height: 42,
        base_height: 0,
        color: "#1E3B5C",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-122.4596, 37.7635],
            [-122.4587, 37.7635],
            [-122.4587, 37.7626],
            [-122.4596, 37.7626],
            [-122.4596, 37.7635],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Surgical Suites & Diagnostics",
        height: 56,
        base_height: 0,
        color: "#212F42",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-122.4585, 37.7625],
            [-122.4573, 37.7625],
            [-122.4573, 37.7617],
            [-122.4585, 37.7617],
            [-122.4585, 37.7625],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Helipad & Rapid Transit Tower",
        height: 100,
        base_height: 0,
        color: "#1A365D",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-122.4568, 37.7631],
            [-122.4557, 37.7631],
            [-122.4557, 37.7622],
            [-122.4568, 37.7622],
            [-122.4568, 37.7631],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Ambulatory & Outpatient Annex",
        height: 48,
        base_height: 0,
        color: "#182230",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-122.4603, 37.7645],
            [-122.4592, 37.7645],
            [-122.4592, 37.7637],
            [-122.4603, 37.7637],
            [-122.4603, 37.7645],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Radiology & Diagnostic Imaging",
        height: 34,
        base_height: 0,
        color: "#1B283A",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-122.4600, 37.7624],
            [-122.4588, 37.7624],
            [-122.4588, 37.7616],
            [-122.4600, 37.7616],
            [-122.4600, 37.7624],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Clinical Research & Oncology",
        height: 64,
        base_height: 0,
        color: "#192535",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-122.4566, 37.7618],
            [-122.4554, 37.7618],
            [-122.4554, 37.7610],
            [-122.4566, 37.7610],
            [-122.4566, 37.7618],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "Multi-Level Parking Deck",
        height: 38,
        base_height: 0,
        color: "#141C28",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-122.4616, 37.7648],
            [-122.4606, 37.7648],
            [-122.4606, 37.7638],
            [-122.4616, 37.7638],
            [-122.4616, 37.7648],
          ],
        ],
      },
    },
  ],
};

export function SmartwatchMapCard({ isOpen, onClose, currentFloor = 7, isLightMode = false }: SmartwatchMapCardProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const [heading, setHeading] = useState<number>(38);
  const [is3DToggled, setIs3DToggled] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>("");

  // Swipe-to-close state
  const [dragOffset, setDragOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  // Update digital clock on smartwatch HUD
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize MapLibre GL JS with 100% self-contained vector style (no external tiles or API key)
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const darkStyle: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        campus_parcels: {
          type: "geojson",
          data: CAMPUS_PARCELS_GEOJSON,
        },
        campus_roads: {
          type: "geojson",
          data: CAMPUS_ROADS_GEOJSON,
        },
        hospital_buildings: {
          type: "geojson",
          data: HOSPITAL_CAMPUS_GEOJSON,
        },
      },
      layers: [
        // Background canvas layer
        {
          id: "map-background",
          type: "background",
          paint: {
            "background-color": isLightMode ? "#17202A" : "#0B0E14",
          },
        },
        // Campus ground polygons
        {
          id: "campus-ground-fill",
          type: "fill",
          source: "campus_parcels",
          filter: ["==", "type", "ground"],
          paint: {
            "fill-color": isLightMode ? "#273541" : "#11151F",
          },
        },
        // Healing garden & courtyard greens
        {
          id: "campus-gardens-fill",
          type: "fill",
          source: "campus_parcels",
          filter: ["!=", "type", "ground"],
          paint: {
            "fill-color": isLightMode ? "#1E4033" : "#0E211A",
            "fill-outline-color": isLightMode ? "#3C735E" : "#153328",
          },
        },
        // Road casing / curbs
        {
          id: "roads-casing",
          type: "line",
          source: "campus_roads",
          paint: {
            "line-color": isLightMode ? "#445461" : "#1A202C",
            "line-width": 7,
          },
        },
        // Road asphalt surface
        {
          id: "roads-surface",
          type: "line",
          source: "campus_roads",
          paint: {
            "line-color": isLightMode ? "#60717E" : "#242D3C",
            "line-width": 4,
          },
        },
        // Road centerline lane markings
        {
          id: "roads-centerlines",
          type: "line",
          source: "campus_roads",
          paint: {
            "line-color": isLightMode ? "#A5B5C1" : "#4A5568",
            "line-width": 1,
            "line-dasharray": [3, 3],
          },
        },
        // 3D Extruded Buildings Layer
        {
          id: "3d-hospital-buildings",
          type: "fill-extrusion",
          source: "hospital_buildings",
          paint: {
            "fill-extrusion-color": [
              "case",
              ["has", "color"],
              ["get", "color"],
              "#1E293B",
            ],
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": ["get", "base_height"],
            "fill-extrusion-opacity": 0.95,
          },
        },
      ],
    };

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: darkStyle,
      center: [-122.4578, 37.7633], // Hospital campus epicenter
      zoom: 16.4,
      pitch: 58,
      bearing: 38,
      attributionControl: false,
    });

    map.on("rotate", () => {
      setHeading(Math.round(map.getBearing()));
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isOpen, isLightMode]);

  if (!isOpen) return null;

  // Camera helpers
  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };
  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };
  const handleToggle3D = () => {
    if (!mapInstanceRef.current) return;
    const next = !is3DToggled;
    setIs3DToggled(next);
    mapInstanceRef.current.easeTo({
      pitch: next ? 58 : 0,
      duration: 500,
    });
  };
  const handleResetNorth = () => {
    mapInstanceRef.current?.easeTo({
      bearing: 0,
      duration: 400,
    });
    setHeading(0);
  };

  // Swipe-to-close handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    setIsSwiping(true);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const deltaX = e.touches[0].clientX - touchStartXRef.current;
    if (deltaX < 0) setDragOffset(deltaX);
  };
  const handleTouchEnd = () => {
    if (dragOffset < -60) onClose();
    setDragOffset(0);
    setIsSwiping(false);
    touchStartXRef.current = null;
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={(e) => e.stopPropagation()}
      className="absolute z-30 select-none animate-in fade-in slide-in-from-left-6 duration-200"
      style={{
        left: "54px",
        bottom: "34px",
        transform: `translateX(${dragOffset}px)`,
        transition: isSwiping ? "none" : "transform 0.2s ease-out",
      }}
    >
      {/* Smartwatch Outer Case Chassis (Brushed Obsidian & Dark Titanium Ring) */}
      <div className="relative w-[340px] h-[340px] rounded-full p-[14px] bg-[#12161E] border-[7px] border-[#222834] shadow-[0_25px_60px_rgba(0,0,0,0.92),0_0_25px_rgba(30,204,230,0.25)] flex items-center justify-center">
        {/* Metallic Bezel Highlights & Depth Gradient */}
        <div className="absolute inset-0 rounded-full pointer-events-none border border-white/15 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.12)_0%,_transparent_65%)]" />

        {/* Outer Compass Tick Ring & Cardinal Markers */}
        <div className="absolute inset-[6px] rounded-full pointer-events-none flex items-center justify-center">
          {/* North */}
          <span
            onClick={handleResetNorth}
            className="absolute top-1 text-[10px] font-mono font-black text-[#1ECCE6] tracking-widest pointer-events-auto cursor-pointer hover:scale-125 transition-transform"
            title="Reset North"
          >
            N
          </span>
          {/* East */}
          <span className="absolute right-1 text-[9px] font-mono font-bold text-[#8E92A4]">
            E
          </span>
          {/* South */}
          <span className="absolute bottom-1 text-[9px] font-mono font-bold text-[#8E92A4]">
            S
          </span>
          {/* West */}
          <span className="absolute left-1 text-[9px] font-mono font-bold text-[#8E92A4]">
            W
          </span>

          {/* Precision Bezel Compass Ticks (every 30 deg) */}
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-[2px] h-[5px] bg-white/20 origin-bottom"
              style={{
                top: "6px",
                transformOrigin: "50% 154px",
                transform: `rotate(${i * 30}deg)`,
              }}
            />
          ))}
        </div>

        {/* Circular Viewport containing MapLibre GL */}
        <div className="relative w-full h-full rounded-full overflow-hidden border border-white/10 bg-[#0B0F15]">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Ambient Inner Shadow for Watch Glass Depth */}
          <div className="absolute inset-0 rounded-full pointer-events-none shadow-[inset_0_0_30px_rgba(0,0,0,0.98)]" />

          {/* Top HUD Display: Floor & Digital Time */}
          <div className="absolute top-3 left-0 right-0 z-20 flex flex-col items-center pointer-events-none">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/15 shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1ECCE6] animate-ping" />
              <span className="text-[9px] font-mono font-semibold text-white tracking-wide">
                FL {currentFloor} · 3D HUD
              </span>
              <span className="text-[#8E92A4] text-[9px]">|</span>
              <span className="text-[9px] font-mono text-[#1ECCE6] font-bold">
                {currentTime}
              </span>
            </div>
            <span className="text-[7.5px] font-mono text-[#8E92A4]/80 mt-0.5 tracking-wider">
              {heading >= 0 ? `${heading}°` : `${360 + heading}°`} HDG · 37.763° N
            </span>
          </div>

          {/* Google Maps Style Navigation Arrow & Heading Beam at Screen Center */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none flex items-center justify-center">
            {/* Pulsing GPS Location Accuracy Ring */}
            <div className="absolute w-12 h-12 rounded-full bg-[#1ECCE6]/20 animate-ping" />
            <div className="absolute w-8 h-8 rounded-full bg-[#1ECCE6]/30 border border-[#1ECCE6]/70 shadow-[0_0_12px_rgba(30,204,230,0.75)]" />

            {/* Google Maps Blue/Cyan Direction Arrow (Heading Cone) */}
            <div
              className="relative w-6 h-6 flex items-center justify-center transition-transform duration-200"
              style={{ transform: `rotate(${-heading}deg)` }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <polygon
                  points="12,1 2,22 12,17.5 22,22"
                  fill="#1ECCE6"
                  stroke="#FFFFFF"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Bottom HUD: Coordinates & Controls */}
          <div className="absolute bottom-3 left-0 right-0 z-20 flex items-center justify-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={handleZoomIn}
              className="w-6 h-6 rounded-full bg-black/70 hover:bg-black/95 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-xs cursor-pointer shadow-md transition-all active:scale-95"
              title="Zoom In"
            >
              +
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="w-6 h-6 rounded-full bg-black/70 hover:bg-black/95 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-xs cursor-pointer shadow-md transition-all active:scale-95"
              title="Zoom Out"
            >
              −
            </button>
            <button
              type="button"
              onClick={handleToggle3D}
              className={`px-2 py-0.5 rounded-full text-[8.5px] font-mono font-bold tracking-wider backdrop-blur-md border transition-all cursor-pointer shadow-md active:scale-95 ${
                is3DToggled
                  ? "bg-[#1ECCE6] text-black border-[#1ECCE6]"
                  : "bg-black/70 text-white/80 border-white/20"
              }`}
              title="Toggle 3D Buildings Pitch"
            >
              3D
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-6 h-6 rounded-full bg-white/15 hover:bg-red-500/40 hover:border-red-500/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-[#B2B7C9] hover:text-white text-[10px] cursor-pointer shadow-md transition-all active:scale-95"
              title="Close Map (Swipe left)"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
