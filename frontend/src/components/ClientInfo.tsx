import type { VlessClient } from '../types/clients'
import { useLang } from '../i18n/LangContext'

type GenerateStatus = 'idle' | 'generating' | 'provisioning' | 'error'

interface Props {
  clients: VlessClient[]
  selectedUuid: string | null
  onSelect: (uuid: string) => void
  loadError: string | null
  canGenerateCredentials: boolean
  generateStatus: GenerateStatus
  onGenerateCredentials: () => void
}

export function ClientInfo({
  clients,
  selectedUuid,
  onSelect,
  loadError,
  canGenerateCredentials,
  generateStatus,
  onGenerateCredentials,
}: Props) {
  const { t } = useLang()
  const client = clients.find((candidate) => candidate.uuid === selectedUuid) ?? null
  // While generating/provisioning, canGenerateCredentials is already false
  // again, but the no-credentials hint would just be noise next to the progress text.
  const generating = generateStatus === 'generating' || generateStatus === 'provisioning'

  return (
    <div className="card">
      <h2>{t('client.heading')}</h2>
      {loadError && !canGenerateCredentials && !generating && (
        <p className="help-text">
          {t('client.noCredentialsHint')}
        </p>
      )}
      {loadError && canGenerateCredentials && generateStatus === 'idle' && (
        <p className="help-text">
          {t('client.generateHint')}{' '}
          <button type="button" className="button" onClick={onGenerateCredentials}>
            {t('client.generateButton')}
          </button>
        </p>
      )}
      {generateStatus === 'generating' && (
        <p className="help-text">{t('client.generating')}</p>
      )}
      {generateStatus === 'provisioning' && (
        <p className="help-text">{t('client.provisioning')}</p>
      )}
      {generateStatus === 'error' && (
        <p className="help-text">{t('client.generateError')}</p>
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
        <>
          <div className="field">
            <label htmlFor="client-email">{t('client.emailLabel')}</label>
            <input id="client-email" type="text" value={client.email} readOnly />
          </div>
          <div className="field">
            <label htmlFor="client-uuid">{t('client.uuidLabel')}</label>
            <input id="client-uuid" type="text" value={client.uuid} readOnly />
          </div>
          <p className="help-text">
            {t('client.loggedInAsPrefix')}
            <strong>{client.email}</strong> ({client.server}:{client.serverPort})
            {t('client.loggedInAsSuffix')}
          </p>
        </>
      )}
    </div>
  )
}
