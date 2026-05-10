export interface NotifyPort {
  sendTelegram(message: string): Promise<void>
  sendEmail(opts: { to: string; subject: string; html: string }): Promise<void>
}
