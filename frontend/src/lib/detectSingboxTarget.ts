import type { SingBoxConfig } from '../types/singbox'
import type { SingboxTarget } from '../types/singboxTarget'

/**
 * Recovers which Sing-box version target (Stable/Alpha) a pasted/loaded config's
 * `dns.rules` were generated for — not which sing-box binary the user actually runs,
 * which no config.json can ever say. Only meaningful for configs this tool (or an
 * earlier version of it) produced for the Ukraine/Russia regions; returns null for
 * anything else (Default region, hand-written configs) rather than guessing.
 *
 * `action: "evaluate"` only ever appears in this tool's `alpha`-target output. A
 * `rule_set` condition with no `action` field is the pre-1.14 "legacy address filter"
 * shape `stable`-target output uses for its geoip checks — the same shape can also
 * appear for a plain geosite domain match shared by both targets, but that's harmless
 * here since it's only ever consulted once `evaluate` has already been ruled out.
 */
export function detectSingboxTarget(config: SingBoxConfig): SingboxTarget | null {
  const dns = config.dns
  if (!dns || typeof dns !== 'object') return null
  const rules = (dns as Record<string, unknown>).rules
  if (!Array.isArray(rules)) return null

  const isRuleObject = (rule: unknown): rule is Record<string, unknown> =>
    typeof rule === 'object' && rule !== null

  if (rules.some((rule) => isRuleObject(rule) && rule.action === 'evaluate')) {
    return 'alpha'
  }
  if (rules.some((rule) => isRuleObject(rule) && 'rule_set' in rule && !('action' in rule))) {
    return 'stable'
  }
  return null
}
