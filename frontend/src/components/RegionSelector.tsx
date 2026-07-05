import { REGION_OPTIONS } from '../types/region'
import type { Region } from '../types/region'
import { useLang } from '../i18n/LangContext'

interface Props {
  value: Region
  onChange: (value: Region) => void
}

export function RegionSelector({ value, onChange }: Props) {
  const { t } = useLang()
  return (
    <div className="card">
      <h2>{t('region.heading')}</h2>
      <p className="help-text">{t('region.help')}</p>
      <div className="field">
        <label htmlFor="region">{t('region.label')}</label>
        <select id="region" value={value} onChange={(event) => onChange(event.target.value as Region)}>
          {REGION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
