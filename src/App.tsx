import { useState } from 'react'
import { HomeAssistantProvider, useHomeAssistantContext } from './context/HomeAssistantContext'
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

function AppContent() {
  const { configured, connectionStatus } = useHomeAssistantContext()
  const [activeTab, setActiveTab] = useState<TabId>('home')

  // Show setup screen if not configured or connection error
  if (!configured || connectionStatus === 'error') {
    return <SetupScreen />
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
    <HomeAssistantProvider>
      <AppContent />
    </HomeAssistantProvider>
  )
}
