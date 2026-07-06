import type { VlessClient } from '../types/clients'
import { useLang } from '../i18n/LangContext'

interface Props {
  clients: VlessClient[]
  selectedUuid: string | null
  onSelect: (uuid: string) => void
  loadError: string | null
}

export function ClientInfo({ clients, selectedUuid, onSelect, loadError }: Props) {
  const { t } = useLang()
  const client = clients.find((candidate) => candidate.uuid === selectedUuid) ?? null

  return (
    <div className="card">
      <h2>{t('client.heading')}</h2>
      {loadError && (
        <div className="warning-banner">{t('client.loadError', { error: loadError })}</div>
      )}
      {!loadError && clients.length > 1 && (
        <div className="field">
          <label htmlFor="client-picker">{t('client.pickerLabel')}</label>
          <select
            id="client-picker"
            value={selectedUuid ?? ''}
            onChange={(event) => onSelect(event.target.value)}
          >
            {clients.map((candidate) => (
              <option key={candidate.uuid} value={candidate.uuid}>
                {candidate.email} ({candidate.flow ? candidate.flow : t('client.pickerNoFlow')})
              </option>
            ))}
          </select>
        </div>
      )}
      {!loadError && client && (
        <p className="help-text">
          {t('client.loggedInAsPrefix')}
          <strong>{client.email}</strong> ({client.server}:{client.serverPort})
          {t('client.loggedInAsSuffix')}{' '}
          <form action="/logout" method="post" style={{ display: 'inline' }}>
            <button type="submit">{t('client.logout')}</button>
          </form>
        </p>
      )}
    </div>
  )
}
