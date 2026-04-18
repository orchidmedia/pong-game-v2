import type { ScreenName, ScreenParams, ScreenState, ScreenModule } from './types'
import { uiEvents, UI_EVENTS } from '../events/uiEvents'

class ScreenManager {
  private _state: ScreenState = { current: 'mainMenu' as ScreenName, previous: null, history: [] }
  private currentModule: ScreenModule | null = null
  private container: HTMLElement | null = null
  private factories: Map<ScreenName, () => ScreenModule> = new Map()

  get currentScreen(): ScreenName { return this._state.current }
  get previousScreen(): ScreenName | null { return this._state.previous }
  get history(): ScreenName[] { return [...this._state.history] }
  getParams(): ScreenParams | undefined { return this._state.params }
  clearHistory(): void { this._state.history = [] }

  init(container: HTMLElement): void { this.container = container }

  register(name: ScreenName, factory: () => ScreenModule): void {
    this.factories.set(name, factory)
  }

  navigate(screen: ScreenName, params?: ScreenParams): void {
    if (!this.container) return

    // Unmount current
    this.currentModule?.unmount()
    this.currentModule = null

    // Update history and state
    this._state.history.push(this._state.current)
    this._state.previous = this._state.current
    this._state.current = screen
    this._state.params = params

    const gameEl = document.getElementById('game')

    if (screen === ('gameActive' as ScreenName)) {
      // Hide ui-root, show game canvas
      this.container.style.display = 'none'
      if (gameEl) { gameEl.classList.add('visible') }
      uiEvents.emit(UI_EVENTS.SCREEN_CHANGED, { screen, params })
      return
    }

    // Show ui-root
    this.container.style.display = ''

    if (screen === ('pauseOverlay' as ScreenName)) {
      // Keep game visible underneath, show ui-root as transparent overlay
      if (gameEl) gameEl.classList.add('visible')
      this.container.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.75);z-index:1000;'
    } else {
      // Hide game, show full-screen ui
      if (gameEl) gameEl.classList.remove('visible')
      this.container.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#000;z-index:100;overflow-y:auto;'
    }

    // Render the module
    const factory = this.factories.get(screen)
    if (factory) {
      const mod = factory()
      this.currentModule = mod
      this.container.innerHTML = ''
      mod.render(this.container, { ...this._state })
    }

    uiEvents.emit(UI_EVENTS.SCREEN_CHANGED, { screen, params })
  }

  back(): void {
    if (this._state.history.length === 0) {
      this.navigate('mainMenu' as ScreenName)
      return
    }
    const prev = this._state.history.pop()!
    this.navigate(prev)
  }
}

export const screenManager = new ScreenManager()
