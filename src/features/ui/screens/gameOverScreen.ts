import type { ScreenModule, ScreenState } from '../state/types'
import { screenManager } from '../state/screenManager'
import { ScreenName } from '../state/types'

export function createGameOverScreen(): ScreenModule {
  return {
    render(container: HTMLElement, state: ScreenState) {
      container.innerHTML = ''
      const wrap = document.createElement('div')
      wrap.className = 'ui-screen'

      const params = state.params

      // Title
      const title = document.createElement('h2')
      title.style.cssText = 'font-size:clamp(24px,8vw,40px);letter-spacing:6px;margin-bottom:4px;'

      if (!params?.matchResult) {
        title.textContent = 'MATCH COMPLETE'
      } else {
        const titles: Record<string, string> = {
          win:  'VICTORY',
          loss: 'DEFEAT',
          draw: 'DRAW',
        }
        title.textContent = titles[params.matchResult] ?? 'MATCH COMPLETE'
      }
      wrap.appendChild(title)

      // Score display
      if (params?.finalScore) {
        const scoreEl = document.createElement('div')
        scoreEl.style.cssText = 'font-size:clamp(20px,6vw,32px);opacity:0.7;letter-spacing:4px;'
        scoreEl.textContent = `${params.finalScore.player} — ${params.finalScore.opponent}`
        wrap.appendChild(scoreEl)
      }

      // Opponent name
      if (params?.opponentName) {
        const oppEl = document.createElement('div')
        oppEl.style.cssText = 'font-size:12px;opacity:0.5;margin-top:4px;'
        oppEl.textContent = `vs ${params.opponentName}`
        wrap.appendChild(oppEl)
      }

      // Buttons
      const btnGroup = document.createElement('div')
      btnGroup.className = 'ui-btn-group'
      btnGroup.style.marginTop = '16px'

      if (params?.matchResult) {
        const replayBtn = document.createElement('button')
        replayBtn.className = 'ui-btn'
        replayBtn.textContent = 'Play Again'
        replayBtn.onclick = () => {
          if (params.replayMode === 'online') {
            screenManager.navigate(ScreenName.ONLINE_LOBBY)
          } else {
            window.startGame()
          }
        }
        btnGroup.appendChild(replayBtn)
      }

      const menuBtn = document.createElement('button')
      menuBtn.className = 'ui-btn ui-btn--secondary'
      menuBtn.textContent = 'Main Menu'
      menuBtn.onclick = () => window.goToMenu()
      btnGroup.appendChild(menuBtn)

      wrap.appendChild(btnGroup)
      container.appendChild(wrap)
    },
    unmount() {}
  }
}
