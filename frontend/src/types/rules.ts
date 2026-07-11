import type { TranslationKey } from '../i18n/translations'

export type ConditionType =
  | 'domain'
  | 'domain_suffix'
  | 'domain_keyword'
  | 'domain_regex'
  | 'rule_set'
  | 'ip_cidr'
  | 'ip_is_private'
  | 'port'
  | 'port_range'
  | 'network'
  | 'protocol'
  | 'process_name'
  | 'process_path'

/** `reject` needs no outbound tag — sing-box handles it as a built-in rule action,
 * unlike direct/proxy which resolve to the detected outbound tags. */
export type Action = 'direct' | 'proxy' | 'reject'

/** route.final only accepts an outbound tag, so the default/fallback action can't
 * be `reject` the way a per-rule action can. */
export type FinalAction = 'direct' | 'proxy'

/** Free-typed list of values for a single condition. Interpretation (numbers,
 * enum members, rule_set tags, ...) is decided at build time per `type`. */
export interface Condition {
  id: string
  type: ConditionType
  values: string[]
}

/** One branch of a `logical` rule — a flat, ANDed-across-types condition set (same
 * shape as a `simple` rule's conditions), optionally negated on its own. */
export interface RuleBranch {
  id: string
  conditions: Condition[]
  invert: boolean
}

export interface Rule {
  id: string
  /** `simple` = sing-box's default rule (flat conditions). `logical` = sing-box's
   * `type: logical` rule (AND/OR of branches). */
  mode: 'simple' | 'logical'
  conditions: Condition[]
  logicalMode: 'and' | 'or'
  branches: RuleBranch[]
  invert: boolean
  action: Action
}

/** A route.rule_set entry the user can reference from a rule_set condition. */
export interface RuleSetDef {
  id: string
  tag: string
  /** domain-based (geosite) vs IP-based (geoip) — determines whether a `resolve` action is needed. */
  kind: 'geosite' | 'geoip'
  format: 'binary' | 'source'
  url: string
}

export interface ConditionTypeInfo {
  type: ConditionType
  labelKey: TranslationKey
  helpKey?: TranslationKey
  valueKind: 'text' | 'enum' | 'rule_set' | 'boolean'
  placeholder?: string
  enumOptions?: string[]
}

export const CONDITION_TYPES: ConditionTypeInfo[] = [
  {
    type: 'domain',
    labelKey: 'condition.domain.label',
    helpKey: 'condition.domain.help',
    valueKind: 'text',
    placeholder: 'example.com',
  },
  {
    type: 'domain_suffix',
    labelKey: 'condition.domain_suffix.label',
    helpKey: 'condition.domain_suffix.help',
    valueKind: 'text',
    placeholder: '.example.com',
  },
  {
    type: 'domain_keyword',
    labelKey: 'condition.domain_keyword.label',
    helpKey: 'condition.domain_keyword.help',
    valueKind: 'text',
    placeholder: 'google',
  },
  {
    type: 'domain_regex',
    labelKey: 'condition.domain_regex.label',
    helpKey: 'condition.domain_regex.help',
    valueKind: 'text',
    placeholder: '^stun\\..+',
  },
  {
    type: 'rule_set',
    labelKey: 'condition.rule_set.label',
    helpKey: 'condition.rule_set.help',
    valueKind: 'rule_set',
  },
  {
    type: 'ip_cidr',
    labelKey: 'condition.ip_cidr.label',
    helpKey: 'condition.ip_cidr.help',
    valueKind: 'text',
    placeholder: '10.0.0.0/24',
  },
  {
    type: 'ip_is_private',
    labelKey: 'condition.ip_is_private.label',
    helpKey: 'condition.ip_is_private.help',
    valueKind: 'boolean',
  },
  {
    type: 'port',
    labelKey: 'condition.port.label',
    helpKey: 'condition.port.help',
    valueKind: 'text',
    placeholder: '443',
  },
  {
    type: 'port_range',
    labelKey: 'condition.port_range.label',
    helpKey: 'condition.port_range.help',
    valueKind: 'text',
    placeholder: '1000:2000',
  },
  {
    type: 'network',
    labelKey: 'condition.network.label',
    helpKey: 'condition.network.help',
    valueKind: 'enum',
    enumOptions: ['tcp', 'udp'],
  },
  {
    type: 'protocol',
    labelKey: 'condition.protocol.label',
    helpKey: 'condition.protocol.help',
    valueKind: 'enum',
    enumOptions: ['http', 'tls', 'quic', 'dns', 'stun', 'bittorrent'],
  },
  {
    type: 'process_name',
    labelKey: 'condition.process_name.label',
    helpKey: 'condition.process_name.help',
    valueKind: 'text',
    placeholder: 'firefox.exe',
  },
  {
    type: 'process_path',
    labelKey: 'condition.process_path.label',
    helpKey: 'condition.process_path.help',
    valueKind: 'text',
    placeholder: '/usr/bin/firefox',
  },
]

export function conditionTypeInfo(type: ConditionType): ConditionTypeInfo {
  const info = CONDITION_TYPES.find((entry) => entry.type === type)
  if (!info) throw new Error(`Unknown condition type: ${type}`)
  return info
}
