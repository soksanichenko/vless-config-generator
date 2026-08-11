import { useEffect, useMemo, useState } from 'react'
import { newId } from '../lib/id'
import { getRuleSetCategories } from '../lib/fetchRuleSetCategories'
import { GEOSITE_CATEGORIES } from '../lib/ruleSetCategories'
import { buildResourceCatalog, FEATURED_RESOURCE_IDS } from '../lib/resourceCatalog'
import type { ResourceOption } from '../lib/resourceCatalog'
import { COMPANION_APP_PROCESSES } from '../lib/companionApps'
import type { Rule, RuleSetDef } from '../types/rules'
import { useLang } from '../i18n/LangContext'

interface Props {
  stepNumber: number
  ruleSets: RuleSetDef[]
  rules: Rule[]
  onChangeRuleSets: (ruleSets: RuleSetDef[]) => void
  onChangeRules: (rules: Rule[]) => void
}

const MAX_SEARCH_RESULTS = 30

function resourceRuleId(optionId: string): string {
  return `resource-${optionId}`
}

/** Builds the Rule this resource adds. Plain rule_set match for most resources; for
 * a known desktop client (appKey set), an OR of the rule_set match and a process_name
 * match on that client's executable, so its own traffic is caught even when it
 * doesn't go through a listed domain/IP at all. */
function buildResourceRule(option: ResourceOption, ruleSetId: string): Rule {
  const ruleId = resourceRuleId(option.id)
  const processNames = option.appKey ? COMPANION_APP_PROCESSES[option.appKey] : undefined
  if (!processNames) {
    return {
      id: ruleId,
      mode: 'simple',
      conditions: [{ id: newId(), type: 'rule_set', values: [ruleSetId] }],
      logicalMode: 'and',
      branches: [],
      invert: false,
      action: 'proxy',
    }
  }
  return {
    id: ruleId,
    mode: 'logical',
    conditions: [],
    logicalMode: 'or',
    branches: [
      { id: newId(), conditions: [{ id: newId(), type: 'rule_set', values: [ruleSetId] }], invert: false },
      { id: newId(), conditions: [{ id: newId(), type: 'process_name', values: processNames }], invert: false },
    ],
    invert: false,
    action: 'proxy',
  }
}

export function SimpleResourcePicker({ stepNumber, ruleSets, rules, onChangeRuleSets, onChangeRules }: Props) {
  const { t } = useLang()
  const [catalog, setCatalog] = useState<ResourceOption[]>(() => buildResourceCatalog(GEOSITE_CATEGORIES))
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    let sagernetCategories = GEOSITE_CATEGORIES
    let runetfreedomCategories: string[] = []
    getRuleSetCategories('geosite', 'sagernet').then((categories) => {
      sagernetCategories = categories
      if (!cancelled) setCatalog(buildResourceCatalog(sagernetCategories, runetfreedomCategories))
    })
    getRuleSetCategories('geosite', 'runetfreedom').then((categories) => {
      runetfreedomCategories = categories
      if (!cancelled) setCatalog(buildResourceCatalog(sagernetCategories, runetfreedomCategories))
    })
    return () => {
      cancelled = true
    }
  }, [])

  const selectedIds = useMemo(() => {
    const ids = new Set(rules.map((rule) => rule.id))
    return new Set(catalog.filter((option) => ids.has(resourceRuleId(option.id))).map((option) => option.id))
  }, [catalog, rules])

  function isSelected(option: ResourceOption): boolean {
    return selectedIds.has(option.id)
  }

  function add(option: ResourceOption) {
    const existing = ruleSets.find((ruleSet) => ruleSet.tag === option.tag)
    const ruleSetId = existing?.id ?? resourceRuleId(option.id)
    if (!existing) {
      onChangeRuleSets([
        ...ruleSets,
        { id: ruleSetId, tag: option.tag, kind: option.kind, format: 'binary', url: option.url },
      ])
    }
    onChangeRules([...rules, buildResourceRule(option, ruleSetId)])
  }

  function remove(option: ResourceOption) {
    const ruleId = resourceRuleId(option.id)
    onChangeRules(rules.filter((rule) => rule.id !== ruleId))
    // Only drop the rule set if this picker actually owns it — a same-tagged rule
    // set added by hand in Advanced mode (a different id) stays untouched.
    onChangeRuleSets(ruleSets.filter((ruleSet) => ruleSet.id !== ruleId))
  }

  function toggle(option: ResourceOption) {
    if (isSelected(option)) remove(option)
    else add(option)
  }

  const featuredOptions = useMemo(() => {
    const byId = new Map(catalog.map((option) => [option.id, option]))
    return FEATURED_RESOURCE_IDS.map((id) => byId.get(id)).filter((option): option is ResourceOption => Boolean(option))
  }, [catalog])

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return []
    return catalog.filter((option) => option.label.toLowerCase().includes(query)).slice(0, MAX_SEARCH_RESULTS)
  }, [catalog, search])

  const resourceRuleIds = useMemo(() => new Set(catalog.map((option) => resourceRuleId(option.id))), [catalog])
  const selectedNonFeatured = useMemo(
    () => catalog.filter((option) => isSelected(option) && !FEATURED_RESOURCE_IDS.includes(option.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalog, selectedIds],
  )
  const extraRulesCount = rules.filter((rule) => !resourceRuleIds.has(rule.id)).length

  return (
    <div className="card">
      <h2>{stepNumber}. {t('ruleList.heading')}</h2>
      <p className="help-text">{t('simpleMode.help')}</p>

      <div className="chip-list">
        {featuredOptions.map((option) => (
          <label className="chip" key={option.id} style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={isSelected(option)} onChange={() => toggle(option)} style={{ marginRight: 6 }} />
            {option.label}
          </label>
        ))}
      </div>

      <div className="combobox spacer-top">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('simpleMode.searchPlaceholder')}
        />
        {searchResults.length > 0 && (
          <div className="combobox-results">
            {searchResults.map((option) => (
              <button
                type="button"
                key={option.id}
                className={`combobox-result${isSelected(option) ? ' selected' : ''}`}
                onClick={() => toggle(option)}
              >
                <span>{option.label}</span>
                <span className="combobox-result-source">{option.source}</span>
                {isSelected(option) && <span aria-hidden="true">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedNonFeatured.length > 0 && (
        <div className="chip-list spacer-top">
          {selectedNonFeatured.map((option) => (
            <span className="chip" key={option.id}>
              {option.label}
              <button type="button" onClick={() => remove(option)} aria-label={t('ruleSets.removeAria', { tag: option.label })}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {extraRulesCount > 0 && (
        <p className="help-text spacer-top">{t('simpleMode.extraRulesHint', { count: extraRulesCount })}</p>
      )}
    </div>
  )
}
