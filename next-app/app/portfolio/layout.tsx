import type { Metadata } from "next";
import { Kanit } from "next/font/google";

const kanit = Kanit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "800", "900"],
  variable: "--font-kanit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jack -- 3D Creator",
  description:
    "Portfolio of Jack, a 3D creator driven by crafting striking and unforgettable projects.",
};

export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${kanit.variable}`}
      style={{ fontFamily: "'Kanit', sans-serif" }}
    >
      {children}
    </div>
  );
}
