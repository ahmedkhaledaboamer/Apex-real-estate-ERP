import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type Theme = 'light' | 'dark'

export interface UiState {
  theme: Theme
  sidebarCollapsed: boolean
  /** Mobile drawer */
  sidebarOpen: boolean
  commandOpen: boolean
}

const STORAGE = 'erp-ui'

function load(): Pick<UiState, 'theme' | 'sidebarCollapsed'> {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE) || '{}') as Partial<UiState>
    return {
      theme: s.theme === 'dark' ? 'dark' : 'light',
      sidebarCollapsed: !!s.sidebarCollapsed,
    }
  } catch {
    return { theme: 'light', sidebarCollapsed: false }
  }
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: (): UiState => ({ ...load(), sidebarOpen: false, commandOpen: false }),
  reducers: {
    setTheme(s, a: PayloadAction<Theme>) {
      s.theme = a.payload
    },
    toggleTheme(s) {
      s.theme = s.theme === 'dark' ? 'light' : 'dark'
    },
    toggleSidebarCollapsed(s) {
      s.sidebarCollapsed = !s.sidebarCollapsed
    },
    setSidebarOpen(s, a: PayloadAction<boolean>) {
      s.sidebarOpen = a.payload
    },
    setCommandOpen(s, a: PayloadAction<boolean>) {
      s.commandOpen = a.payload
    },
  },
})

export const { setTheme, toggleTheme, toggleSidebarCollapsed, setSidebarOpen, setCommandOpen } = uiSlice.actions
export default uiSlice.reducer

/** Persist + apply the theme class whenever UI prefs change. */
export function persistUi(state: UiState) {
  try {
    localStorage.setItem(STORAGE, JSON.stringify({ theme: state.theme, sidebarCollapsed: state.sidebarCollapsed }))
  } catch {
    /* ignore */
  }
  document.documentElement.classList.toggle('dark', state.theme === 'dark')
}
