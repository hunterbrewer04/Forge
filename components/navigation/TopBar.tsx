"use client";

import { useRouter } from "next/navigation";

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  showNotifications?: boolean;
  showMenu?: boolean;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  notificationCount?: number;
}

export default function TopBar({
  title,
  showBack = false,
  showNotifications = true,
  showMenu = false,
  leftContent,
  rightContent,
  notificationCount = 0,
}: TopBarProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 w-full bg-background-dark/95 backdrop-blur-md border-b border-steel/20 pt-safe-top">
      <div className="flex items-center justify-between px-5 py-4">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center size-10 rounded-full bg-stone-800 text-stone-300 transition-colors hover:bg-primary/20 hover:text-primary"
              aria-label="Go back"
            >
              <span className="material-symbols-outlined text-[24px]">
                arrow_back
              </span>
            </button>
          )}
          {leftContent}
          {title && !leftContent && (
            <h1 className="text-lg font-bold tracking-tight">{title}</h1>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {rightContent}
          {showNotifications && !rightContent && (
            <button
              className="flex items-center justify-center size-10 rounded-full bg-stone-800 text-stone-300 transition-colors hover:bg-primary/20 hover:text-primary relative"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined text-[24px]">
                notifications
              </span>
              {notificationCount > 0 && (
                <span className="absolute top-2 right-2 size-2 rounded-full bg-primary" />
              )}
            </button>
          )}
          {showMenu && (
            <button
              className="flex items-center justify-center size-10 rounded-full bg-stone-800 text-stone-300 transition-colors hover:bg-primary/20 hover:text-primary"
              aria-label="Menu"
            >
              <span className="material-symbols-outlined text-[24px]">
                menu
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
