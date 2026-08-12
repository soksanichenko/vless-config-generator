import { useEffect, useMemo, useState } from 'react'
import { newId } from '../lib/id'
import { getRuleSetCategories } from '../lib/fetchRuleSetCategories'
import { GEOSITE_CATEGORIES } from '../lib/ruleSetCategories'
import { buildResourceCatalog } from '../lib/resourceCatalog'
import type { ResourceOption } from '../lib/resourceCatalog'
import { COMPANION_APP_PROCESSES } from '../lib/companionApps'
import type { Condition, Rule, RuleSetDef } from '../types/rules'
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

function allConditionsOf(rule: Rule): Condition[] {
  return rule.mode === 'logical' ? rule.branches.flatMap((branch) => branch.conditions) : rule.conditions
}

function ruleReferencesRuleSet(rule: Rule, ruleSetId: string): boolean {
  return allConditionsOf(rule).some((condition) => condition.type === 'rule_set' && condition.values.includes(ruleSetId))
}

/** Strips `ruleSetId` and (if given) `processNames` out of a single condition list —
 * used on both a `simple` rule's flat conditions and a `logical` rule's per-branch
 * ones. Drops a condition once its values go empty; leaves everything else (other
 * rule_set ids, other condition types entirely) untouched. */
function pruneConditions(conditions: Condition[], ruleSetId: string, processNames: Set<string>): Condition[] {
  return conditions
    .map((condition) => {
      if (condition.type === 'rule_set') {
        return { ...condition, values: condition.values.filter((value) => value !== ruleSetId) }
      }
      if (condition.type === 'process_name' && processNames.size > 0) {
        return { ...condition, values: condition.values.filter((value) => !processNames.has(value)) }
      }
      return condition
    })
    .filter((condition) => condition.type === 'ip_is_private' || condition.values.length > 0)
}

/**
 * Removes one resource's contribution from `rules` without disturbing anything else
 * a rule might carry — this has to work equally well on a rule the picker created
 * itself (single value, the whole rule disappears), a rule load-time merging folded
 * several resources into (just this one value drops out of the shared condition),
 * and a rule hand-built in Advanced mode that happens to also reference this rule
 * set alongside other conditions (only the rule_set membership is touched).
 */
function removeResourceFromRules(rules: Rule[], ruleSetId: string, processNames: string[]): Rule[] {
  const processNameSet = new Set(processNames)
  const result: Rule[] = []
  for (const rule of rules) {
    if (!ruleReferencesRuleSet(rule, ruleSetId)) {
      result.push(rule)
      continue
    }
    if (rule.mode === 'logical') {
      const branches = rule.branches
        .map((branch) => ({ ...branch, conditions: pruneConditions(branch.conditions, ruleSetId, processNameSet) }))
        .filter((branch) => branch.conditions.length > 0)
      if (branches.length > 0) result.push({ ...rule, branches })
    } else {
      const conditions = pruneConditions(rule.conditions, ruleSetId, processNameSet)
      if (conditions.length > 0) result.push({ ...rule, conditions })
    }
  }
  return result
}

export function SimpleResourcePicker({ stepNumber, ruleSets, rules, onChangeRuleSets, onChangeRules }: Props) {
  const { t } = useLang()
  const [catalog, setCatalog] = useState<ResourceOption[]>(() => buildResourceCatalog(GEOSITE_CATEGORIES))
  const [search, setSearch] = useState('')
  const [resultsOpen, setResultsOpen] = useState(false)

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

  const ruleSetIdByTag = useMemo(() => new Map(ruleSets.map((ruleSet) => [ruleSet.tag, ruleSet.id])), [ruleSets])

  // Every rule_set id currently matched to a proxy action, across ALL rules — not
  // just ones the picker itself created. This is what lets a resource picked in
  // Advanced mode, or reconstructed by parseExistingRoute after loading a saved
  // config, still show up as checked here: recognition is by what the rule actually
  // does, not by which UI happened to create it.
  const proxiedRuleSetIds = useMemo(() => {
    const ids = new Set<string>()
    for (const rule of rules) {
      if (rule.action !== 'proxy') continue
      for (const condition of allConditionsOf(rule)) {
        if (condition.type === 'rule_set') condition.values.forEach((value) => ids.add(value))
      }
    }
    return ids
  }, [rules])

  function isSelected(option: ResourceOption): boolean {
    const ruleSetId = ruleSetIdByTag.get(option.tag)
    return ruleSetId !== undefined && proxiedRuleSetIds.has(ruleSetId)
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
    const ruleSetId = ruleSetIdByTag.get(option.tag)
    if (!ruleSetId) return
    const processNames = option.appKey ? (COMPANION_APP_PROCESSES[option.appKey] ?? []) : []
    const nextRules = removeResourceFromRules(rules, ruleSetId, processNames)
    onChangeRules(nextRules)
    // Only drop the rule set once nothing references it anymore — a hand-added
    // Advanced-mode rule using the same rule set (alongside other conditions, or
    // with a different action) can still be relying on it.
    const stillReferenced = nextRules.some((rule) => ruleReferencesRuleSet(rule, ruleSetId))
    if (!stillReferenced) {
      onChangeRuleSets(ruleSets.filter((ruleSet) => ruleSet.id !== ruleSetId))
    }
  }

  function toggle(option: ResourceOption) {
    if (isSelected(option)) remove(option)
    else add(option)
  }

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return []
    return catalog.filter((option) => option.label.toLowerCase().includes(query)).slice(0, MAX_SEARCH_RESULTS)
  }, [catalog, search])

  const selectedOptions = useMemo(
    () => catalog.filter((option) => isSelected(option)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalog, proxiedRuleSetIds, ruleSetIdByTag],
  )

  // Anything proxied that doesn't resolve to a known catalog rule set at all (a
  // hand-written domain/port/etc. rule, or a rule_set this session's catalog
  // doesn't recognize) isn't representable above — surfaced as a count instead.
  const catalogTags = useMemo(() => new Set(catalog.map((option) => option.tag)), [catalog])
  const extraRulesCount = rules.filter((rule) => {
    if (rule.action !== 'proxy') return true
    return !allConditionsOf(rule).some(
      (condition) =>
        condition.type === 'rule_set' &&
        condition.values.some((value) => {
          const ruleSet = ruleSets.find((entry) => entry.id === value)
          return ruleSet !== undefined && catalogTags.has(ruleSet.tag)
        }),
    )
  }).length

  return (
    <div className="card">
      <h2>{stepNumber}. {t('ruleList.heading')}</h2>
      <p className="help-text">{t('simpleMode.help')}</p>

      <div
        className="combobox spacer-top"
        onFocus={() => setResultsOpen(true)}
        onBlur={(event) => {
          // Only close once focus actually leaves the whole search widget — a click
          // moving focus from the input to one of the result buttons below (or back)
          // must not close the list out from under it.
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setResultsOpen(false)
          }
        }}
      >
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('simpleMode.searchPlaceholder')}
        />
        {resultsOpen && searchResults.length > 0 && (
          <div className="combobox-results">
            {searchResults.map((option) => (
              <button
                type="button"
                key={option.id}
                className={`combobox-result${isSelected(option) ? ' selected' : ''}`}
                // Keeps focus on the input instead of moving it to the button, so the
                // blur handler above never fires (and never has to reason about
                // Safari not focusing buttons on click at all).
                onMouseDown={(event) => event.preventDefault()}
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

      {selectedOptions.length > 0 && (
        <div className="chip-list spacer-top">
          {selectedOptions.map((option) => (
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
