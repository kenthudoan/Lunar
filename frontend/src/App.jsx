import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { useGameStore } from './store'

import Layout from './components/Layout/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import { RequireAuth, GuestOnly, RequireAdmin } from './components/AuthGuard'

import Home from './pages/Home'
import ScenarioBuilder from './pages/ScenarioBuilder'
import Play from './pages/Play'
import Library from './pages/Library'
import Profile from './pages/Profile'
import SettingsPage from './pages/SettingsPage'
import Admin from './pages/Admin'
import Login from './pages/Login'
import Register from './pages/Register'

function App() {
  useEffect(() => {
    useGameStore.getState().restoreSettings()
    // Validate existing token on app load
    useGameStore.getState().hydrateUser()
  }, [])

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Auth pages — only for guests, no sidebar/header */}
          <Route element={<GuestOnly />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* Standard layout routes — require auth */}
          <Route element={<RequireAuth><Layout /></RequireAuth>}>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<ScenarioBuilder />} />
            <Route path="/library" element={<Library />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Admin — require admin */}
          <Route element={<RequireAdmin><Layout /></RequireAdmin>}>
            <Route path="/admin" element={<Admin />} />
          </Route>

          {/* Play — full-screen, require auth, no standard layout */}
          <Route path="/play/:campaignId" element={<RequireAuth><Play /></RequireAuth>} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
