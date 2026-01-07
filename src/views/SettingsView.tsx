import { useState } from 'react'
import { useHomeAssistantContext } from '../context/HomeAssistantContext'
import { getBaseUrl } from '../services/homeAssistant'
import { isClaudeConfigured } from '../services/claude'

type EntityType = 'light' | 'switch' | 'climate' | 'vacuum' | 'alarm' | 'valve' | 'fan' | 'lock' | 'sensor' | 'binary_sensor' | 'camera' | 'cover' | 'automation' | 'script'

export function SettingsView() {
  const {
    weather,
    calendars,
    lights,
    switches,
    climate,
    vacuums,
    alarms,
    valves,
    fans,
    locks,
    covers,
    automations,
    scripts,
    sensors,
    binarySensors,
    cameras,
    entities,
    settings,
    updateSettings,
    hiddenEntities,
    hiddenRooms,
    hideEntity,
    showEntity,
    showAllEntities,
    showAllRooms,
    customNames,
    lastUpdated,
    getDisplayName,
  } = useHomeAssistantContext()

  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showEntityPicker, setShowEntityPicker] = useState(false)
  const [showAutomationPicker, setShowAutomationPicker] = useState(false)
  const [showHiddenManager, setShowHiddenManager] = useState(false)
  const [entityFilter, setEntityFilter] = useState('')
  const [automationFilter, setAutomationFilter] = useState('')
  const [hiddenFilter, setHiddenFilter] = useState('')

  const handleWeatherChange = (entityId: string) => {
    updateSettings({ primaryWeatherEntity: entityId || null })
  }

  const handleCalendarPatternChange = (pattern: string) => {
    updateSettings({ calendarPattern: pattern })
  }

  const handlePeoplePatternChange = (pattern: string) => {
    updateSettings({ peoplePattern: pattern })
  }

  const handleAIToggle = () => {
    updateSettings({ aiInsightsEnabled: !settings.aiInsightsEnabled })
  }

  const handleRefreshIntervalChange = (seconds: number) => {
    updateSettings({ refreshInterval: seconds })
  }

  const togglePinnedEntity = (entityId: string) => {
    const current = settings.pinnedEntities || []
    if (current.includes(entityId)) {
      updateSettings({ pinnedEntities: current.filter(id => id !== entityId) })
    } else {
      updateSettings({ pinnedEntities: [...current, entityId] })
    }
  }

  const removePinnedEntity = (entityId: string) => {
    const current = settings.pinnedEntities || []
    updateSettings({ pinnedEntities: current.filter(id => id !== entityId) })
  }

  const togglePinnedAutomation = (entityId: string) => {
    const current = settings.pinnedAutomations || []
    if (current.includes(entityId)) {
      updateSettings({ pinnedAutomations: current.filter(id => id !== entityId) })
    } else {
      updateSettings({ pinnedAutomations: [...current, entityId] })
    }
  }

  const removePinnedAutomation = (entityId: string) => {
    const current = settings.pinnedAutomations || []
    updateSettings({ pinnedAutomations: current.filter(id => id !== entityId) })
  }

  const getEntityIcon = (type: EntityType) => {
    switch (type) {
      case 'light': return '💡'
      case 'switch': return '🔌'
      case 'climate': return '🌡️'
      case 'vacuum': return '🤖'
      case 'alarm': return '🚨'
      case 'valve': return '💧'
      case 'fan': return '🌀'
      case 'lock': return '🔒'
      case 'cover': return '🪟'
      case 'automation': return '⚡'
      case 'script': return '📜'
      case 'sensor': return '📊'
      case 'binary_sensor': return '🔘'
      case 'camera': return '📷'
      default: return '📦'
    }
  }

  // Combine all controllable entities for entity picker (Quick Access)
  const availableEntities = [
    ...lights.map(l => ({ ...l, type: 'light' as const })),
    ...switches.map(s => ({ ...s, type: 'switch' as const })),
    ...climate.map(c => ({ ...c, type: 'climate' as const })),
    ...vacuums.map(v => ({ ...v, type: 'vacuum' as const })),
    ...alarms.map(a => ({ ...a, type: 'alarm' as const })),
    ...valves.map(v => ({ ...v, type: 'valve' as const })),
    ...fans.map(f => ({ ...f, type: 'fan' as const })),
    ...locks.map(l => ({ ...l, type: 'lock' as const })),
    ...covers.map(c => ({ ...c, type: 'cover' as const })),
  ].sort((a, b) => {
    const nameA = a.attributes.friendly_name || a.entity_id
    const nameB = b.attributes.friendly_name || b.entity_id
    return nameA.localeCompare(nameB)
  })

  // Available automations and scripts for picker
  const availableAutomations = [
    ...automations.map(a => ({ ...a, type: 'automation' as const })),
    ...scripts.map(s => ({ ...s, type: 'script' as const })),
  ].sort((a, b) => {
    const nameA = a.attributes.friendly_name || a.entity_id
    const nameB = b.attributes.friendly_name || b.entity_id
    return nameA.localeCompare(nameB)
  })

  // Filter automations by search
  const filteredAutomations = automationFilter
    ? availableAutomations.filter(e => {
        const name = (e.attributes.friendly_name || e.entity_id).toLowerCase()
        return name.includes(automationFilter.toLowerCase())
      })
    : availableAutomations

  // Get pinned automation objects
  const pinnedAutomationObjects = (settings.pinnedAutomations || [])
    .map(id => availableAutomations.find(e => e.entity_id === id))
    .filter(Boolean)

  // All hideable entities (includes sensors and cameras)
  const allHideableEntities = [
    ...lights.map(l => ({ ...l, type: 'light' as EntityType })),
    ...switches.map(s => ({ ...s, type: 'switch' as EntityType })),
    ...climate.map(c => ({ ...c, type: 'climate' as EntityType })),
    ...vacuums.map(v => ({ ...v, type: 'vacuum' as EntityType })),
    ...alarms.map(a => ({ ...a, type: 'alarm' as EntityType })),
    ...valves.map(v => ({ ...v, type: 'valve' as EntityType })),
    ...fans.map(f => ({ ...f, type: 'fan' as EntityType })),
    ...locks.map(l => ({ ...l, type: 'lock' as EntityType })),
    ...sensors.map(s => ({ ...s, type: 'sensor' as EntityType })),
    ...binarySensors.map(b => ({ ...b, type: 'binary_sensor' as EntityType })),
    ...cameras.map(c => ({ ...c, type: 'camera' as EntityType })),
  ].sort((a, b) => {
    const nameA = a.attributes.friendly_name || a.entity_id
    const nameB = b.attributes.friendly_name || b.entity_id
    return nameA.localeCompare(nameB)
  })

  // Filter entities by search
  const filteredEntities = entityFilter
    ? availableEntities.filter(e => {
        const name = (e.attributes.friendly_name || e.entity_id).toLowerCase()
        return name.includes(entityFilter.toLowerCase())
      })
    : availableEntities

  // Get pinned entity objects
  const pinnedEntityObjects = (settings.pinnedEntities || [])
    .map(id => availableEntities.find(e => e.entity_id === id))
    .filter(Boolean)

  // Get currently hidden entity objects
  const hiddenEntityObjects = Array.from(hiddenEntities)
    .map(id => {
      const entity = entities.find(e => e.entity_id === id)
      if (!entity) return null
      let type: EntityType = 'sensor'
      if (id.startsWith('light.')) type = 'light'
      else if (id.startsWith('switch.')) type = 'switch'
      else if (id.startsWith('climate.')) type = 'climate'
      else if (id.startsWith('vacuum.')) type = 'vacuum'
      else if (id.startsWith('alarm_control_panel.')) type = 'alarm'
      else if (id.startsWith('valve.')) type = 'valve'
      else if (id.startsWith('fan.')) type = 'fan'
      else if (id.startsWith('lock.')) type = 'lock'
      else if (id.startsWith('binary_sensor.')) type = 'binary_sensor'
      else if (id.startsWith('camera.')) type = 'camera'
      return { ...entity, type }
    })
    .filter(Boolean)
    .sort((a, b) => {
      const nameA = a!.attributes.friendly_name || a!.entity_id
      const nameB = b!.attributes.friendly_name || b!.entity_id
      return nameA.localeCompare(nameB)
    })

  // Filter hideable entities by search
  const filteredHideableEntities = hiddenFilter
    ? allHideableEntities.filter(e => {
        const name = (e.attributes.friendly_name || e.entity_id).toLowerCase()
        return name.includes(hiddenFilter.toLowerCase())
      })
    : allHideableEntities

  return (
    <div className="space-y-6 pb-20">
      {/* Weather Entity Selection */}
      <section className="glass-card p-4">
        <h3 className="text-sm font-medium text-slate-400 mb-3">Weather Source</h3>
        <select
          value={settings.primaryWeatherEntity || ''}
          onChange={(e) => handleWeatherChange(e.target.value)}
          className="w-full glass-panel text-slate-800 rounded-lg px-3 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="">Auto (first available)</option>
          {weather.map((w) => (
            <option key={w.entity_id} value={w.entity_id}>
              {w.attributes.friendly_name || w.entity_id}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500 mt-2">
          Choose which weather entity to display on the Home screen and use for AI insights.
        </p>
      </section>

      {/* Quick Access Entities */}
      <section className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-400">Quick Access</h3>
          <button
            onClick={() => setShowEntityPicker(!showEntityPicker)}
            className="glass-button px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white transition-colors"
          >
            {showEntityPicker ? 'Done' : 'Add Entities'}
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Entities shown on the Home screen for quick control.
        </p>

        {/* Currently pinned entities */}
        {pinnedEntityObjects.length > 0 ? (
          <div className="space-y-2 mb-3">
            {pinnedEntityObjects.map(entity => {
              if (!entity) return null
              const name = getDisplayName(entity.entity_id, entity.attributes.friendly_name || entity.entity_id.split('.')[1])
              return (
                <div
                  key={entity.entity_id}
                  className="flex items-center justify-between glass-panel rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      {getEntityIcon(entity.type)}
                    </span>
                    <span className="text-sm text-slate-800">{name}</span>
                  </div>
                  <button
                    onClick={() => removePinnedEntity(entity.entity_id)}
                    className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          !showEntityPicker && (
            <p className="text-sm text-slate-500 italic">No entities pinned yet</p>
          )
        )}

        {/* Entity picker */}
        {showEntityPicker && (
          <div className="border-t border-slate-200 pt-3 mt-3">
            <input
              type="text"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              placeholder="Search entities..."
              className="w-full glass-panel text-slate-800 rounded-lg px-3 py-2 mb-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
            />
            <div className="max-h-64 overflow-y-auto space-y-1 scrollbar-hide">
              {filteredEntities.map(entity => {
                const name = getDisplayName(entity.entity_id, entity.attributes.friendly_name || entity.entity_id.split('.')[1])
                const isPinned = (settings.pinnedEntities || []).includes(entity.entity_id)
                return (
                  <button
                    key={entity.entity_id}
                    onClick={() => togglePinnedEntity(entity.entity_id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                      isPinned ? 'glass-panel bg-blue-600/20 text-blue-400' : 'glass-panel text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{getEntityIcon(entity.type)}</span>
                      <span className="text-sm">{name}</span>
                    </div>
                    {isPinned && (
                      <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                )
              })}
              {filteredEntities.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No entities found</p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Automations for Home Page */}
      <section className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-400">Home Page Automations</h3>
          <button
            onClick={() => setShowAutomationPicker(!showAutomationPicker)}
            className="glass-button px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm text-white transition-colors"
          >
            {showAutomationPicker ? 'Done' : 'Add Automations'}
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Automations shown on the Home screen with toggle controls.
        </p>

        {/* Currently pinned automations */}
        {pinnedAutomationObjects.length > 0 ? (
          <div className="space-y-2 mb-3">
            {pinnedAutomationObjects.map(entity => {
              if (!entity) return null
              const name = getDisplayName(entity.entity_id, entity.attributes.friendly_name || entity.entity_id.split('.')[1])
              const isOn = entity.state === 'on'
              return (
                <div
                  key={entity.entity_id}
                  className={`flex items-center justify-between glass-panel rounded-lg px-3 py-2 ${
                    isOn ? 'bg-emerald-500/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs">⚡</span>
                    <span className={`text-sm ${isOn ? 'text-slate-800' : 'text-slate-600'}`}>{name}</span>
                    <span className={`text-xs ${isOn ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {isOn ? 'On' : 'Off'}
                    </span>
                  </div>
                  <button
                    onClick={() => removePinnedAutomation(entity.entity_id)}
                    className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          !showAutomationPicker && (
            <p className="text-sm text-slate-500 italic">No automations added yet</p>
          )
        )}

        {/* Automation picker */}
        {showAutomationPicker && (
          <div className="border-t border-slate-200 pt-3 mt-3">
            <input
              type="text"
              value={automationFilter}
              onChange={(e) => setAutomationFilter(e.target.value)}
              placeholder="Search automations..."
              className="w-full glass-panel text-slate-800 rounded-lg px-3 py-2 mb-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
            />
            <div className="max-h-64 overflow-y-auto space-y-1 scrollbar-hide">
              {filteredAutomations.map(entity => {
                const name = getDisplayName(entity.entity_id, entity.attributes.friendly_name || entity.entity_id.split('.')[1])
                const isPinned = (settings.pinnedAutomations || []).includes(entity.entity_id)
                const isOn = entity.state === 'on'
                return (
                  <button
                    key={entity.entity_id}
                    onClick={() => togglePinnedAutomation(entity.entity_id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                      isPinned ? 'glass-panel bg-emerald-600/20 text-emerald-400' : 'glass-panel text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs">⚡</span>
                      <span className="text-sm">{name}</span>
                      <span className={`text-xs ${isOn ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {isOn ? 'On' : 'Off'}
                      </span>
                    </div>
                    {isPinned && (
                      <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                )
              })}
              {filteredAutomations.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">
                  {automations.length === 0 ? 'No automations found in Home Assistant' : 'No automations found'}
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Hidden Entities Management */}
      <section className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-medium text-slate-400">Hidden Entities</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {hiddenEntities.size} entities hidden from views and AI
            </p>
          </div>
          <button
            onClick={() => setShowHiddenManager(!showHiddenManager)}
            className="glass-button px-3 py-1.5 hover:bg-slate-100 rounded-lg text-sm text-slate-700 transition-colors"
          >
            {showHiddenManager ? 'Done' : 'Manage'}
          </button>
        </div>

        {showHiddenManager && (
          <div className="space-y-4">
            {/* Currently hidden entities */}
            {hiddenEntityObjects.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-400">Currently hidden:</p>
                  <button
                    onClick={showAllEntities}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Unhide all
                  </button>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {hiddenEntityObjects.map(entity => {
                    if (!entity) return null
                    const name = getDisplayName(entity.entity_id, entity.attributes.friendly_name || entity.entity_id.split('.')[1])
                    return (
                      <div
                        key={entity.entity_id}
                        className="flex items-center justify-between bg-red-500/10 rounded-lg px-3 py-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs flex-shrink-0">{getEntityIcon(entity.type)}</span>
                          <span className="text-sm text-slate-300 truncate">{name}</span>
                        </div>
                        <button
                          onClick={() => showEntity(entity.entity_id)}
                          className="p-1 text-slate-500 hover:text-green-400 transition-colors flex-shrink-0"
                          title="Show entity"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Add entities to hide */}
            <div className="border-t border-white/5 pt-3">
              <p className="text-xs text-slate-400 mb-2">Hide an entity:</p>
              <input
                type="text"
                value={hiddenFilter}
                onChange={(e) => setHiddenFilter(e.target.value)}
                placeholder="Search entities to hide..."
                className="w-full glass-panel text-slate-800 rounded-lg px-3 py-2 mb-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
              />
              <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-hide">
                {filteredHideableEntities.slice(0, 50).map(entity => {
                  const name = getDisplayName(entity.entity_id, entity.attributes.friendly_name || entity.entity_id.split('.')[1])
                  const isHidden = hiddenEntities.has(entity.entity_id)
                  return (
                    <button
                      key={entity.entity_id}
                      onClick={() => isHidden ? showEntity(entity.entity_id) : hideEntity(entity.entity_id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                        isHidden
                          ? 'glass-panel bg-red-500/20 text-red-400'
                          : 'glass-panel text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs flex-shrink-0">{getEntityIcon(entity.type)}</span>
                        <span className="text-sm truncate">{name}</span>
                      </div>
                      {isHidden ? (
                        <svg className="w-4 h-4 text-red-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-slate-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  )
                })}
                {filteredHideableEntities.length > 50 && (
                  <p className="text-xs text-slate-500 text-center py-2">
                    Showing first 50 results. Refine your search.
                  </p>
                )}
                {filteredHideableEntities.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">No entities found</p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Calendar Filter */}
      <section className="glass-card p-4">
        <h3 className="text-sm font-medium text-slate-400 mb-3">Calendar Filter</h3>
        <input
          type="text"
          value={settings.calendarPattern}
          onChange={(e) => handleCalendarPatternChange(e.target.value)}
          placeholder="e.g., erikson, family"
          className="w-full glass-panel text-slate-800 rounded-lg px-3 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
        <p className="text-xs text-slate-500 mt-2">
          Only show calendars matching this pattern. Supports regex (e.g., "erik|family").
        </p>
        {calendars.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-xs text-slate-400">Available calendars:</p>
            {calendars.map((c) => {
              const name = c.attributes.friendly_name || c.entity_id
              const matches = settings.calendarPattern
                ? new RegExp(settings.calendarPattern, 'i').test(name) || new RegExp(settings.calendarPattern, 'i').test(c.entity_id)
                : true
              return (
                <div
                  key={c.entity_id}
                  className={`text-xs px-2 py-1 rounded ${matches ? 'text-green-400 bg-green-400/10' : 'text-slate-500'}`}
                >
                  {matches ? '✓' : '○'} {name}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* People Filter */}
      <section className="glass-card p-4">
        <h3 className="text-sm font-medium text-slate-400 mb-3">People Filter</h3>
        <input
          type="text"
          value={settings.peoplePattern}
          onChange={(e) => handlePeoplePatternChange(e.target.value)}
          placeholder="e.g., shelby|wayne"
          className="w-full glass-panel text-slate-800 rounded-lg px-3 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
        <p className="text-xs text-slate-500 mt-2">
          Only show people matching this pattern on the Home screen. Use "|" for multiple names.
        </p>
      </section>

      {/* AI Insights */}
      <section className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-slate-800">AI Insights</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isClaudeConfigured() ? 'Claude API connected' : 'API key not configured'}
            </p>
          </div>
          <button
            onClick={handleAIToggle}
            className={`toggle-3d relative w-12 h-7 rounded-full transition-all ${
              settings.aiInsightsEnabled ? 'bg-gradient-to-r from-blue-500 to-cyan-400' : 'bg-slate-600'
            }`}
            role="switch"
            aria-checked={settings.aiInsightsEnabled}
          >
            <div
              className={`toggle-3d-knob absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                settings.aiInsightsEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {!isClaudeConfigured() && (
          <p className="text-xs text-amber-400 mt-2">
            Add VITE_CLAUDE_API_KEY to your .env file to enable AI insights.
          </p>
        )}
      </section>

      {/* Refresh Interval */}
      <section className="glass-card p-4">
        <h3 className="text-sm font-medium text-slate-400 mb-3">Auto-Refresh Interval</h3>
        <select
          value={settings.refreshInterval}
          onChange={(e) => handleRefreshIntervalChange(Number(e.target.value))}
          className="w-full glass-panel text-slate-800 rounded-lg px-3 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value={10}>10 seconds</option>
          <option value={30}>30 seconds</option>
          <option value={60}>1 minute</option>
          <option value={120}>2 minutes</option>
          <option value={300}>5 minutes</option>
        </select>
        <p className="text-xs text-slate-500 mt-2">
          How often to refresh entity states from Home Assistant.
        </p>
      </section>

      {/* Hidden Rooms */}
      <section className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-slate-400">Hidden Rooms</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {hiddenRooms.size} rooms hidden from views
            </p>
          </div>
          {hiddenRooms.size > 0 && (
            <button
              onClick={showAllRooms}
              className="glass-button px-3 py-1.5 hover:bg-slate-100 rounded-lg text-sm text-slate-700 transition-colors"
            >
              Show All
            </button>
          )}
        </div>
      </section>

      {/* Advanced / Debug Info */}
      <section className="glass-card p-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="text-sm font-medium text-slate-400">Advanced Info</h3>
          <svg
            className={`w-5 h-5 text-slate-500 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Home Assistant URL</span>
              <span className="text-slate-800 truncate ml-4">{getBaseUrl() || 'Not configured'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Last Updated</span>
              <span className="text-slate-800">
                {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Weather Entities</span>
              <span className="text-slate-800">{weather.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Calendar Entities</span>
              <span className="text-slate-800">{calendars.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Custom Names</span>
              <span className="text-slate-800">{customNames.size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Claude API</span>
              <span className={isClaudeConfigured() ? 'text-green-400' : 'text-slate-500'}>
                {isClaudeConfigured() ? 'Configured' : 'Not configured'}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* App Info */}
      <section className="text-center text-xs text-slate-600 py-4">
        <p>Home Assistant Dashboard</p>
        <p className="mt-1">Built with React + Vite + Claude AI</p>
      </section>
    </div>
  )
}
