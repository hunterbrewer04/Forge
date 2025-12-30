'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import MobileLayout from '@/components/layout/MobileLayout'
import { Bell, User, ChevronLeft, ChevronRight, Filter, Clock, Zap, Lock, Plus } from '@/components/ui/icons'

type SessionFilter = 'all' | '1-on-1' | 'strength' | 'conditioning'
type TabType = 'upcoming' | 'history'

interface Session {
  id: string
  time: string
  period: 'AM' | 'PM'
  name: string
  duration: number
  spotsLeft: number | null
  coachName: string
  coachAvatar: string
  isPremium: boolean
  isFull: boolean
  type: SessionFilter
}

interface NextSession {
  name: string
  time: string
  coach: string
}

// Generate dates for the calendar strip
function generateDates(baseDate: Date): { day: string; date: number; fullDate: Date }[] {
  const dates = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(baseDate)
    date.setDate(baseDate.getDate() + i)
    dates.push({
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      date: date.getDate(),
      fullDate: date,
    })
  }
  return dates
}

export default function SchedulePage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<TabType>('upcoming')
  const [activeFilter, setActiveFilter] = useState<SessionFilter>('all')
  const [selectedDateIndex, setSelectedDateIndex] = useState(0)

  // Generate calendar dates starting from today
  const baseDate = useMemo(() => new Date(), [])
  const calendarDates = useMemo(() => generateDates(baseDate), [baseDate])
  const currentMonth = baseDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Mock data - replace with real data later
  const [nextSession] = useState<NextSession>({
    name: 'Heavy Lifting',
    time: 'Tomorrow, 06:00 AM',
    coach: 'Coach Mike',
  })

  const [sessions] = useState<Session[]>([
    {
      id: '1',
      time: '06:00',
      period: 'AM',
      name: 'Iron Circuit',
      duration: 60,
      spotsLeft: 5,
      coachName: 'Coach Mike',
      coachAvatar: '',
      isPremium: false,
      isFull: false,
      type: 'strength',
    },
    {
      id: '2',
      time: '07:30',
      period: 'AM',
      name: '1-on-1 Performance',
      duration: 45,
      spotsLeft: 1,
      coachName: 'Coach Sarah',
      coachAvatar: '',
      isPremium: true,
      isFull: false,
      type: '1-on-1',
    },
    {
      id: '3',
      time: '09:00',
      period: 'AM',
      name: 'Mobility & Flow',
      duration: 60,
      spotsLeft: null,
      coachName: 'Coach Dav',
      coachAvatar: '',
      isPremium: false,
      isFull: true,
      type: 'conditioning',
    },
    {
      id: '4',
      time: '05:30',
      period: 'PM',
      name: 'Evening Grind',
      duration: 90,
      spotsLeft: 8,
      coachName: 'Coach Alex',
      coachAvatar: '',
      isPremium: false,
      isFull: false,
      type: 'strength',
    },
  ])

  const filters: { key: SessionFilter; label: string }[] = [
    { key: 'all', label: 'All Sessions' },
    { key: '1-on-1', label: '1-on-1' },
    { key: 'strength', label: 'Strength' },
    { key: 'conditioning', label: 'Conditioning' },
  ]

  const filteredSessions = useMemo(() => {
    if (activeFilter === 'all') return sessions
    return sessions.filter((s) => s.type === activeFilter)
  }, [sessions, activeFilter])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <div className="text-stone-400">Loading...</div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  // Custom TopBar content for schedule page
  const topBarRightContent = (
    <div className="flex gap-2 items-center">
      <button className="relative p-2 text-gray-300 hover:text-primary transition-colors">
        <Bell size={24} strokeWidth={2} />
        <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"></span>
      </button>
      <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden border border-gray-600 flex items-center justify-center">
        <User size={16} strokeWidth={2} className="text-gray-400" />
      </div>
    </div>
  )

  return (
    <MobileLayout
      showBottomNav={true}
      showNotifications={false}
      topBarLeftContent={
        <h2 className="text-xl font-bold uppercase tracking-wide text-white">Session Booking</h2>
      }
      topBarRightContent={topBarRightContent}
    >
      {/* Navigation Tabs */}
      <div className="flex gap-6 text-sm font-semibold uppercase tracking-wider -mt-2">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'upcoming'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          History
        </button>
      </div>

      {/* Next Up Card */}
      <div className="bg-surface-dark rounded-lg p-4 shadow-md border-l-4 border-primary flex justify-between items-center">
        <div>
          <p className="text-xs font-bold text-primary uppercase mb-1">Next Up</p>
          <h3 className="text-lg font-bold leading-tight text-white">{nextSession.name}</h3>
          <p className="text-sm text-gray-400 mt-1">
            {nextSession.time} • {nextSession.coach}
          </p>
        </div>
        <button className="bg-[#3a2e27] text-xs font-bold px-3 py-2 rounded uppercase tracking-wide hover:bg-[#4a3b32] transition-colors text-white">
          Reschedule
        </button>
      </div>

      {/* Calendar Strip */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-white">{currentMonth}</h3>
          <div className="flex gap-2">
            <button className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <button className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar snap-x -mx-4 px-4">
          {calendarDates.map((dateItem, index) => (
            <button
              key={index}
              onClick={() => setSelectedDateIndex(index)}
              className={`flex-shrink-0 snap-start flex flex-col items-center justify-center w-14 h-20 rounded-lg transition-all ${
                selectedDateIndex === index
                  ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105'
                  : 'bg-surface-dark border border-gray-700 text-gray-400 hover:border-primary/50'
              }`}
            >
              <span className={`text-xs font-medium ${selectedDateIndex === index ? 'opacity-80' : ''}`}>
                {dateItem.day}
              </span>
              <span className={`text-xl font-bold ${selectedDateIndex !== index ? 'text-white' : ''}`}>
                {dateItem.date}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Session Type Filters */}
      <div className="overflow-x-auto no-scrollbar flex gap-3 -mx-4 px-4">
        {filters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => setActiveFilter(filter.key)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeFilter === filter.key
                ? 'bg-primary text-white shadow-md shadow-primary/20 font-bold'
                : 'bg-surface-dark border border-gray-700 text-gray-300'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Session List */}
      <div className="space-y-4 pb-6">
        {filteredSessions.map((session) => (
          <SessionCard key={session.id} session={session} />
        ))}
      </div>

      {/* Filter FAB */}
      <button className="fixed bottom-24 right-4 w-12 h-12 bg-primary text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform z-10 max-w-md">
        <Filter size={24} strokeWidth={2} />
      </button>
    </MobileLayout>
  )
}

function SessionCard({ session }: { session: Session }) {
  if (session.isPremium) {
    return (
      <div className="group relative bg-gradient-to-r from-surface-dark to-[#3a3a1a] rounded-xl p-4 shadow-sm border border-gold/30 hover:border-gold transition-all">
        <div className="absolute top-0 right-0 bg-gold text-black text-[10px] font-bold px-2 py-1 rounded-bl-lg rounded-tr-xl uppercase tracking-wider">
          Premium
        </div>
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-1 min-w-[3.5rem]">
            <span className="text-lg font-bold text-gold">{session.time}</span>
            <span className="text-xs text-gray-400 uppercase font-bold">{session.period}</span>
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-bold text-white leading-tight mb-1 group-hover:text-gold transition-colors">
              {session.name}
            </h4>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex items-center text-xs font-medium text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
                <Clock size={14} strokeWidth={2} className="mr-1" />
                {session.duration} min
              </span>
              {session.spotsLeft !== null && (
                <span className="text-xs font-medium text-gold">
                  {session.spotsLeft === 1 ? 'Only 1 slot' : `${session.spotsLeft} spots left`}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-600 overflow-hidden flex items-center justify-center">
                {session.coachAvatar ? (
                  <div
                    className="w-full h-full bg-cover bg-center"
                    style={{ backgroundImage: `url('${session.coachAvatar}')` }}
                  />
                ) : (
                  <User size={14} strokeWidth={2} className="text-gray-400" />
                )}
              </div>
              <span className="text-sm font-medium text-gray-300">{session.coachName}</span>
            </div>
          </div>
          <button className="self-center bg-gold text-black font-bold p-2 rounded-lg hover:bg-yellow-400 transition-colors shadow-lg shadow-gold/20">
            <Zap size={24} strokeWidth={2} />
          </button>
        </div>
      </div>
    )
  }

  if (session.isFull) {
    return (
      <div className="group relative bg-surface-dark rounded-xl p-4 shadow-sm border border-gray-800 opacity-70">
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-1 min-w-[3.5rem]">
            <span className="text-lg font-bold text-gray-500">{session.time}</span>
            <span className="text-xs text-gray-600 uppercase font-bold">{session.period}</span>
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-bold text-gray-400 leading-tight mb-1">{session.name}</h4>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex items-center text-xs font-medium text-gray-600 bg-gray-800/50 px-2 py-0.5 rounded">
                <Clock size={14} strokeWidth={2} className="mr-1" />
                {session.duration} min
              </span>
              <span className="text-xs font-medium text-red-500 uppercase">Full</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-600 overflow-hidden grayscale opacity-50 flex items-center justify-center">
                {session.coachAvatar ? (
                  <div
                    className="w-full h-full bg-cover bg-center"
                    style={{ backgroundImage: `url('${session.coachAvatar}')` }}
                  />
                ) : (
                  <User size={14} strokeWidth={2} className="text-gray-400" />
                )}
              </div>
              <span className="text-sm font-medium text-gray-500">{session.coachName}</span>
            </div>
          </div>
          <button className="self-center bg-transparent border border-gray-700 text-gray-600 font-bold p-2 rounded-lg cursor-not-allowed">
            <Lock size={24} strokeWidth={2} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="group relative bg-surface-dark rounded-xl p-4 shadow-sm border border-gray-800 hover:border-primary/50 transition-all">
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center gap-1 min-w-[3.5rem]">
          <span className="text-lg font-bold text-white">{session.time}</span>
          <span className="text-xs text-gray-400 uppercase font-bold">{session.period}</span>
        </div>
        <div className="flex-1">
          <h4 className="text-lg font-bold text-white leading-tight mb-1 group-hover:text-primary transition-colors">
            {session.name}
          </h4>
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center text-xs font-medium text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
              <Clock size={14} strokeWidth={2} className="mr-1" />
              {session.duration} min
            </span>
            {session.spotsLeft !== null && (
              <span className="text-xs font-medium text-primary">{session.spotsLeft} spots left</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-600 overflow-hidden flex items-center justify-center">
              {session.coachAvatar ? (
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: `url('${session.coachAvatar}')` }}
                />
              ) : (
                <User size={14} strokeWidth={2} className="text-gray-400" />
              )}
            </div>
            <span className="text-sm font-medium text-gray-300">{session.coachName}</span>
          </div>
        </div>
        <button className="self-center bg-white text-black font-bold p-2 rounded-lg hover:bg-primary hover:text-white transition-colors shadow-lg">
          <Plus size={24} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
