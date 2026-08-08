import { useMemo, useState } from 'react'
import { annotateConfigJson } from '../lib/annotateConfig'
import { highlightJson } from '../lib/jsonHighlight'
import type { SingBoxConfig } from '../types/singbox'
import { useLang } from '../i18n/LangContext'

interface Props {
  config: SingBoxConfig | null
  warnings: string[]
}

export function OutputPanel({ config, warnings }: Props) {
  const { t, lang } = useLang()
  const [copied, setCopied] = useState(false)
  const [showComments, setShowComments] = useState(false)
  // Copy/Download always use this, comment-free — comments make the text invalid JSON,
  // which some sing-box clients (especially older bundled cores) may fail to parse.
  const json = config ? JSON.stringify(config, null, 2) : ''
  const displayText = showComments ? annotateConfigJson(json, lang) : json
  const highlighted = useMemo(() => highlightJson(displayText), [displayText])

  async function copy() {
    await navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function download() {
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'config.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="card">
      <h2>{t('output.heading')}</h2>
      {warnings.map((warning) => (
        <div className="warning-banner" key={warning}>
          {warning}
        </div>
      ))}
      {!config && <p className="help-text">{t('output.emptyState')}</p>}
      {config && (
        <>
          <div className="row spacer-top" style={{ marginBottom: 12 }}>
            <button type="button" className="primary" onClick={download}>
              {t('output.download')}
            </button>
            <button type="button" onClick={copy}>
              {copied ? t('output.copied') : t('output.copy')}
            </button>
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={showComments}
                  onChange={(event) => setShowComments(event.target.checked)}
                />
                {t('output.showComments')}
              </label>
            </div>
          </div>
          <p className="help-text">
            {t('output.trayRunnerHint')}{' '}
            <a
              href="https://github.com/soksanichenko/sing-box-tray-runner"
              target="_blank"
              rel="noopener noreferrer"
            >
              sing-box-tray-runner
            </a>
          </p>
          <pre className="json-output">
            <code dangerouslySetInnerHTML={{ __html: highlighted }} />
          </pre>
        </>
      )}
    </div>
  )
}
