"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, Menu } from "@/components/ui/icons";

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

  // Safe back navigation - check if there's history to go back to
  const handleBack = () => {
    // Check if we have history to go back to
    // window.history.length > 1 means there's at least one entry to go back to
    // Also check if the referrer is from our own domain (not external navigation)
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      // No history - navigate to home as fallback
      router.push('/home');
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-background-dark/95 backdrop-blur-md border-b border-steel/20 pt-safe-top">
      <div className="flex items-center justify-between px-5 py-4">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={handleBack}
              className="flex items-center justify-center size-11 min-w-[44px] min-h-[44px] rounded-full bg-stone-800 text-stone-300 transition-colors hover:bg-primary/20 hover:text-primary active:scale-95"
              aria-label="Go back"
            >
              <ArrowLeft size={24} strokeWidth={2} />
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
              className="flex items-center justify-center size-11 min-w-[44px] min-h-[44px] rounded-full bg-stone-800 text-stone-300 transition-colors hover:bg-primary/20 hover:text-primary active:scale-95 relative"
              aria-label="Notifications"
            >
              <Bell size={24} strokeWidth={2} />
              {notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-primary ring-2 ring-background-dark" />
              )}
            </button>
          )}
          {showMenu && (
            <button
              className="flex items-center justify-center size-11 min-w-[44px] min-h-[44px] rounded-full bg-stone-800 text-stone-300 transition-colors hover:bg-primary/20 hover:text-primary active:scale-95"
              aria-label="Menu"
            >
              <Menu size={24} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
