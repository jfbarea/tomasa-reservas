import type { NotifyPort } from '@/lib/ports/notify'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export const realNotify: NotifyPort = {
  async sendTelegram(message) {
    const token = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID
    if (!token || !chatId) return
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    })
  },

  async sendEmail({ to, subject, html }) {
    const from = process.env.RESEND_FROM ?? 'tomasa@franbarea.dev'
    await resend.emails.send({ from, to, subject, html })
  },
}
