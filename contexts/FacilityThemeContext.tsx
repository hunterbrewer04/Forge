'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { DEFAULT_BRAND_COLOR } from '@/lib/constants/branding'

export interface FacilityTheme {
  name: string
  tagline: string
  logoUrl: string
  primaryColor: string
  fontFamily: string
}

interface ThemeContextValue {
  theme: FacilityTheme
  isDark: boolean
  toggleTheme: () => void
  setTheme: (mode: 'light' | 'dark' | 'system') => void
}

const defaultTheme: FacilityTheme = {
  name: process.env.NEXT_PUBLIC_FACILITY_NAME || 'Forge Sports Performance',
  tagline: process.env.NEXT_PUBLIC_FACILITY_TAGLINE || 'Sports Performance',
  logoUrl: process.env.NEXT_PUBLIC_FACILITY_LOGO || '/logo.png',
  primaryColor: process.env.NEXT_PUBLIC_FACILITY_PRIMARY || DEFAULT_BRAND_COLOR,
  fontFamily: 'Lexend, Manrope, sans-serif',
}

const FacilityThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function getInitialTheme(): 'light' | 'dark' | 'system' {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem('theme-mode')
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }
  return 'light'
}

function getSystemPreference(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function FacilityThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('light')
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Initialize theme on mount
  useEffect(() => {
    const initialMode = getInitialTheme()
    // SSR-safe: localStorage/system-theme reads must happen after mount to avoid client/server mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeMode(initialMode)
    setMounted(true)
  }, [])

  // Update isDark based on themeMode and system preference
  useEffect(() => {
    if (!mounted) return

    const updateDarkMode = () => {
      if (themeMode === 'system') {
        setIsDark(getSystemPreference())
      } else {
        setIsDark(themeMode === 'dark')
      }
    }

    updateDarkMode()

    // Listen for system preference changes
    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    }
  }, [themeMode, mounted])

  // Apply dark class to document
  useEffect(() => {
    if (!mounted) return

    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark, mounted])

  // Apply primary color CSS variable (only if different from CSS default)
  useEffect(() => {
    if (!mounted) return
    if (defaultTheme.primaryColor !== DEFAULT_BRAND_COLOR) {
      document.documentElement.style.setProperty('--facility-primary', defaultTheme.primaryColor)
    }
  }, [mounted])

  const toggleTheme = () => {
    const newMode = isDark ? 'light' : 'dark'
    setThemeMode(newMode)
    localStorage.setItem('theme-mode', newMode)
  }

  const setTheme = (mode: 'light' | 'dark' | 'system') => {
    setThemeMode(mode)
    localStorage.setItem('theme-mode', mode)
  }

  return (
    <FacilityThemeContext.Provider
      value={{
        theme: defaultTheme,
        isDark,
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </FacilityThemeContext.Provider>
  )
}

export function useFacilityTheme() {
  const context = useContext(FacilityThemeContext)
  if (context === undefined) {
    throw new Error('useFacilityTheme must be used within a FacilityThemeProvider')
  }
  return context
}
