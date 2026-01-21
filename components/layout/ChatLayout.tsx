"use client";

import { ReactNode, useState } from "react";
import Sidebar from "@/components/navigation/Sidebar";
import BottomNav from "@/components/navigation/BottomNav";
import { Search, Plus } from "@/components/ui/icons";

interface ChatLayoutProps {
  /** The conversation list component */
  conversationList: ReactNode;
  /** The active chat/thread component */
  activeChat?: ReactNode;
  /** Header content for mobile view */
  mobileHeader: ReactNode;
  /** Whether to show the active chat (on mobile, this controls slide-over) */
  showActiveChat: boolean;
  /** Callback to close active chat on mobile */
  onCloseActiveChat?: () => void;
  /** Sign out handler */
  onSignOut?: () => void;
}

export default function ChatLayout({
  conversationList,
  activeChat,
  mobileHeader,
  showActiveChat,
  onSignOut,
}: ChatLayoutProps) {
  const [desktopSearch, setDesktopSearch] = useState("");

  return (
    <div className="min-h-screen h-screen bg-background-dark flex overflow-hidden">
      {/* Sidebar - only visible on large screens */}
      <Sidebar onSignOut={onSignOut} />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-screen lg:max-h-screen overflow-hidden">
        {/* Mobile Header - only on mobile, hidden when chat is open */}
        {!showActiveChat && <div className="lg:hidden flex-none">{mobileHeader}</div>}

        {/* Conversation List - always visible on desktop, hidden when chat open on mobile */}
        <div
          className={`
            ${showActiveChat ? "hidden" : "flex"}
            lg:flex flex-col
            w-full lg:w-80 xl:w-96
            lg:border-r lg:border-steel/20
            bg-background-dark
            overflow-hidden
          `}
        >
          {/* Desktop List Header */}
          <div className="hidden lg:block px-4 py-4 border-b border-steel/20 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Messages</h2>
              <button
                className="flex items-center justify-center size-10 bg-primary hover:bg-orange-600 transition-colors rounded-full shadow-lg shadow-primary/20 active:scale-95"
                aria-label="New conversation"
              >
                <Plus size={20} strokeWidth={2} className="text-white" />
              </button>
            </div>
            {/* Desktop Search */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} strokeWidth={2} className="text-stone-500 group-focus-within:text-primary transition-colors" />
              </div>
              <input
                type="text"
                value={desktopSearch}
                onChange={(e) => setDesktopSearch(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border-none rounded-lg leading-5 bg-[#2C2C2C] text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-[#333] transition-all text-sm"
                placeholder="Search..."
              />
            </div>
          </div>
          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">{conversationList}</div>
        </div>

        {/* Active Chat Area */}
        <div
          className={`
            ${showActiveChat ? "flex" : "hidden"}
            lg:flex flex-col flex-1
            absolute inset-0 lg:relative
            bg-background-dark z-20 lg:z-0
          `}
        >
          {activeChat || (
            <div className="hidden lg:flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="size-24 rounded-full bg-stone-800 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="size-12 text-stone-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Select a Conversation
                </h3>
                <p className="text-stone-500 text-sm max-w-xs">
                  Choose a conversation from the list to start messaging
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom nav only shows on mobile */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
