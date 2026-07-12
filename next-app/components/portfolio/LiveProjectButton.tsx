"use client";

interface LiveProjectButtonProps {
  className?: string;
}

export default function LiveProjectButton({
  className = "",
}: LiveProjectButtonProps) {
  return (
    <button
      className={`rounded-full text-[#D7E2EA] font-medium uppercase tracking-widest border-2 border-[#D7E2EA] px-8 py-3 sm:px-10 sm:py-3.5 md:px-12 md:py-4 text-xs sm:text-sm md:text-base ${className}`}
    >
      Live Project
    </button>
  );
}
