"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";

export interface RadioTransmission {
  id: string;
  sender: string;
  senderFloor: number;
  recipientFloor: number;
  channel: string;
  frequency: string;
  urgency: "routine" | "urgent" | "priority";
  transcript: string;
  status: "delivered" | "queued" | "played";
  timestamp: string;
  isQueued: boolean;
}

export interface OnlineWarden {
  floor: number;
  name: string;
  ward: string;
  status: "online" | "busy" | "active_operator";
  callsign: string;
  freq: string;
}

interface SatelliteRadioCardProps {
  isOpen: boolean;
  onClose: () => void;
  currentFloor?: number;
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

// Play radio squelch chirp using Web Audio API
function playRadioChirp(urgency: "routine" | "urgent" | "priority" = "routine") {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = urgency === "priority" ? "sawtooth" : "sine";
    osc.frequency.setValueAtTime(urgency === "priority" ? 880 : 660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(urgency === "priority" ? 440 : 880, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.26);
  } catch {
    // AudioContext blocked or not supported
  }
}

export function SatelliteRadioCard({ isOpen, onClose, currentFloor = 7 }: SatelliteRadioCardProps) {
  const [transmissions, setTransmissions] = useState<RadioTransmission[]>([]);
  const [wardens, setWardens] = useState<OnlineWarden[]>([]);
  const [isRadioBlocked, setIsRadioBlocked] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"transmissions" | "queued" | "wardens">("transmissions");
  const [selectedTargetFloor, setSelectedTargetFloor] = useState<number>(8);
  const [dispatchText, setDispatchText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Left swipe-to-close state
  const [dragOffset, setDragOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  // Fetch live radio state from /api/warden/radio
  const fetchRadioData = () => {
    fetch(`/api/warden/radio?floor=${currentFloor}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data && !data.error) {
          setTransmissions(data.transmissions || []);
          setWardens(data.wardens || []);
          setIsRadioBlocked(Boolean(data.isRadioBlocked));
          setQueuedCount(data.queuedCount || 0);
        } else {
          setError(data?.error || "Failed to load radio network");
        }
      })
      .catch((err) => {
        console.error("Radio fetch failed:", err);
        setError("Could not connect to warden radio relay");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    fetchRadioData();
    const interval = setInterval(fetchRadioData, 10000); // 10s live polling
    return () => clearInterval(interval);
  }, [isOpen, currentFloor]);

  if (!isOpen) return null;

  // Toggle Radio Silence (Temporary Block)
  const handleToggleSilence = async () => {
    const nextState = !isRadioBlocked;
    setIsRadioBlocked(nextState);
    try {
      const res = await fetch("/api/warden/radio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_silence", blocked: nextState }),
      });
      const data = await res.json();
      if (data && data.success) {
        fetchRadioData();
      }
    } catch (err) {
      console.error("Toggle silence failed:", err);
    }
  };

  // Broadcast / Dispatch Transmission
  const handleSendDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchText.trim() || isSending) return;

    setIsSending(true);
    try {
      playRadioChirp("routine");
      const res = await fetch("/api/warden/radio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_warden: "Warden Marcus Vance",
          sender_floor: currentFloor,
          recipient_floor: selectedTargetFloor,
          transcript: dispatchText.trim(),
          urgency: "routine",
        }),
      });
      const data = await res.json();
      if (data && data.success) {
        setDispatchText("");
        fetchRadioData();
      }
    } catch (err) {
      console.error("Failed to send transmission:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Play audio transmission
  const handlePlayTransmission = (t: RadioTransmission) => {
    setPlayingId(t.id);
    playRadioChirp(t.urgency);
    setTimeout(() => {
      setPlayingId(null);
      // Mark as played
      fetch("/api/warden/radio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_played", transmissionId: t.id }),
      }).then(() => fetchRadioData());
    }, 1400);
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
    if (target.closest("input") || target.closest("button") || target.closest("select")) return;
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

  const visibleTransmissions =
    activeTab === "queued" ? transmissions.filter((t) => t.isQueued) : transmissions;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={(e) => e.stopPropagation()}
      className="absolute z-30 figma-glass-card rounded-[22px] p-5 w-[380px] max-w-[94vw] text-white flex flex-col gap-3.5 shadow-[0_20px_45px_rgba(0,0,0,0.65)] animate-in fade-in slide-in-from-left-6 duration-200"
      style={{
        left: "54px",
        bottom: "34px",
        maxHeight: "580px",
        transform: `translateX(${dragOffset}px)`,
        transition: isSwiping ? "none" : "transform 0.2s ease-out",
      }}
    >
      {/* Top Ambient Sheen */}
      <div
        className="absolute inset-0 rounded-[inherit] pointer-events-none"
        style={{
          background: isRadioBlocked
            ? "radial-gradient(180px 100px at 15% -10%, rgba(230, 127, 30, 0.18), transparent 70%), linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 30%)"
            : "radial-gradient(180px 100px at 15% -10%, rgba(30, 204, 230, 0.18), transparent 70%), linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 30%)",
        }}
      />

      {/* Header */}
      <div className="relative flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#1ECCE6]/10 border border-[#1ECCE6]/25 flex items-center justify-center">
            <Image src="/satellite.svg" alt="Radio Satellite" width={16} height={16} className="opacity-90" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white tracking-[-0.01em]">Inter-Warden Radio</h3>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-[#A2A7B8]">
                CH-07 · 433.92 MHz
              </span>
            </div>
            <p className="text-[10px] text-[#8E92A4]">Encrypted Hospital Frequency Relay</p>
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

      {/* Radio Silence / Temporary Block Control */}
      <div
        className={`relative rounded-xl p-3 border transition-all duration-300 ${
          isRadioBlocked
            ? "bg-[#E67F1E]/10 border-[#E67F1E]/30 text-[#F4B476]"
            : "bg-[#24A951]/10 border-[#24A951]/25 text-[#82D99E]"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${
                  isRadioBlocked ? "bg-[#E67F1E]" : "bg-[#24A951]"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isRadioBlocked ? "bg-[#E67F1E]" : "bg-[#24A951]"
                }`}
              />
            </span>
            <span className="text-xs font-semibold tracking-wide">
              {isRadioBlocked ? "RADIO SILENCE ACTIVE (BLOCKED)" : "RADIO COMMUNICATIONS LIVE"}
            </span>
          </div>

          <button
            type="button"
            onClick={handleToggleSilence}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wider uppercase transition-all cursor-pointer ${
              isRadioBlocked
                ? "bg-[#E67F1E] text-black hover:bg-[#E67F1E]/90 shadow-[0_0_12px_rgba(230,127,30,0.5)]"
                : "bg-white/10 text-[#C6CBD9] hover:bg-white/20 border border-white/15"
            }`}
          >
            {isRadioBlocked ? "UNBLOCK RADIO" : "BLOCK RADIO"}
          </button>
        </div>

        <p className="text-[10px] text-white/70 mt-1.5 leading-relaxed">
          {isRadioBlocked
            ? "Incoming transmissions are muted and queued silently. Your voice agent can still access all queued messages."
            : "Direct two-way radio dispatch open between wardens across floors 4 through 8."}
        </p>

        {queuedCount > 0 && (
          <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
            <span className="text-white/80">
              <strong className="text-white font-mono">{queuedCount}</strong> transmission{queuedCount === 1 ? "" : "s"} waiting in queue
            </span>
            <button
              onClick={() => setActiveTab("queued")}
              className="text-[#1ECCE6] hover:underline font-medium cursor-pointer"
            >
              Review Queue →
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="relative flex items-center gap-1 bg-black/25 p-1 rounded-xl border border-white/5 text-[10.5px]">
        <button
          type="button"
          onClick={() => setActiveTab("transmissions")}
          className={`flex-1 py-1 rounded-lg font-medium transition-all ${
            activeTab === "transmissions" ? "bg-white/15 text-white shadow-sm" : "text-[#8E92A4] hover:text-white"
          }`}
        >
          Dispatches ({transmissions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("queued")}
          className={`flex-1 py-1 rounded-lg font-medium transition-all flex items-center justify-center gap-1 ${
            activeTab === "queued" ? "bg-white/15 text-white shadow-sm" : "text-[#8E92A4] hover:text-white"
          }`}
        >
          <span>Queue</span>
          {queuedCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-[#E67F1E] text-black text-[9px] font-bold">
              {queuedCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("wardens")}
          className={`flex-1 py-1 rounded-lg font-medium transition-all ${
            activeTab === "wardens" ? "bg-white/15 text-white shadow-sm" : "text-[#8E92A4] hover:text-white"
          }`}
        >
          Network ({wardens.length})
        </button>
      </div>

      {/* Content Area */}
      <div className="relative flex-1 overflow-y-auto max-h-[240px] pr-1 flex flex-col gap-2.5 custom-scrollbar">
        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-[#8E92A4] text-xs">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#1ECCE6] animate-ping" />
            <span>Scanning warden radio frequencies...</span>
          </div>
        ) : error ? (
          <div className="py-6 text-center text-red-300 text-xs bg-red-950/40 rounded-xl p-3 border border-red-500/30">
            ⚠️ {error}
          </div>
        ) : activeTab === "wardens" ? (
          /* Active Wardens Roster */
          <div className="flex flex-col gap-2">
            {wardens.map((w) => (
              <div
                key={w.floor}
                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  w.floor === currentFloor
                    ? "bg-[#1ECCE6]/10 border-[#1ECCE6]/30"
                    : "bg-white/[0.04] border-white/10 hover:bg-white/[0.08]"
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white">{w.name}</span>
                    <span className="text-[9px] font-mono px-1 rounded bg-white/10 text-[#A2A7B8]">
                      FL {w.floor}
                    </span>
                    {w.floor === currentFloor && (
                      <span className="text-[8.5px] px-1 rounded bg-[#1ECCE6]/20 text-[#1ECCE6] font-bold">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-[#8E92A4] mt-0.5">{w.ward}</div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      w.status === "online" || w.status === "active_operator"
                        ? "bg-[#24A951]"
                        : "bg-[#E67F1E]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTargetFloor(w.floor);
                      setActiveTab("transmissions");
                    }}
                    className="px-2 py-0.8 rounded text-[10px] bg-white/10 hover:bg-white/20 text-[#C6CBD9] transition-colors"
                  >
                    Hail
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : visibleTransmissions.length === 0 ? (
          <div className="py-8 text-center text-[#8E92A4] text-xs">
            {activeTab === "queued" ? "No queued radio transmissions" : "No recent transmissions on this channel"}
          </div>
        ) : (
          /* Transmissions list */
          visibleTransmissions.map((t) => {
            const isPlaying = playingId === t.id;
            return (
              <div
                key={t.id}
                className={`p-2.5 rounded-xl border transition-all ${
                  t.isQueued
                    ? "bg-[#E67F1E]/10 border-[#E67F1E]/30"
                    : t.urgency === "priority"
                    ? "bg-[#E61E67]/10 border-[#E61E67]/30"
                    : "bg-white/[0.04] border-white/10 hover:bg-white/[0.07]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-semibold text-white truncate">{t.sender}</span>
                    <span className="text-[9px] font-mono px-1 rounded bg-white/10 text-[#C6CBD9] shrink-0">
                      FL {t.senderFloor} → FL {t.recipientFloor}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {t.isQueued ? (
                      <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#E67F1E]/20 text-[#F4B476] border border-[#E67F1E]/40">
                        QUEUED
                      </span>
                    ) : t.urgency === "priority" ? (
                      <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#E61E67]/20 text-[#FF9DB2] border border-[#E61E67]/40">
                        PRIORITY
                      </span>
                    ) : null}
                    <span className="text-[9px] text-[#7A8095]">{timeAgo(t.timestamp)}</span>
                  </div>
                </div>

                <p className="text-[11px] text-white/90 mt-1 leading-snug">{t.transcript}</p>

                {/* Audio playback & Waveform action */}
                <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[9px] text-[#7A8095]">
                    <span className="font-mono">{t.channel}</span>
                    <span>·</span>
                    <span>{t.frequency}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePlayTransmission(t)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                      isPlaying
                        ? "bg-[#1ECCE6] text-black animate-pulse"
                        : "bg-white/10 hover:bg-white/20 text-[#C6CBD9]"
                    }`}
                  >
                    <span>{isPlaying ? "Playing..." : "Play Audio"}</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Dispatch Bar */}
      <form onSubmit={handleSendDispatch} className="relative pt-2 border-t border-white/10 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[10.5px]">
          <span className="text-[#8E92A4]">Transmit to:</span>
          <select
            value={selectedTargetFloor}
            onChange={(e) => setSelectedTargetFloor(parseInt(e.target.value, 10))}
            className="bg-white/10 border border-white/15 rounded-lg px-2 py-0.5 text-xs text-white outline-none cursor-pointer"
          >
            <option value={4} className="bg-[#242930] text-white">Floor 4 (Ward 4B)</option>
            <option value={5} className="bg-[#242930] text-white">Floor 5 (Ward 5A)</option>
            <option value={6} className="bg-[#242930] text-white">Floor 6 (Ward 6B)</option>
            <option value={7} className="bg-[#242930] text-white">Floor 7 (Ward 7A)</option>
            <option value={8} className="bg-[#242930] text-white">Floor 8 (Ward 8C)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={dispatchText}
            onChange={(e) => setDispatchText(e.target.value)}
            placeholder="Type voice dispatch or tell voice agent..."
            className="flex-1 bg-white/10 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder-[#7A8095] outline-none focus:border-[#1ECCE6]/60 transition-colors"
          />
          <button
            type="submit"
            disabled={isSending || !dispatchText.trim()}
            className="px-3 py-1.5 rounded-xl bg-[#1ECCE6] hover:bg-[#1ECCE6]/90 disabled:opacity-40 text-black font-semibold text-xs tracking-wide transition-all shadow-[0_0_12px_rgba(30,204,230,0.3)] cursor-pointer shrink-0"
          >
            {isSending ? "Sending..." : "Transmit"}
          </button>
        </div>
      </form>
    </div>
  );
}
