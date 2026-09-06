"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { ThinkingOrb } from "thinking-orbs";

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
    BED_RECTANGLES.find((b) => b.id === "bed-top-3") || BED_RECTANGLES[1]
  );
  const [selectedMed, setSelectedMed] = useState<ShelfItem>(SHELF_ITEMS[1]); // Benadryl default
  const [searchQuery, setSearchQuery] = useState("");
  const [barMultipliers, setBarMultipliers] = useState<number[]>(
    BASE_WAVEFORM.map(() => 1)
  );

  // Swipe gesture detection state
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const mouseStartXRef = useRef<number | null>(null);
  const isMouseDownRef = useRef<boolean>(false);

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

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = touchStartYRef.current
      ? e.changedTouches[0].clientY - touchStartYRef.current
      : 0;

    // Horizontal swipe threshold: 45px, more horizontal than vertical
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        // Swipe Left -> next screen
        setActiveScreen((prev) => (prev < 2 ? ((prev + 1) as 0 | 1 | 2) : prev));
      } else {
        // Swipe Right -> prev screen
        setActiveScreen((prev) => (prev > 0 ? ((prev - 1) as 0 | 1 | 2) : prev));
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // Mouse Drag Swipe Handlers for Desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only initiate swipe if clicking directly on the background / non-interactive area
    const target = e.target as HTMLElement;
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
    mouseStartXRef.current = e.clientX;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current || mouseStartXRef.current === null) return;
    const deltaX = e.clientX - mouseStartXRef.current;
    if (Math.abs(deltaX) > 45) {
      if (deltaX < 0) {
        setActiveScreen((prev) => (prev < 2 ? ((prev + 1) as 0 | 1 | 2) : prev));
      } else {
        setActiveScreen((prev) => (prev > 0 ? ((prev - 1) as 0 | 1 | 2) : prev));
      }
    }
    isMouseDownRef.current = false;
    mouseStartXRef.current = null;
  };

  return (
    <main
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative w-screen h-screen bg-[#111319] overflow-hidden flex items-center justify-start select-none"
    >
      {/* =========================================================================
          VIEWPORT CONTENT CONTAINER
          Left-aligned: keeps exact background image aspect ratio and scales with height.
          All coordinates, glass cards, icons, and overlays anchor to this exact container.
         ========================================================================= */}
      <div
        className={`relative h-full flex-shrink-0 transition-opacity duration-300 ${
          activeScreen === 0 ? "aspect-[2750/1536]" : "aspect-[2760/1840]"
        }`}
      >
        {/* =====================================================================
            TOP HEADER (Top Left Dots, Title, Subtitle)
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
            {activeScreen === 0 ? "General Ward" : "Pharmacy"}
          </div>

          {/* Right Label */}
          <div className="text-[#8E92A4] text-[12px] font-medium tracking-[0.06em]">
            {activeScreen === 0 ? "Floor 7" : ""}
          </div>
        </header>

        {/* =====================================================================
            SCREEN 1: GENERAL WARD
           ===================================================================== */}
        {activeScreen === 0 && (
          <div className="relative w-full h-full">
            {/* Base 3D Ward Render */}
            <div className="absolute inset-0 w-full h-full">
              <Image
                src="/ward-room.png"
                alt="General Ward Floor Plan"
                fill
                priority
                sizes="100vw"
                className="object-contain pointer-events-none"
              />
            </div>

            {/* Hardcoded Glowing Rectangles on Top of Beds */}
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
                <Image
                  src="/satellite.svg"
                  alt="Satellite"
                  width={18}
                  height={18}
                />
              </button>
              <button
                aria-label="Biometrics"
                className="w-[18px] h-[18px] opacity-45 hover:opacity-100 transition-opacity duration-200 cursor-pointer"
              >
                <Image
                  src="/fingerprint.svg"
                  alt="Biometrics"
                  width={18}
                  height={18}
                />
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

            {/* Bottom Right Glassmorphic Card */}
            <div
              className="absolute z-20 figma-glass-card rounded-[20px] p-[20px] pb-[18px] flex flex-col justify-between"
              style={{
                right: "2.5%",
                bottom: "3.6%",
                width: "21.6%",
                minWidth: "220px",
                maxWidth: "262px",
                height: "232px",
              }}
            >
              {/* Top Section */}
              <div className="flex flex-col">
                <h2 className="text-white text-[19px] font-semibold tracking-[-0.02em] leading-tight">
                  {selectedBed.name}
                </h2>
                <span className="text-[#9BA1B2] text-[11px] font-medium tracking-[0.06em] uppercase mt-[2px]">
                  {selectedBed.statusText}
                </span>
                <span className="text-[#D1D5E2] text-[13px] font-normal mt-[8px]">
                  Medications
                </span>
              </div>

              {/* Middle Cardiac Telemetry Visualizer */}
              <div className="my-[6px]">
                <div className="flex items-end gap-[2px] h-[48px]">
                  {BASE_WAVEFORM.map((baseH, i) => {
                    const currentHeight = Math.max(
                      4,
                      Math.min(46, Math.round(baseH * (barMultipliers[i] || 1)))
                    );
                    return (
                      <div
                        key={i}
                        className="w-[2px] bg-[#9BA1B2] rounded-full transition-all duration-300 opacity-60"
                        style={{
                          height: `${currentHeight}px`,
                        }}
                      />
                    );
                  })}
                </div>
                <div className="text-[#6D7282] text-[8.5px] font-medium tracking-[0.06em] uppercase mt-[5px]">
                  Heart Rate
                </div>
              </div>

              {/* Bottom Section: Patient info & printer icon */}
              <div className="relative pt-2">
                <div className="flex flex-col">
                  <span className="text-white text-[17px] font-semibold tracking-[-0.01em] leading-none">
                    {selectedBed.patientName}
                  </span>
                  <span className="text-[#9BA1B2] text-[12.5px] font-normal mt-[5px] leading-none">
                    {selectedBed.patientAgeGender}
                  </span>
                </div>

                {/* Subtle Printer Icon below patient details */}
                <div className="mt-4">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#9BA1B2"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-45"
                  >
                    <path d="M6 9V2h12v7" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" rx="1" />
                  </svg>
                </div>
              </div>

              {/* ThinkingOrb Anchored on Bottom-Right Corner */}
              <div className="absolute -right-[14px] -bottom-[14px] z-30 pointer-events-auto">
                <ThinkingOrb state="listening" size={64} />
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            SCREEN 2: PHARMACY SHELF
           ===================================================================== */}
        {activeScreen === 1 && (
          <div className="relative w-full h-full">
            {/* Base 3D Shelf Render */}
            <div className="absolute inset-0 w-full h-full">
              <Image
                src="/medicine-shelf.png"
                alt="Pharmacy Medicine Shelf"
                fill
                priority
                sizes="100vw"
                className="object-contain pointer-events-none"
              />
            </div>

            {/* =================================================================
                LIGHT FIXTURES WITH USER GRADIENT & LAYER BLUR 250
                - Lights: #E8FCFF with 60% opacity
                - Directional downward glow: linear-gradient from #E8FCFF 5% to 1%, blur 250
               ================================================================= */}
            {/* Left Light Fixture */}
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
              {/* Downward Directional Glow Gradient */}
              <div
                className="absolute left-1/2 -translate-x-1/2 -top-[10px] w-[260px] h-[340px] shelf-light-downward-glow pointer-events-none"
                style={{
                  clipPath: "polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)",
                }}
              />
            </div>

            {/* Right Light Fixture */}
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
              {/* Downward Directional Glow Gradient */}
              <div
                className="absolute left-1/2 -translate-x-1/2 -top-[10px] w-[260px] h-[340px] shelf-light-downward-glow pointer-events-none"
                style={{
                  clipPath: "polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)",
                }}
              />
            </div>

            {/* =================================================================
                HIGHLIGHTED SHELF ITEMS (Cyan, Green, Orange, Magenta Bottle)
                Drop shadow: blur 250, spread 80, opacity 25%
               ================================================================= */}
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

              // Magenta bottle has custom bottle shape styling (rounded shoulder & neck)
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

            {/* Benadryl Floating Text Label above magenta bottle */}
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

            {/* =================================================================
                GLASSMORPHISM COMPONENT 1: SEARCH PILL
                Fill #1A1E26 55% with Figma glass reflection & blur
               ================================================================= */}
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

            {/* =================================================================
                GLASSMORPHISM COMPONENT 2: MEDICATION DETAIL CARD
                Fill #1A1E26 55%, with ThinkingOrb on bottom right
               ================================================================= */}
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
              {/* Card Header */}
              <div className="flex flex-col">
                <h2 className="text-white text-[19px] font-semibold tracking-[-0.02em] leading-tight">
                  {selectedMed.name}
                </h2>
                <span className="text-[#9BA1B2] text-[11px] font-normal mt-[3px]">
                  {selectedMed.category}
                </span>
              </div>

              {/* Card Indications List */}
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

              {/* Bottom Subtle Bar / Action Placeholder */}
              <div className="relative pt-1">
                <div className="w-[78px] h-[24px] rounded-[6px] border border-white/10 bg-white/[0.03] flex items-center justify-center opacity-40">
                  <div className="w-[32px] h-[2.5px] bg-white/30 rounded-full" />
                </div>
              </div>

              {/* ThinkingOrb Anchored on Bottom-Right Corner */}
              <div className="absolute -right-[14px] -bottom-[14px] z-30 pointer-events-auto">
                <ThinkingOrb state="listening" size={64} />
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            SCREEN 3: PLACEHOLDER (Ready for future screens)
           ===================================================================== */}
        {activeScreen === 2 && (
          <div className="relative w-full h-full flex flex-col items-center justify-center text-[#8E92A4]">
            <div className="text-[16px] font-medium tracking-[0.06em]">
              Ward Diagnostics & Telemetry Screen 3
            </div>
            <div className="text-[12px] text-[#6D7282] mt-2">
              Swipe left or click the swipe dots to navigate back
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

