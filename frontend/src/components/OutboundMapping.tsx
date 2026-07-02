import type { OutboundSummary } from '../types/singbox'

interface Props {
  outbounds: OutboundSummary[]
  directTag: string
  proxyTag: string
  proxyOutboundIndex: number | null
  onDirectTagChange: (tag: string) => void
  onProxyChange: (tag: string, index: number | null) => void
}

export function OutboundMapping({
  outbounds,
  directTag,
  proxyTag,
  proxyOutboundIndex,
  onDirectTagChange,
  onProxyChange,
}: Props) {
  if (outbounds.length === 0) return null

  const proxyOutbound = outbounds.find((outbound) => outbound.index === proxyOutboundIndex)
  const proxyIsVless = proxyOutbound?.type === 'vless'

  return (
    <div className="card">
      <h2>3. Outbound mapping</h2>
      <p className="help-text">
        Which existing outbound is "direct" and which is "proxy"? Rules and the default outbound
        toggle route to whichever tag you pick here.
      </p>
      <div className="row">
        <div className="field">
          <label htmlFor="direct-outbound">Direct outbound</label>
          <select
            id="direct-outbound"
            value={directTag}
            onChange={(event) => onDirectTagChange(event.target.value)}
          >
            <option value="">— pick —</option>
            {outbounds.map((outbound) => (
              <option key={outbound.index} value={outbound.tag}>
                {outbound.tag} ({outbound.type})
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="proxy-outbound">Proxy outbound</label>
          <select
            id="proxy-outbound"
            value={proxyTag}
            onChange={(event) => {
              const selected = outbounds.find((outbound) => outbound.tag === event.target.value)
              onProxyChange(event.target.value, selected ? selected.index : null)
            }}
          >
            <option value="">— pick —</option>
            {outbounds.map((outbound) => (
              <option key={outbound.index} value={outbound.tag}>
                {outbound.tag} ({outbound.type})
              </option>
            ))}
          </select>
        </div>
      </div>
      {proxyTag && !proxyIsVless && (
        <div className="warning-banner">
          "{proxyTag}" is not a VLESS outbound — client credentials won't be injected into it even
          if you picked a client above.
        </div>
      )}
    </div>
  )
}
