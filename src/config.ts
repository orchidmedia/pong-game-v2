export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  databaseURL: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

export type GameMode = 'cpu' | 'local' | 'online'

export interface AppConfig {
  firebase: FirebaseConfig
  defaultGameMode: GameMode
  isConfigured: boolean
}

const config: AppConfig = {
  firebase: {
    apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            ?? '',
    authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        ?? '',
    databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL       ?? '',
    projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         ?? '',
    storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     ?? '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId:             import.meta.env.VITE_FIREBASE_APP_ID             ?? '',
  },
  defaultGameMode: (import.meta.env.VITE_GAME_MODE as GameMode) ?? 'cpu',
  isConfigured:    !!import.meta.env.VITE_FIREBASE_API_KEY,
}

export default config
