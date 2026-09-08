"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const WARD_TABLES = [
  "beds",
  "bed_assignments",
  "tasks",
  "task_assignments",
  "cleaning_jobs",
  "discharge_plans",
  "transport_requests",
  "transport_tasks",
  "incoming_admissions",
  "staff",
  "vitals",
  "system_events",
] as const;

export type RealtimeConnectionState = "connecting" | "live" | "degraded";

/**
 * One ward-level subscription invalidates the server-computed ward projection.
 * A short coalescing window turns multi-row database transactions into one refetch.
 */
export function useWardRealtime(currentFloor: number) {
  const [revision, setRevision] = useState(0);
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>("connecting");
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`warden-floor-${currentFloor}`);
    const invalidate = () => {
      setLastEventAt(new Date().toISOString());
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setRevision((value) => value + 1), 120);
    };

    for (const table of WARD_TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        invalidate,
      );
    }

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") setConnectionState("live");
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        setConnectionState("degraded");
      } else {
        setConnectionState("connecting");
      }
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      void supabase.removeChannel(channel);
    };
  }, [currentFloor]);

  return { revision, connectionState, lastEventAt };
}
