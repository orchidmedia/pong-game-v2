import type { ScreenModule, ScreenState } from '../state/types'
import { screenManager } from '../state/screenManager'
import { ScreenName } from '../state/types'

export function createAuthCardScreen(): ScreenModule {
  return {
    render(container: HTMLElement, _state: ScreenState) {
      container.innerHTML = ''
      const wrap = document.createElement('div')
      wrap.className = 'ui-screen'

      const title = document.createElement('h2')
      title.style.cssText = 'font-size:clamp(18px,6vw,28px);letter-spacing:4px;margin-bottom:4px;'
      title.textContent = 'SIGN IN'
      wrap.appendChild(title)

      // The actual auth elements are always present in the DOM (injected by initUI)
      // Just show them in a card wrapper
      const card = document.createElement('div')
      card.className = 'ui-card'

      const authHolder = document.getElementById('auth-card')
      if (authHolder) {
        // Clone and show the content inline
        const clone = authHolder.cloneNode(true) as HTMLElement
        clone.style.display = 'flex'
        clone.style.flexDirection = 'column'
        clone.style.alignItems = 'center'
        clone.style.gap = '10px'
        clone.style.width = '100%'
        clone.removeAttribute('id') // avoid duplicate IDs from clone
        card.appendChild(clone)
      }

      wrap.appendChild(card)

      const backBtn = document.createElement('button')
      backBtn.className = 'ui-btn ui-btn--secondary'
      backBtn.textContent = '← Back'
      backBtn.style.marginTop = '8px'
      backBtn.onclick = () => screenManager.navigate(ScreenName.MAIN_MENU)
      wrap.appendChild(backBtn)

      container.appendChild(wrap)
    },
    unmount() {}
  }
}
