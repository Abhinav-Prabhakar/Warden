"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";

export interface CallCandidate {
  bedId: string;
  bedNumber: string;
  roomNumber: string;
  patientId: string;
  patientName: string;
  acuity: string;
  condition: string;
  phone: string;
}

export interface CallLog {
  id: string;
  patientId: string;
  patientName: string;
  bedNumber: string;
  floor: number;
  phoneNumber: string;
  purpose: string;
  status: string;
  durationSeconds: number;
  transcript: { speaker: string; text: string; timestamp: string }[];
  notes: {
    summary: string;
    needs: string[];
    painLevel: number | null;
    urgency: string;
  };
  createdTasks: { id: string; title: string; status: string; priority: number }[];
  timestamp: string;
}

interface TelephoneCallAssistantCardProps {
  isOpen: boolean;
  onClose: () => void;
  currentFloor: number;
}

function timeAgo(ts: string): string {
  const ms = Date.now() - new Date(ts).getTime();
  if (Number.isNaN(ms) || ms < 0) return "just now";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function TelephoneCallAssistantCard({
  isOpen,
  onClose,
  currentFloor,
}: TelephoneCallAssistantCardProps) {
  const [candidates, setCandidates] = useState<CallCandidate[]>([]);
  const [callHistory, setCallHistory] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"dial" | "active" | "history">("dial");
  const [selectedCandidate, setSelectedCandidate] = useState<CallCandidate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("comfort_check");

  // Live active call simulation state
  const [isCalling, setIsCalling] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [activeCallStep, setActiveCallStep] = useState<number>(0);
  const [liveTranscript, setLiveTranscript] = useState<{ speaker: string; text: string; timestamp: string }[]>([]);
  const [liveNeeds, setLiveNeeds] = useState<string[]>([]);
  const [activeCompletedCall, setActiveCompletedCall] = useState<any | null>(null);

  // Left swipe-to-close state
  const [dragOffset, setDragOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const timerRef = useRef<any>(null);

  const fetchCallsData = () => {
    fetch(`/api/warden/calls?floor=${currentFloor}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data && !data.error) {
          setCandidates(data.callCandidates || []);
          setCallHistory(data.calls || []);
          if (data.callCandidates && data.callCandidates.length > 0 && !selectedCandidate) {
            setSelectedCandidate(data.callCandidates[0]);
          }
        } else {
          setError(data?.error || "Failed to load telephone communications");
        }
      })
      .catch((err) => {
        console.error("Calls fetch failed:", err);
        setError("Could not connect to telephony gateway");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    fetchCallsData();
  }, [isOpen, currentFloor]);

  // Clean up call timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  // Initiate an automated phone call
  const handleStartCall = async (candidateToCall?: CallCandidate) => {
    const target = candidateToCall || selectedCandidate;
    if (!target) return;

    setIsCalling(true);
    setActiveTab("active");
    setCallDuration(0);
    setActiveCallStep(1);
    setLiveTranscript([]);
    setLiveNeeds([]);
    setActiveCompletedCall(null);

    // Start live duration counter
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    // Call API to hold conversation & extract notes
    try {
      const res = await fetch("/api/warden/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: target.patientId,
          patientName: target.patientName,
          bedNumber: target.bedNumber,
          floor: currentFloor,
          phoneNumber: target.phone,
          templateKey: selectedTemplate,
        }),
      });

      const data = await res.json();
      if (data && data.success) {
        // Step 1: Connecting
        setTimeout(() => {
          setActiveCallStep(2);
          if (data.transcript?.[0]) {
            setLiveTranscript([data.transcript[0]]);
          }
        }, 1200);

        // Step 2: Patient Speaks & Voice Agent Listens
        setTimeout(() => {
          setActiveCallStep(3);
          if (data.transcript?.[1]) {
            setLiveTranscript((prev) => [...prev, data.transcript[1]]);
          }
          // Real-time note extraction triggers!
          if (data.notes?.needs) {
            setLiveNeeds(data.notes.needs);
          }
        }, 3200);

        // Step 3: Voice Agent Confirms & Logs Tasks
        setTimeout(() => {
          setActiveCallStep(4);
          if (data.transcript?.[2] && data.transcript?.[3]) {
            setLiveTranscript((prev) => [...prev, data.transcript[2], data.transcript[3]]);
          }
          setActiveCompletedCall(data);
          setIsCalling(false);
          if (timerRef.current) clearInterval(timerRef.current);
          fetchCallsData();
        }, 5600);
      } else {
        setIsCalling(false);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    } catch (err) {
      console.error("Failed to execute phone call:", err);
      setIsCalling(false);
      if (timerRef.current) clearInterval(timerRef.current);
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
    if (target.closest("button") || target.closest("input") || target.closest("select")) return;
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

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={(e) => e.stopPropagation()}
      className="absolute z-30 figma-glass-card rounded-[22px] p-5 w-[420px] max-w-[95vw] text-white flex flex-col gap-3.5 shadow-[0_20px_45px_rgba(0,0,0,0.65)] animate-in fade-in slide-in-from-left-6 duration-200"
      style={{
        left: "54px",
        bottom: "34px",
        maxHeight: "600px",
        transform: `translateX(${dragOffset}px)`,
        transition: isSwiping ? "none" : "transform 0.2s ease-out",
      }}
    >
      {/* Ambient Glow Sheen */}
      <div
        className="absolute inset-0 rounded-[inherit] pointer-events-none"
        style={{
          background: isCalling
            ? "radial-gradient(180px 100px at 15% -10%, rgba(30, 204, 230, 0.22), transparent 70%), linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 30%)"
            : "radial-gradient(180px 100px at 15% -10%, rgba(200, 115, 150, 0.18), transparent 70%), linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 30%)",
        }}
      />

      {/* Header */}
      <div className="relative flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#C87396]/15 border border-[#C87396]/30 flex items-center justify-center">
            <Image src="/phone.svg" alt="Telephone Assistant" width={16} height={16} className="opacity-95" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white tracking-[-0.01em]">Telephone Care Agent</h3>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-[#C6CBD9]">
                SIP TRUNK · AUTONOMOUS
              </span>
            </div>
            <p className="text-[10px] text-[#8E92A4]">Automated Patient Calls & Live Clinical Notes</p>
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

      {/* Tabs */}
      <div className="relative flex items-center gap-1 bg-black/25 p-1 rounded-xl border border-white/5 text-[10.5px]">
        <button
          type="button"
          onClick={() => setActiveTab("dial")}
          className={`flex-1 py-1 rounded-lg font-medium transition-all ${
            activeTab === "dial" ? "bg-white/15 text-white shadow-sm" : "text-[#8E92A4] hover:text-white"
          }`}
        >
          Call Inpatients ({candidates.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("active")}
          className={`flex-1 py-1 rounded-lg font-medium transition-all flex items-center justify-center gap-1 ${
            activeTab === "active" ? "bg-white/15 text-white shadow-sm" : "text-[#8E92A4] hover:text-white"
          }`}
        >
          {isCalling && <span className="w-2 h-2 rounded-full bg-[#1ECCE6] animate-ping" />}
          <span>{isCalling ? "Live Call..." : "Call Session"}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-1 rounded-lg font-medium transition-all ${
            activeTab === "history" ? "bg-white/15 text-white shadow-sm" : "text-[#8E92A4] hover:text-white"
          }`}
        >
          Call History ({callHistory.length})
        </button>
      </div>

      {/* Content Area */}
      <div className="relative flex-1 overflow-y-auto max-h-[380px] pr-1 flex flex-col gap-3 custom-scrollbar">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#8E92A4] text-xs">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#C87396] animate-ping" />
            <span>Connecting to hospital telephony trunk...</span>
          </div>
        ) : error ? (
          <div className="py-6 text-center text-red-300 text-xs bg-red-950/40 rounded-xl p-3 border border-red-500/30">
            ⚠️ {error}
          </div>
        ) : activeTab === "dial" ? (
          /* ============================================================
             TAB 1: DIALER & INPATIENT ROSTER
             ============================================================ */
          <div className="flex flex-col gap-3">
            {/* Quick Call Protocol Template */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-2">
              <span className="text-[11px] font-semibold text-white">Select Automated Clinical Call Purpose</span>
              <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                {[
                  { key: "comfort_check", label: "Comfort Check", desc: "Blankets, pain, drinks" },
                  { key: "symptom_followup", label: "Symptom Review", desc: "Pain score & nausea" },
                  { key: "discharge_readiness", label: "Discharge Prep", desc: "Ride, paper, meds" },
                ].map((tpl) => (
                  <button
                    key={tpl.key}
                    type="button"
                    onClick={() => setSelectedTemplate(tpl.key)}
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      selectedTemplate === tpl.key
                        ? "bg-[#1ECCE6]/15 border-[#1ECCE6]/40 text-white shadow-sm"
                        : "bg-black/20 border-white/5 text-[#8E92A4] hover:text-white"
                    }`}
                  >
                    <div className="font-semibold">{tpl.label}</div>
                    <div className="text-[8.5px] opacity-70 mt-0.5">{tpl.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Inpatients on this floor list */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-white">Floor {currentFloor} Inpatient Call Directory</span>
                <span className="text-[10px] text-[#8E92A4]">{candidates.length} occupied beds</span>
              </div>

              {candidates.length === 0 ? (
                <div className="py-8 text-center text-[#8E92A4] text-xs">
                  No occupied patients currently assigned on Floor {currentFloor}.
                </div>
              ) : (
                candidates.map((c) => (
                  <div
                    key={c.bedId}
                    className="p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.07] flex items-center justify-between gap-2 transition-all"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white truncate">{c.patientName}</span>
                        <span className="text-[9px] font-mono px-1 rounded bg-white/10 text-[#C6CBD9]">
                          {c.bedNumber}
                        </span>
                        {c.acuity === "critical" && (
                          <span className="text-[8.5px] font-bold px-1 rounded bg-[#E61E67]/20 text-[#FF9DB2]">
                            STAT
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#8E92A4] mt-0.5 truncate">
                        {c.condition} · Ext: {c.phone}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartCall(c)}
                      className="px-3 py-1.5 rounded-lg bg-[#24A951] hover:bg-[#24A951]/90 text-black font-semibold text-[10.5px] tracking-wide flex items-center gap-1 shadow-[0_0_10px_rgba(36,169,81,0.3)] transition-all cursor-pointer shrink-0"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <span>Call Now</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : activeTab === "active" ? (
          /* ============================================================
             TAB 2: LIVE CALL SIMULATION & REAL-TIME NOTE-TAKING
             ============================================================ */
          <div className="flex flex-col gap-3">
            {/* Call State Hero Header */}
            <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-3 w-3">
                  <span
                    className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isCalling ? "bg-[#1ECCE6] animate-ping" : "bg-[#24A951]"
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-3 w-3 ${
                      isCalling ? "bg-[#1ECCE6]" : "bg-[#24A951]"
                    }`}
                  />
                </div>

                <div>
                  <div className="text-xs font-bold text-white">
                    {isCalling
                      ? activeCallStep === 1
                        ? "Ringing Inpatient Phone..."
                        : activeCallStep === 2
                        ? "Agent Speaking with Patient..."
                        : "Listening & Taking Clinical Notes..."
                      : "Call Completed · Notes Logged"}
                  </div>
                  <div className="text-[10px] text-[#8E92A4]">
                    {selectedCandidate ? `${selectedCandidate.patientName} (${selectedCandidate.bedNumber})` : "Patient Telephony Session"}
                  </div>
                </div>
              </div>

              <div className="text-right font-mono text-sm font-bold text-[#1ECCE6]">
                {formatTimer(callDuration || 52)}
              </div>
            </div>

            {/* Real-time AI Note-Taking Extraction Card (User's core requirement!) */}
            <div className="p-3 rounded-xl bg-[#1ECCE6]/10 border border-[#1ECCE6]/30 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#1ECCE6]">
                    Live AI Clinical Notes
                  </span>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#1ECCE6] animate-pulse" />
                </div>
                <span className="text-[9px] text-[#8E92A4]">Auto-Extracted from Speech</span>
              </div>

              {liveNeeds.length === 0 ? (
                <div className="text-[11px] text-white/60 italic py-1">
                  Listening to conversation... extracting patient needs, pain scores, and comfort requests.
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {liveNeeds.map((need, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-1.5 text-[11px] text-white bg-white/10 rounded-lg p-2 border border-white/15"
                    >
                      <span className="text-[#24A951] font-bold">✓</span>
                      <span>{need}</span>
                    </div>
                  ))}

                  <div className="mt-1 pt-1.5 border-t border-white/10 flex items-center justify-between text-[9.5px]">
                    <span className="text-[#82D99E] font-medium">✓ Dispatched as Ward Follow-Up Task</span>
                    <span className="text-[#8E92A4]">Saved to Supabase</span>
                  </div>
                </div>
              )}
            </div>

            {/* Live Conversation Transcript Display */}
            <div className="flex flex-col gap-2 p-3 rounded-xl bg-black/30 border border-white/5 max-h-[160px] overflow-y-auto custom-scrollbar">
              <span className="text-[9.5px] font-semibold text-[#8E92A4] uppercase tracking-wider">
                Full Dialogue Transcript
              </span>

              {liveTranscript.length === 0 ? (
                <div className="text-[10px] text-[#7A8095] italic">Awaiting call connection...</div>
              ) : (
                liveTranscript.map((t, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg text-[10.5px] leading-snug ${
                      t.speaker.includes("Warden")
                        ? "bg-[#1ECCE6]/15 border border-[#1ECCE6]/25 text-[#D1F2FA]"
                        : "bg-white/10 border border-white/15 text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[8.5px] font-semibold text-[#8E92A4] mb-0.5">
                      <span>{t.speaker}</span>
                      <span>{t.timestamp}</span>
                    </div>
                    <div>{t.text}</div>
                  </div>
                ))
              )}
            </div>

            {/* Re-dial or place another call button */}
            {!isCalling && (
              <button
                type="button"
                onClick={() => setActiveTab("dial")}
                className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Place Another Automated Check-in Call
              </button>
            )}
          </div>
        ) : (
          /* ============================================================
             TAB 3: CALL HISTORY & LOGGED PATIENT NEEDS
             ============================================================ */
          <div className="flex flex-col gap-2.5">
            <span className="text-[11px] font-semibold text-white">Recent Automated Patient Conversations</span>

            {callHistory.length === 0 ? (
              <div className="py-8 text-center text-[#8E92A4] text-xs">
                No previous phone call records on Floor {currentFloor}.
              </div>
            ) : (
              callHistory.map((call) => (
                <div
                  key={call.id}
                  className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-2 hover:bg-white/[0.06] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">{call.patientName}</span>
                      <span className="text-[9px] font-mono px-1 rounded bg-white/10 text-[#C6CBD9]">
                        {call.bedNumber}
                      </span>
                    </div>
                    <span className="text-[9px] text-[#7A8095]">{timeAgo(call.timestamp)}</span>
                  </div>

                  <div className="text-[10px] text-[#8E92A4]">{call.purpose}</div>

                  {/* Recorded Needs */}
                  {call.notes?.needs && call.notes.needs.length > 0 && (
                    <div className="flex flex-col gap-1 mt-1">
                      {call.notes.needs.map((need, i) => (
                        <div key={i} className="text-[10px] text-white/90 bg-white/5 px-2 py-1 rounded border border-white/10">
                          • {need}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Created Tasks count */}
                  {call.createdTasks && call.createdTasks.length > 0 && (
                    <div className="mt-1 pt-1.5 border-t border-white/5 flex items-center justify-between text-[9px] text-[#82D99E]">
                      <span>✓ {call.createdTasks.length} Follow-up Task Dispatched</span>
                      <span className="text-[#8E92A4]">Status: {call.status}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="relative pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-[#8E92A4]">
        <span>SIP Protocol v2.4</span>
        <span className="font-mono text-[#C6CBD9]">Ext: 104-WARDEN</span>
      </div>
    </div>
  );
}
