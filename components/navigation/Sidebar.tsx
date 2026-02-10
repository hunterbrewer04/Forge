"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home,
  Calendar,
  User,
  Users,
  MessageCircle,
  LogOut,
} from "@/components/ui/icons";

type IconKey = "home" | "messages" | "calendar" | "profile" | "clients";

interface NavItem {
  href: string;
  iconKey: IconKey;
  label: string;
}

const mainNavItems: NavItem[] = [
  { href: "/home", iconKey: "home", label: "Home" },
  { href: "/chat", iconKey: "messages", label: "Messages" },
  { href: "/schedule", iconKey: "calendar", label: "Schedule" },
];

const bottomNavItems: NavItem[] = [
  { href: "/profile", iconKey: "profile", label: "Profile" },
];

function SidebarIcon({ iconKey, size, strokeWidth }: { iconKey: IconKey; size: number; strokeWidth: number }) {
  switch (iconKey) {
    case "home":
      return <Home size={size} strokeWidth={strokeWidth} />;
    case "messages":
      return <MessageCircle size={size} strokeWidth={strokeWidth} />;
    case "calendar":
      return <Calendar size={size} strokeWidth={strokeWidth} />;
    case "clients":
      return <Users size={size} strokeWidth={strokeWidth} />;
    case "profile":
      return <User size={size} strokeWidth={strokeWidth} />;
  }
}

interface SidebarProps {
  onSignOut?: () => void;
}

export default function Sidebar({ onSignOut }: SidebarProps) {
  const pathname = usePathname();
  const { profile } = useAuth();

  const isActive = (href: string) => {
    if (href === "/home") {
      return pathname === "/home" || pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const trainerNavItems: NavItem[] = profile?.is_trainer
    ? [{ href: "/trainer/clients", iconKey: "clients", label: "Clients" }]
    : [];

  return (
    <aside className="hidden lg:flex flex-col w-64 xl:w-72 h-screen bg-[#1C1C1C] border-r border-steel/20 sticky top-0">
      {/* Logo/Brand */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-steel/20">
        <div className="size-10 rounded-xl bg-primary flex items-center justify-center">
          <span className="text-white font-bold text-xl">F</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">FORGE</h1>
          <p className="text-xs text-stone-500 uppercase tracking-wider">
            Performance
          </p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-6">
        <ul className="space-y-1">
          {[...mainNavItems, ...trainerNavItems].map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive(item.href)
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "text-stone-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <SidebarIcon
                  iconKey={item.iconKey}
                  size={22}
                  strokeWidth={isActive(item.href) ? 2.5 : 2}
                />
                <span className="font-medium">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="px-3 pb-6 space-y-1">
        {bottomNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              isActive(item.href)
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "text-stone-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <SidebarIcon
              iconKey={item.iconKey}
              size={22}
              strokeWidth={isActive(item.href) ? 2.5 : 2}
            />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}

        {/* Logout Button */}
        {onSignOut && (
          <button
            onClick={onSignOut}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-stone-400 hover:bg-red-500/10 hover:text-red-400 transition-all w-full"
          >
            <LogOut size={22} strokeWidth={2} />
            <span className="font-medium">Log Out</span>
          </button>
        )}
      </div>
    </aside>
  );
}
