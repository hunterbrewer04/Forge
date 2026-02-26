"use client";

import { ReactNode } from "react";
import GlassSidebar from "@/components/navigation/GlassSidebar";
import { motion } from 'framer-motion';
import BottomNav from "@/components/navigation/BottomNav";
import { Plus, MessageCircle } from "@/components/ui/icons";

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
    <div className="fixed inset-0 bg-bg-primary flex overflow-hidden transition-colors duration-200">
      {/* Desktop gradient mesh and floating orbs - lg only */}
      <div className="hidden lg:block">
        <div className="gradient-mesh" />
        <motion.div
          className="fixed top-[10%] left-[15%] w-[300px] h-[300px] rounded-full opacity-20 pointer-events-none z-0"
          style={{
            background: 'radial-gradient(circle, var(--facility-primary), transparent 70%)',
            filter: 'blur(60px)',
          }}
          animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
          transition={{ duration: 8, ease: 'easeInOut', repeat: Infinity }}
        />
        <motion.div
          className="fixed bottom-[10%] right-[15%] w-[250px] h-[250px] rounded-full opacity-15 pointer-events-none z-0"
          style={{
            background: 'radial-gradient(circle, var(--facility-primary), transparent 70%)',
            filter: 'blur(60px)',
          }}
          animate={{ y: [0, 15, 0], x: [0, -12, 0] }}
          transition={{ duration: 10, ease: 'easeInOut', repeat: Infinity }}
        />
      </div>

      {/* Sidebar - only visible on large screens */}
      <GlassSidebar onSignOut={onSignOut} />

      {/* Main Chat Area */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row min-h-0 lg:max-h-screen overflow-hidden">
        {/* Mobile Header - only on mobile, hidden when chat is open */}
        {!showActiveChat && <div className="lg:hidden flex-none">{mobileHeader}</div>}

        {/* Conversation List - always visible on desktop, hidden when chat open on mobile */}
        <div
          className={`
            ${showActiveChat ? "hidden" : "flex"}
            lg:flex flex-col min-h-0
            w-full lg:w-80 xl:w-96
            lg:border-r lg:border-border
            bg-bg-primary lg:glass-subtle
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
                <Plus size={20} className="text-white" />
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
            lg:flex flex-col flex-1 min-h-0
            lg:relative
            bg-bg-primary lg:glass-subtle lg:z-0
          `}
        >
          {activeChat || (
            <div className="hidden lg:flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="size-24 rounded-2xl bg-bg-secondary flex items-center justify-center mx-auto mb-4">
                  <MessageCircle size={48} className="text-text-muted" />
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

        {/* Bottom nav only shows on mobile, hidden when in active chat */}
        {!showActiveChat && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
            <BottomNav />
          </div>
        )}
      </div>
    </div>
  );
}
