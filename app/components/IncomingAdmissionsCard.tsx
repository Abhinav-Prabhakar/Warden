"use client";

import React, { useState, useEffect, useRef } from "react";

export interface IncomingAdmission {
  id: string;
  patient_name: string;
  mrn: string;
  age: number;
  sex: string;
  diagnosis: string;
  acuity: "critical" | "urgent" | "stable";
  eta_minutes: number;
  expected_arrival: string;
  staged_bed_number: string;
  staged_bed_status?: string;
  transfer_source: string;
  requirements: string[];
  blockers: string[];
  status: "staged" | "en_route" | "arrived" | "admitted" | "cancelled";
  created_at: string;
}

interface IncomingAdmissionsCardProps {
  isOpen: boolean;
  onClose: () => void;
  currentFloor?: number;
}

export function IncomingAdmissionsCard({
  isOpen,
  onClose,
  currentFloor = 7,
}: IncomingAdmissionsCardProps) {
  const [admissions, setAdmissions] = useState<IncomingAdmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Swipe left to close
  const [dragOffset, setDragOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  const fetchAdmissions = async () => {
    try {
      const res = await fetch("/api/warden/admissions");
      if (res.ok) {
        const data = await res.json();
        if (data.admissions) {
          setAdmissions(data.admissions);
        }
      }
    } catch (err) {
      console.error("Failed to fetch admissions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetchAdmissions();
    const interval = setInterval(fetchAdmissions, 8000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleAction = async (id: string, action: string, bedNumber?: string) => {
    try {
      const res = await fetch("/api/warden/admissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, bed_number: bedNumber }),
      });
      if (res.ok) {
        const notice =
          action === "reserve_bed"
            ? `${bedNumber} reserved in Supabase.`
            : action === "expedite_cleaning"
            ? `Cleaning expedited to STAT.`
            : `Patient admitted to ${bedNumber}.`;
        setActionNotice(notice);
        fetchAdmissions();
        setTimeout(() => setActionNotice(null), 3500);
      }
    } catch (err) {
      console.error("Failed to execute admission action:", err);
    }
  };

  // Swipe handlers
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

  if (!isOpen) return null;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={(e) => e.stopPropagation()}
      className="absolute z-30 figma-glass-card rounded-[22px] p-5 w-[410px] max-w-[94vw] text-white flex flex-col gap-3.5 shadow-[0_20px_45px_rgba(0,0,0,0.65)] animate-in fade-in slide-in-from-left-6 duration-200"
      style={{
        left: "54px",
        bottom: "34px",
        maxHeight: "590px",
        transform: `translateX(${dragOffset}px)`,
        transition: isSwiping ? "none" : "transform 0.2s ease-out",
      }}
    >
      {/* Top Ambient Sheen */}
      <div
        className="absolute inset-0 rounded-[inherit] pointer-events-none"
        style={{
          background:
            "radial-gradient(180px 100px at 15% -10%, rgba(30, 204, 230, 0.18), transparent 70%), linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 30%)",
        }}
      />

      {/* Header */}
      <div className="relative flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#1ECCE6]/15 border border-[#1ECCE6]/30 flex items-center justify-center text-sm">
            🚑
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white tracking-[-0.01em]">
                Incoming Admissions
              </h3>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#1ECCE6]/20 text-[#1ECCE6] font-bold">
                §20 STAGING QUEUE
              </span>
            </div>
            <p className="text-[10px] text-[#8E92A4]">
              Expected Inbound Transfers & Bed Allocation (Floor {currentFloor})
            </p>
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

      {actionNotice && (
        <div className="px-2.5 py-1.5 rounded-lg bg-[#1ECCE6]/15 border border-[#1ECCE6]/30 text-[#1ECCE6] text-[10.5px] font-medium flex items-center justify-between animate-in fade-in duration-150">
          <span>✓ {actionNotice}</span>
        </div>
      )}

      {/* Admissions List */}
      <div className="relative flex-1 overflow-y-auto max-h-[360px] pr-1 flex flex-col gap-3 custom-scrollbar">
        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-[#8E92A4] text-xs">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#1ECCE6] animate-ping" />
            <span>Connecting to inbound hospital transport spooler...</span>
          </div>
        ) : admissions.length === 0 ? (
          <div className="py-8 text-center text-[#8E92A4] text-xs">
            No incoming admissions currently en-route for Floor {currentFloor}.
          </div>
        ) : (
          admissions.map((adm) => {
            const isCritical = adm.acuity === "critical";

            return (
              <div
                key={adm.id}
                className={`p-3 rounded-2xl border transition-all flex flex-col gap-2 ${
                  isCritical
                    ? "bg-red-950/20 border-red-500/35 shadow-[0_0_15px_rgba(239,68,68,0.12)]"
                    : "bg-white/[0.04] border-white/10 hover:bg-white/[0.07]"
                }`}
              >
                {/* Top Row: Patient Name, Acuity, ETA */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">
                        {adm.patient_name}
                      </span>
                      <span className="text-[9.5px] text-[#A2A7B8] font-mono">
                        {adm.age}y/{adm.sex} · {adm.mrn}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#8E92A4] mt-0.5">
                      Via {adm.transfer_source}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                        isCritical
                          ? "bg-red-500/25 text-red-300 border-red-500/40 animate-pulse"
                          : "bg-[#E67F1E]/20 text-[#F4B476] border-[#E67F1E]/40"
                      }`}
                    >
                      {adm.acuity}
                    </span>
                    <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-[#1ECCE6]/20 text-[#1ECCE6] font-bold">
                      ETA {adm.eta_minutes}m
                    </span>
                  </div>
                </div>

                {/* Admitting Diagnosis */}
                <div className="text-[11px] text-white/90 font-medium">
                  {adm.diagnosis}
                </div>

                {/* Staged Bed Info */}
                <div className="p-2 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#8E92A4]">Target Bed:</span>
                    <strong className="text-white font-mono">{adm.staged_bed_number}</strong>
                    <span
                      className={`text-[8.5px] px-1.5 py-0.2 rounded uppercase font-semibold ${
                        adm.staged_bed_status === "available"
                          ? "bg-[#24A951]/20 text-[#82D99E]"
                          : adm.staged_bed_status === "reserved"
                          ? "bg-[#1ECCE6]/20 text-[#1ECCE6]"
                          : "bg-[#E67F1E]/20 text-[#F4B476]"
                      }`}
                    >
                      {adm.staged_bed_status || "cleaning"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleAction(adm.id, "reserve_bed", adm.staged_bed_number)}
                      className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[#C6CBD9] text-[9.5px] font-medium transition-colors cursor-pointer"
                    >
                      Reserve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAction(adm.id, "mark_admitted", adm.staged_bed_number)}
                      className="px-2 py-0.5 rounded bg-[#1ECCE6] hover:bg-[#1ECCE6]/90 text-black text-[9.5px] font-semibold transition-colors cursor-pointer"
                    >
                      Admit
                    </button>
                  </div>
                </div>

                {/* Blockers Alert Banner */}
                {adm.blockers.length > 0 && (
                  <div className="p-2 rounded-xl bg-[#E67F1E]/10 border border-[#E67F1E]/25 text-[10px] text-[#F4B476] flex flex-col gap-1">
                    <div className="flex items-center justify-between font-semibold">
                      <span>⚠️ Pre-Admission Blockers:</span>
                      <button
                        type="button"
                        onClick={() => handleAction(adm.id, "expedite_cleaning")}
                        className="text-[9px] underline hover:text-white cursor-pointer"
                      >
                        Expedite Cleaning →
                      </button>
                    </div>
                    {adm.blockers.map((b, i) => (
                      <div key={i} className="text-[9.5px] text-white/80">
                        • {b}
                      </div>
                    ))}
                  </div>
                )}

                {/* Requirements Pills */}
                {adm.requirements.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {adm.requirements.map((req, i) => (
                      <span
                        key={i}
                        className="text-[8.5px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[#C6CBD9]"
                      >
                        {req}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Spoken Action Helper */}
      <div className="relative pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-[#8E92A4]">
        <span>Voice Command: &ldquo;Can we take the incoming patient?&rdquo;</span>
        <button
          type="button"
          onClick={fetchAdmissions}
          className="text-[#1ECCE6] hover:underline cursor-pointer"
        >
          ↻ Refresh
        </button>
      </div>
    </div>
  );
}
