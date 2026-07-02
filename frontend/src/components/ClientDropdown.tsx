import type { VlessClient } from '../types/clients'

interface Props {
  clients: VlessClient[]
  loadError: string | null
  selectedEmail: string | null
  onSelect: (email: string | null) => void
}

export function ClientDropdown({ clients, loadError, selectedEmail, onSelect }: Props) {
  return (
    <div className="card">
      <h2>1. Client</h2>
      {loadError && (
        <div className="warning-banner">
          Could not load the client list ({loadError}). You can still build a config, but the
          proxy outbound's credentials won't be filled in automatically.
        </div>
      )}
      {!loadError && clients.length === 0 && (
        <p className="help-text">No clients available yet.</p>
      )}
      {clients.length > 0 && (
        <div className="field">
          <label htmlFor="client-select">VLESS client</label>
          <select
            id="client-select"
            value={selectedEmail ?? ''}
            onChange={(event) => onSelect(event.target.value || null)}
          >
            <option value="">— none, don't fill outbound credentials —</option>
            {clients.map((client) => (
              <option key={client.email} value={client.email}>
                {client.email} ({client.server}:{client.serverPort})
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
