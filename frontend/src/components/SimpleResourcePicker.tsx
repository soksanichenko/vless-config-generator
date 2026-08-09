import { newId } from '../lib/id'
import { presetRuleSetId, presetRuleSetTag, presetRuleSetUrl, RESOURCE_PRESETS } from '../lib/resourcePresets'
import type { Rule, RuleSetDef } from '../types/rules'
import { useLang } from '../i18n/LangContext'

interface Props {
  stepNumber: number
  ruleSets: RuleSetDef[]
  rules: Rule[]
  onChangeRuleSets: (ruleSets: RuleSetDef[]) => void
  onChangeRules: (rules: Rule[]) => void
}

const PRESET_RULE_IDS = new Set(RESOURCE_PRESETS.map((preset) => presetRuleSetId(preset.id)))

export function SimpleResourcePicker({ stepNumber, ruleSets, rules, onChangeRuleSets, onChangeRules }: Props) {
  const { t } = useLang()

  function isChecked(presetId: string): boolean {
    return rules.some((rule) => rule.id === presetRuleSetId(presetId))
  }

  function check(preset: (typeof RESOURCE_PRESETS)[number]) {
    const ruleId = presetRuleSetId(preset.id)
    const tag = presetRuleSetTag(preset)
    // Reuse an existing rule set with the same tag (e.g. hand-added in Advanced
    // mode earlier) instead of creating a second, duplicate-tagged entry.
    const existing = ruleSets.find((ruleSet) => ruleSet.tag === tag)
    if (!existing) {
      onChangeRuleSets([
        ...ruleSets,
        { id: ruleId, tag, kind: 'geosite', format: 'binary', url: presetRuleSetUrl(preset) },
      ])
    }
    onChangeRules([
      ...rules,
      {
        id: ruleId,
        mode: 'simple',
        conditions: [{ id: newId(), type: 'rule_set', values: [existing?.id ?? ruleId] }],
        logicalMode: 'and',
        branches: [],
        invert: false,
        action: 'proxy',
      },
    ])
  }

  function uncheck(preset: (typeof RESOURCE_PRESETS)[number]) {
    const ruleId = presetRuleSetId(preset.id)
    onChangeRules(rules.filter((rule) => rule.id !== ruleId))
    // Only drop the rule set if this preset actually owns it — a same-tagged
    // rule set added by hand in Advanced mode stays untouched.
    onChangeRuleSets(ruleSets.filter((ruleSet) => ruleSet.id !== ruleId))
  }

  const extraRulesCount = rules.filter((rule) => !PRESET_RULE_IDS.has(rule.id)).length

  return (
    <div className="card">
      <h2>{stepNumber}. {t('ruleList.heading')}</h2>
      <p className="help-text">{t('simpleMode.help')}</p>
      <div className="chip-list">
        {RESOURCE_PRESETS.map((preset) => {
          const checked = isChecked(preset.id)
          return (
            <label className="chip" key={preset.id} style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => (checked ? uncheck(preset) : check(preset))}
                style={{ marginRight: 6 }}
              />
              {preset.label}
            </label>
          )
        })}
      </div>
      {extraRulesCount > 0 && (
        <p className="help-text spacer-top">{t('simpleMode.extraRulesHint', { count: extraRulesCount })}</p>
      )}
    </div>
  )
}
