import type { BuilderMode } from '../types/builderMode'
import { useLang } from '../i18n/LangContext'

interface Props {
  value: BuilderMode
  onChange: (value: BuilderMode) => void
}

export function BuilderModeToggle({ value, onChange }: Props) {
  const { t } = useLang()
  return (
    <div className="pill-group spacer-top">
      <button type="button" className={value === 'simple' ? 'active' : ''} onClick={() => onChange('simple')}>
        {t('builderMode.simple')}
      </button>
      <button type="button" className={value === 'advanced' ? 'active' : ''} onClick={() => onChange('advanced')}>
        {t('builderMode.advanced')}
      </button>
    </div>
  )
}
