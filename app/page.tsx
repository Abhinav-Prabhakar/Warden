"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { ThinkingOrb } from "thinking-orbs";
import { useVoiceAgent } from "@/lib/voice/useVoiceAgent";
import { VoiceSettingsModal } from "@/app/components/VoiceSettingsModal";

interface BedOverlay {
  id: string;
  name: string;
  color: "green" | "orange" | "red";
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
  patientName: string;
  patientAgeGender: string;
  statusText: string;
}

const BED_RECTANGLES: BedOverlay[] = [
  // Top Row (4 rooms with beds, left to right)
  {
    id: "bed-top-1",
    name: "Bed 1",
    color: "green",
    leftPct: 14.55,
    topPct: 11.15,
    widthPct: 3.32,
    heightPct: 13.94,
    patientName: "Meera Patel",
    patientAgeGender: "36F",
    statusText: "READY",
  },
  {
    id: "bed-top-3",
    name: "Bed 2",
    color: "orange",
    leftPct: 50.0,
    topPct: 11.15,
    widthPct: 3.32,
    heightPct: 13.94,
    patientName: "Arjun Kumar",
    patientAgeGender: "23M",
    statusText: "CLEANING",
  },
  {
    id: "bed-top-4",
    name: "Bed 3",
    color: "red",
    leftPct: 68.16,
    topPct: 11.0,
    widthPct: 3.32,
    heightPct: 13.94,
    patientName: "Vikram Malhotra",
    patientAgeGender: "62M",
    statusText: "CRITICAL",
  },
  {
    id: "bed-top-5",
    name: "Bed 4",
    color: "orange",
    leftPct: 86.91,
    topPct: 11.15,
    widthPct: 3.22,
    heightPct: 13.94,
    patientName: "Ramesh Gupta",
    patientAgeGender: "54M",
    statusText: "BLOCKED",
  },

  // Bottom Row
  // Room 1 (bottom left)
  {
    id: "bed-b1-h",
    name: "Bed 5",
    color: "green",
    leftPct: 7.03,
    topPct: 67.42,
    widthPct: 8.01,
    heightPct: 6.27,
    patientName: "Siddharth Sen",
    patientAgeGender: "41M",
    statusText: "STABLE",
  },
  {
    id: "bed-b1-v",
    name: "Bed 6",
    color: "green",
    leftPct: 9.38,
    topPct: 75.96,
    widthPct: 3.32,
    heightPct: 14.63,
    patientName: "Sunita Reddy",
    patientAgeGender: "29F",
    statusText: "OBSERVATION",
  },

  // Room 2 (bottom second)
  {
    id: "bed-b2-h",
    name: "Bed 7",
    color: "orange",
    leftPct: 18.65,
    topPct: 67.07,
    widthPct: 7.81,
    heightPct: 6.27,
    patientName: "Ananya Rao",
    patientAgeGender: "69F",
    statusText: "ATTENTION",
  },
  {
    id: "bed-b2-v",
    name: "Bed 8",
    color: "green",
    leftPct: 23.05,
    topPct: 76.13,
    widthPct: 3.32,
    heightPct: 14.63,
    patientName: "Kavita Desai",
    patientAgeGender: "45F",
    statusText: "STABLE",
  },

  // Room 3 (bottom third)
  {
    id: "bed-b3-v",
    name: "Bed 9",
    color: "green",
    leftPct: 30.96,
    topPct: 76.13,
    widthPct: 3.32,
    heightPct: 14.63,
    patientName: "Devansh Nair",
    patientAgeGender: "51M",
    statusText: "RECOVERY",
  },

  // Room 5 (bottom right room)
  {
    id: "bed-b5-left",
    name: "Bed 10",
    color: "orange",
    leftPct: 52.73,
    topPct: 76.13,
    widthPct: 3.32,
    heightPct: 14.63,
    patientName: "Pooja Hegde",
    patientAgeGender: "34F",
    statusText: "DISCHARGE",
  },
  {
    id: "bed-b5-right",
    name: "Bed 11",
    color: "green",
    leftPct: 64.84,
    topPct: 75.96,
    widthPct: 3.32,
    heightPct: 14.63,
    patientName: "Harish Iyer",
    patientAgeGender: "58M",
    statusText: "STABLE",
  },
];

// Exact telemetry bars extracted from design waveform profile
const BASE_WAVEFORM = [
  37, 40, 46, 30, 6, 6, 6, 20, 6, 35, 6, 31, 34, 6, 13, 6, 21, 6, 30, 20,
  22, 24, 6, 30, 18, 25, 12, 6, 15, 6, 21, 6, 6, 13, 6, 16, 6, 19, 6, 6,
  21, 6, 22, 6, 26, 28, 6, 24, 6, 52, 48,
];

// Pharmacy highlighted items
interface ShelfItem {
  id: string;
  name: string;
  category: string;
  indication: string[];
  colorType: "cyan" | "orange" | "green" | "magenta";
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
  isBottleShape?: boolean;
}

const SHELF_ITEMS: ShelfItem[] = [
  {
    id: "cyan-box",
    name: "Cetirizine 10mg",
    category: "Allergy Relief",
    indication: [
      "Relieves seasonal allergy symptoms",
      "Fast acting non-drowsy formulation",
      "Treats itchy eyes and runny nose",
    ],
    colorType: "cyan",
    leftPct: 19.63,
    topPct: 35.89,
    widthPct: 3.61,
    heightPct: 8.5,
  },
  {
    id: "magenta-bottle",
    name: "Benadryl",
    category: "Cough & Cold",
    indication: [
      "Loosens thick mucus, relieves chest congestion",
      "Calms throat irritation, persistent coughs",
      "Relieves runny nose, sneezing, watery eyes",
    ],
    colorType: "magenta",
    leftPct: 37.3,
    topPct: 51.56,
    widthPct: 2.73,
    heightPct: 8.5,
    isBottleShape: true,
  },
  {
    id: "orange-box",
    name: "Ibuprofen 400mg",
    category: "Anti-Inflammatory",
    indication: [
      "Provides relief from acute pain and fever",
      "Reduces joint inflammation & swelling",
      "Prescribed post-op analgesic support",
    ],
    colorType: "orange",
    leftPct: 56.93,
    topPct: 52.0,
    widthPct: 4.3,
    heightPct: 2.34,
  },
  {
    id: "green-box",
    name: "Amoxicillin 500mg",
    category: "Antibiotics",
    indication: [
      "Broad-spectrum bacterial infection control",
      "Respiratory and urinary tract treatment",
      "Completed course verification required",
    ],
    colorType: "green",
    leftPct: 11.82,
    topPct: 81.3,
    widthPct: 4.88,
    heightPct: 7.76,
  },
];

export default function WardenMainScreen() {
  const [activeScreen, setActiveScreen] = useState<0 | 1 | 2>(0);
  const [selectedBed, setSelectedBed] = useState<BedOverlay>(
    BED_RECTANGLES.find((b) => b.id === "bed-top-4") || BED_RECTANGLES[2]
  );
  const [selectedMed, setSelectedMed] = useState<ShelfItem>(SHELF_ITEMS[1]); // Benadryl default
  const [searchQuery, setSearchQuery] = useState("");
  const [barMultipliers, setBarMultipliers] = useState<number[]>(
    BASE_WAVEFORM.map(() => 1)
  );

  // Live Supabase bed drilldown state
  const [drilldownData, setDrilldownData] = useState<any>(null);
  const [isLoadingDrilldown, setIsLoadingDrilldown] = useState(false);

  // Modular Voice Agent Hook
  const {
    voiceConfig,
    updateConfig,
    orbState,
    orbSpeed,
    statusText: voiceStatusText,
    transcript,
    lastResponse,
    isSettingsOpen,
    setIsSettingsOpen,
    isRecording,
    isPlayingAudio,
    handleOrbMouseDown,
    handleOrbMouseUp,
    toggleVoiceSession,
    processUserSpeech,
  } = useVoiceAgent();

  // Swipe gesture detection state
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const mouseStartXRef = useRef<number | null>(null);
  const isMouseDownRef = useRef<boolean>(false);

  // Fetch detailed clinical drilldown from Supabase whenever selectedBed changes
  useEffect(() => {
    if (!selectedBed) return;
    setIsLoadingDrilldown(true);
    fetch(`/api/beds/${encodeURIComponent(selectedBed.name)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setDrilldownData(data);
        }
      })
      .catch((err) => console.warn("Failed to fetch bed drilldown", err))
      .finally(() => setIsLoadingDrilldown(false));
  }, [selectedBed]);

  // Subtle live cardiac telemetry pulse animation
  useEffect(() => {
    const interval = setInterval(() => {
      setBarMultipliers(BASE_WAVEFORM.map(() => 0.88 + Math.random() * 0.24));
    }, 750);
    return () => clearInterval(interval);
  }, []);

  // Keyboard navigation between screens (Arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setActiveScreen((prev) => (prev < 2 ? ((prev + 1) as 0 | 1 | 2) : prev));
      } else if (e.key === "ArrowLeft") {
        setActiveScreen((prev) => (prev > 0 ? ((prev - 1) as 0 | 1 | 2) : prev));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Swipe / Drag Interaction Logic
  const handleDragStart = (clientX: number, target: HTMLElement) => {
    // Only initiate swipe if clicking directly on the background / non-interactive area
    if (
      target.tagName === "BUTTON" ||
      target.tagName === "INPUT" ||
      target.closest("button") ||
      target.closest("input") ||
      target.closest(".figma-glass-card")
    ) {
      return;
    }
    isMouseDownRef.current = true;
    setIsDragging(true);
    mouseStartXRef.current = clientX;
    setDragOffset(0);
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging || mouseStartXRef.current === null) return;
    const deltaX = clientX - mouseStartXRef.current;

    // Resistance when swiping past bounds
    let limitedDelta = deltaX;
    if ((activeScreen === 0 && deltaX > 0) || (activeScreen === 2 && deltaX < 0)) {
      limitedDelta = deltaX * 0.25;
    }

    setDragOffset(limitedDelta);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    isMouseDownRef.current = false;

    const threshold = window.innerWidth * 0.1; // 10% screen width to trigger

    if (Math.abs(dragOffset) > Math.max(threshold, 40)) {
      if (dragOffset < 0) {
        setActiveScreen((prev) => (prev < 2 ? ((prev + 1) as 0 | 1 | 2) : prev));
      } else {
        setActiveScreen((prev) => (prev > 0 ? ((prev - 1) as 0 | 1 | 2) : prev));
      }
    }

    setDragOffset(0);
    mouseStartXRef.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent) => handleDragStart(e.touches[0].clientX, e.target as HTMLElement);
  const handleTouchMove = (e: React.TouchEvent) => handleDragMove(e.touches[0].clientX);
  const handleTouchEnd = () => handleDragEnd();

  const handleMouseDown = (e: React.MouseEvent) => handleDragStart(e.clientX, e.target as HTMLElement);
  const handleMouseMove = (e: React.MouseEvent) => handleDragMove(e.clientX);
  const handleMouseUp = () => handleDragEnd();
  const handleMouseLeave = () => { if (isDragging) handleDragEnd(); };

  // Derived drilldown data values
  const patientRecord = drilldownData?.bed?.patient;
  const latestVitals = drilldownData?.vitals?.[0];
  const bedStatus = drilldownData?.bed?.status || selectedBed.statusText?.toLowerCase() || "occupied";
  const isOccupied = bedStatus === "occupied" || !!patientRecord;
  const isCleaning = bedStatus === "cleaning" || selectedBed.color === "orange" && selectedBed.statusText === "CLEANING";
  const isBlocked = bedStatus === "blocked" || selectedBed.statusText === "BLOCKED";
  const isCritical = patientRecord?.acuity === "critical" || selectedBed.color === "red" || (latestVitals?.heart_rate && latestVitals.heart_rate > 110);

  const patientFullName = patientRecord
    ? `${patientRecord.first_name} ${patientRecord.last_name}`
    : selectedBed.patientName;
  const patientAgeGender = selectedBed.patientAgeGender || (patientRecord?.sex ? `${patientRecord.sex}` : "");
  const patientMRN = patientRecord?.medical_record_number || "MRN-2004";
  const patientBlood = patientRecord?.blood_type || "B+";
  const patientCondition = patientRecord?.patient_conditions?.[0]?.name || "Acute Observation";

  const vitalsHR = latestVitals?.heart_rate || (isCritical ? 118 : 78);
  const vitalsSpO2 = latestVitals?.spo2 || (isCritical ? 90 : 98);
  const vitalsBP = latestVitals?.systolic_bp && latestVitals?.diastolic_bp
    ? `${latestVitals.systolic_bp}/${latestVitals.diastolic_bp}`
    : isCritical ? "158/98" : "120/80";
  const vitalsTemp = latestVitals?.temperature || (isCritical ? 38.2 : 36.8);

  // Operational notice
  let operationalNotice: { type: "blocker" | "alert" | "info" | "success"; text: string; icon: string } | null = null;
  if (isBlocked || drilldownData?.discharge_plan?.status === "delayed") {
    operationalNotice = {
      type: "blocker",
      icon: "⚠️",
      text: drilldownData?.discharge_plan?.notes || "Discharge blocked: awaiting attending signature and pharmacy dispensing",
    };
  } else if (isCritical) {
    operationalNotice = {
      type: "alert",
      icon: "🚨",
      text: "Acute vitals deterioration • STAT Doctor Review & 12-lead ECG",
    };
  } else if (isCleaning || drilldownData?.cleaning_job?.status === "in_progress") {
    operationalNotice = {
      type: "info",
      icon: "🧹",
      text: "Terminal disinfection in progress • Started 8m ago • Assigned: Facilities",
    };
  } else if (selectedBed.statusText === "READY" || drilldownData?.discharge_plan?.status === "ready") {
    operationalNotice = {
      type: "success",
      icon: "✅",
      text: "Medically cleared • Discharge summary printed • Family in lobby",
    };
  }

  return (
    <main
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-screen h-screen bg-[#2E333A] overflow-hidden select-none cursor-grab active:cursor-grabbing"
    >
      {/* =====================================================================
          TOP HEADER (Top Left Dots, Title, Subtitle) - Anchored to Viewport
         ===================================================================== */}
      <header className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-9 py-5 pointer-events-none">
        {/* Swipe Indicator Dots (Top Left) */}
        <div className="flex items-center gap-[6px] pointer-events-auto cursor-pointer">
          {[0, 1, 2].map((idx) => {
            const isActive = idx === activeScreen;
            return (
              <button
                key={idx}
                onClick={() => setActiveScreen(idx as 0 | 1 | 2)}
                aria-label={`Swipe view ${idx + 1}`}
                className="w-[5px] h-[5px] rounded-full transition-all duration-300 hover:scale-125"
                style={{
                  backgroundColor: isActive
                    ? "rgba(217, 221, 237, 0.40)"
                    : "rgba(217, 221, 237, 0.10)",
                  boxShadow: "0 0 10px 0 rgba(90, 92, 102, 0.30)",
                }}
              />
            );
          })}
        </div>

        {/* Center Title */}
        <div className="text-[#8E92A4] text-[12px] font-medium tracking-[0.06em]">
          {activeScreen === 0 ? "General Ward" : activeScreen === 1 ? "Pharmacy" : "Diagnostics"}
        </div>

        {/* Right Label */}
        <div className="text-[#8E92A4] text-[12px] font-medium tracking-[0.06em]">
          {activeScreen === 0 ? "Floor 7" : ""}
        </div>
      </header>

      {/* =====================================================================
          FULL-SCREEN SLIDER CONTAINER (Transitions smoothly across whole viewport)
         ===================================================================== */}
      <div
        className={`flex w-full h-full ${isDragging ? "" : "transition-transform duration-500 ease-out"}`}
        style={{ transform: `translateX(calc(-${activeScreen * 100}vw + ${dragOffset}px))` }}
      >
        {/* =====================================================================
            SCREEN 1: GENERAL WARD (Takes entire viewport w-screen h-screen)
           ===================================================================== */}
        <div className="relative w-screen h-screen shrink-0 overflow-hidden flex items-center justify-start">
          <div className="relative h-full aspect-[2750/1536] max-w-none shrink-0">
            {/* Base 3D Ward Render */}
            <div className="absolute inset-0 w-full h-full">
              <Image
                src="/ward-room.png"
                alt="General Ward Floor Plan"
                fill
                priority
                sizes="100vw"
                className="object-cover object-left pointer-events-none"
              />
            </div>

            {/* Glowing Rectangles on Top of Beds */}
            {BED_RECTANGLES.map((bed) => {
              const isSelected = selectedBed.id === bed.id;
              const glowClass =
                bed.color === "green"
                  ? "bed-glow-green"
                  : bed.color === "orange"
                  ? "bed-glow-orange"
                  : "bed-glow-red";

              return (
                <div
                  key={bed.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBed(bed);
                  }}
                  className={`absolute cursor-pointer transition-transform duration-200 rounded-[4px] z-10 ${glowClass} ${
                    isSelected
                      ? "scale-[1.02] ring-1 ring-white/20"
                      : "hover:scale-[1.02]"
                  }`}
                  style={{
                    left: `${bed.leftPct}%`,
                    top: `${bed.topPct}%`,
                    width: `${bed.widthPct}%`,
                    height: `${bed.heightPct}%`,
                  }}
                  title={`${bed.name} (${bed.color.toUpperCase()})`}
                />
              );
            })}

            {/* Bed 2 Room Label in Top Room 3 */}
            <div
              className="absolute z-10 pointer-events-none"
              style={{
                left: "46.2%",
                top: "31.0%",
              }}
            >
              <div className="text-[#E2E5EE] text-[13px] font-semibold tracking-[-0.01em] leading-none">
                Bed 2
              </div>
              <div className="text-[#8B91A0] text-[9.5px] font-medium tracking-[0.08em] uppercase mt-[4px] leading-none">
                CLEANING
              </div>
            </div>

            {/* Left Vertical Icon Bar (Bottom Left) */}
            <aside className="absolute left-[16px] bottom-[34px] z-20 flex flex-col items-center gap-[18px]">
              <button
                aria-label="Satellite status"
                className="w-[18px] h-[18px] opacity-45 hover:opacity-100 transition-opacity duration-200 cursor-pointer"
              >
                <Image src="/satellite.svg" alt="Satellite" width={18} height={18} />
              </button>
              <button
                aria-label="Biometrics"
                className="w-[18px] h-[18px] opacity-45 hover:opacity-100 transition-opacity duration-200 cursor-pointer"
              >
                <Image src="/fingerprint.svg" alt="Biometrics" width={18} height={18} />
              </button>
              <button
                aria-label="Environment"
                className="w-[18px] h-[18px] opacity-45 hover:opacity-100 transition-opacity duration-200 cursor-pointer"
              >
                <Image src="/leaf.svg" alt="Environment" width={18} height={18} />
              </button>
              <button
                aria-label="Telephone"
                className="w-[18px] h-[18px] opacity-45 hover:opacity-100 transition-opacity duration-200 cursor-pointer"
              >
                <Image src="/phone.svg" alt="Phone" width={18} height={18} />
              </button>
            </aside>

            {/* =============================================================
                BOTTOM RIGHT GLASSMORPHIC CLINICAL OPERATIONS CARD
               ============================================================= */}
            <div
              className="absolute z-20 figma-glass-card rounded-[22px] p-[18px] pb-[16px] flex flex-col justify-between"
              style={{
                right: "2.5%",
                bottom: "3.2%",
                width: "25.2%",
                minWidth: "310px",
                maxWidth: "356px",
                maxHeight: "360px",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header: Bed Number, Acuity Status, Room & Floor */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-white text-[19px] font-semibold tracking-[-0.02em] leading-tight">
                      {selectedBed.name}
                    </h2>
                    <span
                      className={`text-[9.5px] font-semibold tracking-[0.06em] uppercase px-2 py-0.5 rounded-full border ${
                        isCritical
                          ? "bg-red-500/20 border-red-500/40 text-red-300"
                          : isBlocked
                          ? "bg-orange-500/20 border-orange-500/40 text-orange-300"
                          : isCleaning
                          ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                          : "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                      }`}
                    >
                      {selectedBed.statusText}
                    </span>
                  </div>
                  <span className="text-[#8E92A4] text-[11px] font-medium">
                    Room 401 • Floor 7
                  </span>
                </div>

                {/* Patient Primary Details */}
                {isOccupied ? (
                  <div className="flex flex-col mt-0.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-white text-[16px] font-semibold tracking-[-0.01em]">
                        {patientFullName}
                      </span>
                      <span className="text-[#8E92A4] text-[11px] font-mono">
                        {patientMRN}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11.5px] text-[#A6ACBE] mt-0.5">
                      <span>{patientAgeGender}</span>
                      <span className="text-[#4E5364]">•</span>
                      <span>Blood {patientBlood}</span>
                      <span className="text-[#4E5364]">•</span>
                      <span className="text-[#1ECCE6] truncate max-w-[130px] font-medium">
                        {patientCondition}
                      </span>
                    </div>
                  </div>
                ) : isCleaning ? (
                  <div className="flex flex-col mt-0.5">
                    <span className="text-[#E67F1E] text-[14px] font-semibold">
                      Terminal Sanitization
                    </span>
                    <span className="text-[#A6ACBE] text-[11.5px] mt-0.5">
                      Cleaning started 8m ago • Assigned: Facilities
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col mt-0.5">
                    <span className="text-[#24A951] text-[14px] font-semibold">
                      Sanitized & Ready
                    </span>
                    <span className="text-[#A6ACBE] text-[11.5px] mt-0.5">
                      Available for immediate inpatient admission
                    </span>
                  </div>
                )}
              </div>

              {/* Real-Time Cardiac Waveform & 4-Pill Vitals */}
              {isOccupied && (
                <div className="flex flex-col gap-1.5 my-1">
                  {/* Waveform */}
                  <div className="flex items-end gap-[2px] h-[34px] px-1 bg-black/20 rounded-[8px] py-1 border border-white/5">
                    {BASE_WAVEFORM.slice(0, 36).map((baseH, i) => {
                      const currentHeight = Math.max(
                        3,
                        Math.min(26, Math.round((baseH * 0.6) * (barMultipliers[i] || 1)))
                      );
                      return (
                        <div
                          key={i}
                          className={`w-[2.5px] rounded-full transition-all duration-300 ${
                            isCritical ? "bg-[#E61E67] opacity-80" : "bg-[#1ECCE6] opacity-70"
                          }`}
                          style={{ height: `${currentHeight}px` }}
                        />
                      );
                    })}
                  </div>

                  {/* Vitals 4-col Strip */}
                  <div className="grid grid-cols-4 gap-1 text-center">
                    <div className="bg-white/[0.03] border border-white/5 rounded-[6px] py-1">
                      <div className="text-[9px] text-[#8E92A4] font-medium uppercase">HR</div>
                      <div className={`text-[12px] font-semibold font-mono ${isCritical ? "text-[#E61E67] animate-pulse" : "text-white"}`}>
                        {vitalsHR} <span className="text-[8px] font-normal text-[#6D7282]">bpm</span>
                      </div>
                    </div>
                    <div className="bg-white/[0.03] border border-white/5 rounded-[6px] py-1">
                      <div className="text-[9px] text-[#8E92A4] font-medium uppercase">SpO2</div>
                      <div className={`text-[12px] font-semibold font-mono ${vitalsSpO2 < 92 ? "text-[#E67F1E]" : "text-white"}`}>
                        {vitalsSpO2}%
                      </div>
                    </div>
                    <div className="bg-white/[0.03] border border-white/5 rounded-[6px] py-1">
                      <div className="text-[9px] text-[#8E92A4] font-medium uppercase">BP</div>
                      <div className="text-[12px] font-semibold font-mono text-white">
                        {vitalsBP}
                      </div>
                    </div>
                    <div className="bg-white/[0.03] border border-white/5 rounded-[6px] py-1">
                      <div className="text-[9px] text-[#8E92A4] font-medium uppercase">Temp</div>
                      <div className="text-[12px] font-semibold font-mono text-white">
                        {vitalsTemp}°C
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Operational Blockage / Task Alert Box */}
              {operationalNotice && (
                <div
                  className={`rounded-[8px] p-2 text-[11px] leading-[1.3] border flex items-start gap-1.5 ${
                    operationalNotice.type === "blocker"
                      ? "bg-[#E67F1E]/15 border-[#E67F1E]/30 text-[#F4B476]"
                      : operationalNotice.type === "alert"
                      ? "bg-[#E61E67]/15 border-[#E61E67]/30 text-[#F482A3]"
                      : "bg-[#24A951]/15 border-[#24A951]/30 text-[#82D99E]"
                  }`}
                >
                  <span className="text-[12px] shrink-0">{operationalNotice.icon}</span>
                  <span className="truncate">{operationalNotice.text}</span>
                </div>
              )}

              {/* Bottom Action Row: Action buttons + ThinkingOrb */}
              <div className="flex items-center justify-between pt-1 border-t border-white/10 mt-1">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      alert(`Transporter dispatch request sent for ${selectedBed.name}`);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-white/[0.05] hover:bg-white/10 border border-white/10 text-[11px] text-[#C1C6D7] transition-all"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <span>Porter</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      alert(`Printing clinical discharge paperwork for ${selectedBed.name}`);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-white/[0.05] hover:bg-white/10 border border-white/10 text-[11px] text-[#C1C6D7] transition-all"
                    title="Print Summary"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9V2h12v7" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <rect x="6" y="14" width="12" height="8" rx="1" />
                    </svg>
                    <span>Print</span>
                  </button>
                </div>
              </div>

              {/* ThinkingOrb Anchored on Bottom-Right Corner with Voice State Reactivity & 5s Long-Press */}
              <div
                onMouseDown={handleOrbMouseDown}
                onMouseUp={handleOrbMouseUp}
                onTouchStart={handleOrbMouseDown}
                onTouchEnd={handleOrbMouseUp}
                onClick={toggleVoiceSession}
                className="absolute -right-[14px] -bottom-[14px] z-30 pointer-events-auto cursor-pointer group"
                title={`${voiceStatusText} (Click to toggle voice, click & hold 5s for settings)`}
              >
                <ThinkingOrb state={orbState} size={64} speed={orbSpeed} />
                {isPlayingAudio && (
                  <span className="absolute -top-6 right-0 text-[10px] bg-black/70 px-2 py-0.5 rounded text-[#1ECCE6] whitespace-nowrap pointer-events-none animate-pulse">
                    Speaking
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            SCREEN 2: PHARMACY SHELF (Takes entire viewport w-screen h-screen)
           ===================================================================== */}
        <div className="relative w-screen h-screen shrink-0 overflow-hidden flex items-center justify-start">
          <div className="relative h-full aspect-[2760/1840] max-w-none shrink-0">
            {/* Base 3D Shelf Render */}
            <div className="absolute inset-0 w-full h-full">
              <Image
                src="/medicine-shelf-transparent.png"
                alt="Pharmacy Medicine Shelf"
                fill
                priority
                sizes="100vw"
                className="object-cover object-left pointer-events-none"
              />
            </div>

            {/* Lights Fixtures */}
            <div
              className="absolute z-10 pointer-events-none"
              style={{
                left: "25.20%",
                top: "12.74%",
                width: "16.41%",
                height: "1.03%",
              }}
            >
              <div className="w-full h-full rounded-sm shelf-light-bar" />
              <div
                className="absolute left-1/2 -translate-x-1/2 -top-[10px] w-[260px] h-[340px] shelf-light-downward-glow pointer-events-none"
                style={{ clipPath: "polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)" }}
              />
            </div>

            <div
              className="absolute z-10 pointer-events-none"
              style={{
                left: "58.69%",
                top: "12.74%",
                width: "16.41%",
                height: "1.03%",
              }}
            >
              <div className="w-full h-full rounded-sm shelf-light-bar" />
              <div
                className="absolute left-1/2 -translate-x-1/2 -top-[10px] w-[260px] h-[340px] shelf-light-downward-glow pointer-events-none"
                style={{ clipPath: "polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)" }}
              />
            </div>

            {/* Highlighted Shelf Items */}
            {SHELF_ITEMS.map((item) => {
              const isSelected = selectedMed.id === item.id;
              const glowClass =
                item.colorType === "cyan"
                  ? "shelf-glow-cyan"
                  : item.colorType === "green"
                  ? "shelf-glow-green"
                  : item.colorType === "orange"
                  ? "shelf-glow-orange"
                  : "shelf-glow-magenta";

              return (
                <div
                  key={item.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMed(item);
                  }}
                  className={`absolute cursor-pointer transition-transform duration-200 z-10 ${glowClass} ${
                    item.isBottleShape ? "rounded-[5px]" : "rounded-[3px]"
                  } ${
                    isSelected
                      ? "scale-[1.02] ring-1 ring-white/30"
                      : "hover:scale-[1.02]"
                  }`}
                  style={{
                    left: `${item.leftPct}%`,
                    top: `${item.topPct}%`,
                    width: `${item.widthPct}%`,
                    height: `${item.heightPct}%`,
                    ...(item.isBottleShape && {
                      borderRadius: "6px 6px 4px 4px",
                    }),
                  }}
                  title={item.name}
                />
              );
            })}

            {/* Benadryl Floating Text Label */}
            <div
              className="absolute z-10 pointer-events-none text-center"
              style={{
                left: "37.30%",
                top: "45.60%",
                width: "2.73%",
                transform: "translateX(-2px)",
              }}
            >
              <span className="text-[#C87396] text-[12px] font-normal tracking-[0.02em] whitespace-nowrap">
                Benadryl
              </span>
            </div>

            {/* Glassmorphism Search Pill */}
            <div
              className="absolute z-20 figma-glass-card rounded-[12px] px-[14px] py-[6px] flex items-center gap-[8px]"
              style={{
                right: "4.8%",
                bottom: "41.5%",
                width: "21.8%",
                minWidth: "210px",
                maxWidth: "248px",
                height: "32px",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-transparent text-[11px] text-white/90 placeholder-[#6D7385] outline-none font-normal"
              />
            </div>

            {/* Glassmorphism Medication Detail Card */}
            <div
              className="absolute z-20 figma-glass-card rounded-[18px] p-[18px] pb-[16px] flex flex-col justify-between"
              style={{
                right: "4.5%",
                bottom: "7.2%",
                width: "21.8%",
                minWidth: "210px",
                maxWidth: "248px",
                height: "220px",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col">
                <h2 className="text-white text-[19px] font-semibold tracking-[-0.02em] leading-tight">
                  {selectedMed.name}
                </h2>
                <span className="text-[#9BA1B2] text-[11px] font-normal mt-[3px]">
                  {selectedMed.category}
                </span>
              </div>

              <div className="my-[8px] flex flex-col gap-[6px]">
                {selectedMed.indication.map((bullet, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-[6px] text-[10px] leading-[1.35] text-[#C1C6D7]"
                  >
                    <span className="text-[#717688] mt-[-1px] font-bold">•</span>
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>

              <div className="relative pt-1">
                <div className="w-[78px] h-[24px] rounded-[6px] border border-white/10 bg-white/[0.03] flex items-center justify-center opacity-40">
                  <div className="w-[32px] h-[2.5px] bg-white/30 rounded-full" />
                </div>
              </div>

              {/* ThinkingOrb on bottom right */}
              <div
                onMouseDown={handleOrbMouseDown}
                onMouseUp={handleOrbMouseUp}
                onTouchStart={handleOrbMouseDown}
                onTouchEnd={handleOrbMouseUp}
                onClick={toggleVoiceSession}
                className="absolute -right-[14px] -bottom-[14px] z-30 pointer-events-auto cursor-pointer group"
                title={`${voiceStatusText} (Click to toggle voice, click & hold 5s for settings)`}
              >
                <ThinkingOrb state={orbState} size={64} speed={orbSpeed} />
                {isPlayingAudio && (
                  <span className="absolute -top-6 right-0 text-[10px] bg-black/70 px-2 py-0.5 rounded text-[#1ECCE6] whitespace-nowrap pointer-events-none animate-pulse">
                    Speaking
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            SCREEN 3: DIAGNOSTICS & TELEMETRY
           ===================================================================== */}
        <div className="relative w-screen h-screen shrink-0 overflow-hidden flex flex-col items-center justify-center text-[#8E92A4]">
          <div className="text-[16px] font-medium tracking-[0.06em]">
            Ward Diagnostics & Telemetry Screen 3
          </div>
          <div className="text-[12px] text-[#6D7282] mt-2">
            Swipe left or click the swipe dots to navigate back
          </div>
        </div>
      </div>

      {/* Modular Voice Architecture Settings Modal (Triggered by 5s long-press on Orb) */}
      <VoiceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={voiceConfig}
        onSave={updateConfig}
      />
    </main>
  );
}

