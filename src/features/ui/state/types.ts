export enum ScreenName {
  MAIN_MENU = 'mainMenu',
  MODE_SELECTION = 'modeSelection',
  DIFFICULTY_SELECTION = 'difficultySelection',
  ONLINE_LOBBY = 'onlineLobby',
  LEADERBOARD = 'leaderboard',
  SETTINGS = 'settings',
  PAUSE_OVERLAY = 'pauseOverlay',
  GAME_OVER = 'gameOverScreen',
  GAME_ACTIVE = 'gameActive',
  AUTH_CARD = 'authCard',
}

export interface ScreenParams {
  selectedMode?: 'cpu' | 'human' | 'online'
  selectedDifficulty?: 'easy' | 'medium' | 'hard'
  opponentName?: string
  matchResult?: 'win' | 'loss' | 'draw'
  finalScore?: { player: number; opponent: number }
  roomCode?: string
  roomName?: string
  showJoin?: boolean
  replayMode?: string
  replayDifficulty?: string
}

export interface ScreenState {
  current: ScreenName
  previous: ScreenName | null
  history: ScreenName[]
  params?: ScreenParams
}

export interface UIStateShape {
  loading: boolean
  error: { message: string; code: string } | null
  success: { message: string } | null
}

export interface ScreenModule {
  render(container: HTMLElement, state: ScreenState): void
  unmount(): void
}

export interface SettingsData {
  soundEnabled: boolean
  visualEffectsEnabled: boolean
  difficultyPreference: 'easy' | 'medium' | 'hard'
}
