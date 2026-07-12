import { ArrowUpRight } from "lucide-react";

export default function LiveProjectButton({
  className,
}: {
  className?: string;
}) {
  return (
    <button
      className={`rounded-full border-2 border-[#D7E2EA] px-8 py-3 sm:px-10 sm:py-3.5 md:px-12 md:py-4 text-[#D7E2EA] font-medium uppercase tracking-widest text-xs sm:text-sm md:text-base inline-flex items-center gap-2 ${className ?? ""}`}
    >
      Live Project
      <ArrowUpRight className="w-4 h-4" />
    </button>
  );
}
