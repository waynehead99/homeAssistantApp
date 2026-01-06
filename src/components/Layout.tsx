import { type ReactNode, useState } from 'react'
import { useHomeAssistantContext } from '../context/HomeAssistantContext'
import { RefreshIcon } from './icons'
import { EntityControlModal } from './EntityControlModal'
import { LockControls } from './LockControls'
import { AlarmControls } from './AlarmControls'
import type { LockEntity, AlarmEntity } from '../types/homeAssistant'

interface LayoutProps {
  children: ReactNode
  title?: string
}

type ModalEntity =
  | { type: 'lock'; entity: LockEntity }
  | { type: 'alarm'; entity: AlarmEntity }
  | null

export function Layout({ children, title = 'Home' }: LayoutProps) {
  const { refresh, connectionStatus, primaryWeather, filteredPeople, locks, alarms, hiddenEntities, updateEntity, getDisplayName } = useHomeAssistantContext()
  const [modalEntity, setModalEntity] = useState<ModalEntity>(null)

  // Filter out hidden entities
  const visibleLocks = locks.filter(l => !hiddenEntities.has(l.entity_id))
  const visibleAlarms = alarms.filter(a => !hiddenEntities.has(a.entity_id))

  const handleRefresh = async () => {
    await refresh()
  }

  const getWeatherIcon = (condition?: string) => {
    const c = condition?.toLowerCase() || ''
    if (c.includes('sunny') || c.includes('clear')) return '☀️'
    if (c.includes('cloud') || c.includes('overcast')) return '☁️'
    if (c.includes('rain') || c.includes('shower')) return '🌧️'
    if (c.includes('snow')) return '❄️'
    if (c.includes('storm') || c.includes('thunder')) return '⛈️'
    if (c.includes('fog') || c.includes('mist')) return '🌫️'
    return '🌤️'
  }

  // Get primary alarm (first one)
  const primaryAlarm = visibleAlarms.length > 0 ? visibleAlarms[0] : null

  // Get alarm status display
  const getAlarmStatus = () => {
    if (!primaryAlarm) return null
    const state = primaryAlarm.state
    if (state === 'armed_away') return { text: 'Away', color: 'text-red-400', bgColor: 'bg-red-500/20' }
    if (state === 'armed_home') return { text: 'Home', color: 'text-orange-400', bgColor: 'bg-orange-500/20' }
    if (state === 'armed_night') return { text: 'Night', color: 'text-purple-400', bgColor: 'bg-purple-500/20' }
    if (state === 'pending' || state === 'arming') return { text: 'Arming', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' }
    if (state === 'triggered') return { text: 'TRIGGERED', color: 'text-red-500', bgColor: 'bg-red-500/30' }
    return { text: 'Disarmed', color: 'text-slate-400', bgColor: 'bg-slate-700' }
  }

  // Get lock summary
  const getLockSummary = () => {
    if (visibleLocks.length === 0) return null
    const lockedCount = visibleLocks.filter(l => l.state === 'locked').length
    const jammedCount = visibleLocks.filter(l => l.state === 'jammed').length
    const unlockedCount = visibleLocks.filter(l => l.state === 'unlocked').length

    if (jammedCount > 0) {
      return { text: `${jammedCount} Jammed`, color: 'text-red-400', bgColor: 'bg-red-500/20', icon: '⚠️' }
    }
    if (unlockedCount > 0) {
      return { text: `${unlockedCount} Unlocked`, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', icon: '🔓' }
    }
    return { text: `${lockedCount} Locked`, color: 'text-green-400', bgColor: 'bg-green-500/20', icon: '🔒' }
  }

  const alarmStatus = getAlarmStatus()
  const lockSummary = getLockSummary()

  // Get modal title
  const getModalTitle = () => {
    if (!modalEntity) return ''
    return getDisplayName(
      modalEntity.entity.entity_id,
      modalEntity.entity.attributes.friendly_name || modalEntity.entity.entity_id.split('.')[1].replace(/_/g, ' ')
    )
  }

  // Format location for display
  const formatLocation = (state: string) => {
    if (state === 'home') return 'Home'
    if (state === 'not_home') return 'Away'
    // Capitalize first letter of each word for zone names
    return state.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-lg border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-2">
          {/* Top row: Title, Weather, Connection */}
          <div className="flex items-center justify-between">
            <h1 className="text-base font-semibold text-white">{title}</h1>

            <div className="flex items-center gap-3">
              {/* Weather */}
              {primaryWeather && (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{getWeatherIcon(primaryWeather.attributes.condition)}</span>
                  <span className="text-sm font-medium text-white">
                    {Math.round(primaryWeather.attributes.temperature || 0)}°
                  </span>
                </div>
              )}

              {/* Connection status */}
              <div className="flex items-center gap-1">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    connectionStatus === 'connected'
                      ? 'bg-green-400'
                      : connectionStatus === 'connecting'
                      ? 'bg-yellow-400 animate-pulse'
                      : 'bg-red-400'
                  }`}
                />
              </div>

              {/* Refresh button */}
              <button
                onClick={handleRefresh}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bottom row: People, Locks, Alarm */}
          <div className="flex items-center justify-between mt-1.5 gap-2">
            {/* People status */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {filteredPeople.map(person => {
                const name = (person.attributes.friendly_name || person.entity_id.split('.')[1]).split(' ')[0]
                const isHome = person.state === 'home'
                const location = formatLocation(person.state)
                return (
                  <div key={person.entity_id} className="flex items-center gap-1.5 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isHome ? 'bg-green-400' : 'bg-slate-600'}`} />
                    <span className={`text-xs truncate ${isHome ? 'text-slate-300' : 'text-slate-500'}`}>
                      {name}
                      <span className="text-slate-500 ml-1">· {location}</span>
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Security status: Locks & Alarm */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Lock status */}
              {lockSummary && (
                <button
                  onClick={() => setModalEntity({ type: 'lock', entity: visibleLocks[0] })}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${lockSummary.bgColor} hover:opacity-80`}
                >
                  <span className="text-xs">{lockSummary.icon}</span>
                  <span className={`text-xs font-medium ${lockSummary.color}`}>{lockSummary.text}</span>
                </button>
              )}

              {/* Alarm status */}
              {alarmStatus && primaryAlarm && (
                <button
                  onClick={() => setModalEntity({ type: 'alarm', entity: primaryAlarm })}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${alarmStatus.bgColor} hover:opacity-80`}
                >
                  <span className="text-xs">🛡️</span>
                  <span className={`text-xs font-medium ${alarmStatus.color}`}>{alarmStatus.text}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-4">{children}</main>

      {/* Control Modal */}
      <EntityControlModal
        isOpen={modalEntity !== null}
        onClose={() => setModalEntity(null)}
        title={getModalTitle()}
      >
        {modalEntity?.type === 'lock' && (
          <>
            <LockControls
              entity={modalEntity.entity}
              onUpdate={(updated) => {
                updateEntity(updated)
                setModalEntity({ type: 'lock', entity: updated })
              }}
            />
            {/* Show all locks if there are multiple */}
            {visibleLocks.length > 1 && (
              <div className="mt-6 pt-4 border-t border-slate-700">
                <h4 className="text-sm font-medium text-slate-400 mb-3">All Locks</h4>
                <div className="space-y-2">
                  {visibleLocks.map(lock => {
                    const name = getDisplayName(
                      lock.entity_id,
                      lock.attributes.friendly_name || lock.entity_id.split('.')[1].replace(/_/g, ' ')
                    )
                    const isLocked = lock.state === 'locked'
                    const isJammed = lock.state === 'jammed'
                    const isSelected = lock.entity_id === modalEntity.entity.entity_id
                    return (
                      <button
                        key={lock.entity_id}
                        onClick={() => setModalEntity({ type: 'lock', entity: lock })}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                          isSelected ? 'bg-blue-500/20 ring-1 ring-blue-500/30' : 'bg-slate-800 hover:bg-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{isJammed ? '⚠️' : isLocked ? '🔒' : '🔓'}</span>
                          <span className="text-sm text-white">{name}</span>
                        </div>
                        <span className={`text-xs font-medium ${
                          isJammed ? 'text-red-400' : isLocked ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                          {isJammed ? 'Jammed' : isLocked ? 'Locked' : 'Unlocked'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
        {modalEntity?.type === 'alarm' && (
          <AlarmControls
            entity={modalEntity.entity}
            onUpdate={(updated) => {
              updateEntity(updated)
              setModalEntity({ type: 'alarm', entity: updated })
            }}
          />
        )}
      </EntityControlModal>
    </div>
  )
}
