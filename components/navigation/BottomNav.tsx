"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, MessageCircle, Calendar, User, type LucideIcon } from "@/components/ui/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadCount } from "@/lib/hooks/useUnreadCount";

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

const navItems: NavItem[] = [
  { href: "/home", icon: Home, label: "Home" },
  { href: "/chat", icon: MessageCircle, label: "Messages" },
  { href: "/schedule", icon: Calendar, label: "Sessions" },
  { href: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { unreadCount } = useUnreadCount({
    userId: user?.id,
    isTrainer: profile?.is_trainer,
    isClient: profile?.is_client,
  });

  // Prefetch all nav routes on mount for instant navigation
  useEffect(() => {
    navItems.forEach((item) => {
      router.prefetch(item.href);
    });
  }, [router]);

  const isActive = (href: string) => {
    if (href === "/home") {
      return pathname === "/home" || pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-bg-primary/95 dark:bg-bg-primary/95 border-t border-border backdrop-blur-lg pb-safe-bottom z-40 transition-colors duration-200">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const IconComponent = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full gap-0.5 transition-colors ${
                active
                  ? "text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <div className="relative">
                <IconComponent
                  size={26}
                  strokeWidth={active ? 2.5 : 2}
                  fill={active ? "currentColor" : "none"}
                />
                {item.href === "/chat" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[8px] h-2 bg-primary rounded-full" />
                )}
              </div>
              <span
                className={`text-[11px] tracking-tight ${
                  active ? "font-semibold" : "font-medium"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
