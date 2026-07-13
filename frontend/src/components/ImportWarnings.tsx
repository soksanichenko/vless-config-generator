import { useLang } from '../i18n/LangContext'

interface Props {
  ruleSets: Record<string, unknown>[]
  rules: Record<string, unknown>[]
}

export function ImportWarnings({ ruleSets, rules }: Props) {
  const { t } = useLang()
  if (ruleSets.length === 0 && rules.length === 0) return null

  return (
    <div className="card">
      <h2>{t('importWarnings.heading')}</h2>
      <p className="help-text">{t('importWarnings.help')}</p>

      {ruleSets.length > 0 && (
        <>
          <p className="help-text">{t('importWarnings.ruleSetsLabel')}</p>
          {ruleSets.map((entry, index) => (
            <pre className="json-output spacer-top" key={index}>
              {JSON.stringify(entry, null, 2)}
            </pre>
          ))}
        </>
      )}

      {rules.length > 0 && (
        <>
          <p className="help-text">{t('importWarnings.rulesLabel')}</p>
          {rules.map((entry, index) => (
            <pre className="json-output spacer-top" key={index}>
              {JSON.stringify(entry, null, 2)}
            </pre>
          ))}
        </>
      )}
    </div>
  )
}
