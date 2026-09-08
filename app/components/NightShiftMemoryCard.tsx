"use client";

import React, { useState, useEffect, useRef } from "react";

export interface DeferredReminder {
  id: string;
  title: string;
  category: "bed_check" | "doctor_call" | "transport" | "equipment" | "medication" | "general";
  bed_number?: string;
  status: "active" | "completed" | "dismissed";
  remind_at: string;
  created_at: string;
  created_by: string;
  source: "voice" | "ui";
  due_in_minutes?: number;
}

interface NightShiftMemoryCardProps {
  isOpen: boolean;
  onClose: () => void;
  currentFloor?: number;
}

export function NightShiftMemoryCard({
  isOpen,
  onClose,
  currentFloor = 7,
}: NightShiftMemoryCardProps) {
  const [reminders, setReminders] = useState<DeferredReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<DeferredReminder["category"]>("bed_check");
  const [newDelay, setNewDelay] = useState<number>(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Swipe left to close
  const [dragOffset, setDragOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  const fetchReminders = async () => {
    try {
      const res = await fetch("/api/warden/memory");
      if (res.ok) {
        const data = await res.json();
        if (data.reminders) {
          setReminders(data.reminders);
        }
      }
    } catch (err) {
      console.error("Failed to fetch night memory:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetchReminders();
    const interval = setInterval(fetchReminders, 8000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleToggleComplete = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "completed" ? "active" : "completed";
    // Optimistic update
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: nextStatus as any } : r))
    );

    try {
      await fetch("/api/warden/memory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      fetchReminders();
    } catch (err) {
      console.error("Failed to update reminder status:", err);
    }
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/warden/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          category: newCategory,
          delayMinutes: newDelay,
          created_by: `Floor ${currentFloor} Coordinator`,
          source: "ui",
        }),
      });
      if (res.ok) {
        setNewTitle("");
        fetchReminders();
      }
    } catch (err) {
      console.error("Failed to add reminder:", err);
    } finally {
      setIsSubmitting(false);
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

  const activeReminders = reminders.filter((r) => r.status === "active");
  const completedReminders = reminders.filter((r) => r.status === "completed");
  const displayList = activeTab === "active" ? activeReminders : completedReminders;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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
          background:
            "radial-gradient(180px 100px at 15% -10%, rgba(168, 85, 247, 0.18), transparent 70%), linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 30%)",
        }}
      />

      {/* Header */}
      <div className="relative flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-sm">
            🧠
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white tracking-[-0.01em]">
                Night-Shift Memory
              </h3>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                §29 SCRATCHPAD
              </span>
            </div>
            <p className="text-[10px] text-[#8E92A4]">
              Deferred promises & spoken follow-ups (Floor {currentFloor})
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

      {/* Spoken Query Banner */}
      <div className="relative rounded-xl p-2.5 bg-purple-950/25 border border-purple-500/25 flex items-center justify-between text-[10.5px]">
        <span className="text-purple-200">
          Ask Warden anytime: <strong className="text-white">&ldquo;What am I forgetting?&rdquo;</strong>
        </span>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-purple-300">
          {activeReminders.length} Active
        </span>
      </div>

      {/* Tab Switcher */}
      <div className="relative flex items-center gap-1 bg-black/25 p-1 rounded-xl border border-white/5 text-[10.5px]">
        <button
          type="button"
          onClick={() => setActiveTab("active")}
          className={`flex-1 py-1 rounded-lg font-medium transition-all ${
            activeTab === "active"
              ? "bg-white/15 text-white shadow-sm"
              : "text-[#8E92A4] hover:text-white"
          }`}
        >
          Active Promises ({activeReminders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("completed")}
          className={`flex-1 py-1 rounded-lg font-medium transition-all ${
            activeTab === "completed"
              ? "bg-white/15 text-white shadow-sm"
              : "text-[#8E92A4] hover:text-white"
          }`}
        >
          Completed ({completedReminders.length})
        </button>
      </div>

      {/* Reminders List */}
      <div className="relative flex-1 overflow-y-auto max-h-[230px] pr-1 flex flex-col gap-2 custom-scrollbar">
        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-[#8E92A4] text-xs">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping" />
            <span>Scanning night-shift memory index...</span>
          </div>
        ) : displayList.length === 0 ? (
          <div className="py-8 text-center text-[#8E92A4] text-xs">
            {activeTab === "active"
              ? "No active deferred promises. All night follow-ups clear."
              : "No completed memories yet."}
          </div>
        ) : (
          displayList.map((r) => {
            const isCompleted = r.status === "completed";
            const isOverdue = (r.due_in_minutes ?? 0) < 0;

            return (
              <div
                key={r.id}
                className={`p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${
                  isCompleted
                    ? "bg-white/[0.02] border-white/5 opacity-50"
                    : isOverdue
                    ? "bg-red-950/20 border-red-500/30"
                    : "bg-white/[0.04] border-white/10 hover:bg-white/[0.07]"
                }`}
              >
                {/* Complete Checkbox */}
                <button
                  type="button"
                  onClick={() => handleToggleComplete(r.id, r.status)}
                  className={`w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                    isCompleted
                      ? "bg-purple-500 border-purple-400 text-white"
                      : "border-white/30 hover:border-purple-400"
                  }`}
                  title={isCompleted ? "Mark active" : "Mark completed"}
                >
                  {isCompleted && <span className="text-[9px]">✓</span>}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <span
                      className={`text-xs font-medium leading-snug truncate ${
                        isCompleted ? "line-through text-white/50" : "text-white"
                      }`}
                    >
                      {r.title}
                    </span>
                    <span
                      className={`text-[8.5px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                        isCompleted
                          ? "bg-white/10 text-white/40"
                          : isOverdue
                          ? "bg-red-500/20 text-red-300 font-bold animate-pulse"
                          : "bg-purple-500/20 text-purple-300 font-medium"
                      }`}
                    >
                      {isCompleted
                        ? "Done"
                        : isOverdue
                        ? `Overdue ${Math.abs(r.due_in_minutes || 0)}m`
                        : `In ${r.due_in_minutes}m`}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-2 text-[9px] text-[#8E92A4]">
                    <span className="capitalize px-1 rounded bg-white/10 text-[#C6CBD9]">
                      {r.category.replace("_", " ")}
                    </span>
                    {r.bed_number && <span className="font-mono">{r.bed_number}</span>}
                    <span>·</span>
                    <span>{r.source === "voice" ? "🎙️ Spoken" : "⌨️ UI"}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Intention Bar */}
      <form onSubmit={handleAddReminder} className="relative pt-2 border-t border-white/10 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[10.5px]">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as any)}
            className="bg-white/10 border border-white/15 rounded-lg px-2 py-0.5 text-xs text-white outline-none cursor-pointer"
          >
            <option value="bed_check" className="bg-[#242930] text-white">Bed Check</option>
            <option value="doctor_call" className="bg-[#242930] text-white">Doctor Call</option>
            <option value="transport" className="bg-[#242930] text-white">Transport</option>
            <option value="equipment" className="bg-[#242930] text-white">Equipment</option>
            <option value="medication" className="bg-[#242930] text-white">Medication</option>
            <option value="general" className="bg-[#242930] text-white">General</option>
          </select>

          <select
            value={newDelay}
            onChange={(e) => setNewDelay(Number(e.target.value))}
            className="bg-white/10 border border-white/15 rounded-lg px-2 py-0.5 text-xs text-white outline-none cursor-pointer"
          >
            <option value={15} className="bg-[#242930] text-white">In 15 mins</option>
            <option value={30} className="bg-[#242930] text-white">In 30 mins</option>
            <option value={45} className="bg-[#242930] text-white">In 45 mins</option>
            <option value={60} className="bg-[#242930] text-white">In 1 hour</option>
            <option value={120} className="bg-[#242930] text-white">In 2 hours</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Remember to check / promise to call..."
            className="flex-1 bg-white/10 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder-[#7A8095] outline-none focus:border-purple-400/60 transition-colors"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newTitle.trim()}
            className="px-3 py-1.5 rounded-xl bg-purple-500 hover:bg-purple-400 disabled:opacity-40 text-white font-semibold text-xs tracking-wide transition-all shadow-[0_0_12px_rgba(168,85,247,0.35)] cursor-pointer shrink-0"
          >
            {isSubmitting ? "Saving..." : "+ Remind"}
          </button>
        </div>
      </form>
    </div>
  );
}
