import type { SingBoxConfig } from '../types/singbox'
import type { Action, Condition, ConditionType, FinalAction, Rule, RuleBranch, RuleSetDef } from '../types/rules'
import { newId } from './id'

const STRING_LIST_CONDITION_TYPES: ConditionType[] = [
  'domain',
  'domain_suffix',
  'domain_keyword',
  'domain_regex',
  'ip_cidr',
  'network',
  'protocol',
  'process_name',
  'process_path',
  'port_range',
]

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((entry) => String(entry))
  if (value === undefined || value === null) return []
  return [String(value)]
}

function ruleSetKindFor(tag: string, url: string): 'geosite' | 'geoip' {
  return /geoip/i.test(tag) || /geoip/i.test(url) ? 'geoip' : 'geosite'
}

interface ParsedRuleSets {
  ruleSets: RuleSetDef[]
  /** route.rule_set entries we can't round-trip into a RuleSetDef (no tag/url, or a
   * `local`/inline set) — kept as-is so the caller can surface them to the user. */
  skipped: Record<string, unknown>[]
}

function parseRuleSets(config: SingBoxConfig): ParsedRuleSets {
  const route = config.route
  const ruleSet = route && typeof route === 'object' ? (route as Record<string, unknown>).rule_set : undefined
  if (!Array.isArray(ruleSet)) return { ruleSets: [], skipped: [] }

  const ruleSets: RuleSetDef[] = []
  const skipped: Record<string, unknown>[] = []
  for (const entry of ruleSet) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as Record<string, unknown>
    const tag = typeof record.tag === 'string' ? record.tag : ''
    const url = typeof record.url === 'string' ? record.url : ''
    if (record.type !== 'remote' || !tag || !url) {
      skipped.push(record)
      continue
    }
    ruleSets.push({
      id: newId(),
      tag,
      kind: ruleSetKindFor(tag, url),
      format: record.format === 'source' ? 'source' : 'binary',
      url,
    })
  }
  return { ruleSets, skipped }
}

/** Rules buildConfig always regenerates itself (sniff, DNS hijack, resolve) must not
 * be imported back as user rules, or they'd be duplicated on the next build. */
function isStructuralRule(record: Record<string, unknown>): boolean {
  const keys = Object.keys(record)
  if (keys.length === 1 && record.action === 'sniff') return true
  if (keys.length === 2 && record.protocol === 'dns' && record.action === 'hijack-dns') return true
  if (record.action === 'resolve') return true
  return false
}

function parseConditionFields(record: Record<string, unknown>, tagToRuleSetId: Map<string, string>): Condition[] {
  const conditions: Condition[] = []

  for (const type of STRING_LIST_CONDITION_TYPES) {
    const values = toStringList(record[type])
    if (values.length > 0) conditions.push({ id: newId(), type, values })
  }

  const ports = toStringList(record.port)
  if (ports.length > 0) conditions.push({ id: newId(), type: 'port', values: ports })

  const ruleSetTags = toStringList(record.rule_set)
  if (ruleSetTags.length > 0) {
    const ids = ruleSetTags.map((tag) => tagToRuleSetId.get(tag)).filter((id): id is string => Boolean(id))
    if (ids.length > 0) conditions.push({ id: newId(), type: 'rule_set', values: ids })
  }

  if (record.ip_is_private === true) {
    conditions.push({ id: newId(), type: 'ip_is_private', values: [] })
  }

  return conditions
}

/** `reject` rules carry no `outbound` field at all — only `action`. */
function parseAction(record: Record<string, unknown>, directTag: string, proxyTag: string): Action | null {
  if (record.action === 'reject') return 'reject'
  if (record.outbound === proxyTag) return 'proxy'
  if (record.outbound === directTag) return 'direct'
  return null
}

/** Only one level of `type: logical` nesting is imported (a branch's own `rules`,
 * if present, would mean a nested logical group) — matches what the rule builder's
 * UI can represent, rather than modeling sing-box's fully recursive rule tree. */
function parseRule(
  record: Record<string, unknown>,
  tagToRuleSetId: Map<string, string>,
  directTag: string,
  proxyTag: string,
): Rule | null {
  const action = parseAction(record, directTag, proxyTag)
  if (!action) return null

  if (record.type === 'logical') {
    const logicalMode = record.mode === 'or' ? 'or' : 'and'
    const rawBranches = Array.isArray(record.rules) ? record.rules : []
    const branches: RuleBranch[] = []
    for (const entry of rawBranches) {
      if (!entry || typeof entry !== 'object') continue
      const branchRecord = entry as Record<string, unknown>
      const conditions = parseConditionFields(branchRecord, tagToRuleSetId)
      if (conditions.length === 0) continue
      branches.push({ id: newId(), conditions, invert: branchRecord.invert === true })
    }
    if (branches.length === 0) return null
    return {
      id: newId(),
      mode: 'logical',
      conditions: [],
      logicalMode,
      branches,
      invert: record.invert === true,
      action,
    }
  }

  const conditions = parseConditionFields(record, tagToRuleSetId)
  if (conditions.length === 0) return null
  return {
    id: newId(),
    mode: 'simple',
    conditions,
    logicalMode: 'and',
    branches: [],
    invert: record.invert === true,
    action,
  }
}

export interface ParsedRoute {
  ruleSets: RuleSetDef[]
  rules: Rule[]
  defaultAction: FinalAction | null
  /** route.rule_set / route.rules entries that existed in the pasted config but
   * couldn't be imported into the builder — surfaced to the user, since buildConfig
   * would otherwise drop them from the output with no explanation. */
  skippedRuleSets: Record<string, unknown>[]
  skippedRules: Record<string, unknown>[]
}

/**
 * Best-effort import of a pasted config's existing `route` section into the rule
 * builder's model, so a config that already has rules baked in doesn't get silently
 * discarded the moment buildConfig regenerates `route` from scratch. Anything that
 * doesn't map cleanly onto the builder's direct/proxy + condition model (custom
 * actions, outbounds other than the detected direct/proxy pair, inline rule sets) is
 * reported back as skipped rather than guessed at.
 */
export function parseExistingRoute(config: SingBoxConfig, directTag: string, proxyTag: string): ParsedRoute {
  const { ruleSets, skipped: skippedRuleSets } = parseRuleSets(config)
  const tagToRuleSetId = new Map(ruleSets.map((ruleSet) => [ruleSet.tag, ruleSet.id]))

  const route = config.route
  const routeRules = route && typeof route === 'object' ? (route as Record<string, unknown>).rules : undefined
  const rules: Rule[] = []
  const skippedRules: Record<string, unknown>[] = []
  if (Array.isArray(routeRules)) {
    for (const entry of routeRules) {
      if (!entry || typeof entry !== 'object') continue
      const record = entry as Record<string, unknown>
      if (isStructuralRule(record)) continue
      const rule = parseRule(record, tagToRuleSetId, directTag, proxyTag)
      if (rule) {
        rules.push(rule)
      } else {
        skippedRules.push(record)
      }
    }
  }

  const routeFinal = route && typeof route === 'object' ? (route as Record<string, unknown>).final : undefined
  const defaultAction: FinalAction | null =
    routeFinal === proxyTag ? 'proxy' : routeFinal === directTag ? 'direct' : null

  return { ruleSets, rules, defaultAction, skippedRuleSets, skippedRules }
}
