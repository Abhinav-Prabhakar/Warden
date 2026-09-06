"use client";

import React, { useState, useEffect } from "react";
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
    leftPct: 50.00,
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
  21, 6, 22, 6, 26, 28, 6, 24, 6, 52, 48
];

export default function WardenMainScreen() {
  const [selectedBed, setSelectedBed] = useState<BedOverlay>(
    BED_RECTANGLES.find((b) => b.id === "bed-top-3") || BED_RECTANGLES[1]
  );
  const [activeDot, setActiveDot] = useState(0);
  const [barMultipliers, setBarMultipliers] = useState<number[]>(
    BASE_WAVEFORM.map(() => 1)
  );

  // Subtle live cardiac telemetry pulse animation
  useEffect(() => {
    const interval = setInterval(() => {
      setBarMultipliers(
        BASE_WAVEFORM.map(() => 0.88 + Math.random() * 0.24)
      );
    }, 750);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="relative w-screen h-screen bg-[#111319] overflow-hidden flex items-center justify-center select-none">
      {/* Top Header Overlay */}
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-9 py-5 pointer-events-none">
        {/* Swipe Indicator Dots (Top Left) */}
        <div className="flex items-center gap-[6px] pointer-events-auto cursor-pointer">
          {[0, 1, 2].map((idx) => {
            const isActive = idx === activeDot;
            return (
              <button
                key={idx}
                onClick={() => setActiveDot(idx)}
                aria-label={`Swipe view ${idx + 1}`}
                className="w-[5px] h-[5px] rounded-full transition-all duration-300"
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
          General Ward
        </div>

        {/* Right Label */}
        <div className="text-[#8E92A4] text-[12px] font-medium tracking-[0.06em]">
          Floor 7
        </div>
      </header>

      {/* Main Floor Plan Container */}
      <div className="relative w-full h-full max-w-[1920px] max-h-[1080px] aspect-[2750/1536] flex items-center justify-center">
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
              onClick={() => setSelectedBed(bed)}
              className={`absolute cursor-pointer transition-transform duration-200 rounded-[4px] z-10 ${glowClass} ${
                isSelected ? "scale-[1.02] ring-1 ring-white/20" : "hover:scale-[1.02]"
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
    </main>
  );
}
