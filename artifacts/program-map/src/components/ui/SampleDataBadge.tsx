// SampleDataBadge — neutral disclosure pill for panels containing invented prototype figures.
// Sits next to the title of any panel, card, or bar whose data is Illustrative (plausible
// but invented) rather than Real or Live. Marks the container, not individual figures.
// Remove this component import by import as real data replaces each prototype file.

export function SampleDataBadge({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[14px] font-semibold bg-[#E2E4E1] text-[#4A4F4D] border-[#C8CBC6] shrink-0 select-none whitespace-nowrap ${className ?? ''}`}
      title="Some figures on this panel are sample data created for prototype demonstration. They do not represent real Transition Trails operational data."
    >
      Sample data
    </span>
  );
}
