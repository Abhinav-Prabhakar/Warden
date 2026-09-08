"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { ThinkingOrb } from "thinking-orbs";
import { useVoiceAgent } from "@/lib/voice/useVoiceAgent";
import { useWardRealtime } from "@/lib/realtime/useWardRealtime";
import { VoiceSettingsModal } from "@/app/components/VoiceSettingsModal";
import { StaffDirectoryCard } from "@/app/components/StaffDirectoryCard";
import { SatelliteRadioCard } from "@/app/components/SatelliteRadioCard";
import { EnergyEfficiencyCard } from "@/app/components/EnergyEfficiencyCard";
import { TelephoneCallAssistantCard } from "@/app/components/TelephoneCallAssistantCard";
import { NightShiftMemoryCard } from "@/app/components/NightShiftMemoryCard";
import { IncomingAdmissionsCard } from "@/app/components/IncomingAdmissionsCard";

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
  isCleaningJob?: boolean;
}

interface BedGeometry {
  slotId: string;
  name: string;
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
}

const BED_GEOMETRY: BedGeometry[] = [
  // Top Row (4 rooms with beds, left to right)
  {
    slotId: "bed-top-1",
    name: "Bed 1",
    leftPct: 14.55,
    topPct: 10.8,
    widthPct: 3.2,
    heightPct: 14.2,
  },
  {
    slotId: "bed-top-3",
    name: "Bed 2",
    leftPct: 49.9,
    topPct: 10.45,
    widthPct: 3.65,
    heightPct: 14.5,
  },
  {
    slotId: "bed-top-4",
    name: "Bed 3",
    leftPct: 68.16,
    topPct: 10.6,
    widthPct: 3.45,
    heightPct: 14.5,
  },
  {
    slotId: "bed-top-5",
    name: "Bed 4",
    leftPct: 86.72,
    topPct: 10.6,
    widthPct: 3.45,
    heightPct: 14.5,
  },

  // Bottom Row
  // Room 1 (bottom left)
  {
    slotId: "bed-b1-h",
    name: "Bed 5",
    leftPct: 7.03,
    topPct: 67.5,
    widthPct: 8.2,
    heightPct: 6.2,
  },
  {
    slotId: "bed-b1-v",
    name: "Bed 6",
    leftPct: 9.3,
    topPct: 75.96,
    widthPct: 3.35,
    heightPct: 14.7,
  },

  // Room 2 (bottom second)
  {
    slotId: "bed-b2-h",
    name: "Bed 7",
    leftPct: 18.5,
    topPct: 66.9,
    widthPct: 8.15,
    heightPct: 6.35,
  },
  {
    slotId: "bed-b2-v",
    name: "Bed 8",
    leftPct: 23.05,
    topPct: 76.13,
    widthPct: 3.32,
    heightPct: 14.7,
  },

  // Room 3 (bottom third)
  {
    slotId: "bed-b3-v",
    name: "Bed 9",
    leftPct: 30.96,
    topPct: 76.13,
    widthPct: 3.32,
    heightPct: 14.7,
  },

  // Room 5 (bottom right room)
  {
    slotId: "bed-b5-left",
    name: "Bed 10",
    leftPct: 52.54,
    topPct: 75.8,
    widthPct: 3.75,
    heightPct: 14.7,
  },
  {
    slotId: "bed-b5-right",
    name: "Bed 11",
    leftPct: 64.84,
    topPct: 75.6,
    widthPct: 3.25,
    heightPct: 14.7,
  },
];

/* ============================================================
   Clinical card theming — one tone per bed state, reused by the
   status pill, ambient glass glow, ECG trace and notice banner
   ============================================================ */
type CardTone = "danger" | "task" | "well";

const CARD_TONE: Record<CardTone, { accent: string; text: string }> = {
  danger: { accent: "#E61E67", text: "#FF9DB2" },
  task: { accent: "#E67F1E", text: "#F4B476" },
  well: { accent: "#24A951", text: "#82D99E" },
};

const NOTICE_THEME: Record<"blocker" | "alert" | "info" | "success", { accent: string; text: string }> = {
  blocker: { accent: "#E67F1E", text: "#F4B476" },
  alert: { accent: "#E61E67", text: "#FF9DB2" },
  info: { accent: "#F0B429", text: "#F6CE72" },
  success: { accent: "#24A951", text: "#82D99E" },
};

/* Loose shapes for the Supabase bed-drilldown payload — typed only where the card reads them */
type BedDrilldown = {
  bed?: {
    status?: string;
    patient?: {
      medical_record_number?: string;
      first_name?: string;
      last_name?: string;
      date_of_birth?: string;
      sex?: string;
      blood_type?: string;
      admission_at?: string;
      acuity?: string;
      patient_conditions?: { name: string }[];
      patient_allergies?: { allergen: string }[];
    } | null;
    room?: { room_number: string | number; floor_number: string | number } | null;
  };
  vitals?: {
    heart_rate?: number;
    spo2?: number;
    systolic_bp?: number;
    diastolic_bp?: number;
    temperature?: number;
    recorded_at?: string;
  }[];
  tasks?: { title?: string; status?: string }[];
  discharge_plan?: { planned_discharge_at?: string; status?: string; notes?: string } | null;
  cleaning_job?: { started_at?: string; status?: string } | null;
};

function NoticeIcon({ type, className }: { type: string; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (type === "alert") {
    return (
      <svg {...common}>
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        <line x1="12" y1="9" x2="12" y2="13.5" />
        <line x1="12" y1="17" x2="12" y2="17.01" />
      </svg>
    );
  }
  if (type === "info") {
    return (
      <svg {...common}>
        <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
        <path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7L19 15z" />
      </svg>
    );
  }
  if (type === "blocker") {
    return (
      <svg {...common}>
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <path d="M9 12h6" />
        <path d="M9 16h4" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.2l2.4 2.4 4.6-5" />
    </svg>
  );
}

/* Single-beat ECG morphology: baseline → P wave → QRS complex → T wave
   (x in beat units, y offset from baseline; negative y is upward) */
const ECG_BEAT: Array<[number, number]> = [
  [0, 0], [8, 0],
  [12, -1.5], [16, -3.2], [20, -1.5], [24, 0],
  [32, 0],
  [36, 1.6], [39, 1.6],
  [42.5, -15], [45.5, 6.5], [48, 0],
  [56, 0],
  [61, -2], [65, -4.4], [69, -2], [73, 0],
  [82, 0], [90, 0],
];

function buildEcgPath(beats: number, beatWidth: number, midY: number): string {
  const points: string[] = [];
  for (let b = 0; b < beats; b++) {
    for (const [dx, dy] of ECG_BEAT) {
      points.push(`${(b * beatWidth + dx).toFixed(1)},${(midY + dy).toFixed(1)}`);
    }
  }
  return `M${points.join(" L")}`;
}

const ECG_PATH = buildEcgPath(6, 90, 21);

function calcAge(dob?: string): number | null {
  if (!dob) return null;
  const t = new Date(dob).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / (365.25 * 24 * 3600 * 1000));
}

function stayLabel(admissionAt?: string): string {
  if (!admissionAt) return "—";
  const ms = Date.now() - new Date(admissionAt).getTime();
  if (Number.isNaN(ms) || ms < 0) return "—";
  const days = Math.floor(ms / (24 * 3600 * 1000));
  return days >= 1 ? `${days}d` : "<1d";
}

function elapsedLabel(ts?: string): string {
  if (!ts) return "8m";
  const ms = Date.now() - new Date(ts).getTime();
  if (Number.isNaN(ms) || ms < 0) return "moments";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "moments";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function clockLabel(ts?: string): string {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function dischargeLabel(ts?: string): string {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return d.toDateString() === new Date().toDateString()
    ? time
    : `${d.toLocaleDateString([], { weekday: "short" })} ${time}`;
}

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

const AVAILABLE_FLOORS = [4, 5, 6, 7, 8];

export default function WardenMainScreen() {
  const [activeScreen, setActiveScreen] = useState<0 | 1 | 2>(0);
  const [currentFloor, setCurrentFloor] = useState<number>(7);
  const [isStaffOpen, setIsStaffOpen] = useState<boolean>(false);
  const [isRadioOpen, setIsRadioOpen] = useState<boolean>(false);
  const [isEfficiencyOpen, setIsEfficiencyOpen] = useState<boolean>(false);
  const [isPhoneOpen, setIsPhoneOpen] = useState<boolean>(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState<boolean>(false);
  const [isAdmissionsOpen, setIsAdmissionsOpen] = useState<boolean>(false);
  const wardRealtime = useWardRealtime(currentFloor);

  // Live Beds state from Supabase
  const [beds, setBeds] = useState<BedOverlay[]>([]);
  const [bedsLoading, setBedsLoading] = useState<boolean>(true);
  const [bedsError, setBedsError] = useState<string | null>(null);
  const [selectedBed, setSelectedBed] = useState<BedOverlay | null>(null);

  // Live Pharmacy items state from Supabase
  const [shelfItems, setShelfItems] = useState<ShelfItem[]>([]);
  const [shelfLoading, setShelfLoading] = useState<boolean>(true);
  const [shelfError, setShelfError] = useState<string | null>(null);
  const [selectedMed, setSelectedMed] = useState<ShelfItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Live Supabase bed drilldown state — keyed by bed name so stale
  // results from a previous selection are ignored while a new one loads
  const [drilldown, setDrilldown] = useState<{ bedName: string; data: BedDrilldown } | null>(null);
  const [settledBed, setSettledBed] = useState<string | null>(null);
  const isLoadingDrilldown = Boolean(selectedBed && settledBed !== selectedBed.name);

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
    triggerSelfInvalidationDemo,
    triggerProactiveCallout,
  } = useVoiceAgent();

  // Swipe gesture detection state
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const mouseStartXRef = useRef<number | null>(null);
  const isMouseDownRef = useRef<boolean>(false);

  // 1. Fetch live beds from Supabase whenever floor changes
  useEffect(() => {
    setBedsLoading(true);
    setBedsError(null);
    fetch(`/api/beds?floor=${currentFloor}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data && !data.error && Array.isArray(data.beds)) {
          const mapped: BedOverlay[] = data.beds.slice(0, BED_GEOMETRY.length).map((b: any, idx: number) => {
            const geom = BED_GEOMETRY[idx] || BED_GEOMETRY[0];
            const pat = b.patient;
            const age = pat?.date_of_birth ? calcAge(pat.date_of_birth) : null;
            const patientAgeGender = pat
              ? `${pat.sex === 'male' || pat.sex === 'M' ? 'M' : pat.sex === 'female' || pat.sex === 'F' ? 'F' : pat.sex || '—'}, ${age ? `${age}y` : '—'}`
              : 'Unassigned';
            const patientName = pat ? `${pat.first_name || ''} ${pat.last_name || ''}`.trim() : 'Vacant Bed';

            return {
              id: b.id,
              name: `Bed ${b.bed_number || idx + 1}`,
              color: b.color,
              leftPct: geom.leftPct,
              topPct: geom.topPct,
              widthPct: geom.widthPct,
              heightPct: geom.heightPct,
              patientName,
              patientAgeGender,
              statusText: b.statusText,
              isCleaningJob: b.isCleaningJob,
            };
          });
          setBeds(mapped);
          setSelectedBed((prev) => {
            if (prev) {
              const matched = mapped.find((m) => m.name === prev.name);
              if (matched) return matched;
            }
            return mapped.find((m) => m.name === "Bed 3") || mapped[0] || null;
          });
        } else {
          setBedsError(data?.error || "Failed to load floor beds");
        }
      })
      .catch((err) => {
        console.error("Failed to load beds:", err);
        setBedsError("Live database connection unavailable for beds");
      })
      .finally(() => setBedsLoading(false));
  }, [currentFloor, wardRealtime.revision]);

  // 2. Fetch live pharmacy items from Supabase on mount
  useEffect(() => {
    setShelfLoading(true);
    setShelfError(null);
    fetch("/api/pharmacy")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data && !data.error && Array.isArray(data.items)) {
          setShelfItems(data.items);
          if (data.items.length > 0) {
            const benadryl = data.items.find((i: ShelfItem) => i.name.toLowerCase().includes("benadryl"));
            setSelectedMed(benadryl || data.items[0]);
          }
        } else {
          setShelfError(data?.error || "Failed to load pharmacy items");
        }
      })
      .catch((err) => {
        console.error("Failed to load pharmacy items:", err);
        setShelfError("Live database connection unavailable for pharmacy");
      })
      .finally(() => setShelfLoading(false));
  }, []);

  // 3. Fetch detailed clinical drilldown from Supabase whenever selectedBed or floor changes
  useEffect(() => {
    if (!selectedBed) return;
    fetch(`/api/beds/${encodeURIComponent(selectedBed.name)}?floor=${currentFloor}`)
      .then((res) => res.json())
      .then((data: BedDrilldown) => {
        if (data && !(data as { error?: string }).error) {
          setDrilldown({ bedName: selectedBed.name, data });
        }
      })
      .catch((err) => console.warn("Failed to fetch bed drilldown", err))
      .finally(() => setSettledBed(selectedBed.name));
  }, [selectedBed, currentFloor, wardRealtime.revision]);

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

  // Derived drilldown data values (stale results from another bed are ignored)
  const drilldownData = selectedBed && drilldown?.bedName === selectedBed.name ? drilldown.data : null;
  const patientRecord = drilldownData?.bed?.patient;
  const latestVitals = drilldownData?.vitals?.[0];
  const bedStatus = drilldownData?.bed?.status || selectedBed?.statusText?.toLowerCase() || "occupied";
  const isCritical = patientRecord?.acuity === "critical" || selectedBed?.color === "red" || Boolean(latestVitals?.heart_rate && latestVitals.heart_rate > 110);
  const isCleaning = bedStatus === "cleaning" || selectedBed?.isCleaningJob === true;
  const isBlocked = bedStatus === "blocked" || selectedBed?.statusText === "BLOCKED";
  const isOccupied = !!patientRecord || (!isCleaning && bedStatus !== "available");

  const activeTask = drilldownData?.tasks?.[0];
  const hasTask = Boolean(activeTask && activeTask.status !== "completed") || selectedBed?.color === "orange";

  // One tone per bed drives the pill, ambient glow, waveform and notice
  const cardTone: CardTone = isCritical ? "danger" : hasTask || isBlocked || isCleaning ? "task" : "well";
  const tone = CARD_TONE[cardTone];
  const pillLabel = isCritical
    ? "DANGER / STAT"
    : !isOccupied && !isCleaning
    ? "BED READY"
    : hasTask || isBlocked || isCleaning || selectedBed?.color === "orange"
    ? "TASK PENDING"
    : "DOING WELL";

  const patientAge = calcAge(patientRecord?.date_of_birth);
  const patientAgeGender = patientAge != null
    ? `${patientAge}${(patientRecord?.sex || "U").toUpperCase().slice(0, 1)}`
    : selectedBed?.patientAgeGender || patientRecord?.sex || "";
  const patientFullName = patientRecord
    ? `${patientRecord.first_name} ${patientRecord.last_name}`
    : selectedBed?.patientName || "Bed Status";
  const patientMRN = patientRecord?.medical_record_number || "MRN-2004";
  const patientBlood = patientRecord?.blood_type || "B+";
  const patientCondition = drilldownData?.bed?.patient?.patient_conditions?.[0]?.name || "Acute Observation";
  const allergies = patientRecord?.patient_allergies?.slice(0, 2) || [];

  const roomLabel = drilldownData?.bed?.room
    ? `Room ${drilldownData.bed.room.room_number} · Floor ${drilldownData.bed.room.floor_number}`
    : `General Ward · Floor ${currentFloor}`;

  const vitalsHR = latestVitals?.heart_rate || (isCritical ? 118 : 78);
  const vitalsSpO2 = latestVitals?.spo2 || (isCritical ? 90 : 98);
  const vitalsBP = latestVitals?.systolic_bp && latestVitals?.diastolic_bp
    ? `${latestVitals.systolic_bp}/${latestVitals.diastolic_bp}`
    : isCritical ? "158/98" : "120/80";
  const vitalsTemp = latestVitals?.temperature || (isCritical ? 38.2 : 36.8);
  const bpWarn = (latestVitals?.systolic_bp && latestVitals.systolic_bp >= 140) ||
    (latestVitals?.diastolic_bp && latestVitals.diastolic_bp >= 90);

  const openTasks = (drilldownData?.tasks || []).filter(
    (t) => !["done", "completed", "cancelled"].includes(t?.status ?? "")
  ).length;
  const stay = stayLabel(patientRecord?.admission_at);
  const dischargeAt = dischargeLabel(drilldownData?.discharge_plan?.planned_discharge_at);
  const vitalsTime = clockLabel(latestVitals?.recorded_at);
  const cleaningElapsed = elapsedLabel(drilldownData?.cleaning_job?.started_at);

  // Operational notice reflecting:
  // - RED: Danger & priority task
  // - ORANGE: Task you have to do there
  // - GREEN: Patient is doing well
  let operationalNotice: { type: "blocker" | "alert" | "info" | "success"; text: string } | null = null;
  if (isCritical) {
    operationalNotice = {
      type: "alert",
      text: activeTask?.title ? `DANGER • ${activeTask.title}` : "DANGER: Critical vitals deterioration • STAT Doctor Review & 12-lead ECG",
    };
  } else if (isCleaning || drilldownData?.cleaning_job?.status === "in_progress") {
    operationalNotice = {
      type: "info",
      text: "Task Pending • Terminal disinfection & UV-C decontamination (Facilities)",
    };
  } else if (activeTask) {
    operationalNotice = {
      type: "blocker",
      text: `Task Pending • ${activeTask.title}`,
    };
  } else if (isBlocked || drilldownData?.discharge_plan?.status === "delayed") {
    operationalNotice = {
      type: "blocker",
      text: drilldownData?.discharge_plan?.notes || "Task Pending • Discharge blocked: awaiting attending signature",
    };
  } else {
    operationalNotice = {
      type: "success",
      text: "Patient doing well • All scheduled care complete • Vitals stable",
    };
  }
  const noticeTheme = operationalNotice ? NOTICE_THEME[operationalNotice.type] : null;

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

        {/* Right Label with Quick Controls & Floor Chevrons */}
        <div className="flex items-center gap-2 text-[#8E92A4] text-[12px] font-medium tracking-[0.06em] pointer-events-auto">
          {activeScreen === 0 ? (
            <>
              {/* Incoming Admissions Pill */}
              <button
                type="button"
                onClick={() => {
                  setIsAdmissionsOpen((prev) => !prev);
                  setIsMemoryOpen(false);
                  setIsRadioOpen(false);
                  setIsStaffOpen(false);
                  setIsEfficiencyOpen(false);
                  setIsPhoneOpen(false);
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
                  isAdmissionsOpen
                    ? "bg-[#1ECCE6]/25 border-[#1ECCE6]/50 text-white shadow-[0_0_10px_rgba(30,204,230,0.3)]"
                    : "bg-white/5 border-white/10 hover:bg-white/10 text-[#C6CBD9]"
                }`}
                title="Incoming Admissions Staging Queue (§20)"
              >
                <span>🚑 Admissions</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#1ECCE6] animate-pulse" />
              </button>

              {/* Night-Shift Memory Pill */}
              <button
                type="button"
                onClick={() => {
                  setIsMemoryOpen((prev) => !prev);
                  setIsAdmissionsOpen(false);
                  setIsRadioOpen(false);
                  setIsStaffOpen(false);
                  setIsEfficiencyOpen(false);
                  setIsPhoneOpen(false);
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
                  isMemoryOpen
                    ? "bg-purple-500/25 border-purple-400/50 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                    : "bg-white/5 border-white/10 hover:bg-white/10 text-[#C6CBD9]"
                }`}
                title="Night-Shift Memory & Deferred Tasks (§29, §34)"
              >
                <span>🧠 Night Memory</span>
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              </button>

              {/* Self-Invalidation Test Pill */}
              <button
                type="button"
                onClick={() => triggerSelfInvalidationDemo()}
                className="px-2 py-1 rounded-full text-[10.5px] font-medium bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-200 transition-all cursor-pointer hidden md:flex items-center gap-1"
                title="Test Self-Invalidating Speech Mid-Stream (§4, §68 Rule 1 & 2)"
              >
                <span>⚡ Test Invalidation</span>
              </button>

              <div className="h-4 w-px bg-white/10 mx-0.5" />

              {/* Floor Chevrons */}
              <button
                type="button"
                onClick={() => {
                  const currIdx = AVAILABLE_FLOORS.indexOf(currentFloor);
                  const prevIdx = (currIdx - 1 + AVAILABLE_FLOORS.length) % AVAILABLE_FLOORS.length;
                  setCurrentFloor(AVAILABLE_FLOORS[prevIdx]);
                }}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-[#8E92A4] hover:text-white transition-all cursor-pointer"
                title="Previous Floor"
                aria-label="Previous Floor"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <span className="select-none min-w-[50px] text-center">Floor {currentFloor}</span>
              <span
                className={`hidden lg:inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] ${
                  wardRealtime.connectionState === "live"
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                    : wardRealtime.connectionState === "degraded"
                    ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                    : "border-white/10 bg-white/5 text-[#8E92A4]"
                }`}
                title={
                  wardRealtime.lastEventAt
                    ? `Last ward event ${new Date(wardRealtime.lastEventAt).toLocaleTimeString()}`
                    : "Waiting for the ward event stream"
                }
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    wardRealtime.connectionState === "live"
                      ? "bg-emerald-300"
                      : wardRealtime.connectionState === "degraded"
                      ? "bg-amber-300"
                      : "bg-[#727889] animate-pulse"
                  }`}
                />
                {wardRealtime.connectionState === "live" ? "Ward live" : wardRealtime.connectionState}
              </span>
              <button
                type="button"
                onClick={() => {
                  const currIdx = AVAILABLE_FLOORS.indexOf(currentFloor);
                  const nextIdx = (currIdx + 1) % AVAILABLE_FLOORS.length;
                  setCurrentFloor(AVAILABLE_FLOORS[nextIdx]);
                }}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-[#8E92A4] hover:text-white transition-all cursor-pointer"
                title="Next Floor"
                aria-label="Next Floor"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </>
          ) : (
            ""
          )}
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
        <div className="relative w-screen h-screen shrink-0 overflow-hidden flex items-center justify-center">
          <div className="relative h-full aspect-[2750/1536] max-w-none shrink-0">
            {/* Base 3D Ward Render */}
            <div className="absolute inset-0 w-full h-full">
              <Image
                src="/ward-room.png"
                alt="General Ward Floor Plan"
                fill
                priority
                sizes="100vw"
                className="object-cover object-center pointer-events-none"
              />
            </div>

            {/* Live Beds Loading Indicator */}
            {bedsLoading && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 figma-glass-card rounded-full px-4 py-1.5 text-xs text-[#8E92A4] flex items-center gap-2 pointer-events-none">
                <span className="inline-block w-2 h-2 rounded-full bg-[#1ECCE6] animate-ping" />
                <span>Loading Floor {currentFloor} live data...</span>
              </div>
            )}
            {bedsError && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-red-950/80 border border-red-500/40 rounded-full px-4 py-1.5 text-xs text-red-200 flex items-center gap-2 pointer-events-none">
                <span>⚠️ {bedsError}</span>
              </div>
            )}

            {/* Glowing Rectangles on Top of Beds */}
            {beds.map((bed) => {
              const isSelected = selectedBed?.id === bed.id;
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
                  title={`${bed.name} (${bed.color.toUpperCase()} - ${bed.statusText})`}
                />
              );
            })}

            {/* Bed 2 Dynamic Room Label in Top Room 3 */}
            {(() => {
              const bed2 = beds.find((b) => b.name === "Bed 2");
              if (!bed2) return null;
              return (
                <div
                  className="absolute z-10 pointer-events-none"
                  style={{
                    left: "46.2%",
                    top: "31.0%",
                  }}
                >
                  <div className="text-[#E2E5EE] text-[13px] font-semibold tracking-[-0.01em] leading-none">
                    {bed2.name}
                  </div>
                  <div className="text-[#8B91A0] text-[9.5px] font-medium tracking-[0.08em] uppercase mt-[4px] leading-none">
                    {bed2.statusText}
                  </div>
                </div>
              );
            })()}

            {/* Left Vertical Icon Bar (Bottom Left) */}
            <aside className="absolute left-[16px] bottom-[34px] z-20 flex flex-col items-center gap-[18px]">
              {/* Satellite / Inter-Warden Radio */}
              <button
                aria-label="Inter-Warden Radio & Dispatches"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRadioOpen((prev) => !prev);
                  setIsStaffOpen(false);
                  setIsEfficiencyOpen(false);
                  setIsPhoneOpen(false);
                }}
                className={`w-[18px] h-[18px] transition-all duration-200 cursor-pointer ${
                  isRadioOpen
                    ? "opacity-100 scale-110 drop-shadow-[0_0_8px_rgba(30,204,230,0.8)]"
                    : "opacity-45 hover:opacity-100"
                }`}
                title="Inter-Warden Radio & Dispatches"
              >
                <Image src="/satellite.svg" alt="Satellite Radio" width={18} height={18} />
              </button>

              {/* Fingerprint / Staff Directory */}
              <button
                aria-label="Biometrics & Staff Directory"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsStaffOpen((prev) => !prev);
                  setIsRadioOpen(false);
                  setIsEfficiencyOpen(false);
                  setIsPhoneOpen(false);
                }}
                className={`w-[18px] h-[18px] transition-all duration-200 cursor-pointer ${
                  isStaffOpen
                    ? "opacity-100 scale-110 drop-shadow-[0_0_8px_rgba(30,204,230,0.8)]"
                    : "opacity-45 hover:opacity-100"
                }`}
                title="Staff Directory"
              >
                <Image src="/fingerprint.svg" alt="Biometrics" width={18} height={18} />
              </button>

              {/* Leaf / Efficiency & Power Automation Deck */}
              <button
                aria-label="Efficiency & Power Automation Deck"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEfficiencyOpen((prev) => !prev);
                  setIsRadioOpen(false);
                  setIsStaffOpen(false);
                  setIsPhoneOpen(false);
                }}
                className={`w-[18px] h-[18px] transition-all duration-200 cursor-pointer ${
                  isEfficiencyOpen
                    ? "opacity-100 scale-110 drop-shadow-[0_0_8px_rgba(36,169,81,0.8)]"
                    : "opacity-45 hover:opacity-100"
                }`}
                title="Efficiency & Power Consumption"
              >
                <Image src="/leaf.svg" alt="Efficiency" width={18} height={18} />
              </button>

              {/* Telephone / Autonomous Inpatient Calls */}
              <button
                aria-label="Telephone Comms & Autonomous Patient Check-in Calls"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPhoneOpen((prev) => !prev);
                  setIsRadioOpen(false);
                  setIsStaffOpen(false);
                  setIsEfficiencyOpen(false);
                }}
                className={`w-[18px] h-[18px] transition-all duration-200 cursor-pointer ${
                  isPhoneOpen
                    ? "opacity-100 scale-110 drop-shadow-[0_0_8px_rgba(200,115,150,0.8)]"
                    : "opacity-45 hover:opacity-100"
                }`}
                title="Telephone Comms & Automated Patient Calls"
              >
                <Image src="/phone.svg" alt="Phone" width={18} height={18} />
              </button>
            </aside>

            {/* Inter-Warden Radio Glass Card */}
            <SatelliteRadioCard
              isOpen={isRadioOpen}
              onClose={() => setIsRadioOpen(false)}
              currentFloor={currentFloor}
            />

            {/* Staff Directory Glass Card */}
            <StaffDirectoryCard
              isOpen={isStaffOpen}
              onClose={() => setIsStaffOpen(false)}
            />

            {/* Efficiency & Power Consumption Glass Card */}
            <EnergyEfficiencyCard
              isOpen={isEfficiencyOpen}
              onClose={() => setIsEfficiencyOpen(false)}
              currentFloor={currentFloor}
              onSelectFloor={(fl) => setCurrentFloor(fl)}
            />

            {/* Telephone Comms & Patient Call Assistant Glass Card */}
            <TelephoneCallAssistantCard
              isOpen={isPhoneOpen}
              onClose={() => setIsPhoneOpen(false)}
              currentFloor={currentFloor}
            />

            {/* Night-Shift Memory Glass Card (§29, §34) */}
            <NightShiftMemoryCard
              isOpen={isMemoryOpen}
              onClose={() => setIsMemoryOpen(false)}
              currentFloor={currentFloor}
            />

            {/* Incoming Admissions Staging Queue Glass Card (§20) */}
            <IncomingAdmissionsCard
              isOpen={isAdmissionsOpen}
              onClose={() => setIsAdmissionsOpen(false)}
              currentFloor={currentFloor}
            />

            {/* =============================================================
                BOTTOM RIGHT GLASSMORPHIC CLINICAL OPERATIONS CARD
               ============================================================= */}
            <div
              className="absolute z-20 figma-glass-card rounded-[20px] p-[16px] pb-[14px]"
              style={{
                right: "2.5%",
                bottom: "3.2%",
                width: "26%",
                minWidth: "318px",
                maxWidth: "372px",
                maxHeight: "412px",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Ambient tone light refracting inside the glass + top sheen */}
              <div
                className="absolute inset-0 rounded-[inherit] pointer-events-none"
                style={{
                  background: `radial-gradient(170px 90px at 88% -12%, ${tone.accent}2e, transparent 68%), linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 24%)`,
                }}
              />

              {selectedBed ? (
                <div key={selectedBed.id} className="card-content-enter relative flex flex-col gap-[9px]">
                  {/* Header overline — bed · room · floor + status pill */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-baseline gap-[6px] min-w-0 text-[10px] font-medium uppercase tracking-[0.14em]">
                      <span className="font-bold text-[#C6CBD9] whitespace-nowrap">{selectedBed.name}</span>
                      <span className="text-[#565B6B]">·</span>
                      <span className="text-[#8E92A4] truncate">{roomLabel}</span>
                    </div>
                  <span
                    className="shrink-0 flex items-center gap-[5px] pl-[8px] pr-[9px] py-[3px] rounded-full border"
                    style={{
                      background: `${tone.accent}1f`,
                      borderColor: `${tone.accent}4a`,
                      color: tone.text,
                    }}
                  >
                    <span className="relative flex h-[5px] w-[5px]">
                      {cardTone !== "well" && (
                        <span
                          className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping"
                          style={{ background: tone.accent }}
                        />
                      )}
                      <span
                        className="relative inline-flex h-[5px] w-[5px] rounded-full"
                        style={{ background: tone.accent, boxShadow: `0 0 6px ${tone.accent}` }}
                      />
                    </span>
                    <span className="text-[8.5px] font-bold tracking-[0.14em] leading-none pt-[1px]">
                      {pillLabel}
                    </span>
                  </span>
                </div>

                {/* Patient / bed-state hero */}
                {isOccupied ? (
                  <>
                    <div className="flex items-baseline justify-between gap-2">
                      <h2 className="text-white text-[17px] font-semibold tracking-[-0.01em] leading-tight truncate">
                        {patientFullName}
                      </h2>
                      <span className="shrink-0 text-[#7A8095] text-[10px] font-mono">{patientMRN}</span>
                    </div>
                    <div className="flex items-center gap-[6px] min-w-0 text-[10.5px] text-[#A6ACBE]">
                      <span className="whitespace-nowrap">{patientAgeGender}</span>
                      <span className="text-[#4E5364]">·</span>
                      <span className="whitespace-nowrap">{patientBlood}</span>
                      <span className="text-[#4E5364]">·</span>
                      <span className="text-[#1ECCE6] font-medium truncate">{patientCondition}</span>
                      {allergies.map((a, i) => (
                        <span
                          key={i}
                          className="shrink-0 inline-flex items-center gap-[3px] px-[6px] py-[1.5px] rounded-full border text-[8.5px] font-semibold tracking-[0.04em]"
                          style={{ background: "#E61E6717", borderColor: "#E61E6740", color: "#FF9DB2" }}
                          title={`Allergy: ${a.allergen}`}
                        >
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12" y2="17.01" />
                          </svg>
                          {a.allergen}
                        </span>
                      ))}
                    </div>
                  </>
                ) : isCleaning ? (
                  <div className="flex flex-col gap-[7px] py-[2px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] font-semibold text-[#F6CE72] tracking-[-0.01em]">
                        Terminal Sanitization
                      </span>
                      <span className="text-[10px] font-mono text-[#8E92A4]">{cleaningElapsed} elapsed</span>
                    </div>
                    <div className="h-[4px] rounded-full shimmer-track border border-[#F0B429]/15" />
                    <span className="text-[10.5px] text-[#A6ACBE] leading-[1.45]">
                      Started {cleaningElapsed} ago · Assigned: Facilities · Bed locked for admission
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-[12px] py-[4px]">
                    <div
                      className="w-[34px] h-[34px] shrink-0 rounded-full flex items-center justify-center border"
                      style={{ background: "#24A9511a", borderColor: "#24A95142", boxShadow: "0 0 14px #24A95126" }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#82D99E" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[15px] font-semibold text-[#82D99E] tracking-[-0.01em]">
                        Sanitized & Ready
                      </span>
                      <span className="text-[10.5px] text-[#A6ACBE] mt-[2px]">
                        Available for immediate inpatient admission
                      </span>
                    </div>
                  </div>
                )}

                {/* Live ECG strip + vitals (occupied beds only) */}
                {isOccupied && (
                  <>
                    <div className="relative h-[42px] rounded-[10px] border border-white/[0.06] bg-[#0A0D13]/70 ecg-grid overflow-hidden">
                      {/* Scrolling trace — two identical halves loop seamlessly */}
                      <div
                        className="absolute inset-y-0 left-0 flex w-[200%] ecg-scroll"
                        style={{
                          animationDuration: isCritical ? "2.6s" : "4.5s",
                          maskImage: "linear-gradient(90deg, transparent 0%, black 14%)",
                          WebkitMaskImage: "linear-gradient(90deg, transparent 0%, black 14%)",
                        }}
                      >
                        {[0, 1].map((half) => (
                          <svg key={half} viewBox="0 0 540 42" preserveAspectRatio="none" className="block h-full w-1/2" aria-hidden="true">
                            <path
                              d={ECG_PATH}
                              fill="none"
                              stroke={isCritical ? "#E61E67" : "#1ECCE6"}
                              strokeWidth="1.6"
                              strokeLinejoin="round"
                              strokeLinecap="round"
                              vectorEffect="non-scaling-stroke"
                              style={{ filter: `drop-shadow(0 0 3px ${isCritical ? "#E61E67" : "#1ECCE6"}80)` }}
                            />
                          </svg>
                        ))}
                      </div>

                      {/* Heart-rate badge */}
                      <div className="absolute left-[9px] top-1/2 -translate-y-1/2 flex items-center gap-[6px]">
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill={isCritical ? "#E61E67" : "none"}
                          stroke={isCritical ? "#E61E67" : "#1ECCE6"}
                          strokeWidth="2"
                          className={isCritical ? "animate-pulse" : ""}
                        >
                          <path d="M19.5 13.6 12 21l-7.5-7.4A5.2 5.2 0 0 1 12 6.2a5.2 5.2 0 0 1 7.5 7.4z" />
                        </svg>
                        <span
                          className={`text-[15px] leading-none font-mono font-semibold ${
                            isCritical ? "text-[#FF9DB2] animate-pulse" : "text-white"
                          }`}
                        >
                          {vitalsHR}
                        </span>
                        <span className="text-[8px] font-medium uppercase tracking-[0.16em] text-[#6D7385]">bpm</span>
                      </div>

                      {/* Live / last-recording indicator */}
                      <div className="absolute right-[9px] top-1/2 -translate-y-1/2 flex items-center gap-[4px]">
                        <span
                          className={`w-[5px] h-[5px] rounded-full ${isLoadingDrilldown ? "" : "animate-pulse"}`}
                          style={{ background: isLoadingDrilldown ? "#F0B429" : "#1ECCE6", boxShadow: "0 0 6px rgba(30, 204, 230, 0.8)" }}
                        />
                        <span className="text-[8px] font-semibold tracking-[0.18em] text-[#7A8095]">
                          {isLoadingDrilldown ? "SYNC" : vitalsTime || "LIVE"}
                        </span>
                      </div>
                    </div>

                    {/* Vitals strip — hairline dividers instead of boxes */}
                    <div className="grid grid-cols-4 divide-x divide-white/[0.07]">
                      {[
                        { label: "SPO2", value: `${vitalsSpO2}%`, warn: vitalsSpO2 < 92, title: "Blood oxygen saturation" },
                        { label: "BP", value: vitalsBP, warn: !!bpWarn, title: "Blood pressure (systolic/diastolic)" },
                        { label: "TEMP", value: `${vitalsTemp}°`, warn: vitalsTemp >= 37.8, title: "Core temperature °C" },
                        { label: "STAY", value: stay, warn: false, title: "Length of stay since admission" },
                      ].map((v) => (
                        <div key={v.label} className="px-1 py-[3px] text-center" title={v.title}>
                          <div className="text-[8px] font-semibold uppercase tracking-[0.16em] text-[#7A8095]">{v.label}</div>
                          <div className={`mt-[2px] text-[12.5px] leading-none font-mono font-semibold ${v.warn ? "text-[#F4B476]" : "text-[#E8EBF2]"}`}>
                            {v.value}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Operational context line */}
                    {(openTasks > 0 || dischargeAt) && (
                      <div className="flex items-center gap-[6px] min-w-0 text-[9.5px] font-medium text-[#7A8095] truncate">
                        {openTasks > 0 && (
                          <span className="flex items-center gap-[4px] whitespace-nowrap">
                            <span className="w-[4px] h-[4px] rounded-full" style={{ background: tone.accent }} />
                            {openTasks} open task{openTasks === 1 ? "" : "s"}
                          </span>
                        )}
                        {dischargeAt && (
                          <span className="truncate">
                            {openTasks > 0 && <span className="text-[#4E5364] mr-[6px]">·</span>}
                            Discharge planned {dischargeAt}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Operational notice banner */}
                {operationalNotice && noticeTheme && (
                  <div
                    className="flex items-start gap-[7px] rounded-[10px] border px-[9px] py-[7px]"
                    style={{ background: `${noticeTheme.accent}14`, borderColor: `${noticeTheme.accent}33` }}
                  >
                    <span
                      className="w-[3px] self-stretch rounded-full shrink-0"
                      style={{ background: noticeTheme.accent, boxShadow: `0 0 8px ${noticeTheme.accent}80` }}
                    />
                    <NoticeIcon type={operationalNotice.type} className="w-[12px] h-[12px] shrink-0 mt-[1px]" />
                    <span className="text-[10.5px] leading-[1.45] font-medium line-clamp-2" style={{ color: noticeTheme.text }}>
                      {operationalNotice.text}
                    </span>
                  </div>
                )}

                {/* Footer actions */}
                <div className="flex items-center pt-[9px] border-t border-white/[0.08]">
                  <div className="flex items-center gap-[7px]">
                    <button
                      type="button"
                      onClick={() => {
                        alert(`Transporter dispatch request sent for ${selectedBed.name}`);
                      }}
                      className="flex items-center gap-[5px] px-[10px] h-[28px] rounded-[8px] bg-white/[0.06] hover:bg-white/[0.12] active:scale-[0.97] border border-white/10 hover:border-white/20 text-[10.5px] font-medium text-[#C9CEDC] transition-all"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <span>Porter</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (selectedBed) alert(`Printing clinical discharge paperwork for ${selectedBed.name}`);
                      }}
                      className="flex items-center gap-[5px] px-[10px] h-[28px] rounded-[8px] bg-white/[0.06] hover:bg-white/[0.12] active:scale-[0.97] border border-white/10 hover:border-white/20 text-[10.5px] font-medium text-[#C9CEDC] transition-all"
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
              </div>
              ) : (
                <div className="card-content-enter relative flex flex-col items-center justify-center py-20 text-[#8E92A4] text-xs">
                  <span>Select a bed to view live clinical telemetry</span>
                </div>
              )}

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
        <div className="relative w-screen h-screen shrink-0 overflow-hidden flex items-center justify-center">
          <div className="relative h-full aspect-[2760/1840] max-w-none shrink-0">
            {/* Base 3D Shelf Render */}
            <div className="absolute inset-0 w-full h-full">
              <Image
                src="/medicine-shelf-transparent.png"
                alt="Pharmacy Medicine Shelf"
                fill
                priority
                sizes="100vw"
                className="object-cover object-center pointer-events-none"
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

            {/* Live Pharmacy Loading / Error Indicators */}
            {shelfLoading && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 figma-glass-card rounded-full px-4 py-1.5 text-xs text-[#8E92A4] flex items-center gap-2 pointer-events-none">
                <span className="inline-block w-2 h-2 rounded-full bg-[#1ECCE6] animate-ping" />
                <span>Loading live pharmacy catalog...</span>
              </div>
            )}
            {shelfError && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-red-950/80 border border-red-500/40 rounded-full px-4 py-1.5 text-xs text-red-200 flex items-center gap-2 pointer-events-none">
                <span>⚠️ {shelfError}</span>
              </div>
            )}

            {/* Highlighted Shelf Items */}
            {shelfItems
              .filter((item) =>
                searchQuery
                  ? item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.category.toLowerCase().includes(searchQuery.toLowerCase())
                  : true
              )
              .map((item) => {
                const isSelected = selectedMed?.id === item.id;
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
              {selectedMed ? (
                <>
                  <div className="flex flex-col">
                    <h2 className="text-white text-[19px] font-semibold tracking-[-0.02em] leading-tight">
                      {selectedMed.name}
                    </h2>
                    <span className="text-[#9BA1B2] text-[11px] font-normal mt-[3px]">
                      {selectedMed.category}
                    </span>
                  </div>

                  <div className="my-[8px] flex flex-col gap-[6px]">
                    {(selectedMed.indication || []).map((bullet, idx) => (
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
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-[#8E92A4]">
                  <span>Select a medication from shelf</span>
                </div>
              )}

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
