import type { TranslationKey } from '../i18n/translations'
import type { Lang } from '../i18n/translations'

export type Region = 'default' | 'ua' | 'ru'

export const REGION_OPTIONS: { value: Region; labelKey: TranslationKey }[] = [
  { value: 'default', labelKey: 'region.optionDefault' },
  { value: 'ua', labelKey: 'region.optionUa' },
  { value: 'ru', labelKey: 'region.optionRu' },
]

/** Basic mode's region: the UI language doubles as the region pick (no
 * separate control shown), since the app only has profiles for exactly the
 * languages it's localized into. Any language without a matching region
 * (only 'en' today) falls back to the plain-Cloudflare default. */
export function regionForLang(lang: Lang): Region {
  return lang === 'ua' || lang === 'ru' ? lang : 'default'
}
