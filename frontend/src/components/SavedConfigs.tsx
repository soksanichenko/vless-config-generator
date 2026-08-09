import { useEffect, useState } from 'react'
import { deleteSavedConfig, fetchSavedConfig, listSavedConfigs, saveConfig } from '../lib/savedConfigs'
import type { SavedConfigMeta } from '../types/savedConfig'
import type { SingBoxConfig } from '../types/singbox'
import { useLang } from '../i18n/LangContext'

// Kept in sync with MAX_SAVED_CONFIGS_PER_ACCOUNT in sources/src/vless_admin/app.py —
// only used here for the "x/N" label, the backend enforces the actual cap.
const MAX_SAVED_CONFIGS = 5

// `Lang`'s 'ua' isn't a real BCP 47 tag (Ukrainian is 'uk') — toLocaleDateString
// needs the real one to actually localize instead of silently falling back.
const DATE_LOCALE: Record<'en' | 'ua' | 'ru', string> = { en: 'en', ua: 'uk', ru: 'ru' }

interface Props {
  stepNumber: number
  config: SingBoxConfig | null
  loggedIn: boolean
}

function downloadText(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function SavedConfigs({ stepNumber, config, loggedIn }: Props) {
  const { t, lang } = useLang()
  const [saved, setSaved] = useState<SavedConfigMeta[]>([])
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [actionError, setActionError] = useState<string | null>(null)

  function refresh() {
    listSavedConfigs()
      .then(setSaved)
      .catch(() => setSaved([]))
  }

  useEffect(() => {
    if (loggedIn) refresh()
    else setSaved([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn])

  async function handleSave() {
    if (!config) return
    setSaveStatus('saving')
    setActionError(null)
    try {
      await saveConfig(JSON.stringify(config, null, 2))
      setSaveStatus('idle')
      refresh()
    } catch (error: unknown) {
      setSaveStatus('error')
      setActionError(error instanceof Error ? error.message : String(error))
    }
  }

  async function handleDownload(item: SavedConfigMeta) {
    setActionError(null)
    try {
      const detail = await fetchSavedConfig(item.id)
      const stamp = new Date(item.createdAt).toISOString().slice(0, 16).replace(/[:T]/g, '-')
      downloadText(detail.config, `sing-box-config-${stamp}.json`)
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : String(error))
    }
  }

  async function handleDelete(item: SavedConfigMeta) {
    setActionError(null)
    try {
      await deleteSavedConfig(item.id)
      refresh()
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <div className="card">
      <h2>{stepNumber}. {t('savedConfigs.heading')}</h2>
      {!loggedIn && (
        <p className="help-text">
          {t('savedConfigs.loginHint')}{' '}
          <a className="button" href="/login">
            {t('client.login')}
          </a>
        </p>
      )}
      {loggedIn && (
        <>
          <p className="help-text">
            {t('savedConfigs.help', { max: MAX_SAVED_CONFIGS })}
          </p>
          <div className="row spacer-top" style={{ marginBottom: 12 }}>
            <button
              type="button"
              className="primary"
              onClick={handleSave}
              disabled={!config || saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? t('savedConfigs.saving') : t('savedConfigs.saveButton')}
            </button>
          </div>
          {actionError && <div className="error-banner">{actionError}</div>}
          {saved.length === 0 && <p className="help-text">{t('savedConfigs.empty')}</p>}
          {saved.map((item) => (
            <div
              className="row"
              key={item.id}
              style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}
            >
              <span>{new Date(item.createdAt).toLocaleString(DATE_LOCALE[lang])}</span>
              <div className="row">
                <button type="button" onClick={() => handleDownload(item)}>
                  {t('savedConfigs.download')}
                </button>
                <button type="button" onClick={() => handleDelete(item)}>
                  {t('savedConfigs.delete')}
                </button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
