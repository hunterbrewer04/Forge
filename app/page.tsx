import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold mb-4 text-gray-900">Gym Trainer Messaging App</h1>
        <p className="text-xl mb-8 text-gray-700">
          Connect seamlessly with your trainer and clients. Share progress, schedule sessions, and stay motivated with real-time messaging.
        </p>

        <div className="flex gap-4 justify-center mt-8">
          <Link
            href="/login"
            className="px-8 py-4 text-lg font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors shadow-lg hover:shadow-xl"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="px-8 py-4 text-lg font-semibold text-blue-600 bg-white border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors shadow-lg hover:shadow-xl"
          >
            Sign Up
          </Link>
        </div>

        <div className="mt-12 text-sm text-gray-600">
          <p>Connect with your trainer and track your fitness journey</p>
        </div>
      </div>
    </main>
  )
}
