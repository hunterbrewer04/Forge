"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, BarChart2, User, Plus } from "@/components/ui/icons";

interface NavItem {
  href: string;
  iconKey: "home" | "calendar" | "stats" | "profile";
  label: string;
}

const navItems: NavItem[] = [
  { href: "/home", iconKey: "home", label: "Home" },
  { href: "/schedule", iconKey: "calendar", label: "Schedule" },
  { href: "/stats", iconKey: "stats", label: "Stats" },
  { href: "/profile", iconKey: "profile", label: "Profile" },
];

function NavIcon({ iconKey, size, strokeWidth }: { iconKey: NavItem["iconKey"]; size: number; strokeWidth: number }) {
  switch (iconKey) {
    case "home":
      return <Home size={size} strokeWidth={strokeWidth} />;
    case "calendar":
      return <Calendar size={size} strokeWidth={strokeWidth} />;
    case "stats":
      return <BarChart2 size={size} strokeWidth={strokeWidth} />;
    case "profile":
      return <User size={size} strokeWidth={strokeWidth} />;
  }
}

interface BottomNavProps {
  onFabClick?: () => void;
}

export default function BottomNav({ onFabClick }: BottomNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/home") {
      return pathname === "/home" || pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#1C1C1C]/95 border-t border-steel/30 backdrop-blur-lg pb-safe-bottom z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {/* Left nav items */}
        {navItems.slice(0, 2).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              isActive(item.href)
                ? "text-primary"
                : "text-stone-500 hover:text-stone-300"
            }`}
          >
            <NavIcon iconKey={item.iconKey} size={26} strokeWidth={2} />
            <span
              className={`text-[10px] tracking-wide ${
                isActive(item.href) ? "font-bold" : "font-medium"
              }`}
            >
              {item.label}
            </span>
          </Link>
        ))}

        {/* Center FAB */}
        <div className="relative -top-6">
          <button
            onClick={onFabClick}
            className="size-14 rounded-full bg-primary text-white shadow-lg shadow-primary/30 flex items-center justify-center border-4 border-[#1C1C1C] active:scale-95 transition-transform"
            aria-label="Quick action"
          >
            <Plus size={32} strokeWidth={2} />
          </button>
        </div>

        {/* Right nav items */}
        {navItems.slice(2).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              isActive(item.href)
                ? "text-primary"
                : "text-stone-500 hover:text-stone-300"
            }`}
          >
            <NavIcon iconKey={item.iconKey} size={26} strokeWidth={2} />
            <span
              className={`text-[10px] tracking-wide ${
                isActive(item.href) ? "font-bold" : "font-medium"
              }`}
            >
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
