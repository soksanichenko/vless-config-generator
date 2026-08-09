import type { FinalAction } from '../types/rules'
import { useLang } from '../i18n/LangContext'

interface Props {
  stepNumber: number
  value: FinalAction
  onChange: (value: FinalAction) => void
}

export function DefaultOutboundToggle({ stepNumber, value, onChange }: Props) {
  const { t } = useLang()
  return (
    <div className="card">
      <h2>{stepNumber}. {t('defaultOutbound.heading')}</h2>
      <p className="help-text">{t('defaultOutbound.help')}</p>
      <div className="pill-group">
        <button type="button" className={value === 'direct' ? 'active' : ''} onClick={() => onChange('direct')}>
          {t('common.direct')}
        </button>
        <button type="button" className={value === 'proxy' ? 'active' : ''} onClick={() => onChange('proxy')}>
          {t('common.proxy')}
        </button>
      </div>
    </div>
  )
}
