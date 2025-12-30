"use client";

import TopBar from "@/components/navigation/TopBar";
import BottomNav from "@/components/navigation/BottomNav";

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  showNotifications?: boolean;
  showMenu?: boolean;
  showBottomNav?: boolean;
  topBarLeftContent?: React.ReactNode;
  topBarRightContent?: React.ReactNode;
  notificationCount?: number;
  onFabClick?: () => void;
}

export default function MobileLayout({
  children,
  title,
  showBack = false,
  showNotifications = true,
  showMenu = false,
  showBottomNav = true,
  topBarLeftContent,
  topBarRightContent,
  notificationCount = 0,
  onFabClick,
}: MobileLayoutProps) {
  return (
    <div className="min-h-screen bg-background-dark">
      <TopBar
        title={title}
        showBack={showBack}
        showNotifications={showNotifications}
        showMenu={showMenu}
        leftContent={topBarLeftContent}
        rightContent={topBarRightContent}
        notificationCount={notificationCount}
      />

      {/* Main content area - centered with max-width on mobile, wider on tablet/desktop */}
      <main className="w-full max-w-md lg:max-w-2xl xl:max-w-4xl mx-auto flex flex-col gap-6 px-4 sm:px-6 pt-6 pb-24 lg:pb-8">
        {children}
      </main>

      {/* Bottom nav only shows on mobile/tablet, hidden on large screens */}
      {showBottomNav && (
        <div className="lg:hidden">
          <BottomNav onFabClick={onFabClick} />
        </div>
      )}
    </div>
  );
}
