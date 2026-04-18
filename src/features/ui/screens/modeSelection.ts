import type { ScreenModule, ScreenState } from '../state/types'
import { screenManager } from '../state/screenManager'
import { ScreenName } from '../state/types'
import { rt } from '@/features/game/runtime'

export function createModeSelectionScreen(): ScreenModule {
  return {
    render(container: HTMLElement, _state: ScreenState) {
      container.innerHTML = ''
      const wrap = document.createElement('div')
      wrap.className = 'ui-screen'

      const title = document.createElement('h2')
      title.style.cssText = 'font-size:clamp(18px,6vw,28px);letter-spacing:4px;margin-bottom:4px;'
      title.textContent = 'SELECT MODE'
      wrap.appendChild(title)

      const modes: Array<{ id: 'cpu' | 'human' | 'online'; label: string; desc: string }> = [
        { id: 'cpu',    label: 'VS CPU',    desc: 'Play against the computer' },
        { id: 'human',  label: 'LOCAL 2P',  desc: 'Play with a friend locally' },
        { id: 'online', label: 'ONLINE',    desc: 'Play online with others' },
      ]

      let selected: 'cpu' | 'human' | 'online' = rt.mode as 'cpu' | 'human' | 'online'

      const cards: HTMLDivElement[] = []

      modes.forEach(m => {
        const card = document.createElement('div')
        card.className = 'ui-option-card' + (selected === m.id ? ' selected' : '')
        card.innerHTML = `<div><div class="card-title">${m.label}</div><div class="card-desc">${m.desc}</div></div>`
        card.onclick = () => {
          selected = m.id
          cards.forEach((c, i) => c.classList.toggle('selected', modes[i].id === m.id))
          rt.mode = m.id
          if (m.id === 'online') {
            screenManager.navigate(ScreenName.ONLINE_LOBBY, { selectedMode: 'online' })
          } else {
            screenManager.navigate(ScreenName.DIFFICULTY_SELECTION, { selectedMode: m.id })
          }
        }
        cards.push(card)
        wrap.appendChild(card)
      })

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
