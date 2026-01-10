"use client";

import type { LucideIcon, LucideProps } from "lucide-react";
import {
  // Navigation
  Home,
  Calendar,
  BarChart2,
  User,
  Users,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  // Actions
  Plus,
  Pencil,
  Trash2,
  Send,
  Search,
  Filter,
  Settings,
  Settings2,
  LogOut,
  // Communication
  MessageCircle,
  MessageSquare,
  Bell,
  Mail,
  Phone,
  Smile,
  CheckCheck,
  // Status & Indicators
  BadgeCheck,
  Check,
  CheckCircle,
  AlertCircle,
  Info,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Pin,
  // Gamification & Fitness
  Flame,
  Award,
  Trophy,
  Dumbbell,
  TrendingUp,
  Target,
  Zap,
  Star,
  Heart,
  // Utility
  Clock,
  Timer,
  CreditCard,
  HelpCircle,
  MoreVertical,
  MoreHorizontal,
  Loader2,
  RefreshCw,
  Upload,
  Download,
  Image,
  Video,
  Camera,
  MapPin,
  AlertTriangle,
  Copy,
  CheckSquare,
} from "lucide-react";

// Re-export LucideIcon type for external use
export type { LucideIcon };

// Size variants following the app's design system
const sizes = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 26,
  "2xl": 32,
  "3xl": 48,
} as const;

// Stroke width variants
const strokeWidths = {
  thin: 1.5,
  normal: 2,
  bold: 2.5,
} as const;

// Color variants matching Forge brand
const variants = {
  default: "text-current",
  primary: "text-primary",
  muted: "text-stone-500",
  white: "text-white",
  gold: "text-gold",
  success: "text-green-500",
  error: "text-red-500",
} as const;

export type IconSize = keyof typeof sizes;
export type IconVariant = keyof typeof variants;
export type IconStroke = keyof typeof strokeWidths;

export interface IconProps extends Omit<LucideProps, "size" | "strokeWidth"> {
  icon: LucideIcon;
  size?: IconSize;
  variant?: IconVariant;
  stroke?: IconStroke;
  className?: string;
}

/**
 * Icon component wrapper for consistent styling across the app
 * Uses Lucide React icons with standardized sizes and colors
 */
export function Icon({
  icon: IconComponent,
  size = "md",
  variant = "default",
  stroke = "normal",
  className = "",
  ...props
}: IconProps) {
  return (
    <IconComponent
      size={sizes[size]}
      strokeWidth={strokeWidths[stroke]}
      className={`${variants[variant]} ${className}`}
      {...props}
    />
  );
}

// Re-export commonly used icons for convenience
export {
  // Navigation
  Home,
  Calendar,
  BarChart2,
  User,
  Users,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  // Actions
  Plus,
  Pencil,
  Trash2,
  Send,
  Search,
  Filter,
  Settings,
  Settings2,
  LogOut,
  // Communication
  MessageCircle,
  MessageSquare,
  Bell,
  Mail,
  Phone,
  Smile,
  CheckCheck,
  // Status & Indicators
  BadgeCheck,
  Check,
  CheckCircle,
  AlertCircle,
  Info,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Pin,
  // Gamification & Fitness
  Flame,
  Award,
  Trophy,
  Dumbbell,
  TrendingUp,
  Target,
  Zap,
  Star,
  Heart,
  // Utility
  Clock,
  Timer,
  CreditCard,
  HelpCircle,
  MoreVertical,
  MoreHorizontal,
  Loader2,
  RefreshCw,
  Upload,
  Download,
  Image,
  Video,
  Camera,
  MapPin,
  AlertTriangle,
  Copy,
  CheckSquare,
};
