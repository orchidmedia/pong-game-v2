import type { ScreenModule, ScreenState, SettingsData } from '../state/types'
import { screenManager } from '../state/screenManager'
import { ScreenName } from '../state/types'
import { uiState } from '../state/uiState'

const SETTINGS_KEY = 'pong_settings'
const defaultSettings: SettingsData = {
  soundEnabled: true,
  visualEffectsEnabled: true,
  difficultyPreference: 'medium',
}

function loadSettings(): SettingsData {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { ...defaultSettings }
}

function saveSettings(data: SettingsData): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(data))
}

function makeRow(label: string, control: HTMLElement): HTMLDivElement {
  const row = document.createElement('div')
  row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;width:100%;padding:6px 0;'
  const lbl = document.createElement('div')
  lbl.style.cssText = 'font-size:14px;'
  lbl.textContent = label
  row.appendChild(lbl)
  row.appendChild(control)
  return row
}

export function createSettingsScreen(): ScreenModule {
  return {
    render(container: HTMLElement, _state: ScreenState) {
      container.innerHTML = ''
      const wrap = document.createElement('div')
      wrap.className = 'ui-screen'

      const title = document.createElement('h2')
      title.style.cssText = 'font-size:clamp(18px,6vw,28px);letter-spacing:4px;margin-bottom:4px;'
      title.textContent = 'SETTINGS'
      wrap.appendChild(title)

      const card = document.createElement('div')
      card.className = 'ui-card'
      card.style.width = 'min(380px,90vw)'

      const settings = loadSettings()

      // Sound toggle
      const soundCheck = document.createElement('input')
      soundCheck.type = 'checkbox'
      soundCheck.checked = settings.soundEnabled
      soundCheck.style.cssText = 'width:18px;height:18px;cursor:pointer;accent-color:#fff;'
      card.appendChild(makeRow('Sound', soundCheck))

      const divider1 = document.createElement('div')
      divider1.className = 'ui-divider'
      card.appendChild(divider1)

      // Visual FX toggle
      const fxCheck = document.createElement('input')
      fxCheck.type = 'checkbox'
      fxCheck.checked = settings.visualEffectsEnabled
      fxCheck.style.cssText = 'width:18px;height:18px;cursor:pointer;accent-color:#fff;'
      card.appendChild(makeRow('Visual Effects', fxCheck))

      const divider2 = document.createElement('div')
      divider2.className = 'ui-divider'
      card.appendChild(divider2)

      // Difficulty preference
      const diffSelect = document.createElement('select')
      diffSelect.style.cssText = 'background:#000;border:1px solid rgba(255,255,255,0.4);color:#fff;font-family:monospace;font-size:13px;padding:4px 8px;cursor:pointer;'
      ;(['easy', 'medium', 'hard'] as const).forEach(d => {
        const opt = document.createElement('option')
        opt.value = d
        opt.textContent = d.charAt(0).toUpperCase() + d.slice(1)
        opt.selected = settings.difficultyPreference === d
        diffSelect.appendChild(opt)
      })
      card.appendChild(makeRow('Default Difficulty', diffSelect))

      wrap.appendChild(card)

      // Save / Cancel buttons
      const btnRow = document.createElement('div')
      btnRow.style.cssText = 'display:flex;gap:12px;margin-top:8px;'

      const saveBtn = document.createElement('button')
      saveBtn.className = 'ui-btn'
      saveBtn.textContent = 'Save'
      saveBtn.onclick = () => {
        saveSettings({
          soundEnabled: soundCheck.checked,
          visualEffectsEnabled: fxCheck.checked,
          difficultyPreference: diffSelect.value as 'easy' | 'medium' | 'hard',
        })
        uiState.showSuccess('Settings saved')
        screenManager.navigate(ScreenName.MAIN_MENU)
      }

      const cancelBtn = document.createElement('button')
      cancelBtn.className = 'ui-btn ui-btn--secondary'
      cancelBtn.textContent = 'Cancel'
      cancelBtn.onclick = () => screenManager.navigate(ScreenName.MAIN_MENU)

      btnRow.appendChild(saveBtn)
      btnRow.appendChild(cancelBtn)
      wrap.appendChild(btnRow)

      container.appendChild(wrap)
    },
    unmount() {}
  }
}
