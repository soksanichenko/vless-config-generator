export type ConditionType =
  | 'domain'
  | 'domain_suffix'
  | 'domain_keyword'
  | 'domain_regex'
  | 'rule_set'
  | 'ip_cidr'
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
  format: 'binary' | 'source'
  url: string
}

export interface ConditionTypeInfo {
  type: ConditionType
  label: string
  help?: string
  valueKind: 'text' | 'enum' | 'rule_set'
  placeholder?: string
  enumOptions?: string[]
}

export const CONDITION_TYPES: ConditionTypeInfo[] = [
  {
    type: 'domain',
    label: 'Domain (exact)',
    valueKind: 'text',
    placeholder: 'example.com',
  },
  {
    type: 'domain_suffix',
    label: 'Domain suffix',
    valueKind: 'text',
    placeholder: '.example.com',
  },
  {
    type: 'domain_keyword',
    label: 'Domain keyword',
    valueKind: 'text',
    placeholder: 'google',
  },
  {
    type: 'domain_regex',
    label: 'Domain regex',
    valueKind: 'text',
    placeholder: '^stun\\..+',
  },
  {
    type: 'rule_set',
    label: 'Rule set (geosite/geoip)',
    help: 'References a rule set defined below, fetched by sing-box from a remote .srs file.',
    valueKind: 'rule_set',
  },
  {
    type: 'ip_cidr',
    label: 'IP CIDR',
    valueKind: 'text',
    placeholder: '10.0.0.0/24',
  },
  {
    type: 'port',
    label: 'Port',
    valueKind: 'text',
    placeholder: '443',
  },
  {
    type: 'port_range',
    label: 'Port range',
    valueKind: 'text',
    placeholder: '1000:2000',
  },
  {
    type: 'network',
    label: 'Network',
    valueKind: 'enum',
    enumOptions: ['tcp', 'udp'],
  },
  {
    type: 'protocol',
    label: 'Protocol',
    valueKind: 'enum',
    enumOptions: ['http', 'tls', 'quic', 'dns', 'stun', 'bittorrent'],
  },
  {
    type: 'process_name',
    label: 'Process name',
    help: 'Only works when sing-box runs as a full local client with OS process-list access. Target platforms: Windows and Linux. On Linux this needs root/CAP_NET_ADMIN — not available on a router or restricted environment.',
    valueKind: 'text',
    placeholder: 'firefox.exe',
  },
  {
    type: 'process_path',
    label: 'Process path',
    help: 'Same platform/permission caveat as process name.',
    valueKind: 'text',
    placeholder: '/usr/bin/firefox',
  },
]

export function conditionTypeInfo(type: ConditionType): ConditionTypeInfo {
  const info = CONDITION_TYPES.find((entry) => entry.type === type)
  if (!info) throw new Error(`Unknown condition type: ${type}`)
  return info
}
