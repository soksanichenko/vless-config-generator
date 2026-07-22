import type { SingBoxConfig } from '../types/singbox'
import type { Action, Condition, ConditionType, FinalAction, Rule, RuleSetDef } from '../types/rules'
import type { VlessClient } from '../types/clients'
import type { Region } from '../types/region'
import type { MultiplexSettings } from '../types/multiplex'
import type { SingboxTarget } from '../types/singboxTarget'
import { buildRegionConfig } from './regionConfig'

export interface BuildConfigInput {
  config: SingBoxConfig
  rules: Rule[]
  ruleSets: RuleSetDef[]
  defaultAction: FinalAction
  directTag: string
  proxyTag: string
  proxyOutboundIndex: number | null
  selectedClient: VlessClient | null
  region: Region
  multiplex: MultiplexSettings
  singboxTarget: SingboxTarget
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

/** Vision's flow control and mux multiplexing can't be combined, so enabling
 * mux drops any flow set on the outbound (e.g. the default xtls-rprx-vision). */
function applyMultiplexToOutbound(outbound: Record<string, unknown>, multiplex: MultiplexSettings): void {
  if (!multiplex.enabled) {
    delete outbound.multiplex
    return
  }
  delete outbound.flow
  outbound.multiplex = {
    enabled: true,
    protocol: multiplex.protocol,
    max_connections: multiplex.maxConnections,
    min_streams: multiplex.minStreams,
    padding: multiplex.padding,
  }
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

/** A rule's conditions regardless of whether they live flat on it (`simple` mode)
 * or spread across its branches (`logical` mode). */
function allConditionsOf(rule: Rule): Condition[] {
  return rule.mode === 'logical' ? rule.branches.flatMap((branch) => branch.conditions) : rule.conditions
}

/** Whether any rule matches on an IP directly, meaning the destination must be
 * resolved before routing can evaluate it (geoip rule sets are IP lists, not domains). */
function needsIpResolve(rules: Rule[], ruleSets: RuleSetDef[]): boolean {
  const geoipRuleSetIds = new Set(
    ruleSets.filter((ruleSet) => ruleSet.kind === 'geoip').map((ruleSet) => ruleSet.id),
  )
  return rules.some((rule) =>
    allConditionsOf(rule).some((condition) => {
      if (condition.type === 'ip_cidr') return condition.values.length > 0
      if (condition.type === 'rule_set') return condition.values.some((id) => geoipRuleSetIds.has(id))
      return false
    }),
  )
}

function buildConditionFields(conditions: Condition[], ruleSets: RuleSetDef[]): Record<string, unknown> | null {
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
    'process_path_regex',
    'port_range',
  ]
  for (const type of stringListTypes) {
    const values = mergeConditionValues(conditions, type)
    if (values.length > 0) output[type] = values
  }

  const ports = mergeConditionValues(conditions, 'port')
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value))
  if (ports.length > 0) output.port = ports

  const ruleSetTags = ruleSetTagsFor(mergeConditionValues(conditions, 'rule_set'), ruleSets)
  if (ruleSetTags.length > 0) output.rule_set = ruleSetTags

  if (conditions.some((condition) => condition.type === 'ip_is_private')) {
    output.ip_is_private = true
  }

  return Object.keys(output).length > 0 ? output : null
}

/** `reject` is a built-in rule action with no outbound of its own — direct/proxy
 * instead resolve to whichever outbound tag was detected for them. */
function actionFieldsFor(action: Action, directTag: string, proxyTag: string): Record<string, unknown> {
  if (action === 'reject') return { action: 'reject' }
  return { outbound: action === 'direct' ? directTag : proxyTag }
}

function buildRule(rule: Rule, ruleSets: RuleSetDef[], directTag: string, proxyTag: string): Record<string, unknown> | null {
  if (rule.mode === 'logical') {
    const branchRules = rule.branches
      .map((branch) => {
        const fields = buildConditionFields(branch.conditions, ruleSets)
        if (!fields) return null
        if (branch.invert) fields.invert = true
        return fields
      })
      .filter((entry): entry is Record<string, unknown> => entry !== null)
    if (branchRules.length === 0) return null
    return {
      type: 'logical',
      mode: rule.logicalMode,
      rules: branchRules,
      ...(rule.invert ? { invert: true } : {}),
      ...actionFieldsFor(rule.action, directTag, proxyTag),
    }
  }

  const fields = buildConditionFields(rule.conditions, ruleSets)
  if (!fields) return null
  if (rule.invert) fields.invert = true
  return { ...fields, ...actionFieldsFor(rule.action, directTag, proxyTag) }
}

export function buildOutputConfig(input: BuildConfigInput): SingBoxConfig {
  const config = structuredClone(input.config)

  if (input.proxyOutboundIndex !== null) {
    const outbounds = config.outbounds
    if (Array.isArray(outbounds)) {
      const target = outbounds[input.proxyOutboundIndex]
      if (target && typeof target === 'object') {
        const outbound = target as Record<string, unknown>
        if (input.selectedClient) {
          injectClientIntoOutbound(outbound, input.selectedClient)
        }
        applyMultiplexToOutbound(outbound, input.multiplex)
      }
    }
  }

  const { dns, extraRuleSets, defaultDomainResolver, routeRules: regionRouteRules, needsIpResolve: regionNeedsIpResolve } =
    buildRegionConfig(input.region, input.directTag, input.proxyTag, input.singboxTarget)

  // Required for domain/protocol-based rules to see anything at all, and for DNS
  // queries to actually go through the configured DNS servers instead of leaking.
  // Not modeled as a toggle in the UI — always present, ahead of user-built rules.
  const structuralRules: Record<string, unknown>[] = [
    { action: 'sniff' },
    { protocol: 'dns', action: 'hijack-dns' },
  ]

  // Only added when a rule actually matches on an IP (ip_cidr or a geoip rule set) —
  // those need the destination resolved first, which isn't guaranteed outside tun inbounds.
  if (needsIpResolve(input.rules, input.ruleSets) || regionNeedsIpResolve) {
    structuralRules.push({ action: 'resolve', strategy: 'prefer_ipv4' })
  }

  const rules = [
    ...structuralRules,
    ...regionRouteRules,
    ...input.rules
      .map((rule) => buildRule(rule, input.ruleSets, input.directTag, input.proxyTag))
      .filter((rule): rule is Record<string, unknown> => rule !== null),
  ]

  // Region rule sets take priority on a tag collision with the user's own rule sets.
  const regionRuleSetTags = new Set(extraRuleSets.map((ruleSet) => ruleSet.tag))
  const ruleSet = [
    ...input.ruleSets
      .filter((ruleSet) => !regionRuleSetTags.has(ruleSet.tag))
      .map((ruleSet) => ({
        type: 'remote',
        tag: ruleSet.tag,
        format: ruleSet.format,
        url: ruleSet.url,
      })),
    ...extraRuleSets,
  ]

  // Preserve any other route-level settings the pasted config already had
  // (e.g. auto_detect_interface) — only rules, rule_set, final, and
  // default_domain_resolver are ours to fully replace. default_domain_resolver in
  // particular must reference a server tag that exists in the dns section we just
  // built above, so it can't be left as a passthrough from the pasted config either.
  const existingRoute = (
    config.route && typeof config.route === 'object' ? config.route : {}
  ) as Record<string, unknown>

  const route: Record<string, unknown> = {
    ...existingRoute,
    rules,
    default_domain_resolver: defaultDomainResolver,
    final: input.defaultAction === 'direct' ? input.directTag : input.proxyTag,
  }
  if (ruleSet.length > 0) {
    route.rule_set = ruleSet
  } else {
    delete route.rule_set
  }

  config.route = route

  // Preserve any other dns-level settings the pasted config already had —
  // only servers, rules, and final are fully replaced based on the selected region.
  const existingDns = (
    config.dns && typeof config.dns === 'object' ? config.dns : {}
  ) as Record<string, unknown>
  config.dns = { ...existingDns, ...dns }

  return config
}
