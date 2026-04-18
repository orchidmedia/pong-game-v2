import type { ScreenModule, ScreenState } from '../state/types'
import { screenManager } from '../state/screenManager'
import { ScreenName } from '../state/types'
import { rt } from '@/features/game/runtime'

export function createOnlineLobbyScreen(): ScreenModule {
  return {
    render(container: HTMLElement, state: ScreenState) {
      container.innerHTML = ''
      const wrap = document.createElement('div')
      wrap.className = 'ui-screen'

      const title = document.createElement('h2')
      title.style.cssText = 'font-size:clamp(18px,6vw,28px);letter-spacing:4px;margin-bottom:4px;'
      title.textContent = 'ONLINE'
      wrap.appendChild(title)

      const card = document.createElement('div')
      card.className = 'ui-card'

      // If already hosting (onlineCode is set), show waiting state
      if (rt.onlineCode) {
        const waitLabel = document.createElement('div')
        waitLabel.className = 'ui-section-label'
        waitLabel.textContent = 'YOUR ROOM CODE'
        card.appendChild(waitLabel)

        const codeDisplay = document.createElement('div')
        codeDisplay.id = 'ol-code-display'
        codeDisplay.style.cssText = 'font-size:48px;letter-spacing:12px;font-weight:bold;text-align:center;'
        codeDisplay.textContent = rt.onlineCode
        card.appendChild(codeDisplay)

        const statusEl = document.createElement('div')
        statusEl.id = 'ol-status'
        statusEl.style.cssText = 'font-size:13px;opacity:0.5;text-align:center;'
        statusEl.textContent = 'Waiting for opponent…'
        card.appendChild(statusEl)

        const cancelBtn = document.createElement('button')
        cancelBtn.className = 'ui-btn ui-btn--secondary'
        cancelBtn.textContent = 'Cancel'
        cancelBtn.onclick = () => window.cancelRoom()
        card.appendChild(cancelBtn)

        // Hidden inputs to satisfy game.ts DOM lookups
        const hiddenInput = document.createElement('input')
        hiddenInput.id = 'ol-code-input'
        hiddenInput.style.display = 'none'
        card.appendChild(hiddenInput)
      } else {
        // Create room section
        const createLabel = document.createElement('div')
        createLabel.className = 'ui-section-label'
        createLabel.textContent = 'CREATE ROOM'
        card.appendChild(createLabel)

        const createBtn = document.createElement('button')
        createBtn.className = 'ui-btn'
        createBtn.textContent = 'Create Room'
        createBtn.onclick = () => window.createRoom()
        card.appendChild(createBtn)

        const divider = document.createElement('div')
        divider.className = 'ui-divider'
        card.appendChild(divider)

        // Join room section
        const joinLabel = document.createElement('div')
        joinLabel.className = 'ui-section-label'
        joinLabel.textContent = 'JOIN ROOM'
        card.appendChild(joinLabel)

        const codeInput = document.createElement('input')
        codeInput.id = 'ol-code-input'
        codeInput.maxLength = 4
        codeInput.autocomplete = 'off'
        codeInput.spellcheck = false
        codeInput.placeholder = 'XXXX'
        codeInput.style.cssText = 'background:transparent;border:2px solid #fff;color:#fff;font-family:monospace;font-size:32px;letter-spacing:10px;text-align:center;text-transform:uppercase;width:180px;padding:8px 4px;outline:none;'
        codeInput.addEventListener('input', () => {
          codeInput.value = codeInput.value.toUpperCase()
        })
        card.appendChild(codeInput)

        const joinBtn = document.createElement('button')
        joinBtn.className = 'ui-btn'
        joinBtn.textContent = 'Join Room'
        joinBtn.onclick = () => window.joinRoom()
        card.appendChild(joinBtn)

        // Placeholder code display (hidden, for compatibility with game.ts)
        const codeDisplay = document.createElement('div')
        codeDisplay.id = 'ol-code-display'
        codeDisplay.style.display = 'none'
        card.appendChild(codeDisplay)

        // Status element
        const statusEl = document.createElement('div')
        statusEl.id = 'ol-status'
        statusEl.style.cssText = 'font-size:13px;opacity:0.5;text-align:center;'
        card.appendChild(statusEl)

        // Focus join input if showJoin param set
        if (state.params?.showJoin) {
          setTimeout(() => codeInput.focus(), 50)
        }
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
