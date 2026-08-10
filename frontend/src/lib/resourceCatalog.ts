import { COMPANION_APP_PROCESSES } from './companionApps'

export type ResourceSource = 'sagernet' | 'vernette'

/** One pickable entry in the Basic-mode routing-rules search — a single remote
 * rule_set the user can add with one click. */
export interface ResourceOption {
  id: string
  label: string
  source: ResourceSource
  kind: 'geosite' | 'geoip'
  tag: string
  url: string
  /** Set when this resource is a known desktop client — used to also bundle a
   * process_name condition for that client's executable into the same rule. */
  appKey?: string
}

function sagernetOption(category: string): ResourceOption {
  return {
    id: `sagernet:${category}`,
    label: category,
    source: 'sagernet',
    kind: 'geosite',
    tag: `geosite-${category}`,
    url: `https://raw.githubusercontent.com/SagerNet/sing-geosite/rule-set/geosite-${category}.srs`,
    appKey: COMPANION_APP_PROCESSES[category] ? category : undefined,
  }
}

/**
 * vernette/rulesets (https://github.com/vernette/rulesets) has no machine-readable
 * category index the way SagerNet's tree API does — it's a small hand-curated set of
 * services, some split into "-domains" (pure domain match) vs "-full"/"-voice-chats"
 * variants that also carry IP/CIDR data (e.g. voice server ranges) SagerNet's plain
 * geosite categories don't cover at all. Snapshot of the repo's srs/ directory and
 * README as of 2026-08 — extend by hand if the repo adds more.
 */
interface VernetteFile {
  file: string
  label: string
  /** Whether this file's rule_set can contain ip_cidr entries alongside/instead of
   * domains, meaning sing-box needs the destination resolved first to match it. */
  hasIpData: boolean
  appKey?: string
}

const VERNETTE_FILES: VernetteFile[] = [
  { file: 'claude', label: 'Claude', hasIpData: false },
  { file: 'copilot', label: 'GitHub Copilot', hasIpData: false },
  { file: 'discord-domains', label: 'Discord — domains', hasIpData: false, appKey: 'discord' },
  { file: 'discord-full', label: 'Discord — full (domains + voice IP ranges)', hasIpData: true, appKey: 'discord' },
  { file: 'discord-voice-chats', label: 'Discord — voice chat IP ranges', hasIpData: true, appKey: 'discord' },
  {
    file: 'discord-voice-chats-no-cidr',
    label: 'Discord — voice chat IPs (no CIDR)',
    hasIpData: true,
    appKey: 'discord',
  },
  { file: 'gemini', label: 'Gemini', hasIpData: false },
  { file: 'grok', label: 'Grok', hasIpData: false },
  { file: 'instagram', label: 'Instagram', hasIpData: false },
  { file: 'linkedin', label: 'LinkedIn', hasIpData: false },
  { file: 'netflix', label: 'Netflix', hasIpData: false },
  { file: 'nintendo', label: 'Nintendo', hasIpData: false },
  { file: 'openai', label: 'OpenAI', hasIpData: false },
  { file: 'rkn', label: 'RKN blocklist', hasIpData: false },
  { file: 'roblox', label: 'Roblox', hasIpData: false },
  { file: 'spotify', label: 'Spotify', hasIpData: false, appKey: 'spotify' },
  { file: 'telegram', label: 'Telegram', hasIpData: false, appKey: 'telegram' },
  { file: 'telegram-voice-chats', label: 'Telegram — voice chat IP ranges', hasIpData: true, appKey: 'telegram' },
  { file: 'tiktok', label: 'TikTok', hasIpData: false },
  { file: 'unavailable-in-russia', label: 'Unavailable in Russia', hasIpData: false },
  { file: 'whatsapp', label: 'WhatsApp', hasIpData: false, appKey: 'whatsapp' },
  { file: 'x', label: 'X (Twitter)', hasIpData: false },
  { file: 'youtube', label: 'YouTube', hasIpData: false },
]

function vernetteOption(entry: VernetteFile): ResourceOption {
  return {
    id: `vernette:${entry.file}`,
    label: entry.label,
    source: 'vernette',
    kind: entry.hasIpData ? 'geoip' : 'geosite',
    tag: `vernette-${entry.file}`,
    url: `https://github.com/vernette/rulesets/raw/master/srs/${entry.file}.srs`,
    appKey: entry.appKey,
  }
}

/** Curated shortcuts shown before the user types anything into the search box —
 * kept from this feature's original 5-preset Basic mode list. */
export const FEATURED_RESOURCE_IDS = [
  'sagernet:rutracker',
  'sagernet:discord',
  'sagernet:google',
  'sagernet:tiktok',
  'sagernet:youtube',
]

/** Combines the (possibly still-loading, backend-cached) SagerNet geosite category
 * list with the static vernette/rulesets catalog above into one flat, searchable set. */
export function buildResourceCatalog(geositeCategories: string[]): ResourceOption[] {
  return [...geositeCategories.map(sagernetOption), ...VERNETTE_FILES.map(vernetteOption)]
}
