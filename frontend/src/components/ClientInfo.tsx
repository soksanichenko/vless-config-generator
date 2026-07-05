import type { VlessClient } from '../types/clients'
import { useLang } from '../i18n/LangContext'

interface Props {
  client: VlessClient | null
  loadError: string | null
}

export function ClientInfo({ client, loadError }: Props) {
  const { t } = useLang()
  return (
    <div className="card">
      <h2>{t('client.heading')}</h2>
      {loadError && (
        <div className="warning-banner">{t('client.loadError', { error: loadError })}</div>
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
