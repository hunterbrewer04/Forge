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

      <main className="w-full max-w-md mx-auto flex flex-col gap-6 px-4 pt-6 pb-24">
        {children}
      </main>

      {showBottomNav && <BottomNav onFabClick={onFabClick} />}
    </div>
  );
}
