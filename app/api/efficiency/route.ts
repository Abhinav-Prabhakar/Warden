import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const floorParam = searchParams.get('floor');
    const targetFloor = floorParam ? parseInt(floorParam, 10) : 7;

    // 1. Fetch all beds across all floors (4, 5, 6, 7, 8)
    const { data: allBeds, error: bedErr } = await admin
      .from('beds')
      .select(`
        id,
        bed_number,
        bed_type,
        status,
        room:rooms!beds_room_id_fkey!inner (
          id,
          room_number,
          floor_number
        ),
        patient:patients!beds_current_patient_id_fkey (
          id,
          acuity,
          status
        )
      `);

    if (bedErr) {
      console.error('Efficiency beds fetch error:', bedErr);
      return NextResponse.json({ error: bedErr.message }, { status: 500 });
    }

    // 2. Fetch latest power overrides from system_events
    const { data: overrideEvents } = await admin
      .from('system_events')
      .select('*')
      .eq('event_type', 'facility_power_override')
      .order('timestamp', { ascending: false })
      .limit(50);

    const overridesMap: Record<string, { lights?: boolean; ac?: boolean; ecoSync?: boolean }> = {};
    (overrideEvents || []).forEach((e: any) => {
      const key = e.metadata?.key;
      if (key && !overridesMap[key]) {
        overridesMap[key] = e.metadata;
      }
    });

    // 3. Aggregate data per floor
    const floorsMap: Record<number, { total: number; occupied: number; vacant: number; beds: any[]; rooms: Record<string, any> }> = {
      4: { total: 0, occupied: 0, vacant: 0, beds: [], rooms: {} },
      5: { total: 0, occupied: 0, vacant: 0, beds: [], rooms: {} },
      6: { total: 0, occupied: 0, vacant: 0, beds: [], rooms: {} },
      7: { total: 0, occupied: 0, vacant: 0, beds: [], rooms: {} },
      8: { total: 0, occupied: 0, vacant: 0, beds: [], rooms: {} },
    };

    (allBeds || []).forEach((b: any) => {
      const fl = b.room?.floor_number;
      if (floorsMap[fl]) {
        floorsMap[fl].total++;
        const isOccupied = Boolean(b.patient) && b.status !== 'available';
        if (isOccupied) {
          floorsMap[fl].occupied++;
        } else {
          floorsMap[fl].vacant++;
        }
        floorsMap[fl].beds.push(b);

        const rNum = String(b.room.room_number);
        if (!floorsMap[fl].rooms[rNum]) {
          floorsMap[fl].rooms[rNum] = {
            roomId: b.room.id,
            roomNumber: rNum,
            floorNumber: fl,
            beds: [],
            hasOccupant: false,
          };
        }
        floorsMap[fl].rooms[rNum].beds.push(b);
        if (isOccupied) {
          floorsMap[fl].rooms[rNum].hasOccupant = true;
        }
      }
    });

    // 4. Calculate metrics for each floor
    const crossFloorComparison = [4, 5, 6, 7, 8].map((fl) => {
      const data = floorsMap[fl];
      const floorKey = `floor_${fl}`;
      const floorOverride = overridesMap[floorKey];
      const isEcoSync = floorOverride?.ecoSync ?? true;

      // Base loads in kW
      const baseLoad = 6.2;
      const hvacOccupiedPerBed = 1.6;
      const hvacVacantPerBed = isEcoSync ? 0.15 : 1.2;
      const lightsOccupiedPerBed = 0.55;
      const lightsVacantPerBed = isEcoSync ? 0.04 : 0.45;
      const telemetryPerBed = 0.85;

      const hvacLoad = parseFloat((data.occupied * hvacOccupiedPerBed + data.vacant * hvacVacantPerBed).toFixed(1));
      const lightingLoad = parseFloat((data.occupied * lightsOccupiedPerBed + data.vacant * lightsVacantPerBed).toFixed(1));
      const telemetryLoad = parseFloat((data.occupied * telemetryPerBed).toFixed(1));
      const totalKw = parseFloat((baseLoad + hvacLoad + lightingLoad + telemetryLoad).toFixed(1));

      // Standard non-automated baseline
      const standardBaselineKw = parseFloat((baseLoad + data.total * (hvacOccupiedPerBed + lightsOccupiedPerBed + 0.4)).toFixed(1));
      const kwSaved = Math.max(0, parseFloat((standardBaselineKw - totalKw).toFixed(1)));
      const efficiencyPct = Math.min(99, Math.max(65, Math.round(((standardBaselineKw - totalKw) / standardBaselineKw) * 100 + 75)));

      const occupancyRate = data.total > 0 ? Math.round((data.occupied / data.total) * 100) : 0;

      return {
        floor: fl,
        totalBeds: data.total,
        occupiedBeds: data.occupied,
        vacantBeds: data.vacant,
        occupancyRate,
        powerKw: totalKw,
        standardBaselineKw,
        kwSaved,
        efficiencyPct,
        hvacLoad,
        lightingLoad,
        telemetryLoad,
        isEcoSync,
      };
    });

    // 5. Current floor detailed room and bed pod breakdown
    const currentFloorData = crossFloorComparison.find((f) => f.floor === targetFloor) || crossFloorComparison[3];
    const currentFloorRooms = floorsMap[targetFloor]?.rooms || {};

    const roomPods = Object.values(currentFloorRooms).map((r: any) => {
      const roomKey = `floor_${targetFloor}_room_${r.roomNumber}`;
      const override = overridesMap[roomKey];

      const hasOccupant = r.hasOccupant;
      // Automation defaults based on bed occupancy:
      // If occupied: Lights ON (circadian), AC ON (comfort)
      // If empty: Lights OFF, AC eco-setback
      const lightsOn = override?.lights !== undefined ? override.lights : hasOccupant;
      const acOn = override?.ac !== undefined ? override.ac : hasOccupant;

      return {
        roomId: r.roomId,
        roomNumber: r.roomNumber,
        floorNumber: r.floorNumber,
        bedCount: r.beds.length,
        hasOccupant,
        lightsOn,
        acOn,
        lightMode: lightsOn ? (hasOccupant ? 'Circadian (80%)' : 'Override (100%)') : 'Eco-Standby (Off)',
        acMode: acOn ? (hasOccupant ? 'Comfort (22°C)' : 'Active (22°C)') : 'Setback (26°C / Off)',
        powerDrawKw: parseFloat(((hasOccupant ? 2.8 : 0.4) * (lightsOn ? 1 : 0.4) * (acOn ? 1 : 0.3)).toFixed(1)),
        beds: r.beds.map((b: any) => ({
          id: b.id,
          name: `Bed ${b.bed_number}`,
          isOccupied: Boolean(b.patient) && b.status !== 'available',
          status: b.status,
        })),
      };
    });

    // 24-hour simulation trend based on real current load
    const hours = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];
    const powerTrend = hours.map((h, i) => {
      const variation = Math.sin((i / hours.length) * Math.PI * 2) * 4.2;
      return {
        time: h,
        actualKw: parseFloat((currentFloorData.powerKw + variation * 0.4).toFixed(1)),
        baselineKw: parseFloat((currentFloorData.standardBaselineKw + variation * 0.8).toFixed(1)),
      };
    });

    return NextResponse.json({
      targetFloor,
      currentFloorMetrics: currentFloorData,
      roomPods,
      crossFloorComparison,
      powerTrend,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Efficiency API GET exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = createAdminClient();
    const body = await request.json();
    const { action, floor = 7, roomNumber, type, state } = body;

    const entityId = crypto.randomUUID();

    if (action === 'toggle_room') {
      const key = `floor_${floor}_room_${roomNumber}`;
      await admin.from('system_events').insert({
        event_type: 'facility_power_override',
        entity_type: 'room_power',
        entity_id: entityId,
        actor_type: 'warden',
        metadata: {
          key,
          floor,
          roomNumber,
          [type]: Boolean(state),
          updated_at: new Date().toISOString(),
        },
      });

      return NextResponse.json({
        success: true,
        key,
        type,
        state: Boolean(state),
        message: `Room ${roomNumber} ${type.toUpperCase()} set to ${state ? 'ON' : 'OFF'}`,
      });
    }

    if (action === 'auto_eco_sync') {
      const key = `floor_${floor}`;
      await admin.from('system_events').insert({
        event_type: 'facility_power_override',
        entity_type: 'floor_power_sync',
        entity_id: entityId,
        actor_type: 'warden',
        metadata: {
          key,
          floor,
          ecoSync: Boolean(state),
          updated_at: new Date().toISOString(),
        },
      });

      return NextResponse.json({
        success: true,
        floor,
        ecoSync: Boolean(state),
        message: state
          ? `Floor ${floor} synced to live bed occupancy (Vacant zones powered off)`
          : `Floor ${floor} manual override enabled`,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Efficiency API POST exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
