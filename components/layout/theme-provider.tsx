'use client'
import { createContext, useContext, useEffect, useState } from 'react'
type Theme = 'dark' | 'light'
const Ctx = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'dark', toggle: () => {} })
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')
  useEffect(() => {
    const s = localStorage.getItem('al-theme') as Theme | null
    if (s) { setTheme(s); document.documentElement.classList.toggle('light', s === 'light') }
  }, [])
  const toggle = () => {
    const n = theme === 'dark' ? 'light' : 'dark'
    setTheme(n); localStorage.setItem('al-theme', n)
    document.documentElement.classList.toggle('light', n === 'light')
  }
  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>
}
export const useTheme = () => useContext(Ctx)
