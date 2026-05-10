import { z } from 'zod'

export const CreateBookingSchema = z.object({
  guest_name: z.string().min(2, 'Nombre demasiado corto').max(80, 'Nombre demasiado largo'),
  guest_email: z.string().email('Email no válido'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido'),
  guests_count: z.number().int().min(1, 'Mínimo 1 huésped'),
  notes: z.string().max(1000, 'Notas demasiado largas').optional(),
})

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>

export const BlockSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(500).optional(),
})

export type BlockInput = z.infer<typeof BlockSchema>
