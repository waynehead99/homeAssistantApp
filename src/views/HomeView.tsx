import { useEffect, useState, useCallback } from 'react'
import { useHomeAssistantContext } from '../context/HomeAssistantContext'
import { useAIInsights } from '../hooks/useAIInsights'
import { lightService, callService } from '../services/homeAssistant'
import { EntityControlModal } from '../components/EntityControlModal'
import { ClimateControls } from '../components/ClimateControls'
import { AlarmControls } from '../components/AlarmControls'
import { VacuumControls } from '../components/VacuumControls'
import { FanControls } from '../components/FanControls'
import { LockControls } from '../components/LockControls'
import { CoverControls } from '../components/CoverControls'
import { AutomationToggle } from '../components/AutomationToggle'
import { RelatedEntitiesSection } from '../components/RelatedEntitiesSection'
import type { ClimateEntity, VacuumEntity, AlarmEntity, FanEntity, LockEntity, CoverEntity } from '../types/homeAssistant'

type ModalEntity =
  | { type: 'climate'; entity: ClimateEntity }
  | { type: 'vacuum'; entity: VacuumEntity }
  | { type: 'alarm'; entity: AlarmEntity }
  | { type: 'fan'; entity: FanEntity }
  | { type: 'lock'; entity: LockEntity }
  | { type: 'cover'; entity: CoverEntity }
  | null

export function HomeView() {
  const { lights, switches, climate, vacuums, alarms, valves, fans, locks, covers, automations, scripts, settings, updateEntity, getDisplayName } = useHomeAssistantContext()
  const { insight, loading, generateInsight, refresh: refreshInsight, isConfigured } = useAIInsights()
  const [loadingEntities, setLoadingEntities] = useState<Set<string>>(new Set())
  const [modalEntity, setModalEntity] = useState<ModalEntity>(null)

  // Generate insight on mount (only if enabled)
  useEffect(() => {
    if (isConfigured && settings.aiInsightsEnabled) {
      generateInsight()
    }
  }, [generateInsight, isConfigured, settings.aiInsightsEnabled])

  // Get pinned entities
  const pinnedEntities = (settings.pinnedEntities || [])
    .map(id => {
      const light = lights.find(l => l.entity_id === id)
      if (light) return { ...light, type: 'light' as const }
      const sw = switches.find(s => s.entity_id === id)
      if (sw) return { ...sw, type: 'switch' as const }
      const clim = climate.find(c => c.entity_id === id)
      if (clim) return { ...clim, type: 'climate' as const }
      const vac = vacuums.find(v => v.entity_id === id)
      if (vac) return { ...vac, type: 'vacuum' as const }
      const alarm = alarms.find(a => a.entity_id === id)
      if (alarm) return { ...alarm, type: 'alarm' as const }
      const valve = valves.find(v => v.entity_id === id)
      if (valve) return { ...valve, type: 'valve' as const }
      const fan = fans.find(f => f.entity_id === id)
      if (fan) return { ...fan, type: 'fan' as const }
      const lock = locks.find(l => l.entity_id === id)
      if (lock) return { ...lock, type: 'lock' as const }
      const cover = covers.find(c => c.entity_id === id)
      if (cover) return { ...cover, type: 'cover' as const }
      return null
    })
    .filter(Boolean)

  // Get pinned automations (includes both automations and scripts)
  const pinnedAutomations = (settings.pinnedAutomations || [])
    .map(id => {
      const automation = automations.find(a => a.entity_id === id)
      if (automation) return automation
      const script = scripts.find(s => s.entity_id === id)
      if (script) return script
      return null
    })
    .filter(Boolean)

  // Handle simple toggle for lights, switches, and valves
  const handleSimpleToggle = useCallback(async (entity: NonNullable<typeof pinnedEntities[number]>) => {
    const entityId = entity.entity_id
    setLoadingEntities(prev => new Set(prev).add(entityId))

    try {
      if (entity.type === 'light') {
        const isOn = entity.state === 'on'
        updateEntity({ ...entity, state: isOn ? 'off' : 'on' })
        if (isOn) {
          await lightService.turnOff(entityId)
        } else {
          await lightService.turnOn(entityId)
        }
      } else if (entity.type === 'switch') {
        const isOn = entity.state === 'on'
        updateEntity({ ...entity, state: isOn ? 'off' : 'on' })
        await callService('switch', isOn ? 'turn_off' : 'turn_on', { entity_id: entityId })
      } else if (entity.type === 'valve') {
        const isOpen = entity.state === 'open'
        updateEntity({ ...entity, state: isOpen ? 'closed' : 'open' })
        await callService('valve', isOpen ? 'close_valve' : 'open_valve', { entity_id: entityId })
      }
    } catch (error) {
      updateEntity(entity)
      console.error('Failed to toggle entity:', error)
    } finally {
      setLoadingEntities(prev => {
        const next = new Set(prev)
        next.delete(entityId)
        return next
      })
    }
  }, [updateEntity])

  // Handle entity click - either toggle or open modal
  const handleEntityClick = useCallback((entity: NonNullable<typeof pinnedEntities[number]>) => {
    // Complex entities open modal for detailed controls
    if (entity.type === 'climate') {
      setModalEntity({ type: 'climate', entity: entity as ClimateEntity })
    } else if (entity.type === 'vacuum') {
      setModalEntity({ type: 'vacuum', entity: entity as VacuumEntity })
    } else if (entity.type === 'alarm') {
      setModalEntity({ type: 'alarm', entity: entity as AlarmEntity })
    } else if (entity.type === 'fan') {
      setModalEntity({ type: 'fan', entity: entity as FanEntity })
    } else if (entity.type === 'lock') {
      setModalEntity({ type: 'lock', entity: entity as LockEntity })
    } else if (entity.type === 'cover') {
      setModalEntity({ type: 'cover', entity: entity as CoverEntity })
    } else {
      // Simple entities just toggle
      handleSimpleToggle(entity)
    }
  }, [handleSimpleToggle])

  // Get modal title
  const getModalTitle = () => {
    if (!modalEntity) return ''
    const entity = modalEntity.entity
    return getDisplayName(
      entity.entity_id,
      entity.attributes.friendly_name || entity.entity_id.split('.')[1].replace(/_/g, ' ')
    )
  }

  return (
    <div className="space-y-4 pb-20">
      {/* AI Insights Card - only show when enabled */}
      {settings.aiInsightsEnabled && (
        <div className="glass-card bg-gradient-to-br from-purple-600/20 to-blue-600/20 p-4 glow-purple">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <h3 className="font-medium text-purple-300 text-shadow">AI Insights</h3>
            </div>
            <button
              onClick={refreshInsight}
              disabled={loading}
              className="glass-button p-1.5 text-purple-400 hover:text-purple-300 rounded-lg transition-all disabled:opacity-50"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          <p className="text-slate-200 text-sm leading-relaxed">
            {loading ? (
              <span className="text-slate-400 animate-pulse">Analyzing your home...</span>
            ) : insight ? (
              insight
            ) : (
              <span className="text-slate-400">Tap refresh to generate insights</span>
            )}
          </p>
        </div>
      )}

      {/* Quick Access Entities */}
      {pinnedEntities.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-400 px-1">Quick Access</h3>
          <div className="grid grid-cols-2 gap-2">
            {pinnedEntities.map(entity => {
              if (!entity) return null
              const isLoading = loadingEntities.has(entity.entity_id)
              const name = getDisplayName(
                entity.entity_id,
                entity.attributes.friendly_name || entity.entity_id.split('.')[1].replace(/_/g, ' ')
              )

              // Determine active state and colors based on entity type
              const getEntityStyle = () => {
                switch (entity.type) {
                  case 'light':
                    const lightOn = entity.state === 'on'
                    return {
                      isActive: lightOn,
                      activeColor: 'yellow',
                      statusText: lightOn ? 'On' : 'Off',
                    }
                  case 'switch':
                    const switchOn = entity.state === 'on'
                    return {
                      isActive: switchOn,
                      activeColor: 'green',
                      statusText: switchOn ? 'On' : 'Off',
                    }
                  case 'climate':
                    const climateActive = entity.state !== 'off'
                    return {
                      isActive: climateActive,
                      activeColor: 'orange',
                      statusText: climateActive
                        ? `${entity.state.charAt(0).toUpperCase() + entity.state.slice(1)}${entity.attributes.temperature ? ` · ${entity.attributes.temperature}°` : ''}`
                        : 'Off',
                    }
                  case 'vacuum':
                    const vacuumActive = ['cleaning', 'on'].includes(entity.state)
                    return {
                      isActive: vacuumActive,
                      activeColor: 'purple',
                      statusText: entity.state.charAt(0).toUpperCase() + entity.state.slice(1),
                    }
                  case 'alarm':
                    const alarmArmed = entity.state.startsWith('armed')
                    return {
                      isActive: alarmArmed,
                      activeColor: 'red',
                      statusText: alarmArmed ? 'Armed' : 'Disarmed',
                    }
                  case 'valve':
                    const valveOpen = entity.state === 'open'
                    return {
                      isActive: valveOpen,
                      activeColor: 'cyan',
                      statusText: valveOpen ? 'Open' : 'Closed',
                    }
                  case 'fan':
                    const fanOn = entity.state === 'on'
                    const fanPercentage = entity.attributes.percentage
                    return {
                      isActive: fanOn,
                      activeColor: 'blue',
                      statusText: fanOn
                        ? (fanPercentage !== undefined ? `${fanPercentage}%` : 'On')
                        : 'Off',
                    }
                  case 'lock':
                    const isLocked = entity.state === 'locked'
                    const isJammed = entity.state === 'jammed'
                    return {
                      isActive: isLocked,
                      activeColor: isJammed ? 'red' : 'green',
                      statusText: isJammed ? 'Jammed' : (isLocked ? 'Locked' : 'Unlocked'),
                    }
                  case 'cover':
                    const coverOpen = entity.state === 'open' || (entity.attributes.current_position ?? 0) > 0
                    const coverPosition = entity.attributes.current_position
                    return {
                      isActive: coverOpen,
                      activeColor: 'purple',
                      statusText: coverPosition !== undefined ? `${coverPosition}%` : (coverOpen ? 'Open' : 'Closed'),
                    }
                  default:
                    return { isActive: false, activeColor: 'slate', statusText: 'Unknown' }
                }
              }

              const { isActive, activeColor, statusText } = getEntityStyle()
              const colorClasses = {
                yellow: { bg: 'bg-yellow-400/20', ring: 'ring-yellow-400/30', text: 'text-yellow-400' },
                green: { bg: 'bg-green-400/20', ring: 'ring-green-400/30', text: 'text-green-400' },
                orange: { bg: 'bg-orange-400/20', ring: 'ring-orange-400/30', text: 'text-orange-400' },
                purple: { bg: 'bg-purple-400/20', ring: 'ring-purple-400/30', text: 'text-purple-400' },
                red: { bg: 'bg-red-400/20', ring: 'ring-red-400/30', text: 'text-red-400' },
                cyan: { bg: 'bg-cyan-400/20', ring: 'ring-cyan-400/30', text: 'text-cyan-400' },
                blue: { bg: 'bg-blue-400/20', ring: 'ring-blue-400/30', text: 'text-blue-400' },
                slate: { bg: 'bg-slate-700', ring: '', text: 'text-slate-500' },
              }
              const colors = colorClasses[activeColor as keyof typeof colorClasses]

              const renderIcon = () => {
                const iconClass = `w-5 h-5 ${isActive ? colors.text : 'text-slate-500'}`
                switch (entity.type) {
                  case 'light':
                    return (
                      <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zM9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1z"/>
                      </svg>
                    )
                  case 'switch':
                    return (
                      <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42A6.92 6.92 0 0119 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.27 1.09-4.28 2.76-5.56L6.34 5.02A8.96 8.96 0 003 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.76-1.24-5.23-3.17-6.83z"/>
                      </svg>
                    )
                  case 'climate':
                    return (
                      <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15 13V5c0-1.66-1.34-3-3-3S9 3.34 9 5v8c-1.21.91-2 2.37-2 4 0 2.76 2.24 5 5 5s5-2.24 5-5c0-1.63-.79-3.09-2-4zm-4-8c0-.55.45-1 1-1s1 .45 1 1h-1v1h1v2h-1v1h1v2h-2V5z"/>
                      </svg>
                    )
                  case 'vacuum':
                    return (
                      <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                      </svg>
                    )
                  case 'alarm':
                    return (
                      <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                      </svg>
                    )
                  case 'valve':
                    return (
                      <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8zm0 18c-3.35 0-6-2.57-6-6.2 0-2.34 1.95-5.44 6-9.14 4.05 3.7 6 6.79 6 9.14 0 3.63-2.65 6.2-6 6.2z"/>
                      </svg>
                    )
                  case 'fan':
                    return (
                      <svg className={`${iconClass} ${isActive ? 'animate-spin' : ''}`} style={{ animationDuration: '2s' }} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 11c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm4.5-6.5c-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5-1.45 0-2.99.22-4.28.79C.73 5.57.5 6.62.5 7.74v9.02c0 1.12.23 2.17.72 2.94C2.51 20.47 4.05 20.5 5.5 20.5c1.95 0 4.05-.4 5.5-1.5 1.45 1.1 3.55 1.5 5.5 1.5 1.45 0 2.99-.22 4.28-.79.49-.24.72-.29.72-1.41V9.28c0-1.12-.23-2.17-.72-2.94-1.29-.57-2.83-.84-4.28-.84zM12 18c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
                      </svg>
                    )
                  case 'lock':
                    return (
                      <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
                        {isActive ? (
                          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                        ) : (
                          <path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"/>
                        )}
                      </svg>
                    )
                  case 'cover':
                    return (
                      <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 19V5c0-1.1-.9-2-2-2H7c-1.1 0-2 .9-2 2v14H3v2h18v-2h-2zm-2 0H7V5h10v14z"/>
                      </svg>
                    )
                  default:
                    return null
                }
              }

              // Show expand indicator for complex entities
              const isComplexEntity = ['climate', 'vacuum', 'alarm', 'fan', 'lock', 'cover'].includes(entity.type)

              return (
                <button
                  key={entity.entity_id}
                  onClick={() => handleEntityClick(entity)}
                  disabled={isLoading}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                    isActive
                      ? `glass-card ${colors.bg} ring-1 ${colors.ring}`
                      : 'glass-panel hover:bg-white/5'
                  } ${isLoading ? 'opacity-50' : ''}`}
                >
                  <div className={`p-2 rounded-lg transition-all duration-300 ${isActive ? colors.bg : 'bg-slate-700/50'}`}>
                    {renderIcon()}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-white line-clamp-2 leading-tight">{name}</p>
                    <p className={`text-xs mt-0.5 ${isActive ? colors.text : 'text-slate-500'}`}>
                      {statusText}
                    </p>
                  </div>
                  {isComplexEntity && (
                    <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Automations Section */}
      {pinnedAutomations.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-400 px-1">Automations</h3>
          <div className="grid grid-cols-1 gap-2">
            {pinnedAutomations.map(automation => {
              if (!automation) return null
              const name = getDisplayName(
                automation.entity_id,
                automation.attributes.friendly_name || automation.entity_id.split('.')[1].replace(/_/g, ' ')
              )
              return (
                <AutomationToggle
                  key={automation.entity_id}
                  entity={automation}
                  displayName={name}
                  onUpdate={(updated) => updateEntity(updated)}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Entity Control Modal */}
      <EntityControlModal
        isOpen={modalEntity !== null}
        onClose={() => setModalEntity(null)}
        title={getModalTitle()}
      >
        {modalEntity?.type === 'climate' && (
          <ClimateControls
            entity={modalEntity.entity}
            onUpdate={(updated) => {
              updateEntity(updated)
              // Update modal state to reflect changes
              setModalEntity({ type: 'climate', entity: updated })
            }}
          />
        )}
        {modalEntity?.type === 'vacuum' && (
          <VacuumControls
            entity={modalEntity.entity}
            onUpdate={(updated) => {
              updateEntity(updated)
              setModalEntity({ type: 'vacuum', entity: updated })
            }}
          />
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
        {modalEntity?.type === 'fan' && (
          <FanControls
            entity={modalEntity.entity}
            onUpdate={(updated) => {
              updateEntity(updated)
              setModalEntity({ type: 'fan', entity: updated })
            }}
          />
        )}
        {modalEntity?.type === 'lock' && (
          <LockControls
            entity={modalEntity.entity}
            onUpdate={(updated) => {
              updateEntity(updated)
              setModalEntity({ type: 'lock', entity: updated })
            }}
          />
        )}
        {modalEntity?.type === 'cover' && (
          <CoverControls
            entity={modalEntity.entity}
            onUpdate={(updated) => {
              updateEntity(updated)
              setModalEntity({ type: 'cover', entity: updated })
            }}
          />
        )}
        {/* Related entities from same device */}
        {modalEntity && (
          <RelatedEntitiesSection entityId={modalEntity.entity.entity_id} />
        )}
      </EntityControlModal>
    </div>
  )
}
