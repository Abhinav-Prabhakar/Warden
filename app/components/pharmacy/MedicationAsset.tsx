import type { ShelfPlacement } from '@/lib/pharmacy/layout';

const COLOR = {
  cyan: '#1ECCE6',
  magenta: '#E61E67',
  orange: '#E67F1E',
  green: '#24A951',
};

export function MedicationAsset({ item, selected, matched, onSelect }: {
  item: ShelfPlacement;
  selected: boolean;
  matched: boolean;
  onSelect: () => void;
}) {
  const accent = COLOR[item.colorType];
  const shape = item.packageType;
  return (
    <button
      type="button"
      onClick={(event) => { event.stopPropagation(); onSelect(); }}
      className={`absolute z-10 transition-all duration-300 ${matched ? 'opacity-100 scale-105' : 'opacity-55 hover:opacity-100'} ${selected ? 'ring-1 ring-white/60' : ''}`}
      style={{
        left: `${item.leftPct}%`, top: `${item.topPct}%`, width: `${item.widthPct}%`, height: `${item.heightPct}%`,
        borderRadius: shape === 'bottle' ? '9px 9px 5px 5px' : shape === 'container' ? '11px' : '4px',
        background: shape === 'strip'
          ? `radial-gradient(circle at 16% 50%, ${accent}55 0 9%, transparent 10%), radial-gradient(circle at 42% 50%, ${accent}55 0 9%, transparent 10%), radial-gradient(circle at 68% 50%, ${accent}55 0 9%, transparent 10%), linear-gradient(145deg,#3D4350,#171B24)`
          : `linear-gradient(145deg, ${accent}90, #171B24 72%)`,
        border: `1px solid ${accent}90`,
        boxShadow: matched || selected ? `0 0 18px ${accent}aa, inset 0 0 10px ${accent}30` : `0 0 8px ${accent}50`,
      }}
      aria-label={`${item.name}, ${item.packageType}`}
      title={`${item.name} · ${item.strength || item.form || item.category}`}
    >
      {shape === 'bottle' && <span className="absolute left-[22%] right-[22%] -top-[10%] h-[12%] rounded-t-sm bg-[#737A89]" />}
      <span className="absolute inset-x-[8%] bottom-[8%] truncate rounded-sm bg-black/35 px-[2px] py-[1px] text-[6px] font-semibold leading-tight text-white/90">
        {item.name}
      </span>
    </button>
  );
}
