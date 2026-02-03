"use client";

import { useRouter } from "next/navigation";
import MaterialIcon from "@/components/ui/MaterialIcon";

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
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/home');
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-bg-primary/95 dark:bg-bg-primary/95 backdrop-blur-md border-b border-border pt-safe-top transition-colors duration-200">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={handleBack}
              className="flex items-center justify-center size-10 min-w-[44px] min-h-[44px] rounded-full text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary active:scale-95"
              aria-label="Go back"
            >
              <MaterialIcon name="arrow_back" size={24} />
            </button>
          )}
          {leftContent}
          {title && !leftContent && (
            <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-1">
          {rightContent}
          {showNotifications && !rightContent && (
            <button
              className="flex items-center justify-center size-10 min-w-[44px] min-h-[44px] rounded-full text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary active:scale-95 relative"
              aria-label="Notifications"
            >
              <MaterialIcon name="notifications" size={24} />
              {notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-primary ring-2 ring-bg-primary" />
              )}
            </button>
          )}
          {showMenu && (
            <button
              className="flex items-center justify-center size-10 min-w-[44px] min-h-[44px] rounded-full text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary active:scale-95"
              aria-label="Menu"
            >
              <MaterialIcon name="more_vert" size={24} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
