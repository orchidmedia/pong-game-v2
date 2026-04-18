import type { ScreenModule, ScreenState } from '../state/types'
import { currentUser } from '@/features/firebase/auth'

export function createMainMenuScreen(): ScreenModule {
  return {
    render(container: HTMLElement, _state: ScreenState) {
      container.innerHTML = ''
      const wrap = document.createElement('div')
      wrap.className = 'ui-screen'

      // Title
      const title = document.createElement('h1')
      title.className = 'ui-title'
      title.textContent = 'PONG'
      wrap.appendChild(title)

      // Buttons
      const group = document.createElement('div')
      group.className = 'ui-btn-group'

      const btnCpu = document.createElement('button')
      btnCpu.className = 'ui-btn'
      btnCpu.textContent = 'Play vs CPU'
      btnCpu.onclick = () => window.selectMode('cpu')

      const btnLocal = document.createElement('button')
      btnLocal.className = 'ui-btn'
      btnLocal.textContent = 'Play Local'
      btnLocal.onclick = () => window.selectMode('human')

      const btnOnline = document.createElement('button')
      btnOnline.className = 'ui-btn'
      btnOnline.textContent = 'Play Online'
      btnOnline.onclick = () => window.selectMode('online')

      group.appendChild(btnCpu)
      group.appendChild(btnLocal)
      group.appendChild(btnOnline)
      wrap.appendChild(group)

      // Footer
      const footer = document.createElement('div')
      footer.style.cssText = 'display:flex;gap:12px;margin-top:8px;'

      const btnSettings = document.createElement('button')
      btnSettings.className = 'ui-btn ui-btn--secondary'
      btnSettings.textContent = 'Settings'
      btnSettings.onclick = () => window.showSettings()

      const btnLB = document.createElement('button')
      btnLB.className = 'ui-btn ui-btn--secondary'
      btnLB.textContent = 'Leaderboard'
      btnLB.onclick = () => window.showLeaderboard()

      footer.appendChild(btnSettings)
      footer.appendChild(btnLB)
      wrap.appendChild(footer)

      // Auth area
      const authArea = document.createElement('div')
      authArea.style.cssText = 'margin-top:8px;font-size:12px;opacity:0.6;'
      if (currentUser) {
        authArea.textContent = `${currentUser.displayName ?? currentUser.email} · `
        const signOutBtn = document.createElement('button')
        signOutBtn.style.cssText = 'background:none;border:none;color:#fff;font-family:monospace;font-size:12px;cursor:pointer;opacity:0.6;padding:0;'
        signOutBtn.textContent = 'Sign out'
        signOutBtn.onclick = () => window.doSignOut()
        authArea.appendChild(signOutBtn)
      } else {
        const signInBtn = document.createElement('button')
        signInBtn.style.cssText = 'background:none;border:none;color:#fff;font-family:monospace;font-size:12px;cursor:pointer;opacity:0.6;padding:0;text-decoration:underline;'
        signInBtn.textContent = 'Sign in'
        signInBtn.onclick = () => window.showAuthCard()
        authArea.appendChild(signInBtn)
      }
      wrap.appendChild(authArea)

      container.appendChild(wrap)
    },
    unmount() {}
  }
}
