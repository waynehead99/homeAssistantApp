import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
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
import { AIInsightChat } from '../components/AIInsightChat'

// Store only entity_id and type, look up actual entity from context for real-time updates
type ModalEntityRef =
  | { type: 'climate'; entityId: string }
  | { type: 'vacuum'; entityId: string }
  | { type: 'alarm'; entityId: string }
  | { type: 'fan'; entityId: string }
  | { type: 'lock'; entityId: string }
  | { type: 'cover'; entityId: string }
  | null

export function HomeView() {
  const { lights, switches, climate, vacuums, alarms, valves, fans, locks, covers, automations, scripts, settings, updateEntity, getDisplayName } = useHomeAssistantContext()
  const { insight, loading, generateInsight, refresh: refreshInsight, sendInsightNotification, isConfigured, sendChatMessage } = useAIInsights()
  const [loadingEntities, setLoadingEntities] = useState<Set<string>>(new Set())
  const [modalEntityRef, setModalEntityRef] = useState<ModalEntityRef>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [startWithVoice, setStartWithVoice] = useState(false)
  const insightLoadedRef = useRef(false)

  // Look up the actual entity from context - this updates when context updates
  const modalEntity = useMemo(() => {
    if (!modalEntityRef) return null

    switch (modalEntityRef.type) {
      case 'climate': {
        const entity = climate.find(e => e.entity_id === modalEntityRef.entityId)
        return entity ? { type: 'climate' as const, entity } : null
      }
      case 'vacuum': {
        const entity = vacuums.find(e => e.entity_id === modalEntityRef.entityId)
        return entity ? { type: 'vacuum' as const, entity } : null
      }
      case 'alarm': {
        const entity = alarms.find(e => e.entity_id === modalEntityRef.entityId)
        return entity ? { type: 'alarm' as const, entity } : null
      }
      case 'fan': {
        const entity = fans.find(e => e.entity_id === modalEntityRef.entityId)
        return entity ? { type: 'fan' as const, entity } : null
      }
      case 'lock': {
        const entity = locks.find(e => e.entity_id === modalEntityRef.entityId)
        return entity ? { type: 'lock' as const, entity } : null
      }
      case 'cover': {
        const entity = covers.find(e => e.entity_id === modalEntityRef.entityId)
        return entity ? { type: 'cover' as const, entity } : null
      }
      default:
        return null
    }
  }, [modalEntityRef, climate, vacuums, alarms, fans, locks, covers])

  // Generate insight only once on mount (uses 5-minute cache in the hook)
  useEffect(() => {
    if (isConfigured && settings.aiInsightsEnabled && !insightLoadedRef.current) {
      insightLoadedRef.current = true
      generateInsight()
    }
  }, [isConfigured, settings.aiInsightsEnabled, generateInsight])

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
      setModalEntityRef({ type: 'climate', entityId: entity.entity_id })
    } else if (entity.type === 'vacuum') {
      setModalEntityRef({ type: 'vacuum', entityId: entity.entity_id })
    } else if (entity.type === 'alarm') {
      setModalEntityRef({ type: 'alarm', entityId: entity.entity_id })
    } else if (entity.type === 'fan') {
      setModalEntityRef({ type: 'fan', entityId: entity.entity_id })
    } else if (entity.type === 'lock') {
      setModalEntityRef({ type: 'lock', entityId: entity.entity_id })
    } else if (entity.type === 'cover') {
      setModalEntityRef({ type: 'cover', entityId: entity.entity_id })
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
        <div className="glass-card bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500/15 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <h3 className="font-medium text-blue-700">AI Insights</h3>
            </div>
            <div className="flex items-center gap-1">
              {/* Voice chat button */}
              {insight && (
                <button
                  onClick={() => {
                    setIsChatOpen(true)
                    setStartWithVoice(true)
                  }}
                  disabled={loading}
                  className="glass-button p-1.5 text-blue-500 hover:text-blue-600 rounded-lg transition-all disabled:opacity-50"
                  title="Voice chat"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
                  </svg>
                </button>
              )}
              {/* Chat button */}
              {insight && (
                <button
                  onClick={() => {
                    setIsChatOpen(true)
                    setStartWithVoice(false)
                  }}
                  disabled={loading}
                  className="glass-button p-1.5 text-blue-500 hover:text-blue-600 rounded-lg transition-all disabled:opacity-50"
                  title="Text chat"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </button>
              )}
              {/* Send notification button */}
              {(settings.notificationRecipients?.length ?? 0) > 0 && insight && (
                <button
                  onClick={sendInsightNotification}
                  disabled={loading}
                  className="glass-button p-1.5 text-blue-500 hover:text-blue-600 rounded-lg transition-all disabled:opacity-50"
                  title="Send as notification"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </button>
              )}
              {/* Refresh button */}
              <button
                onClick={refreshInsight}
                disabled={loading}
                className="glass-button p-1.5 text-blue-500 hover:text-blue-600 rounded-lg transition-all disabled:opacity-50"
                title="Refresh insight"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
          <p className="text-slate-700 text-sm leading-relaxed">
            {loading ? (
              <span className="text-slate-500 animate-pulse">Analyzing your home...</span>
            ) : insight ? (
              insight
            ) : (
              <span className="text-slate-500">Tap refresh to generate insights</span>
            )}
          </p>
        </div>
      )}

      {/* Quick Access Entities */}
      {pinnedEntities.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-600 px-1">Quick Access</h3>
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
                yellow: { bg: 'bg-amber-500/15', ring: 'ring-amber-400/40', text: 'text-amber-600' },
                green: { bg: 'bg-green-500/15', ring: 'ring-green-400/40', text: 'text-green-600' },
                orange: { bg: 'bg-orange-500/15', ring: 'ring-orange-400/40', text: 'text-orange-600' },
                purple: { bg: 'bg-purple-500/15', ring: 'ring-purple-400/40', text: 'text-purple-600' },
                red: { bg: 'bg-red-500/15', ring: 'ring-red-400/40', text: 'text-red-600' },
                cyan: { bg: 'bg-cyan-500/15', ring: 'ring-cyan-400/40', text: 'text-cyan-600' },
                blue: { bg: 'bg-blue-500/15', ring: 'ring-blue-400/40', text: 'text-blue-600' },
                slate: { bg: 'bg-slate-200', ring: '', text: 'text-slate-500' },
              }
              const colors = colorClasses[activeColor as keyof typeof colorClasses]

              const renderIcon = () => {
                const iconClass = `w-5 h-5 ${isActive ? colors.text : 'text-slate-400'}`
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
                      : 'glass-panel hover:bg-slate-100'
                  } ${isLoading ? 'opacity-50' : ''}`}
                >
                  <div className={`p-2 rounded-lg transition-all duration-300 ${isActive ? colors.bg : 'bg-slate-200'}`}>
                    {renderIcon()}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-slate-800 line-clamp-2 leading-tight">{name}</p>
                    <p className={`text-xs mt-0.5 ${isActive ? colors.text : 'text-slate-500'}`}>
                      {statusText}
                    </p>
                  </div>
                  {isComplexEntity && (
                    <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
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
          <h3 className="text-sm font-medium text-slate-600 px-1">Automations</h3>
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
        onClose={() => setModalEntityRef(null)}
        title={getModalTitle()}
      >
        {modalEntity?.type === 'climate' && (
          <ClimateControls
            entity={modalEntity.entity}
            onUpdate={updateEntity}
          />
        )}
        {modalEntity?.type === 'vacuum' && (
          <VacuumControls
            entity={modalEntity.entity}
            onUpdate={updateEntity}
          />
        )}
        {modalEntity?.type === 'alarm' && (
          <AlarmControls
            entity={modalEntity.entity}
            onUpdate={updateEntity}
          />
        )}
        {modalEntity?.type === 'fan' && (
          <FanControls
            entity={modalEntity.entity}
            onUpdate={updateEntity}
          />
        )}
        {modalEntity?.type === 'lock' && (
          <LockControls
            entity={modalEntity.entity}
            onUpdate={updateEntity}
          />
        )}
        {modalEntity?.type === 'cover' && (
          <CoverControls
            entity={modalEntity.entity}
            onUpdate={updateEntity}
          />
        )}
        {/* Related entities from same device */}
        {modalEntity && (
          <RelatedEntitiesSection entityId={modalEntity.entity.entity_id} />
        )}
      </EntityControlModal>

      {/* AI Chat Modal */}
      <AIInsightChat
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false)
          setStartWithVoice(false)
        }}
        initialInsight={insight || ''}
        onSendMessage={sendChatMessage}
        startWithVoice={startWithVoice}
      />
    </div>
  )
}
