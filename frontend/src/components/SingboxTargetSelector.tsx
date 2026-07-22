import { SINGBOX_TARGET_OPTIONS } from '../types/singboxTarget'
import type { SingboxTarget } from '../types/singboxTarget'
import { useLang } from '../i18n/LangContext'

interface Props {
  value: SingboxTarget
  onChange: (value: SingboxTarget) => void
}

export function SingboxTargetSelector({ value, onChange }: Props) {
  const { t } = useLang()
  return (
    <div className="card">
      <h2>{t('singboxTarget.heading')}</h2>
      <p className="help-text">{t('singboxTarget.help')}</p>
      <div className="field">
        <label htmlFor="singbox-target">{t('singboxTarget.label')}</label>
        <select
          id="singbox-target"
          value={value}
          onChange={(event) => onChange(event.target.value as SingboxTarget)}
        >
          {SINGBOX_TARGET_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
