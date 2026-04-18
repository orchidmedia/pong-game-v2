import type { ScreenModule, ScreenState } from '../state/types'

export function createPauseOverlayScreen(): ScreenModule {
  return {
    render(container: HTMLElement, _state: ScreenState) {
      container.innerHTML = ''

      const card = document.createElement('div')
      card.className = 'ui-pause-card'

      const title = document.createElement('h2')
      title.style.cssText = 'font-size:clamp(20px,6vw,32px);letter-spacing:6px;'
      title.textContent = 'PAUSED'
      card.appendChild(title)

      const resumeBtn = document.createElement('button')
      resumeBtn.className = 'ui-btn'
      resumeBtn.textContent = 'Resume'
      resumeBtn.onclick = () => window.togglePause()
      card.appendChild(resumeBtn)

      const quitBtn = document.createElement('button')
      quitBtn.className = 'ui-btn ui-btn--secondary'
      quitBtn.textContent = 'Quit to Menu'
      quitBtn.onclick = () => window.goToMenu()
      card.appendChild(quitBtn)

      container.appendChild(card)
    },
    unmount() {}
  }
}
