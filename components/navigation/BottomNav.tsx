"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Calendar, User } from "@/components/ui/icons";

interface NavItem {
  href: string;
  iconKey: "home" | "calendar" | "profile";
  label: string;
}

const navItems: NavItem[] = [
  { href: "/home", iconKey: "home", label: "Home" },
  { href: "/schedule", iconKey: "calendar", label: "Schedule" },
  { href: "/profile", iconKey: "profile", label: "Profile" },
];

function NavIcon({ iconKey, size, strokeWidth }: { iconKey: NavItem["iconKey"]; size: number; strokeWidth: number }) {
  switch (iconKey) {
    case "home":
      return <Home size={size} strokeWidth={strokeWidth} />;
    case "calendar":
      return <Calendar size={size} strokeWidth={strokeWidth} />;
    case "profile":
      return <User size={size} strokeWidth={strokeWidth} />;
  }
}

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Prefetch all nav routes on mount for instant navigation
  useEffect(() => {
    navItems.forEach((item) => {
      router.prefetch(item.href);
    });
    // Also prefetch chat since it's a common destination
    router.prefetch("/chat");
  }, [router]);

  const isActive = (href: string) => {
    if (href === "/home") {
      return pathname === "/home" || pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#1C1C1C]/95 border-t border-steel/30 backdrop-blur-lg pb-safe-bottom z-40">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => (
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
