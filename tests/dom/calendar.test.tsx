import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import BookingCard from '@/components/BookingCard'
import type { Booking } from '@/types'

const mockBooking: Booking = {
  id: 'test-id-1',
  guest_name: 'Ana García',
  guest_email: 'ana@example.com',
  start_date: '2026-06-10',
  end_date: '2026-06-15',
  guests_count: 2,
  notes: 'Llego tarde',
  status: 'pending',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

describe('BookingCard', () => {
  it('renders booking status', () => {
    render(<BookingCard booking={mockBooking} />)
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
  })

  it('renders guest name', () => {
    render(<BookingCard booking={mockBooking} />)
    expect(screen.getByText('Ana García')).toBeInTheDocument()
  })

  it('renders confirmed status', () => {
    render(<BookingCard booking={{ ...mockBooking, status: 'confirmed' }} />)
    expect(screen.getByText('Confirmada')).toBeInTheDocument()
  })

  it('renders cancelled status', () => {
    render(<BookingCard booking={{ ...mockBooking, status: 'cancelled' }} />)
    expect(screen.getByText('Cancelada')).toBeInTheDocument()
  })

  it('renders date range', () => {
    render(<BookingCard booking={mockBooking} />)
    expect(screen.getByText(/2026-06-10/)).toBeInTheDocument()
    expect(screen.getByText(/2026-06-15/)).toBeInTheDocument()
  })
})
