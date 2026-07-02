import type { SingBoxConfig } from '../types/singbox'
import type { Action, Condition, ConditionType, Rule, RuleSetDef } from '../types/rules'
import type { VlessClient } from '../types/clients'

export interface BuildConfigInput {
  config: SingBoxConfig
  rules: Rule[]
  ruleSets: RuleSetDef[]
  defaultAction: Action
  directTag: string
  proxyTag: string
  proxyOutboundIndex: number | null
  selectedClient: VlessClient | null
}

/** Fields we control on the injected VLESS outbound; everything else on it is left as-is. */
function injectClientIntoOutbound(outbound: Record<string, unknown>, client: VlessClient): void {
  outbound.server = client.server
  outbound.server_port = client.serverPort
  outbound.uuid = client.uuid

  const tls = (outbound.tls && typeof outbound.tls === 'object' ? outbound.tls : {}) as Record<
    string,
    unknown
  >
  tls.server_name = client.serverName

  const reality = (
    tls.reality && typeof tls.reality === 'object' ? tls.reality : {}
  ) as Record<string, unknown>
  reality.public_key = client.publicKey
  reality.short_id = client.shortId

  tls.reality = reality
  outbound.tls = tls
}

function mergeConditionValues(conditions: Condition[], type: ConditionType): string[] {
  const values = conditions
    .filter((condition) => condition.type === type)
    .flatMap((condition) => condition.values)
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
  return Array.from(new Set(values))
}

function ruleSetTagsFor(values: string[], ruleSets: RuleSetDef[]): string[] {
  const byId = new Map(ruleSets.map((ruleSet) => [ruleSet.id, ruleSet.tag]))
  return values.map((id) => byId.get(id)).filter((tag): tag is string => Boolean(tag))
}

function buildRule(rule: Rule, ruleSets: RuleSetDef[], directTag: string, proxyTag: string): Record<string, unknown> | null {
  if (rule.conditions.length === 0) return null

  const output: Record<string, unknown> = {}

  const stringListTypes: ConditionType[] = [
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
  for (const type of stringListTypes) {
    const values = mergeConditionValues(rule.conditions, type)
    if (values.length > 0) output[type] = values
  }

  const ports = mergeConditionValues(rule.conditions, 'port')
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value))
  if (ports.length > 0) output.port = ports

  const ruleSetTags = ruleSetTagsFor(mergeConditionValues(rule.conditions, 'rule_set'), ruleSets)
  if (ruleSetTags.length > 0) output.rule_set = ruleSetTags

  if (Object.keys(output).length === 0) return null

  output.outbound = rule.action === 'direct' ? directTag : proxyTag
  return output
}

export function buildOutputConfig(input: BuildConfigInput): SingBoxConfig {
  const config = structuredClone(input.config)

  if (input.selectedClient && input.proxyOutboundIndex !== null) {
    const outbounds = config.outbounds
    if (Array.isArray(outbounds)) {
      const target = outbounds[input.proxyOutboundIndex]
      if (target && typeof target === 'object') {
        injectClientIntoOutbound(target as Record<string, unknown>, input.selectedClient)
      }
    }
  }

  // Required for domain/protocol-based rules to see anything at all, and for DNS
  // queries to actually go through the configured DNS servers instead of leaking.
  // Not modeled as a toggle in the UI — always present, ahead of user-built rules.
  const structuralRules: Record<string, unknown>[] = [
    { action: 'sniff' },
    { protocol: 'dns', action: 'hijack-dns' },
  ]

  const rules = [
    ...structuralRules,
    ...input.rules
      .map((rule) => buildRule(rule, input.ruleSets, input.directTag, input.proxyTag))
      .filter((rule): rule is Record<string, unknown> => rule !== null),
  ]

  const ruleSet = input.ruleSets.map((ruleSet) => ({
    type: 'remote',
    tag: ruleSet.tag,
    format: ruleSet.format,
    url: ruleSet.url,
  }))

  // Preserve any other route-level settings the pasted config already had
  // (e.g. default_domain_resolver, auto_detect_interface) — only rules,
  // rule_set, and final are ours to fully replace.
  const existingRoute = (
    config.route && typeof config.route === 'object' ? config.route : {}
  ) as Record<string, unknown>

  const route: Record<string, unknown> = {
    ...existingRoute,
    rules,
    final: input.defaultAction === 'direct' ? input.directTag : input.proxyTag,
  }
  if (ruleSet.length > 0) {
    route.rule_set = ruleSet
  } else {
    delete route.rule_set
  }

  config.route = route

  return config
}
