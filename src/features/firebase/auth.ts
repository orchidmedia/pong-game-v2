import {
  onAuthStateChanged, signInWithPopup, signOut,
  GoogleAuthProvider, GithubAuthProvider, User
} from 'firebase/auth'
import { getFirebaseAuth } from './setup'

export let currentUser: User | null = null

export function initAuth() {
  const auth = getFirebaseAuth()
  if (!auth) {
    // No Firebase — show auth card in sign-in state immediately
    showAuthCard(null)
    return
  }

  const authCard   = document.getElementById('auth-card') as HTMLElement
  const authSignin = document.getElementById('auth-signin') as HTMLElement
  authCard.style.display         = 'flex'
  authSignin.style.display       = 'flex'
  authSignin.style.flexDirection = 'column'
  authSignin.style.alignItems    = 'center'

  onAuthStateChanged(auth, user => {
    currentUser = user
    showAuthCard(user)
  })
}

function showAuthCard(user: User | null) {
  const authCard   = document.getElementById('auth-card')   as HTMLElement
  const authSignin = document.getElementById('auth-signin') as HTMLElement
  const authUser   = document.getElementById('auth-user')   as HTMLElement

  authCard.style.display = 'flex'

  if (user) {
    authSignin.style.display = 'none'
    authUser.style.display   = 'flex'
    const nameEl = document.getElementById('auth-name')
    const avEl   = document.getElementById('auth-avatar') as HTMLImageElement
    const provEl = document.getElementById('auth-provider')
    if (nameEl) nameEl.textContent = user.displayName ?? user.email ?? ''
    if (avEl && user.photoURL) { avEl.src = user.photoURL; avEl.style.display = 'block' }
    const pid = user.providerData[0]?.providerId ?? ''
    if (provEl) provEl.textContent = pid.includes('google') ? 'via Google' : pid.includes('github') ? 'via GitHub' : ''
  } else {
    authSignin.style.display       = 'flex'
    authSignin.style.flexDirection = 'column'
    authSignin.style.alignItems    = 'center'
    authUser.style.display         = 'none'
  }
}

export function signInGoogle() {
  const auth = getFirebaseAuth()
  if (!auth) return
  signInWithPopup(auth, new GoogleAuthProvider()).catch(console.error)
}

export function signInGithub() {
  const auth = getFirebaseAuth()
  if (!auth) return
  signInWithPopup(auth, new GithubAuthProvider()).catch(console.error)
}

export function doSignOut() {
  const auth = getFirebaseAuth()
  if (!auth) return
  signOut(auth)
}
