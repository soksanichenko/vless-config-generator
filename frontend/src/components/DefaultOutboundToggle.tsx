import type { Action } from '../types/rules'

interface Props {
  value: Action
  onChange: (value: Action) => void
}

export function DefaultOutboundToggle({ value, onChange }: Props) {
  return (
    <div className="card">
      <h2>5. Default outbound</h2>
      <p className="help-text">Where traffic goes when no rule above matches. Pick one — there's no implicit default.</p>
      <div className="pill-group">
        <button type="button" className={value === 'direct' ? 'active' : ''} onClick={() => onChange('direct')}>
          Direct
        </button>
        <button type="button" className={value === 'proxy' ? 'active' : ''} onClick={() => onChange('proxy')}>
          Proxy
        </button>
      </div>
    </div>
  )
}
