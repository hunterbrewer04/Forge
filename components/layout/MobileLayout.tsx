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
}: MobileLayoutProps) {
  return (
    <div className="fixed inset-0 flex flex-col bg-background-dark">
      <TopBar
        title={title}
        showBack={showBack}
        showNotifications={showNotifications}
        showMenu={showMenu}
        leftContent={topBarLeftContent}
        rightContent={topBarRightContent}
        notificationCount={notificationCount}
      />

      <main className="flex-1 overflow-y-auto overscroll-none w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="max-w-md lg:max-w-2xl xl:max-w-4xl mx-auto flex flex-col gap-6 px-4 sm:px-6 pt-6 pb-24 lg:pb-8">
          {children}
        </div>
      </main>

      {showBottomNav && (
        <div className="lg:hidden">
          <BottomNav />
        </div>
      )}
    </div>
  );
}
