// Extend Navigator interface for iOS standalone detection
// iOS Safari exposes `navigator.standalone` to detect if app is running in PWA mode
declare global {
  interface Navigator {
    // iOS-specific property to detect if the app is running in standalone mode
    readonly standalone?: boolean
  }
}

export {}
