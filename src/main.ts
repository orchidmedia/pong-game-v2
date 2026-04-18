import { initFirebase } from '@/features/firebase/setup'
import { initAuth } from '@/features/firebase/auth'
import { initGame } from '@/game'
import {
  initUI,
  selectMode, selectDiff, startGame, togglePause, goToMenu,
  showLeaderboard, showMenu, clearLocalScores, createRoom, joinRoom,
  cancelRoom, showJoinForm, showOlChoice, saveGuestName, showNameSaved,
  toggleSound, signInGoogle, signInGithub, signOutUser, doSignOut,
  showSettings, showAuthCard,
} from '@/features/ui'

// Types for window
declare global {
  interface Window {
    selectMode:       typeof selectMode
    selectDiff:       typeof selectDiff
    startGame:        typeof startGame
    togglePause:      typeof togglePause
    goToMenu:         typeof goToMenu
    showLeaderboard:  typeof showLeaderboard
    showMenu:         typeof showMenu
    clearLocalScores: typeof clearLocalScores
    createRoom:       typeof createRoom
    joinRoom:         typeof joinRoom
    cancelRoom:       typeof cancelRoom
    showJoinForm:     typeof showJoinForm
    showOlChoice:     typeof showOlChoice
    saveGuestName:    typeof saveGuestName
    showNameSaved:    typeof showNameSaved
    toggleSound:      typeof toggleSound
    signInGoogle:     typeof signInGoogle
    signInGithub:     typeof signInGithub
    signOutUser:      typeof signOutUser
    doSignOut:        typeof doSignOut
    showSettings:     typeof showSettings
    showAuthCard:     typeof showAuthCard
  }
}

initFirebase()
initAuth()
initGame()
initUI()

window.selectMode       = selectMode
window.selectDiff       = selectDiff
window.startGame        = startGame
window.togglePause      = togglePause
window.goToMenu         = goToMenu
window.showLeaderboard  = showLeaderboard
window.showMenu         = showMenu
window.clearLocalScores = clearLocalScores
window.createRoom       = createRoom
window.joinRoom         = joinRoom
window.cancelRoom       = cancelRoom
window.showJoinForm     = showJoinForm
window.showOlChoice     = showOlChoice
window.saveGuestName    = saveGuestName
window.showNameSaved    = showNameSaved
window.toggleSound      = toggleSound
window.signInGoogle     = signInGoogle
window.signInGithub     = signInGithub
window.signOutUser      = signOutUser
window.doSignOut        = doSignOut
window.showSettings     = showSettings
window.showAuthCard     = showAuthCard
