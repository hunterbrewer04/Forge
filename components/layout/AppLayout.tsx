"use client";

import TopBar from "@/components/navigation/TopBar";
import BottomNav from "@/components/navigation/BottomNav";
import Sidebar from "@/components/navigation/Sidebar";

interface AppLayoutProps {
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
  onSignOut?: () => void;
}

export default function AppLayout({
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
  onSignOut,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background-dark flex">
      {/* Sidebar - only visible on large screens */}
      <Sidebar onSignOut={onSignOut} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen lg:max-h-screen lg:overflow-hidden">
        {/* TopBar - shows on mobile, simplified on desktop */}
        <div className="lg:hidden">
          <TopBar
            title={title}
            showBack={showBack}
            showNotifications={showNotifications}
            showMenu={showMenu}
            leftContent={topBarLeftContent}
            rightContent={topBarRightContent}
            notificationCount={notificationCount}
          />
        </div>

        {/* Desktop Header - simplified */}
        <header className="hidden lg:flex items-center justify-between px-8 py-4 border-b border-steel/20 bg-background-dark">
          <div className="flex items-center gap-4">
            {topBarLeftContent || (
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {title}
              </h1>
            )}
          </div>
          <div className="flex items-center gap-4">
            {topBarRightContent}
          </div>
        </header>

        {/* Main content area - responsive max-width */}
        <main className="flex-1 w-full max-w-md lg:max-w-none mx-auto lg:mx-0 flex flex-col gap-6 px-4 sm:px-6 lg:px-8 pt-6 pb-24 lg:pb-8 lg:overflow-y-auto">
          {children}
        </main>

        {/* Bottom nav only shows on mobile/tablet, hidden on large screens */}
        {showBottomNav && (
          <div className="lg:hidden">
            <BottomNav onFabClick={onFabClick} />
          </div>
        )}
      </div>
    </div>
  );
}
