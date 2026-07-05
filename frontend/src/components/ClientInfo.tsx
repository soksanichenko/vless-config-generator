import type { VlessClient } from '../types/clients'

interface Props {
  client: VlessClient | null
  loadError: string | null
}

export function ClientInfo({ client, loadError }: Props) {
  return (
    <div className="card">
      <h2>1. Client</h2>
      {loadError && (
        <div className="warning-banner">
          Could not load your client credentials ({loadError}). You can still build a config, but
          the proxy outbound's credentials won't be filled in automatically.
        </div>
      )}
      {!loadError && client && (
        <p className="help-text">
          Logged in as <strong>{client.email}</strong> ({client.server}:{client.serverPort}) —
          these credentials will be filled into the proxy outbound.{' '}
          <form action="/logout" method="post" style={{ display: 'inline' }}>
            <button type="submit">Log out</button>
          </form>
        </p>
      )}
    </div>
  )
}
