export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { bookingRepo } from '@/lib/db/repo/bookings'

export async function GET(req: NextRequest) {
  const err = await requireAdmin(req)
  if (err) return err

  const bookings = await bookingRepo.findAll()
  return NextResponse.json({ bookings })
}
