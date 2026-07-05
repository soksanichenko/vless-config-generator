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

export type Action = 'direct' | 'proxy'

/** Free-typed list of values for a single condition. Interpretation (numbers,
 * enum members, rule_set tags, ...) is decided at build time per `type`. */
export interface Condition {
  id: string
  type: ConditionType
  values: string[]
}

export interface Rule {
  id: string
  conditions: Condition[]
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
    valueKind: 'text',
    placeholder: 'example.com',
  },
  {
    type: 'domain_suffix',
    labelKey: 'condition.domain_suffix.label',
    valueKind: 'text',
    placeholder: '.example.com',
  },
  {
    type: 'domain_keyword',
    labelKey: 'condition.domain_keyword.label',
    valueKind: 'text',
    placeholder: 'google',
  },
  {
    type: 'domain_regex',
    labelKey: 'condition.domain_regex.label',
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
    valueKind: 'text',
    placeholder: '443',
  },
  {
    type: 'port_range',
    labelKey: 'condition.port_range.label',
    valueKind: 'text',
    placeholder: '1000:2000',
  },
  {
    type: 'network',
    labelKey: 'condition.network.label',
    valueKind: 'enum',
    enumOptions: ['tcp', 'udp'],
  },
  {
    type: 'protocol',
    labelKey: 'condition.protocol.label',
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
