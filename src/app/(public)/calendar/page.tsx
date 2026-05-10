'use client'

import dynamic from 'next/dynamic'

const AvailabilityCalendar = dynamic(() => import('@/components/AvailabilityCalendar'), {
  ssr: false,
})

export default function CalendarPage() {
  return (
    <main className="flex-1 p-6">
      <h1 className="text-2xl font-semibold tracking-tight mb-6 text-center">Reservar estancia</h1>
      <AvailabilityCalendar />
    </main>
  )
}
