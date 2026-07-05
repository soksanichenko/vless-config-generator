import { useMemo, useRef } from 'react'
import { DEFAULT_CONFIG_TEXT } from '../lib/defaultConfig'
import { highlightJson } from '../lib/jsonHighlight'
import { useLang } from '../i18n/LangContext'

interface Props {
  value: string
  onChange: (value: string) => void
  error: string | null
}

export function ConfigPaste({ value, onChange, error }: Props) {
  const { t } = useLang()
  const highlightRef = useRef<HTMLPreElement>(null)
  const highlighted = useMemo(() => highlightJson(value), [value])

  return (
    <div className="card">
      <h2>{t('configPaste.heading')}</h2>
      <p className="help-text">
        {t('configPaste.helpPart1')}
        <code>route</code>
        {t('configPaste.helpPart2')}
        <code>sniff</code>
        {t('configPaste.helpPart3')}
      </p>
      {error && <div className="error-banner">{error}</div>}
      <div className="code-editor">
        <pre className="code-editor-highlight" ref={highlightRef} aria-hidden="true">
          <code dangerouslySetInnerHTML={{ __html: `${highlighted}\n` }} />
        </pre>
        <textarea
          className="code-editor-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onScroll={(event) => {
            if (highlightRef.current) {
              highlightRef.current.scrollTop = event.currentTarget.scrollTop
              highlightRef.current.scrollLeft = event.currentTarget.scrollLeft
            }
          }}
          placeholder={t('configPaste.placeholder')}
          spellCheck={false}
        />
      </div>
      <div className="row spacer-top">
        <button type="button" onClick={() => onChange(DEFAULT_CONFIG_TEXT)}>
          {t('configPaste.reset')}
        </button>
      </div>
    </div>
  )
}
