import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { t as translate, type Lang, type TranslationKey } from './translations'

const STORAGE_KEY = 'lang'

function readStoredLang(): Lang {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  return stored === 'en' || stored === 'ua' || stored === 'ru' ? stored : 'en'
}

interface LangContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
}

const LangContext = createContext<LangContextValue | null>(null)

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang)

  function setLang(next: Lang) {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // localStorage unavailable (private browsing, quota) — language just won't persist.
    }
  }

  const value = useMemo(() => ({ lang, setLang }), [lang])
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

/** Current language plus a `t` helper bound to it — `t('key', { var: 'value' })`. */
export function useLang(): LangContextValue & { t: (key: TranslationKey, vars?: Record<string, string | number>) => string } {
  const context = useContext(LangContext)
  if (!context) throw new Error('useLang must be used within a LangProvider')
  return { ...context, t: (key, vars) => translate(key, context.lang, vars) }
}
