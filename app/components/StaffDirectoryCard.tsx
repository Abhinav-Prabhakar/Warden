"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";

export interface StaffSkill {
  id: string;
  skill_code: string;
  proficiency: string;
  certified: boolean;
}

export interface StaffMember {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  display_name: string;
  role: "doctor" | "nurse" | "porter" | "warden" | "pharmacist" | "technician" | "carer" | "administrator" | "facility_staff";
  phone: string | null;
  email: string | null;
  status: "active" | "busy" | "on_break" | "off_duty" | "unavailable";
  is_on_duty: boolean;
  department: {
    id: string;
    name: string;
    code: string;
  } | null;
  skills: StaffSkill[];
}

interface StaffDirectoryCardProps {
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; dotColor: string; bgBadge: string; textColor: string }
> = {
  active: {
    label: "AVAILABLE",
    dotColor: "#24A951",
    bgBadge: "rgba(36, 169, 81, 0.12)",
    textColor: "#82D99E",
  },
  busy: {
    label: "IN PROCEDURE",
    dotColor: "#E67F1E",
    bgBadge: "rgba(230, 127, 30, 0.12)",
    textColor: "#F4B476",
  },
  on_break: {
    label: "ON BREAK",
    dotColor: "#F0B429",
    bgBadge: "rgba(240, 180, 41, 0.12)",
    textColor: "#F6CE72",
  },
  off_duty: {
    label: "OFF DUTY",
    dotColor: "#6D7282",
    bgBadge: "rgba(109, 114, 130, 0.15)",
    textColor: "#8E92A4",
  },
  unavailable: {
    label: "UNAVAILABLE",
    dotColor: "#E61E67",
    bgBadge: "rgba(230, 30, 103, 0.12)",
    textColor: "#FF9DB2",
  },
};

export function StaffDirectoryCard({ isOpen, onClose }: StaffDirectoryCardProps) {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "doctor" | "nurse" | "support">("all");

  // Swipe-to-close state
  const [dragOffset, setDragOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  // Fetch live staff data whenever opened
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);

    fetch("/api/staff")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data && !data.error) {
          setStaffList(data);
        } else {
          setError(data?.error || "Failed to load staff directory");
        }
      })
      .catch((err) => {
        console.error("Staff fetch failed:", err);
        setError("Could not connect to live staff database");
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  // Touch / Mouse Swipe left handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const deltaX = e.touches[0].clientX - touchStartXRef.current;
    if (deltaX < 0) {
      setDragOffset(deltaX);
    }
  };

  const handleTouchEnd = () => {
    if (dragOffset < -60) {
      onClose();
    }
    setDragOffset(0);
    setIsSwiping(false);
    touchStartXRef.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('input') || target.closest('button') || target.closest('a')) return;
    touchStartXRef.current = e.clientX;
    setIsSwiping(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSwiping || touchStartXRef.current === null) return;
    const deltaX = e.clientX - touchStartXRef.current;
    if (deltaX < 0) {
      setDragOffset(deltaX);
    }
  };

  const handleMouseUp = () => {
    if (isSwiping) {
      if (dragOffset < -60) {
        onClose();
      }
      setDragOffset(0);
      setIsSwiping(false);
      touchStartXRef.current = null;
    }
  };

  // Filtered staff list
  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      s.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.department?.name && s.department.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.skills.some((sk) => sk.skill_code.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (roleFilter === "doctor") return s.role === "doctor";
    if (roleFilter === "nurse") return s.role === "nurse";
    if (roleFilter === "support") return !["doctor", "nurse"].includes(s.role);
    return true;
  });

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={(e) => e.stopPropagation()}
      className="absolute z-30 figma-glass-card bg-[#10141D]/90 rounded-[22px] p-5 w-[360px] max-w-[92vw] text-white flex flex-col gap-3.5 shadow-[0_20px_45px_rgba(0,0,0,0.85)] animate-in fade-in slide-in-from-left-6 duration-200"
      style={{
        left: "54px",
        bottom: "34px",
        maxHeight: "560px",
        transform: `translateX(${dragOffset}px)`,
        transition: isSwiping ? "none" : "transform 0.2s ease-out",
      }}
    >
      {/* Top Ambient Sheen */}
      <div
        className="absolute inset-0 rounded-[inherit] pointer-events-none"
        style={{
          background:
            "radial-gradient(180px 100px at 15% -10%, rgba(30, 204, 230, 0.15), transparent 70%), linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 30%)",
        }}
      />

      {/* Header */}
      <div className="relative flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#1ECCE6]/10 border border-[#1ECCE6]/25 flex items-center justify-center">
            <Image src="/fingerprint.svg" alt="Biometrics" width={16} height={16} className="opacity-90" />
          </div>
          <div>
            <h3 className="text-[13.5px] font-semibold tracking-[-0.01em] text-[#E2E5EE]">
              Clinical Staff Directory
            </h3>
            <p className="text-[10px] text-[#8E92A4]">
              Live Ward Availability &amp; Specializations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[9.5px] text-[#6D7282] hidden sm:inline">Swipe ‹ to close</span>
          <button
            onClick={onClose}
            aria-label="Close staff card"
            className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-[#8E92A4] hover:text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by name, role, specialization..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-[10px] px-3 py-1.5 text-[11.5px] text-white placeholder-[#5C6170] focus:border-[#1ECCE6]/50 outline-none transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-1.5 text-[11px] text-[#8E92A4] hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-black/30 p-1 rounded-[10px] border border-white/5">
        {[
          { id: "all", label: "All Staff" },
          { id: "doctor", label: "Doctors" },
          { id: "nurse", label: "Nurses" },
          { id: "support", label: "Support" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setRoleFilter(tab.id as any)}
            className={`flex-1 py-1 text-[10.5px] font-medium rounded-[7px] transition-all text-center ${
              roleFilter === tab.id
                ? "bg-white/15 text-white shadow-sm"
                : "text-[#8E92A4] hover:text-[#C6CBD9]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Staff List */}
      <div className="relative flex-1 overflow-y-auto flex flex-col gap-2 pr-1 max-h-[340px] select-text">
        {loading ? (
          <div className="flex flex-col gap-2.5 py-6 items-center justify-center text-[#8E92A4]">
            <div className="w-5 h-5 border-2 border-[#1ECCE6]/40 border-t-[#1ECCE6] rounded-full animate-spin" />
            <span className="text-[11px]">Fetching live staff roster...</span>
          </div>
        ) : error ? (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-[12px] text-center">
            <p className="text-[11px] text-red-400 font-medium">{error}</p>
            <button
              onClick={() => {
                setLoading(true);
                setError(null);
                fetch("/api/staff")
                  .then((r) => r.json())
                  .then((data) => setStaffList(data || []))
                  .catch(() => setError("Retry failed"))
                  .finally(() => setLoading(false));
              }}
              className="mt-2 text-[10px] text-[#1ECCE6] underline"
            >
              Retry Connection
            </button>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="py-8 text-center text-[#6D7282] text-[11px]">
            No matching staff members found.
          </div>
        ) : (
          filteredStaff.map((staff) => {
            const statusConfig = STATUS_CONFIG[staff.status] || STATUS_CONFIG.off_duty;
            const initials = staff.display_name
              .split(" ")
              .filter((n) => !n.startsWith("Dr.") && !n.startsWith("Pharm.") && !n.startsWith("Tech"))
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "ST";

            return (
              <div
                key={staff.id}
                className="group relative bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/15 rounded-[13px] p-2.5 transition-all flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  {/* Avatar + Name + Role */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0 w-8 h-8 rounded-full bg-[#1F242C] border border-white/10 flex items-center justify-center font-bold text-[10.5px] text-[#D0D4E4]">
                      {initials}
                      {/* Online/Active status dot */}
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#161920]"
                        style={{ backgroundColor: statusConfig.dotColor }}
                        title={statusConfig.label}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold text-[#E2E5EE] truncate leading-tight">
                        {staff.display_name}
                      </div>
                      <div className="text-[10px] text-[#8E92A4] capitalize tracking-wide leading-tight mt-0.5">
                        {staff.role === "doctor"
                          ? "Attending Physician"
                          : staff.role === "nurse"
                          ? "Staff / Charge Nurse"
                          : staff.role === "porter"
                          ? "Patient Transport Porter"
                          : staff.role === "warden"
                          ? "Clinical Coordinator"
                          : staff.role === "pharmacist"
                          ? "Clinical Pharmacist"
                          : staff.role === "technician"
                          ? "Diagnostics Technician"
                          : staff.role}
                      </div>
                    </div>
                  </div>

                  {/* Availability Badge */}
                  <div
                    className="shrink-0 px-2 py-0.5 rounded-[6px] text-[9px] font-semibold tracking-[0.06em] uppercase flex items-center gap-1"
                    style={{
                      backgroundColor: statusConfig.bgBadge,
                      color: statusConfig.textColor,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ backgroundColor: statusConfig.dotColor }}
                    />
                    {statusConfig.label}
                  </div>
                </div>

                {/* Specialization Tags */}
                {staff.skills && staff.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {staff.skills.slice(0, 3).map((sk) => (
                      <span
                        key={sk.id || sk.skill_code}
                        className="px-1.5 py-0.5 rounded-[5px] bg-[#1ECCE6]/[0.08] text-[#1ECCE6] border border-[#1ECCE6]/20 text-[9.5px] font-medium"
                      >
                        {sk.skill_code}
                      </span>
                    ))}
                    {staff.skills.length > 3 && (
                      <span className="px-1.5 py-0.5 rounded-[5px] bg-white/5 text-[#8E92A4] text-[9.5px]">
                        +{staff.skills.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Footer Info (Phone, Department) */}
                <div className="flex items-center justify-between text-[9.5px] text-[#6D7282] pt-1 border-t border-white/5">
                  <span>{staff.department?.name || "General Ward"}</span>
                  {staff.phone && (
                    <span className="font-mono text-[#8E92A4]">{staff.phone}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer / Count */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-[#6D7282]">
        <span>
          {filteredStaff.length} of {staffList.length} staff members listed
        </span>
        <span className="text-[#1ECCE6] font-mono">Live Sync</span>
      </div>
    </div>
  );
}
