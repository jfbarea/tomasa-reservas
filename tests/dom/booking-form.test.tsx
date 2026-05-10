import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import BookingForm from '@/components/BookingForm'

global.fetch = vi.fn()

describe('BookingForm', () => {
  it('shows validation errors for empty form submission', async () => {
    render(<BookingForm />)
    const button = screen.getByRole('button', { name: /solicitar/i })
    await act(async () => {
      fireEvent.click(button)
    })
    expect(screen.getByText(/nombre/i)).toBeTruthy()
  })

  it('shows success message after successful submit', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ booking: { id: '1', status: 'pending' }, token: 'tok' }),
    } as Response)

    render(
      <BookingForm
        selectedRange={{
          from: new Date('2026-06-10'),
          to: new Date('2026-06-15'),
        }}
      />,
    )

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/Tu nombre completo/i), {
        target: { value: 'Ana García' },
      })
      fireEvent.change(screen.getByPlaceholderText(/tu@email.com/i), {
        target: { value: 'ana@example.com' },
      })
      fireEvent.click(screen.getByRole('button', { name: /solicitar/i }))
    })

    await waitFor(() => {
      expect(screen.getByText(/enviada correctamente/i)).toBeTruthy()
    })
  })

  it('shows server error on failure', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'overlap' }),
    } as Response)

    render(
      <BookingForm
        selectedRange={{
          from: new Date('2026-06-10'),
          to: new Date('2026-06-15'),
        }}
      />,
    )

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/Tu nombre completo/i), {
        target: { value: 'Ana García' },
      })
      fireEvent.change(screen.getByPlaceholderText(/tu@email.com/i), {
        target: { value: 'ana@example.com' },
      })
      fireEvent.click(screen.getByRole('button', { name: /solicitar/i }))
    })

    await waitFor(() => {
      expect(screen.getByText(/overlap/i)).toBeTruthy()
    })
  })
})
