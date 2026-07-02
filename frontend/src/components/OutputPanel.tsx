import { useState } from 'react'
import type { SingBoxConfig } from '../types/singbox'

interface Props {
  config: SingBoxConfig | null
  warnings: string[]
}

export function OutputPanel({ config, warnings }: Props) {
  const [copied, setCopied] = useState(false)
  const json = config ? JSON.stringify(config, null, 2) : ''

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
      <h2>6. Output</h2>
      {warnings.map((warning) => (
        <div className="warning-banner" key={warning}>
          {warning}
        </div>
      ))}
      {!config && <p className="help-text">Paste a valid config above to see the output.</p>}
      {config && (
        <>
          <div className="row spacer-top" style={{ marginBottom: 12 }}>
            <button type="button" className="primary" onClick={download}>
              Download config.json
            </button>
            <button type="button" onClick={copy}>
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
          </div>
          <output className="json-output">{json}</output>
        </>
      )}
    </div>
  )
}
