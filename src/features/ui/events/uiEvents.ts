export const UI_EVENTS = {
  SCREEN_CHANGED:        'screenChanged',
  MODE_SELECTED:         'modeSelected',
  DIFFICULTY_SELECTED:   'difficultySelected',
  ROOM_CREATED:          'roomCreated',
  ROOM_JOINED:           'roomJoined',
  GAME_RESUMED:          'gameResumed',
  QUIT_TO_MENU:          'quitToMenu',
  SETTINGS_SAVED:        'settingsSaved',
  LEADERBOARD_REFRESHED: 'leaderboardRefreshed',
} as const

class UIEventEmitter {
  private handlers: Map<string, Array<(payload?: unknown) => void>> = new Map()
  on(event: string, handler: (payload?: unknown) => void): void {
    if (!this.handlers.has(event)) this.handlers.set(event, [])
    this.handlers.get(event)!.push(handler)
  }
  off(event: string, handler: (payload?: unknown) => void): void {
    const arr = this.handlers.get(event) ?? []
    this.handlers.set(event, arr.filter(h => h !== handler))
  }
  emit(event: string, payload?: unknown): void {
    ;(this.handlers.get(event) ?? []).forEach(h => h(payload))
  }
}

export const uiEvents = new UIEventEmitter()
