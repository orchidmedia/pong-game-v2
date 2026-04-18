import type { ScreenModule, ScreenState } from '../state/types'
import { screenManager } from '../state/screenManager'
import { ScreenName } from '../state/types'
import { getEntries, LeaderboardEntry } from '@/features/firebase/firestore'

const LB_KEY = 'pong_leaderboard'
function loadLocal(): LeaderboardEntry[] {
  try { return JSON.parse(localStorage.getItem(LB_KEY) || '[]') as LeaderboardEntry[] } catch { return [] }
}

export function createLeaderboardScreen(): ScreenModule {
  return {
    render(container: HTMLElement, _state: ScreenState) {
      container.innerHTML = ''
      const wrap = document.createElement('div')
      wrap.className = 'ui-screen'

      const title = document.createElement('h2')
      title.style.cssText = 'font-size:clamp(18px,6vw,28px);letter-spacing:4px;margin-bottom:4px;'
      title.textContent = 'LEADERBOARD'
      wrap.appendChild(title)

      const tableWrap = document.createElement('div')
      tableWrap.style.cssText = 'width:min(580px,92vw);overflow-x:auto;'

      const table = document.createElement('table')
      table.className = 'ui-lb-table'
      table.innerHTML = '<thead><tr><th>#</th><th>Player</th><th>Mode</th><th>Score</th><th>Date</th></tr></thead>'

      const tbody = document.createElement('tbody')
      table.appendChild(tbody)
      tableWrap.appendChild(table)
      wrap.appendChild(tableWrap)

      const sourceEl = document.createElement('div')
      sourceEl.style.cssText = 'font-size:11px;opacity:0.3;margin-top:5px;'
      wrap.appendChild(sourceEl)

      // Show skeleton rows
      for (let i = 0; i < 5; i++) {
        const tr = document.createElement('tr')
        tr.innerHTML = `<td colspan="5"><div class="skeleton"></div></td>`
        tbody.appendChild(tr)
      }

      // Footer buttons
      const nav = document.createElement('div')
      nav.style.cssText = 'display:flex;gap:12px;margin-top:8px;'

      const clearBtn = document.createElement('button')
      clearBtn.className = 'ui-btn ui-btn--secondary'
      clearBtn.textContent = 'Clear Local'
      clearBtn.onclick = () => window.clearLocalScores()

      const backBtn = document.createElement('button')
      backBtn.className = 'ui-btn ui-btn--secondary'
      backBtn.textContent = '← Back'
      backBtn.onclick = () => screenManager.navigate(ScreenName.MAIN_MENU)

      nav.appendChild(clearBtn)
      nav.appendChild(backBtn)
      wrap.appendChild(nav)

      container.appendChild(wrap)

      // Fetch data
      const renderEntries = (entries: LeaderboardEntry[], online: boolean) => {
        tbody.innerHTML = ''
        sourceEl.textContent = online ? '🌐 Online leaderboard' : '💾 Local scores only'
        if (entries.length === 0) {
          const tr = document.createElement('tr')
          tr.innerHTML = `<td colspan="5" style="opacity:0.4;text-align:center;padding:16px;">No games played yet.</td>`
          tbody.appendChild(tr)
          return
        }
        const rankIcons = ['🥇', '🥈', '🥉']
        entries.forEach((e, i) => {
          const tr = document.createElement('tr')
          const rank = i < 3 ? rankIcons[i] : String(i + 1)
          tr.innerHTML = `<td>${rank}</td><td>${e.winner || e.displayName || '—'}</td><td>${e.mode}</td><td>${e.score}</td><td>${e.date}</td>`
          tbody.appendChild(tr)
        })
      }

      getEntries()
        .then(entries => renderEntries(entries, true))
        .catch(() => renderEntries(loadLocal(), false))
    },
    unmount() {}
  }
}
