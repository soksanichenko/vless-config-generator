import type { TranslationKey } from '../i18n/translations'

export type Region = 'default' | 'ua' | 'ru'

export const REGION_OPTIONS: { value: Region; labelKey: TranslationKey }[] = [
  { value: 'default', labelKey: 'region.optionDefault' },
  { value: 'ua', labelKey: 'region.optionUa' },
  { value: 'ru', labelKey: 'region.optionRu' },
]
