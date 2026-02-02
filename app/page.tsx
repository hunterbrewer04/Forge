import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-[#1C1C1C]">
      <div className="text-center max-w-2xl">
        {/* Logo Placeholder */}
        <div className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-[#ff6714] rounded-lg">
          <span className="text-4xl font-bold text-white">F</span>
        </div>

        {/* Brand Name */}
        <h1 className="text-5xl font-bold mb-3 text-white">
          Forge Sports Performance
        </h1>

        {/* Tagline */}
        <p className="text-2xl mb-8 text-[#ff6714] font-semibold">
          Train. Track. Transform.
        </p>

        {/* Description */}
        <p className="text-lg mb-10 text-stone-400 leading-relaxed">
          Connect seamlessly with your trainer and clients. Share progress, schedule sessions, and stay motivated with real-time messaging.
        </p>

        {/* Feature Pills */}
        <div className="flex flex-wrap gap-3 justify-center mb-10">
          <span className="px-4 py-2 text-sm font-medium text-white bg-white/10 rounded-full border border-white/20">
            Scheduling
          </span>
          <span className="px-4 py-2 text-sm font-medium text-white bg-white/10 rounded-full border border-white/20">
            Messaging
          </span>
          <span className="px-4 py-2 text-sm font-medium text-white bg-white/10 rounded-full border border-white/20">
            Progress Tracking
          </span>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="px-8 py-4 text-lg font-semibold text-white bg-[#ff6714] rounded-lg hover:bg-orange-600 transition-colors shadow-lg hover:shadow-xl"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="px-8 py-4 text-lg font-semibold text-[#ff6714] bg-transparent border border-[#ff6714] rounded-lg hover:bg-[#ff6714]/10 transition-colors shadow-lg hover:shadow-xl"
          >
            Sign Up
          </Link>
        </div>

        {/* Footer Text */}
        <div className="mt-12 text-sm text-stone-400">
          <p>Connect with your trainer and track your fitness journey</p>
        </div>
      </div>
    </main>
  )
}
