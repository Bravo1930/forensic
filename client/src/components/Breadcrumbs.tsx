import { ChevronRight, type LucideIcon } from "lucide-react";

export interface BreadcrumbSegment {
  label: string;
  href?: string;
  icon?: LucideIcon;
}

export default function Breadcrumbs({
  segments,
  onNavigate,
}: {
  segments: BreadcrumbSegment[];
  onNavigate: (href: string) => void;
}) {
  return (
    <nav
      className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3"
      aria-label="Breadcrumb"
    >
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        const Icon = seg.icon;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3 h-3" />}
            {Icon && <Icon className="w-3 h-3" />}
            {seg.href && !isLast ? (
              <button
                onClick={() => onNavigate(seg.href!)}
                className="hover:text-foreground transition-colors"
              >
                {seg.label}
              </button>
            ) : (
              <span className={isLast ? "text-foreground font-medium" : ""}>
                {seg.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
