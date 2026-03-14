"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, ChevronDown } from "@/components/ui/icons";
import { SidebarIcon, type IconKey } from "@/components/navigation/sidebar-icons";

interface NavItem {
  href: string;
  iconKey: IconKey;
  label: string;
}

const mainNavItems: NavItem[] = [
  { href: "/home", iconKey: "home", label: "Home" },
  { href: "/schedule", iconKey: "calendar", label: "Schedule" },
];

const bottomNavItems: NavItem[] = [
  { href: "/profile", iconKey: "profile", label: "Profile" },
];

interface SidebarProps {
  onSignOut?: () => void;
}

export default function Sidebar({ onSignOut }: SidebarProps) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const [adminOpen, setAdminOpen] = useState(() => pathname.startsWith("/admin"));

  const isActive = (href: string) => {
    if (href === "/home") {
      return pathname === "/home" || pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const isAdminActive = pathname.startsWith("/admin");

  const messagesNavItem: NavItem[] =
    profile?.is_trainer || profile?.has_full_access
      ? [{ href: "/chat", iconKey: "messages", label: "Messages" }]
      : [];

  const trainerNavItems: NavItem[] = profile?.is_trainer
    ? [{ href: "/trainer/clients", iconKey: "clients", label: "Clients" }]
    : [];

  const adminSubItems: NavItem[] = [
    { href: "/admin/users", iconKey: "admin-users", label: "Users" },
    { href: "/admin/tiers", iconKey: "admin-tiers", label: "Tiers" },
    { href: "/admin/finances", iconKey: "admin-finances", label: "Finances" },
    { href: "/admin/settings", iconKey: "admin-settings", label: "Settings" },
  ];

  const allNavItems = [...mainNavItems, ...messagesNavItem, ...trainerNavItems];

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
          {allNavItems.map((item) => (
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

          {/* Admin Dropdown */}
          {profile?.is_admin && (
            <li>
              <div className="mt-2 mb-1 px-4">
                <div className="border-t border-steel/20" />
              </div>
              <button
                onClick={() => setAdminOpen((prev) => !prev)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full ${
                  isAdminActive
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "text-stone-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <SidebarIcon
                  iconKey="admin"
                  size={22}
                  strokeWidth={isAdminActive ? 2.5 : 2}
                />
                <span className="font-medium flex-1 text-left">Admin Panel</span>
                <motion.span
                  animate={{ rotate: adminOpen ? 180 : 0 }}
                  transition={{ duration: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
                >
                  <ChevronDown size={16} />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {adminOpen && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.25, 0.4, 0.25, 1] }}
                    className="overflow-hidden"
                  >
                    {adminSubItems.map((item, index) => (
                      <motion.li
                        key={item.href}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{
                          duration: 0.2,
                          delay: index * 0.05,
                          ease: [0.25, 0.4, 0.25, 1],
                        }}
                      >
                        <Link
                          href={item.href}
                          className={`flex items-center gap-3 pl-8 pr-4 py-2.5 rounded-xl transition-all ${
                            isActive(item.href)
                              ? "bg-primary/80 text-white shadow-md shadow-primary/10"
                              : "text-stone-400 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <SidebarIcon
                            iconKey={item.iconKey}
                            size={18}
                            strokeWidth={isActive(item.href) ? 2.5 : 2}
                          />
                          <span className="font-medium text-sm">{item.label}</span>
                        </Link>
                      </motion.li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </li>
          )}
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
