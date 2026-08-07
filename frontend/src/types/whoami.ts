export interface Whoami {
  discordUserId: string | null
  avatarUrl: string | null
  isAdmin: boolean
  canGenerateCredentials: boolean
}
