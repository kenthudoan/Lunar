import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { useGameStore } from './store'

import Layout from './components/Layout/Layout'
import ErrorBoundary from './components/ErrorBoundary'

import Home from './pages/Home'
import ScenarioBuilder from './pages/ScenarioBuilder'
import Play from './pages/Play'
import Library from './pages/Library'
import Profile from './pages/Profile'
import SettingsPage from './pages/SettingsPage'
import Admin from './pages/Admin'

function App() {
  useEffect(() => {
    useGameStore.getState().restoreSettings()
  }, [])

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Standard layout routes */}
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<ScenarioBuilder />} />
            <Route path="/library" element={<Library />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin" element={<Admin />} />
          </Route>

          {/* Play — full-screen, no standard layout */}
          <Route path="/play" element={<Play />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
