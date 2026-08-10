/**
 * Desktop clients whose own traffic (voice/signaling, update checks, background
 * sync, ...) isn't fully covered by a domain/IP rule-set match on its own — matching
 * the client's executable name too catches whatever it dials directly, regardless of
 * destination. Keyed by the same `appKey` used on `ResourceOption`; only apps with a
 * well-known, stable executable name across platforms are listed here.
 */
export const COMPANION_APP_PROCESSES: Record<string, string[]> = {
  discord: ['Discord.exe', 'discord'],
  telegram: ['Telegram.exe', 'telegram-desktop'],
  whatsapp: ['WhatsApp.exe'],
  viber: ['Viber.exe', 'viber'],
  signal: ['Signal.exe', 'signal-desktop'],
  slack: ['slack.exe', 'slack'],
  spotify: ['Spotify.exe', 'spotify'],
  steam: ['steam.exe', 'steam'],
  zoom: ['Zoom.exe', 'zoom'],
}
