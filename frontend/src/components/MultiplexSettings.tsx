import { MULTIPLEX_PROTOCOLS } from '../types/multiplex'
import type { MultiplexProtocol, MultiplexSettings as MultiplexSettingsValue } from '../types/multiplex'
import { useLang } from '../i18n/LangContext'

interface Props {
  value: MultiplexSettingsValue
  onChange: (value: MultiplexSettingsValue) => void
}

export function MultiplexSettings({ value, onChange }: Props) {
  const { t } = useLang()

  function set<K extends keyof MultiplexSettingsValue>(key: K, next: MultiplexSettingsValue[K]) {
    onChange({ ...value, [key]: next })
  }

  return (
    <div className="card">
      <h2>{t('multiplex.heading')}</h2>
      <p className="help-text">{t('multiplex.help')}</p>
      <div className="checkbox-group">
        <label>
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(event) => set('enabled', event.target.checked)}
          />
          {t('multiplex.enable')}
        </label>
      </div>

      {value.enabled && (
        <div className="row spacer-top">
          <div className="field">
            <label htmlFor="multiplex-protocol">{t('multiplex.protocol')}</label>
            <select
              id="multiplex-protocol"
              value={value.protocol}
              onChange={(event) => set('protocol', event.target.value as MultiplexProtocol)}
            >
              {MULTIPLEX_PROTOCOLS.map((protocol) => (
                <option key={protocol} value={protocol}>
                  {protocol}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="multiplex-max-connections">{t('multiplex.maxConnections')}</label>
            <input
              id="multiplex-max-connections"
              type="number"
              min={1}
              value={value.maxConnections}
              onChange={(event) => set('maxConnections', Number.parseInt(event.target.value, 10) || 1)}
            />
          </div>
          <div className="field">
            <label htmlFor="multiplex-min-streams">{t('multiplex.minStreams')}</label>
            <input
              id="multiplex-min-streams"
              type="number"
              min={1}
              value={value.minStreams}
              onChange={(event) => set('minStreams', Number.parseInt(event.target.value, 10) || 1)}
            />
          </div>
          <div className="field" style={{ flex: '0 0 auto', justifyContent: 'flex-end' }}>
            <label>&nbsp;</label>
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={value.padding}
                  onChange={(event) => set('padding', event.target.checked)}
                />
                {t('multiplex.padding')}
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
