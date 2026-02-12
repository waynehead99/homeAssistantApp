import { useState } from 'react'
import { HomeAssistantProvider, useHomeAssistantContext } from './context/HomeAssistantContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { SetupScreen } from './components/SetupScreen'
import { Layout } from './components/Layout'
import { TabBar, type TabId } from './components/TabBar'
import { HomeView } from './views/HomeView'
import { RoomsView } from './views/RoomsView'
import { CamerasView } from './views/CamerasView'
import { WeatherView } from './views/WeatherView'
import { CalendarView } from './views/CalendarView'
import { SettingsView } from './views/SettingsView'
import { CarsView } from './views/CarsView'
import { CamperView } from './views/CamperView'
import { HouseModeView } from './views/HouseModeView'

const validTabs: TabId[] = ['home', 'rooms', 'cameras', 'weather', 'calendar', 'cars', 'camper', 'houseMode', 'settings']

function getInitialTab(): TabId {
  const params = new URLSearchParams(window.location.search)
  const tab = params.get('tab')
  if (tab && validTabs.includes(tab as TabId)) {
    return tab as TabId
  }
  return 'home'
}

function AppContent() {
  const { configured, connectionStatus, settingsError } = useHomeAssistantContext()
  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab)

  // Show setup screen if not configured or connection error
  if (!configured || connectionStatus === 'error') {
    return <SetupScreen />
  }

  // Show error if settings couldn't be loaded from HA
  if (settingsError) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <svg className="w-16 h-16 text-red-400 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <h2 className="text-xl font-semibold text-white mb-2">Settings Load Error</h2>
          <p className="text-slate-400 mb-4">{settingsError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Show loading while connecting
  if (connectionStatus === 'connecting') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Connecting to Home Assistant...</p>
        </div>
      </div>
    )
  }

  // Get title based on active tab
  const getTitle = () => {
    switch (activeTab) {
      case 'home': return 'Home'
      case 'rooms': return 'Rooms'
      case 'cameras': return 'Cameras'
      case 'weather': return 'Weather'
      case 'calendar': return 'Calendar'
      case 'cars': return 'Cars'
      case 'camper': return 'Camper'
      case 'houseMode': return 'House Mode'
      case 'settings': return 'Settings'
      default: return 'Home'
    }
  }

  // Render active view
  const renderView = () => {
    switch (activeTab) {
      case 'home': return <HomeView />
      case 'rooms': return <RoomsView />
      case 'cameras': return <CamerasView />
      case 'weather': return <WeatherView />
      case 'calendar': return <CalendarView />
      case 'cars': return <CarsView />
      case 'camper': return <CamperView />
      case 'houseMode': return <HouseModeView />
      case 'settings': return <SettingsView />
      default: return <HomeView />
    }
  }

  // Main dashboard
  return (
    <Layout title={getTitle()}>
      {renderView()}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </Layout>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <HomeAssistantProvider>
        <AppContent />
      </HomeAssistantProvider>
    </ErrorBoundary>
  )
}
