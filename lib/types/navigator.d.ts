// Extend Navigator for iOS standalone detection
// iOS Safari exposes `navigator.standalone` to detect if app is running in PWA mode
interface NavigatorStandalone extends Navigator {
  standalone?: boolean
}

declare global {
  interface Window {
    navigator: NavigatorStandalone
  }
}

export {}
