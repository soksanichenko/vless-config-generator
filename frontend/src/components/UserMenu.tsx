import { useEffect, useState } from 'react'
import type { Whoami } from '../types/whoami'
import { useLang } from '../i18n/LangContext'

export function UserMenu() {
  const { t } = useLang()
  const [whoami, setWhoami] = useState<Whoami | null>(null)

  useEffect(() => {
    fetch('/api/whoami')
      .then((response) => (response.ok ? (response.json() as Promise<Whoami>) : null))
      .then(setWhoami)
      .catch(() => setWhoami(null))
  }, [])

  if (!whoami || !whoami.discordUserId) return null

  return (
    <div className="user-menu">
      {whoami.avatarUrl ? (
        <img src={whoami.avatarUrl} alt="" />
      ) : (
        <span className="avatar-placeholder" />
      )}
      {whoami.isAdmin && (
        <a className="button" href="/admin/">
          {t('userMenu.admin')}
        </a>
      )}
      <form action="/logout" method="post">
        <button type="submit">{t('client.logout')}</button>
      </form>
    </div>
  )
}
