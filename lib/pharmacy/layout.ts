export type MedicationPackageType = 'box' | 'bottle' | 'strip' | 'container';

export interface PharmacyMedication {
  id: string;
  name: string;
  genericName: string | null;
  strength: string | null;
  form: string | null;
  category: string;
  indication: string[];
  packageType: MedicationPackageType;
  colorType: 'cyan' | 'magenta' | 'orange' | 'green';
}

export interface ShelfPlacement extends PharmacyMedication {
  shelf: number;
  slot: number;
  page: number;
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
}

const SHELF_ROWS = [31.5, 52.5, 73.5];
const SLOT_LEFT = [10.5, 19.2, 27.9, 36.6, 45.3, 54, 62.7];
export const ITEMS_PER_SHELF_PAGE = SHELF_ROWS.length * SLOT_LEFT.length;

/** Stable grouping keeps similar dosage forms together while allowing any catalog size. */
export function arrangeMedicationShelf(items: PharmacyMedication[]): ShelfPlacement[] {
  const grouped = [...items].sort((a, b) =>
    a.packageType.localeCompare(b.packageType) || a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
  );

  return grouped.map((item, index) => {
    const pageSlot = index % ITEMS_PER_SHELF_PAGE;
    const shelf = Math.floor(pageSlot / SLOT_LEFT.length);
    const slot = pageSlot % SLOT_LEFT.length;
    const isWide = item.packageType === 'strip';
    const isBottle = item.packageType === 'bottle';
    return {
      ...item,
      page: Math.floor(index / ITEMS_PER_SHELF_PAGE),
      shelf,
      slot,
      leftPct: SLOT_LEFT[slot],
      topPct: SHELF_ROWS[shelf] + (isWide ? 4.3 : 0),
      widthPct: isWide ? 6.7 : isBottle ? 3.4 : 4.8,
      heightPct: isWide ? 3.2 : isBottle ? 9.2 : 7.4,
    };
  });
}
