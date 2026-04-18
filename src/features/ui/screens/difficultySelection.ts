import type { ScreenModule, ScreenState } from '../state/types'
import { screenManager } from '../state/screenManager'
import { ScreenName } from '../state/types'
import { rt } from '@/features/game/runtime'

export function createDifficultySelectionScreen(): ScreenModule {
  return {
    render(container: HTMLElement, _state: ScreenState) {
      container.innerHTML = ''
      const wrap = document.createElement('div')
      wrap.className = 'ui-screen'

      const title = document.createElement('h2')
      title.style.cssText = 'font-size:clamp(18px,6vw,28px);letter-spacing:4px;margin-bottom:4px;'
      title.textContent = 'DIFFICULTY'
      wrap.appendChild(title)

      const diffs: Array<{ id: 'easy' | 'medium' | 'hard'; label: string; desc: string }> = [
        { id: 'easy',   label: 'EASY',   desc: 'Relaxed pace, great for beginners' },
        { id: 'medium', label: 'MEDIUM', desc: 'Balanced challenge' },
        { id: 'hard',   label: 'HARD',   desc: 'Fast and unforgiving' },
      ]

      let selected: 'easy' | 'medium' | 'hard' = rt.difficulty as 'easy' | 'medium' | 'hard'
      const cards: HTMLDivElement[] = []

      diffs.forEach(d => {
        const card = document.createElement('div')
        card.className = 'ui-option-card' + (selected === d.id ? ' selected' : '')
        card.innerHTML = `<div><div class="card-title">${d.label}</div><div class="card-desc">${d.desc}</div></div>`
        card.onclick = () => {
          selected = d.id
          cards.forEach((c, i) => c.classList.toggle('selected', diffs[i].id === d.id))
          window.selectDiff(d.id)
        }
        cards.push(card)
        wrap.appendChild(card)
      })

      const backBtn = document.createElement('button')
      backBtn.className = 'ui-btn ui-btn--secondary'
      backBtn.textContent = '← Back'
      backBtn.style.marginTop = '8px'
      backBtn.onclick = () => {
        if (rt.mode === 'human') {
          screenManager.navigate(ScreenName.MAIN_MENU)
        } else {
          screenManager.navigate(ScreenName.MODE_SELECTION)
        }
      }
      wrap.appendChild(backBtn)

      container.appendChild(wrap)
    },
    unmount() {}
  }
}
