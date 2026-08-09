/**
 * Curated "popular resource" presets for Simple mode — each one is a single
 * SagerNet/sing-geosite category, added as a rule_set + a `-> proxy` rule with
 * one click instead of the two manual steps Advanced mode requires (quick-add
 * the rule set, then build a rule referencing it). Currently focused on
 * commonly-blocked-in-Russia services, matching this feature's original ask;
 * extend this list for other regions/audiences as needed.
 */
export interface ResourcePreset {
  id: string
  label: string
  geositeCategory: string
}

export const RESOURCE_PRESETS: ResourcePreset[] = [
  { id: 'rutracker', label: 'RuTracker', geositeCategory: 'rutracker' },
  { id: 'discord', label: 'Discord', geositeCategory: 'discord' },
  { id: 'google', label: 'Google', geositeCategory: 'google' },
  { id: 'tiktok', label: 'TikTok', geositeCategory: 'tiktok' },
  { id: 'youtube', label: 'YouTube', geositeCategory: 'youtube' },
]

export function presetRuleSetId(presetId: string): string {
  return `preset-${presetId}`
}

export function presetRuleSetTag(preset: ResourcePreset): string {
  return `geosite-${preset.geositeCategory}`
}

export function presetRuleSetUrl(preset: ResourcePreset): string {
  return `https://raw.githubusercontent.com/SagerNet/sing-geosite/rule-set/geosite-${preset.geositeCategory}.srs`
}
