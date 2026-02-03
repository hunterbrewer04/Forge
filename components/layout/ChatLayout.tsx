"use client";

import { ReactNode } from "react";
import Sidebar from "@/components/navigation/Sidebar";
import BottomNav from "@/components/navigation/BottomNav";
import MaterialIcon from "@/components/ui/MaterialIcon";

interface ChatLayoutProps {
  conversationList: ReactNode;
  activeChat?: ReactNode;
  mobileHeader: ReactNode;
  showActiveChat: boolean;
  onSignOut?: () => void;
}

export default function ChatLayout({
  conversationList,
  activeChat,
  mobileHeader,
  showActiveChat,
  onSignOut,
}: ChatLayoutProps) {
  return (
    <div className="min-h-screen h-screen bg-bg-primary flex overflow-hidden transition-colors duration-200">
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
            lg:border-r lg:border-border
            bg-bg-primary
            overflow-hidden
          `}
        >
          {/* Desktop List Header */}
          <div className="hidden lg:block px-4 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-text-primary">Messages</h2>
              <button
                className="flex items-center justify-center size-10 bg-primary hover:bg-primary/90 transition-colors rounded-full shadow-lg shadow-primary/20 active:scale-95"
                aria-label="New conversation"
              >
                <MaterialIcon name="add" size={20} className="text-white" />
              </button>
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
            bg-bg-primary z-20 lg:z-0
          `}
        >
          {activeChat || (
            <div className="hidden lg:flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="size-24 rounded-2xl bg-bg-secondary flex items-center justify-center mx-auto mb-4">
                  <MaterialIcon name="chat_bubble_outline" size={48} className="text-text-muted" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  Select a Conversation
                </h3>
                <p className="text-text-secondary text-sm max-w-xs">
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
