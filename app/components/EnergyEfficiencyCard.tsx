"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";

export interface FloorMetrics {
  floor: number;
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  occupancyRate: number;
  powerKw: number;
  standardBaselineKw: number;
  kwSaved: number;
  efficiencyPct: number;
  hvacLoad: number;
  lightingLoad: number;
  telemetryLoad: number;
  isEcoSync: boolean;
}

export interface RoomPod {
  roomId: string;
  roomNumber: string;
  floorNumber: number;
  bedCount: number;
  hasOccupant: boolean;
  lightsOn: boolean;
  acOn: boolean;
  lightMode: string;
  acMode: string;
  powerDrawKw: number;
  beds: {
    id: string;
    name: string;
    isOccupied: boolean;
    status: string;
  }[];
}

export interface PowerTrendPoint {
  time: string;
  actualKw: number;
  baselineKw: number;
}

interface EnergyEfficiencyCardProps {
  isOpen: boolean;
  onClose: () => void;
  currentFloor: number;
  onSelectFloor?: (floor: number) => void;
}

export function EnergyEfficiencyCard({
  isOpen,
  onClose,
  currentFloor,
  onSelectFloor,
}: EnergyEfficiencyCardProps) {
  const [metrics, setMetrics] = useState<FloorMetrics | null>(null);
  const [roomPods, setRoomPods] = useState<RoomPod[]>([]);
  const [crossFloors, setCrossFloors] = useState<FloorMetrics[]>([]);
  const [powerTrend, setPowerTrend] = useState<PowerTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"floor" | "rooms" | "grid">("floor");
  const [isUpdating, setIsUpdating] = useState(false);

  // Left swipe-to-close gesture state
  const [dragOffset, setDragOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  const fetchEfficiencyData = () => {
    fetch(`/api/efficiency?floor=${currentFloor}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data && !data.error) {
          setMetrics(data.currentFloorMetrics);
          setRoomPods(data.roomPods || []);
          setCrossFloors(data.crossFloorComparison || []);
          setPowerTrend(data.powerTrend || []);
        } else {
          setError(data?.error || "Failed to load efficiency data");
        }
      })
      .catch((err) => {
        console.error("Efficiency fetch failed:", err);
        setError("Could not connect to live building energy telemetry");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    fetchEfficiencyData();
    const interval = setInterval(fetchEfficiencyData, 12000); // 12s live telemetry polling
    return () => clearInterval(interval);
  }, [isOpen, currentFloor]);

  if (!isOpen) return null;

  // Toggle room lights or AC
  const handleToggleRoom = async (roomNumber: string, type: "lights" | "ac", currentState: boolean) => {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/efficiency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_room",
          floor: currentFloor,
          roomNumber,
          type,
          state: !currentState,
        }),
      });
      const data = await res.json();
      if (data && data.success) {
        setRoomPods((prev) =>
          prev.map((r) =>
            r.roomNumber === roomNumber
              ? {
                  ...r,
                  [type === "lights" ? "lightsOn" : "acOn"]: !currentState,
                  lightMode:
                    type === "lights"
                      ? !currentState
                        ? r.hasOccupant
                          ? "Circadian (80%)"
                          : "Override (100%)"
                        : "Eco-Standby (Off)"
                      : r.lightMode,
                  acMode:
                    type === "ac"
                      ? !currentState
                        ? "Comfort (22°C)"
                        : "Setback (26°C / Off)"
                      : r.acMode,
                }
              : r
          )
        );
        fetchEfficiencyData();
      }
    } catch (err) {
      console.error("Toggle room failed:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Sync entire floor to live bed occupancy
  const handleAutoEcoSync = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/efficiency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "auto_eco_sync",
          floor: currentFloor,
          state: true,
        }),
      });
      const data = await res.json();
      if (data && data.success) {
        fetchEfficiencyData();
      }
    } catch (err) {
      console.error("Auto eco sync failed:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Touch / Mouse Swipe Left handlers
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

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input")) return;
    touchStartXRef.current = e.clientX;
    setIsSwiping(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSwiping || touchStartXRef.current === null) return;
    const deltaX = e.clientX - touchStartXRef.current;
    if (deltaX < 0) setDragOffset(deltaX);
  };

  const handleMouseUp = () => {
    if (isSwiping) {
      if (dragOffset < -60) onClose();
      setDragOffset(0);
      setIsSwiping(false);
      touchStartXRef.current = null;
    }
  };

  // SVG Radial Gauge Calculation
  const powerKw = metrics?.powerKw || 36.3;
  const maxKw = 60;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(powerKw, maxKw) / maxKw) * circumference;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={(e) => e.stopPropagation()}
      className="absolute z-30 figma-glass-card bg-[#10141D]/90 rounded-[22px] p-5 w-[420px] max-w-[95vw] text-white flex flex-col gap-3.5 shadow-[0_20px_45px_rgba(0,0,0,0.85)] animate-in fade-in slide-in-from-left-6 duration-200"
      style={{
        left: "54px",
        bottom: "34px",
        maxHeight: "600px",
        transform: `translateX(${dragOffset}px)`,
        transition: isSwiping ? "none" : "transform 0.2s ease-out",
      }}
    >
      {/* Emerald Ambient Glow Sheen */}
      <div
        className="absolute inset-0 rounded-[inherit] pointer-events-none"
        style={{
          background:
            "radial-gradient(180px 100px at 15% -10%, rgba(36, 169, 81, 0.20), transparent 70%), linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 30%)",
        }}
      />

      {/* Header */}
      <div className="relative flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#24A951]/15 border border-[#24A951]/30 flex items-center justify-center">
            <Image src="/leaf.svg" alt="Efficiency Leaf" width={16} height={16} className="opacity-95" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white tracking-[-0.01em]">Floor Efficiency & Grid</h3>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#24A951]/20 text-[#82D99E] border border-[#24A951]/35">
                FL {currentFloor} FOCUS
              </span>
            </div>
            <p className="text-[10px] text-[#8E92A4]">Bed Occupancy Climate & Smart Power Control</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#8E92A4] hover:text-white transition-colors cursor-pointer text-xs"
          title="Close (Swipe left)"
        >
          ✕
        </button>
      </div>

      {/* Card Tabs */}
      <div className="relative flex items-center gap-1 bg-black/25 p-1 rounded-xl border border-white/5 text-[10.5px]">
        <button
          type="button"
          onClick={() => setActiveTab("floor")}
          className={`flex-1 py-1 rounded-lg font-medium transition-all ${
            activeTab === "floor" ? "bg-white/15 text-white shadow-sm" : "text-[#8E92A4] hover:text-white"
          }`}
        >
          Floor {currentFloor} Load
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("rooms")}
          className={`flex-1 py-1 rounded-lg font-medium transition-all ${
            activeTab === "rooms" ? "bg-white/15 text-white shadow-sm" : "text-[#8E92A4] hover:text-white"
          }`}
        >
          Bed Automation ({roomPods.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("grid")}
          className={`flex-1 py-1 rounded-lg font-medium transition-all ${
            activeTab === "grid" ? "bg-white/15 text-white shadow-sm" : "text-[#8E92A4] hover:text-white"
          }`}
        >
          Cross-Floor Grid
        </button>
      </div>

      {/* Content Area */}
      <div className="relative flex-1 overflow-y-auto max-h-[360px] pr-1 flex flex-col gap-3 custom-scrollbar">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#8E92A4] text-xs">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#24A951] animate-ping" />
            <span>Measuring live floor electrical telemetry...</span>
          </div>
        ) : error ? (
          <div className="py-6 text-center text-red-300 text-xs bg-red-950/40 rounded-xl p-3 border border-red-500/30">
            ⚠️ {error}
          </div>
        ) : activeTab === "floor" ? (
          /* ============================================================
             CARD 1: FLOOR CURRENT METRICS & POWER GAUGES
             ============================================================ */
          <div className="flex flex-col gap-3">
            {/* Hero Radial Meter Banner */}
            <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3">
              {/* Radial Meter Graphic */}
              <div className="relative w-[96px] h-[96px] shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke="url(#ecoGradient)"
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                  <defs>
                    <linearGradient id="ecoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1ECCE6" />
                      <stop offset="100%" stopColor="#24A951" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-base font-bold font-mono text-white leading-none">
                    {metrics?.powerKw ?? 36.3}
                  </span>
                  <span className="text-[9px] text-[#8E92A4] font-medium mt-0.5">kW Draw</span>
                </div>
              </div>

              {/* Stats Column */}
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-white">Eco Efficiency</span>
                  <span className="text-[11px] font-bold font-mono text-[#82D99E] bg-[#24A951]/15 px-2 py-0.5 rounded-full border border-[#24A951]/30">
                    {metrics?.efficiencyPct ?? 92}%
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#A2A7B8]">
                  <span>Bed Occupancy:</span>
                  <span className="font-mono text-white">
                    {metrics?.occupiedBeds ?? 10} / {metrics?.totalBeds ?? 11} ({metrics?.occupancyRate ?? 91}%)
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#A2A7B8]">
                  <span>Baseline Target:</span>
                  <span className="font-mono text-white/80">{metrics?.standardBaselineKw ?? 48.0} kW</span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#82D99E] font-medium pt-1 border-t border-white/10">
                  <span>Current Power Saved:</span>
                  <span className="font-mono font-bold">
                    {metrics?.kwSaved && metrics.kwSaved > 0 ? `-${metrics.kwSaved} kW` : "Optimized"}
                  </span>
                </div>
              </div>
            </div>

            {/* Power Breakdown Bars Graphic */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-2.5">
              <span className="text-[11px] font-semibold text-white tracking-tight">Active Load Breakdown</span>

              {/* HVAC */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-[#C6CBD9]">HVAC & Variable Climate</span>
                  <span className="font-mono text-white">{metrics?.hvacLoad ?? 16.1} kW</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#1ECCE6] to-[#1E8AE6]"
                    style={{ width: `${Math.min(100, ((metrics?.hvacLoad ?? 16.1) / powerKw) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Smart Lighting */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-[#C6CBD9]">Circadian LED Smart Lighting</span>
                  <span className="font-mono text-white">{metrics?.lightingLoad ?? 5.5} kW</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#F0B429] to-[#E67F1E]"
                    style={{ width: `${Math.min(100, ((metrics?.lightingLoad ?? 5.5) / powerKw) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Medical Telemetry */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-[#C6CBD9]">Clinical Telemetry & Critical Monitors</span>
                  <span className="font-mono text-white">{metrics?.telemetryLoad ?? 8.5} kW</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#24A951] to-[#82D99E]"
                    style={{ width: `${Math.min(100, ((metrics?.telemetryLoad ?? 8.5) / powerKw) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 24-Hour Sparkline Chart */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold text-white">Estimated 24h Load Profile</span>
                <span className="text-[#8E92A4]">Modelled from current occupancy vs baseline</span>
              </div>

              <div className="h-16 w-full relative flex items-end">
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 280 60">
                  {/* Grid Lines */}
                  <line x1="0" y1="15" x2="280" y2="15" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <line x1="0" y1="35" x2="280" y2="35" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

                  {/* Baseline curve */}
                  <path
                    d="M 0,32 Q 70,25 140,28 T 280,30"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.25)"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                  />

                  {/* Actual power curve with glow */}
                  <path
                    d="M 0,42 Q 70,36 140,40 T 280,38"
                    fill="none"
                    stroke="#24A951"
                    strokeWidth="2.5"
                  />
                </svg>
              </div>

              <div className="flex justify-between text-[9px] text-[#7A8095] font-mono">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>NOW</span>
              </div>
            </div>
          </div>
        ) : activeTab === "rooms" ? (
          /* ============================================================
             CARD 2: BED OCCUPANCY & SMART ROOM AUTOMATION
             ============================================================ */
          <div className="flex flex-col gap-2.5">
            {/* Auto Eco Sync Banner */}
            <div className="p-3 rounded-xl bg-[#24A951]/10 border border-[#24A951]/25 flex items-center justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-[#82D99E]">Bed Occupancy Synchronization</span>
                <p className="text-[10px] text-white/70 mt-0.5">
                  Automatically cuts AC and lights for uncoloured / empty beds.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAutoEcoSync}
                disabled={isUpdating}
                className="px-2.5 py-1.5 rounded-lg bg-[#24A951] text-black font-semibold text-[10px] uppercase tracking-wider hover:bg-[#24A951]/90 shadow-[0_0_12px_rgba(36,169,81,0.4)] cursor-pointer shrink-0"
              >
                {isUpdating ? "Syncing..." : "Sync All"}
              </button>
            </div>

            {/* Room by Room Automation Cards */}
            {roomPods.map((r) => (
              <div
                key={r.roomNumber}
                className={`p-3 rounded-xl border transition-all ${
                  r.hasOccupant
                    ? "bg-white/[0.04] border-white/10"
                    : "bg-black/20 border-white/5 opacity-80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Room {r.roomNumber}</span>
                    <span
                      className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-full border ${
                        r.hasOccupant
                          ? "bg-[#24A951]/15 border-[#24A951]/30 text-[#82D99E]"
                          : "bg-white/10 border-white/15 text-[#8E92A4]"
                      }`}
                    >
                      {r.hasOccupant ? "OCCUPIED" : "VACANT / ECO"}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-[#A2A7B8]">{r.powerDrawKw} kW</span>
                </div>

                {/* Beds in this room */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {r.beds.map((b) => (
                    <span
                      key={b.id}
                      className={`text-[9px] px-1.5 py-0.5 rounded ${
                        b.isOccupied
                          ? "bg-white/10 text-white font-medium"
                          : "bg-black/30 text-[#6B7182] border border-white/5"
                      }`}
                    >
                      {b.name} {b.isOccupied ? "●" : "○"}
                    </span>
                  ))}
                </div>

                {/* Lighting and AC Controls */}
                <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-[10px]">
                  {/* Lights */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#8E92A4]">Lighting:</span>
                    <button
                      type="button"
                      onClick={() => handleToggleRoom(r.roomNumber, "lights", r.lightsOn)}
                      className={`px-2 py-0.8 rounded text-[9.5px] font-semibold transition-all cursor-pointer ${
                        r.lightsOn
                          ? "bg-[#F0B429]/20 text-[#F6CE72] border border-[#F0B429]/40"
                          : "bg-white/5 text-[#6B7182] hover:text-white"
                      }`}
                    >
                      {r.lightsOn ? "ON (Circadian)" : "OFF (Standby)"}
                    </button>
                  </div>

                  {/* AC / Climate */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#8E92A4]">Climate:</span>
                    <button
                      type="button"
                      onClick={() => handleToggleRoom(r.roomNumber, "ac", r.acOn)}
                      className={`px-2 py-0.8 rounded text-[9.5px] font-semibold transition-all cursor-pointer ${
                        r.acOn
                          ? "bg-[#1ECCE6]/20 text-[#1ECCE6] border border-[#1ECCE6]/40"
                          : "bg-white/5 text-[#6B7182] hover:text-white"
                      }`}
                    >
                      {r.acOn ? "ON (22°C)" : "SETBACK (26°C)"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ============================================================
             CARD 3: CROSS-FLOOR GRID COMPARISON (FLOORS 4 THROUGH 8)
             ============================================================ */
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-semibold text-white">Hospital-Wide Multi-Floor Comparison</span>

            {/* Vertical Bar Chart Comparison Graphic */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-2">
              <div className="h-28 w-full flex items-end justify-between gap-2 pt-4 px-2">
                {crossFloors.map((fl) => {
                  const isCurrent = fl.floor === currentFloor;
                  const barHeight = Math.min(100, Math.max(20, (fl.powerKw / 60) * 100));

                  return (
                    <div
                      key={fl.floor}
                      onClick={() => onSelectFloor && onSelectFloor(fl.floor)}
                      className="flex-1 flex flex-col items-center gap-1 cursor-pointer group"
                    >
                      <span className="text-[9px] font-mono text-white/80 group-hover:text-white">
                        {fl.powerKw}k
                      </span>

                      <div className="w-full max-w-[28px] h-20 rounded-t-md bg-white/5 flex items-end overflow-hidden">
                        <div
                          className={`w-full rounded-t-md transition-all duration-500 ${
                            isCurrent
                              ? "bg-gradient-to-t from-[#24A951] to-[#1ECCE6] shadow-[0_0_12px_rgba(30,204,230,0.6)]"
                              : "bg-white/20 group-hover:bg-white/40"
                          }`}
                          style={{ height: `${barHeight}%` }}
                        />
                      </div>

                      <span
                        className={`text-[10px] font-bold ${
                          isCurrent ? "text-[#1ECCE6]" : "text-[#8E92A4] group-hover:text-white"
                        }`}
                      >
                        FL {fl.floor}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Floor Cards List */}
            <div className="flex flex-col gap-2">
              {crossFloors.map((fl) => {
                const isCurrent = fl.floor === currentFloor;

                return (
                  <div
                    key={fl.floor}
                    onClick={() => onSelectFloor && onSelectFloor(fl.floor)}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-[#24A951]/10 border-[#24A951]/35 shadow-sm"
                        : "bg-white/[0.03] border-white/10 hover:bg-white/[0.07]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">Floor {fl.floor}</span>
                        {isCurrent && (
                          <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-[#1ECCE6]/20 text-[#1ECCE6]">
                            CURRENT
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#8E92A4] mt-0.5">
                        Occupancy: {fl.occupiedBeds} / {fl.totalBeds} beds ({fl.occupancyRate}%)
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold font-mono text-white">{fl.powerKw} kW</div>
                      <div className="text-[9.5px] font-semibold text-[#82D99E]">{fl.efficiencyPct}% Eco</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="relative pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-[#8E92A4]">
        <span>Automated Building Management System</span>
        <span className="font-mono text-[#C6CBD9]">Ward Substation B</span>
      </div>
    </div>
  );
}
