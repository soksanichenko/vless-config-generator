import type { TranslationKey } from '../i18n/translations'

/** Which sing-box release line the generated `dns.rules` syntax targets. `stable` uses
 * the classic single-step address-filter pattern (rule_set/ip_cidr matched directly
 * against the query response, since sing-box 1.8–1.9). `alpha` uses the two-step
 * `evaluate`/`match_response` rules, which need sing-box 1.14.0 — not yet released
 * as stable. Only affects the `ua`/`ru` region DNS profiles; `default` has no
 * geoip-based DNS rules to begin with. */
export type SingboxTarget = 'stable' | 'alpha'

export const DEFAULT_SINGBOX_TARGET: SingboxTarget = 'stable'

export const SINGBOX_TARGET_OPTIONS: { value: SingboxTarget; labelKey: TranslationKey }[] = [
  { value: 'stable', labelKey: 'singboxTarget.optionStable' },
  { value: 'alpha', labelKey: 'singboxTarget.optionAlpha' },
]
