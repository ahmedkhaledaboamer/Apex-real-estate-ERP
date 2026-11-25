import { configureStore } from '@reduxjs/toolkit'
import ui, { persistUi } from './uiSlice'

/**
 * Redux holds client-only UI state (theme, sidebar, command palette).
 * Server data (bookings, invoices…) lives in React Query via `src/api/resource.ts`.
 */
export const store = configureStore({ reducer: { ui } })

let last = store.getState().ui
persistUi(last)
store.subscribe(() => {
  const next = store.getState().ui
  if (next !== last) {
    last = next
    persistUi(next)
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
