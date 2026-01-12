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
  const { refresh, connectionStatus, primaryWeather, filteredPeople, locks, alarms, sensors, hiddenEntities, updateEntity, getDisplayName } = useHomeAssistantContext()
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

  // Check if Ford alarm is armed (considers car doors locked)
  const fordAlarmSensor = sensors.find(s => s.entity_id.toLowerCase().includes('fordpass_alarm'))
  const fordAlarmState = fordAlarmSensor?.state?.toLowerCase() || ''
  const isFordAlarmArmed = fordAlarmState === 'set' || fordAlarmState === 'armed' || fordAlarmState.includes('arm')

  // Separate Ford locks from house locks
  const fordLocks = visibleLocks.filter(l => l.entity_id.toLowerCase().includes('fordpass'))
  const houseLocks = visibleLocks.filter(l => !l.entity_id.toLowerCase().includes('fordpass'))

  // Get lock summary
  const getLockSummary = () => {
    // Count house locks normally
    const houseLockedCount = houseLocks.filter(l => l.state === 'locked').length
    const houseJammedCount = houseLocks.filter(l => l.state === 'jammed').length
    const houseUnlockedCount = houseLocks.filter(l => l.state === 'unlocked').length

    // Ford locks are considered locked if alarm is armed
    const fordLockedCount = isFordAlarmArmed ? fordLocks.length : fordLocks.filter(l => l.state === 'locked').length
    const fordUnlockedCount = isFordAlarmArmed ? 0 : fordLocks.filter(l => l.state === 'unlocked').length

    const totalLocked = houseLockedCount + fordLockedCount
    const totalUnlocked = houseUnlockedCount + fordUnlockedCount
    const totalLocks = houseLocks.length + fordLocks.length

    // If no locks at all
    if (totalLocks === 0 && !isFordAlarmArmed) return null
    if (totalLocks === 0 && isFordAlarmArmed) {
      return { text: 'Secured', color: 'text-green-400', bgColor: 'bg-green-500/20', icon: '🔒' }
    }

    if (houseJammedCount > 0) {
      return { text: `${houseJammedCount} Jammed`, color: 'text-red-400', bgColor: 'bg-red-500/20', icon: '⚠️' }
    }
    if (totalUnlocked > 0) {
      return { text: `${totalUnlocked} Unlocked`, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', icon: '🔓' }
    }
    return { text: `${totalLocked} Locked`, color: 'text-green-400', bgColor: 'bg-green-500/20', icon: '🔒' }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 overflow-x-hidden">
      {/* Subtle gradient mesh background */}
      <div className="fixed inset-0 bg-gradient-mesh pointer-events-none opacity-60" />

      {/* Header */}
      <header className="glass-card sticky top-0 z-20 rounded-none border-t-0 border-x-0">
        <div className="max-w-3xl mx-auto px-4 py-2">
          {/* Top row: Title, Weather, Connection */}
          <div className="flex items-center justify-between">
            <h1 className="text-base font-semibold text-slate-800">{title}</h1>

            <div className="flex items-center gap-3">
              {/* Weather */}
              {primaryWeather && (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{getWeatherIcon(primaryWeather.attributes.condition)}</span>
                  <span className="text-sm font-medium text-slate-700">
                    {Math.round(primaryWeather.attributes.temperature || 0)}°
                  </span>
                </div>
              )}

              {/* Connection status */}
              <div className="flex items-center gap-1">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    connectionStatus === 'connected'
                      ? 'bg-green-500'
                      : connectionStatus === 'connecting'
                      ? 'bg-yellow-500 animate-pulse'
                      : 'bg-red-500'
                  }`}
                />
              </div>

              {/* Refresh button */}
              <button
                onClick={handleRefresh}
                className="glass-button p-1.5 text-slate-500 hover:text-slate-700 rounded-lg"
                title="Refresh"
              >
                <RefreshIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bottom row: People, Locks, Alarm */}
          <div className="flex items-center justify-between mt-1.5 gap-2">
            {/* People status */}
            <div className="flex items-center gap-4 flex-1 min-w-0 overflow-x-auto">
              {filteredPeople.map(person => {
                const name = (person.attributes.friendly_name || person.entity_id.split('.')[1]).split(' ')[0]
                const isHome = person.state === 'home'
                const location = formatLocation(person.state)
                return (
                  <div key={person.entity_id} className="flex items-center gap-2 flex-shrink-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isHome ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]' : 'bg-slate-400'}`} />
                    <div className="flex flex-col">
                      <span className={`text-xs font-medium ${isHome ? 'text-slate-700' : 'text-slate-500'}`}>
                        {name}
                      </span>
                      <span className={`text-[10px] ${isHome ? 'text-green-600' : 'text-slate-400'}`}>
                        {location}
                      </span>
                    </div>
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
                  className={`glass-button flex items-center gap-1 px-2.5 py-1.5 rounded-lg`}
                >
                  <span className="text-xs">{lockSummary.icon}</span>
                  <span className={`text-xs font-medium ${lockSummary.color.replace('-400', '-600')}`}>{lockSummary.text}</span>
                </button>
              )}

              {/* Alarm status */}
              {alarmStatus && primaryAlarm && (
                <button
                  onClick={() => setModalEntity({ type: 'alarm', entity: primaryAlarm })}
                  className={`glass-button flex items-center gap-1 px-2.5 py-1.5 rounded-lg`}
                >
                  <span className="text-xs">🛡️</span>
                  <span className={`text-xs font-medium ${alarmStatus.color.replace('-400', '-600').replace('-500', '-600')}`}>{alarmStatus.text}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative max-w-3xl mx-auto px-4 py-4 pb-safe">{children}</main>

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
              <div className="mt-6 pt-4 border-t border-slate-200">
                <h4 className="text-sm font-medium text-slate-600 mb-3">All Locks</h4>
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
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                          isSelected
                            ? 'glass-panel ring-1 ring-blue-400/50 glow-blue'
                            : 'glass-panel hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{isJammed ? '⚠️' : isLocked ? '🔒' : '🔓'}</span>
                          <span className="text-sm text-slate-700">{name}</span>
                        </div>
                        <span className={`text-xs font-medium ${
                          isJammed ? 'text-red-600' : isLocked ? 'text-green-600' : 'text-yellow-600'
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
