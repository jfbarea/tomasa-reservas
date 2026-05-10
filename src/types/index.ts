export type BookingStatus = 'pending' | 'confirmed' | 'cancelled'
export type GoogleAccount = 'fran' | 'elisa'

export interface Booking {
  id: string
  guest_name: string
  guest_email: string
  start_date: string
  end_date: string
  guests_count: number
  notes?: string | null
  status: BookingStatus
  google_event_id_fran?: string | null
  google_event_id_elisa?: string | null
  cancel_token?: string | null
  created_at: string
  updated_at: string
}

export interface BlockedPeriod {
  id: string
  start_date: string
  end_date: string
  reason?: string | null
  created_at: string
}

export interface OAuthToken {
  account: GoogleAccount
  access_token: string
  refresh_token: string
  expires_at: string
  scopes: string[]
}

export interface Settings {
  access_code_hash?: string
  admin_password_hash?: string
  auto_confirm?: boolean
  min_notice_days?: number
  max_stay_days?: number
  max_guests?: number
}

export interface BookingEvent {
  id: string
  booking_id: string
  from_status: BookingStatus | null
  to_status: BookingStatus
  actor: string
  at: string
}

export interface AvailabilityDay {
  date: string
  status: 'available' | 'booked' | 'blocked'
}
