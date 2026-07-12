"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderOpen,
  Brain,
  FileSearch,
  BarChart3,
  CreditCard,
  LogOut,
  Shield,
  PanelLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: FolderOpen, label: "Casos", path: "/casos" },
  { icon: Brain, label: "Análisis IA", path: "/analisis" },
  { icon: FileSearch, label: "Evidencia", path: "/evidencia" },
  { icon: BarChart3, label: "Reportes", path: "/reportes" },
  { icon: CreditCard, label: "Suscripción", path: "/suscripcion" },
  { icon: Shield, label: "Admin", path: "/admin" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#12151E" }}>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full flex-col transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
        style={{
          backgroundColor: "#0F1219",
          borderRight: "1px solid #2A2E3A",
        }}
      >
        <div
          className="flex h-16 items-center gap-3 px-4 shrink-0"
          style={{ borderBottom: "1px solid #2A2E3A" }}
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
            style={{
              backgroundColor: "#E8B86D",
              color: "#12151E",
            }}
          >
            FL
          </div>
          {!collapsed && (
            <span
              style={{ color: "#E8EDF2" }}
              className="text-sm font-semibold"
            >
              Forensic Legal
            </span>
          )}
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {menuItems.map(item => {
            const isActive = pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group",
                  isActive
                    ? "text-[#E8B86D]"
                    : "text-[#8892A0] hover:text-[#E8EDF2]"
                )}
                style={{
                  backgroundColor: isActive
                    ? "rgba(232, 184, 109, 0.08)"
                    : "transparent",
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor =
                      "rgba(232, 184, 109, 0.05)";
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <item.icon
                  className="h-4 w-4 shrink-0"
                  style={{
                    color: isActive ? "#E8B86D" : "#8892A0",
                  }}
                />
                {!collapsed && <span>{item.label}</span>}
                {isActive && !collapsed && (
                  <ChevronRight
                    className="ml-auto h-3 w-3"
                    style={{ color: "#E8B86D" }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div
          className="p-3 shrink-0"
          style={{ borderTop: "1px solid #2A2E3A" }}
        >
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200"
            style={{ color: "#8892A0" }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor =
                "rgba(232, 184, 109, 0.05)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <PanelLeft className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Colapsar</span>}
          </button>
        </div>
      </aside>

      <main
        className={cn(
          "flex-1 transition-all duration-300",
          collapsed ? "ml-16" : "ml-64"
        )}
      >
        <div className="min-h-screen p-8">{children}</div>
      </main>
    </div>
  );
}
