import type { NotifyPort } from '@/lib/ports/notify'

const messages: string[] = []
const emails: Array<{ to: string; subject: string; html: string }> = []

export const __inbox = {
  lastTelegram(): string | undefined {
    return messages[messages.length - 1]
  },
  lastEmail() {
    return emails[emails.length - 1]
  },
  allTelegrams(): string[] {
    return [...messages]
  },
  allEmails() {
    return [...emails]
  },
  clear() {
    messages.length = 0
    emails.length = 0
  },
}

export const inMemoryNotify: NotifyPort = {
  async sendTelegram(message) {
    messages.push(message)
  },

  async sendEmail(opts) {
    emails.push(opts)
  },
}
