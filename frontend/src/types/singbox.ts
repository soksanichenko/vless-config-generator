/**
 * The pasted sing-box config is treated as an opaque JSON object everywhere
 * except `route` (fully replaced) and the single outbound selected as the
 * "proxy" target (only its credential fields are overwritten). Every other
 * key passes through untouched, so we deliberately don't model the full
 * sing-box schema here.
 */
export type SingBoxConfig = Record<string, unknown>

export interface OutboundSummary {
  index: number
  tag: string
  type: string
}

export function listOutbounds(config: SingBoxConfig): OutboundSummary[] {
  const outbounds = config.outbounds
  if (!Array.isArray(outbounds)) return []
  return outbounds.map((outbound, index) => {
    const record = (outbound ?? {}) as Record<string, unknown>
    return {
      index,
      tag: typeof record.tag === 'string' ? record.tag : `outbound-${index}`,
      type: typeof record.type === 'string' ? record.type : 'unknown',
    }
  })
}
