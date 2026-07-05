import { LANG_OPTIONS, type Lang } from '../i18n/translations'

interface Props {
  value: Lang
  onChange: (value: Lang) => void
}

export function LanguageSwitcher({ value, onChange }: Props) {
  return (
    <select
      className="lang-switcher"
      aria-label="Language"
      value={value}
      onChange={(event) => onChange(event.target.value as Lang)}
    >
      {LANG_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.flag} {option.label}
        </option>
      ))}
    </select>
  )
}
