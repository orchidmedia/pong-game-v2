import { screenManager } from './state/screenManager'
import { uiState } from './state/uiState'
import { ScreenName } from './state/types'
import { rt } from '@/features/game/runtime'
import { signInGoogle as _signInGoogle, signInGithub as _signInGithub, doSignOut as _doSignOut, onAuthStateChange } from '@/features/firebase/auth'

// Screen factories
import { createMainMenuScreen } from './screens/mainMenu'
import { createModeSelectionScreen } from './screens/modeSelection'
import { createDifficultySelectionScreen } from './screens/difficultySelection'
import { createOnlineLobbyScreen } from './screens/onlineLobby'
import { createLeaderboardScreen } from './screens/leaderboard'
import { createSettingsScreen } from './screens/settings'
import { createPauseOverlayScreen } from './screens/pauseOverlay'
import { createGameOverScreen } from './screens/gameOverScreen'
import { createAuthCardScreen } from './screens/authCard'

// Game functions for delegation
import {
  startGame as gameStartGame,
  togglePause as gameTogglePause,
  goToMenu as gameGoToMenu,
  clearLocalScores as gameClearLocalScores,
  createRoom as gameCreateRoom,
  joinRoom as gameJoinRoom,
  cancelRoom as gameCancelRoom,
  saveGuestName as gameSaveGuestName,
  showNameSaved as gameShowNameSaved,
  toggleSound as gameToggleSound,
  resizeGame,
} from '@/game'

export function initUI(): void {
  // Pre-render auth elements (always in DOM for auth.ts compatibility)
  const authHolder = document.createElement('div')
  authHolder.id = 'auth-card'
  authHolder.style.cssText = 'display:none;flex-direction:column;align-items:center;gap:10px;width:min(340px,90vw);'
  authHolder.innerHTML = `
    <div id="auth-signin" style="display:none;flex-direction:column;align-items:center;gap:10px;width:100%;">
      <div style="font-size:clamp(10px,1.8vw,13px);opacity:0.5;text-transform:uppercase;letter-spacing:2px;">Your name</div>
      <div id="name-row" style="display:flex;gap:6px;align-items:center;width:100%;">
        <input id="guest-name-input" type="text" maxlength="20" placeholder="Enter your name" style="background:transparent;border:1px solid rgba(255,255,255,0.3);color:#fff;font-family:monospace;font-size:13px;padding:5px 10px;outline:none;flex:1;min-width:0;" autocomplete="off" onkeydown="if(event.key==='Enter'){window.saveGuestName(this.value);window.showNameSaved();}">
        <button id="btn-save-name" onclick="window.saveGuestName(document.getElementById('guest-name-input').value);window.showNameSaved();" style="font-size:12px;padding:5px 12px;white-space:nowrap;background:transparent;border:2px solid #fff;color:#fff;font-family:monospace;cursor:pointer;">Save</button>
      </div>
      <div id="name-saved" style="font-size:11px;opacity:0;color:#fff;transition:opacity 0.3s;">✓ Saved</div>
      <div style="font-size:clamp(10px,1.8vw,13px);opacity:0.5;text-transform:uppercase;letter-spacing:2px;margin-top:4px;">Sign in to save scores online</div>
      <div style="display:flex;gap:8px;">
        <button onclick="window.signInGoogle()" style="font-size:13px;padding:7px 16px;background:transparent;border:2px solid #fff;color:#fff;font-family:monospace;cursor:pointer;">Google</button>
        <button onclick="window.signInGithub()" style="font-size:13px;padding:7px 16px;background:transparent;border:2px solid #fff;color:#fff;font-family:monospace;cursor:pointer;">GitHub</button>
      </div>
    </div>
    <div id="auth-user" style="display:none;align-items:center;gap:10px;">
      <img id="auth-avatar" src="" alt="" style="display:none;width:30px;height:30px;border-radius:50%;border:1px solid rgba(255,255,255,0.35);">
      <div><div id="auth-name" style="font-size:14px;"></div><div id="auth-provider" style="font-size:11px;opacity:0.4;"></div></div>
      <button id="auth-signout" onclick="window.doSignOut()" style="font-size:12px;padding:4px 12px;opacity:0.55;background:transparent;border:2px solid #fff;color:#fff;font-family:monospace;cursor:pointer;">Sign out</button>
    </div>
  `
  document.body.appendChild(authHolder)

  // Load saved guest name
  const savedName = localStorage.getItem('pong_guest_name')
  if (savedName) {
    const inp = document.getElementById('guest-name-input') as HTMLInputElement | null
    if (inp) inp.value = savedName
  }

  // Init screen manager
  const root = document.getElementById('ui-root') as HTMLElement
  screenManager.init(root)
  screenManager.register(ScreenName.MAIN_MENU,            createMainMenuScreen)
  screenManager.register(ScreenName.MODE_SELECTION,       createModeSelectionScreen)
  screenManager.register(ScreenName.DIFFICULTY_SELECTION, createDifficultySelectionScreen)
  screenManager.register(ScreenName.ONLINE_LOBBY,         createOnlineLobbyScreen)
  screenManager.register(ScreenName.LEADERBOARD,          createLeaderboardScreen)
  screenManager.register(ScreenName.SETTINGS,             createSettingsScreen)
  screenManager.register(ScreenName.PAUSE_OVERLAY,        createPauseOverlayScreen)
  screenManager.register(ScreenName.GAME_OVER,            createGameOverScreen)
  screenManager.register(ScreenName.AUTH_CARD,            createAuthCardScreen)

  screenManager.navigate(ScreenName.MAIN_MENU)

  // After sign-in: navigate to main menu so it re-renders with user's name
  onAuthStateChange((user) => {
    if (screenManager.currentScreen === ScreenName.AUTH_CARD) {
      screenManager.navigate(ScreenName.MAIN_MENU)
      if (user) uiState.showSuccess(`Welcome, ${user.displayName ?? user.email ?? 'Player'}!`)
    }
  })
}

// ── The exported window functions ──

export function selectMode(m: string): void {
  rt.mode = m as 'cpu' | 'human' | 'online'
  if (m === 'online') {
    screenManager.navigate(ScreenName.ONLINE_LOBBY, { selectedMode: 'online' })
  } else {
    screenManager.navigate(ScreenName.DIFFICULTY_SELECTION, { selectedMode: m as 'cpu' | 'human' })
  }
}

export function selectDiff(d: string): void {
  rt.difficulty = d as 'easy' | 'medium' | 'hard'
  screenManager.navigate(ScreenName.GAME_ACTIVE)
  gameStartGame()
}

export function startGame(): void {
  screenManager.navigate(ScreenName.GAME_ACTIVE)
  gameStartGame()
}

export function togglePause(): void {
  if (screenManager.currentScreen === ScreenName.PAUSE_OVERLAY) {
    // Resume
    screenManager.navigate(ScreenName.GAME_ACTIVE)
    gameTogglePause()
  } else {
    // Pause
    screenManager.navigate(ScreenName.PAUSE_OVERLAY)
    gameTogglePause()
  }
}

export function goToMenu(): void {
  gameGoToMenu()
  screenManager.navigate(ScreenName.MAIN_MENU)
  screenManager.clearHistory()
}

export async function showLeaderboard(): Promise<void> {
  screenManager.navigate(ScreenName.LEADERBOARD)
}

export function showMenu(): void {
  screenManager.navigate(ScreenName.MAIN_MENU)
}

export function clearLocalScores(): void {
  gameClearLocalScores()
}

export async function createRoom(): Promise<void> {
  uiState.setLoading(true)
  try { await gameCreateRoom() } finally { uiState.setLoading(false) }
}

export async function joinRoom(): Promise<void> {
  uiState.setLoading(true)
  try { await gameJoinRoom() } finally { uiState.setLoading(false) }
}

export async function cancelRoom(): Promise<void> {
  await gameCancelRoom()
  screenManager.navigate(ScreenName.MAIN_MENU)
}

export function showJoinForm(): void {
  screenManager.navigate(ScreenName.ONLINE_LOBBY, { showJoin: true })
}

export function showOlChoice(): void {
  screenManager.navigate(ScreenName.ONLINE_LOBBY)
}

export function saveGuestName(val: string): void {
  gameSaveGuestName(val)
  uiState.showSuccess('Name saved')
}

export function showNameSaved(): void {
  gameShowNameSaved()
}

export function toggleSound(): void {
  gameToggleSound()
  uiState.showSuccess('Sound toggled')
}

export function signInGoogle(): void {
  _signInGoogle()
}

export function signInGithub(): void {
  _signInGithub()
}

export function signOutUser(): void {
  _doSignOut()
  screenManager.navigate(ScreenName.MAIN_MENU)
  uiState.showSuccess('Signed out')
}

export const doSignOut = signOutUser

export function showSettings(): void {
  screenManager.navigate(ScreenName.SETTINGS)
}

export function showAuthCard(): void {
  screenManager.navigate(ScreenName.AUTH_CARD)
}

// Re-export for convenience
export { resizeGame }
