import { useState, useEffect, useRef } from 'react'
import type { ClimateEntity } from '../types/homeAssistant'
import { callService } from '../services/homeAssistant'

interface ClimateControlsProps {
  entity: ClimateEntity
  onUpdate: (entity: ClimateEntity) => void
}

const MODE_ICONS: Record<string, string> = {
  off: 'M18.36 19.78L12 13.41l-6.36 6.37-1.42-1.42L10.59 12 4.22 5.64l1.42-1.42L12 10.59l6.36-6.36 1.41 1.41L13.41 12l6.36 6.36z',
  heat: 'M17.66 11.2C17.43 10.9 17.15 10.64 16.89 10.38C16.22 9.78 15.46 9.35 14.82 8.72C13.33 7.26 13 4.85 13.95 3C13 3.23 12.17 3.75 11.46 4.32C8.87 6.4 7.85 10.07 9.07 13.22C9.11 13.32 9.15 13.42 9.15 13.55C9.15 13.77 9 13.97 8.8 14.05C8.57 14.15 8.33 14.09 8.14 13.93C8.08 13.88 8.04 13.83 8 13.76C6.87 12.33 6.69 10.28 7.45 8.64C5.78 10 4.87 12.3 5 14.47C5.06 14.97 5.12 15.47 5.29 15.97C5.43 16.57 5.7 17.17 6 17.7C7.08 19.43 8.95 20.67 10.96 20.92C13.1 21.19 15.39 20.8 17.03 19.32C18.86 17.66 19.5 15 18.56 12.72L18.43 12.46C18.22 12 17.66 11.2 17.66 11.2Z',
  cool: 'M22 11h-4.17l3.24-3.24-1.41-1.42L15 11h-2V9l4.66-4.66-1.42-1.41L13 6.17V2h-2v4.17L7.76 2.93 6.34 4.34 11 9v2H9L4.34 6.34 2.93 7.76 6.17 11H2v2h4.17l-3.24 3.24 1.41 1.42L9 13h2v2l-4.66 4.66 1.42 1.41L11 17.83V22h2v-4.17l3.24 3.24 1.42-1.41L13 15v-2h2l4.66 4.66 1.41-1.42L17.83 13H22z',
  heat_cool: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93s3.05-7.44 7-7.93v15.86zm2-15.86c1.03.13 2 .45 2.87.93H13v-.93zM13 7h5.24c.25.31.48.65.68 1H13V7zm0 3h6.74c.08.33.15.66.19 1H13v-1zm0 9.93V19h2.87c-.87.48-1.84.8-2.87.93zM18.24 17H13v-1h5.92c-.2.35-.43.69-.68 1zm1.5-3H13v-1h6.93c-.04.34-.11.67-.19 1z',
  auto: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z',
  dry: 'M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z',
  fan_only: 'M12 12c0-3 2.5-5.5 5.5-5.5S23 9 23 12s-2.5 5.5-5.5 5.5S12 15 12 12zm-1.59.41L7.59 15.24l-1.41-1.41 2.83-2.83-2.83-2.83 1.41-1.41 2.82 2.82L12 8.59l1.41 1.41-1.59 1.59 1.59 1.59-1.41 1.41-1.59-1.59z',
}

const MODE_LABELS: Record<string, string> = {
  off: 'Off',
  heat: 'Heat',
  cool: 'Cool',
  heat_cool: 'Auto',
  auto: 'Auto',
  dry: 'Dry',
  fan_only: 'Fan',
}

const MODE_COLORS: Record<string, string> = {
  off: 'text-slate-500 bg-slate-200',
  heat: 'text-orange-600 bg-orange-500/15',
  cool: 'text-blue-600 bg-blue-500/15',
  heat_cool: 'text-purple-600 bg-purple-500/15',
  auto: 'text-purple-600 bg-purple-500/15',
  dry: 'text-cyan-600 bg-cyan-500/15',
  fan_only: 'text-green-600 bg-green-500/15',
}

const DEBOUNCE_DELAY = 3000 // 3 seconds after last adjustment before sending to HA

export function ClimateControls({ entity, onUpdate }: ClimateControlsProps) {
  const [loading, setLoading] = useState(false)
  const [localTemp, setLocalTemp] = useState(entity.attributes.temperature || 72)
  const [isPendingSubmit, setIsPendingSubmit] = useState(false)
  const pendingTempRef = useRef<number | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync local state when entity prop changes (from context updates)
  // But don't overwrite if we have a pending change that HA hasn't confirmed yet
  useEffect(() => {
    const entityTemp = entity.attributes.temperature || 72

    // If we have a pending temp and HA now matches it, clear the pending state
    if (pendingTempRef.current !== null && entityTemp === pendingTempRef.current) {
      pendingTempRef.current = null
      setIsPendingSubmit(false)
    }

    // Only sync from entity if we don't have a pending change
    if (pendingTempRef.current === null && !isPendingSubmit) {
      setLocalTemp(entityTemp)
    }
  }, [entity.attributes.temperature, isPendingSubmit])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const currentTemp = entity.attributes.current_temperature
  const minTemp = entity.attributes.min_temp || 50
  const maxTemp = entity.attributes.max_temp || 90
  const hvacModes = entity.attributes.hvac_modes || ['off', 'heat', 'cool']
  const currentMode = entity.state
  const hvacAction = entity.attributes.hvac_action

  const handleModeChange = async (mode: string) => {
    setLoading(true)
    try {
      // Optimistic update
      onUpdate({ ...entity, state: mode })
      await callService('climate', 'set_hvac_mode', {
        entity_id: entity.entity_id,
        hvac_mode: mode,
      })
    } catch (error) {
      console.error('Failed to set mode:', error)
      onUpdate(entity) // Revert
    } finally {
      setLoading(false)
    }
  }

  const handleTempChange = (delta: number) => {
    const newTemp = Math.min(maxTemp, Math.max(minTemp, localTemp + delta))
    setLocalTemp(newTemp)
    pendingTempRef.current = newTemp
    setIsPendingSubmit(true)

    // Optimistic update for UI
    onUpdate({
      ...entity,
      attributes: { ...entity.attributes, temperature: newTemp },
    })

    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new timer - will fire after DEBOUNCE_DELAY of no changes
    debounceTimerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        await callService('climate', 'set_temperature', {
          entity_id: entity.entity_id,
          temperature: newTemp,
        })
      } catch (error) {
        console.error('Failed to set temperature:', error)
        pendingTempRef.current = null
        setIsPendingSubmit(false)
        onUpdate(entity) // Revert on error
      } finally {
        setLoading(false)
      }
    }, DEBOUNCE_DELAY)
  }

  const getActionText = () => {
    if (currentMode === 'off') return 'System off'
    switch (hvacAction) {
      case 'heating': return 'Heating'
      case 'cooling': return 'Cooling'
      case 'idle': return 'Idle'
      case 'drying': return 'Drying'
      case 'fan': return 'Fan running'
      default: return MODE_LABELS[currentMode] || currentMode
    }
  }

  return (
    <div className={`space-y-6 ${loading ? 'opacity-70 pointer-events-none' : ''}`}>
      {/* Current Temperature Display */}
      <div className="text-center">
        <div className="text-5xl font-light text-slate-800 mb-1">
          {currentTemp ? `${Math.round(currentTemp)}°` : '--°'}
        </div>
        <div className="text-sm text-slate-500">{getActionText()}</div>
      </div>

      {/* Target Temperature Control */}
      {currentMode !== 'off' && currentMode !== 'fan_only' && (
        <div className="glass-panel p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-3">Target Temperature</div>
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => handleTempChange(-1)}
              className="w-12 h-12 rounded-full glass-button text-slate-700 text-2xl font-light transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
            >
              -
            </button>
            <div className="text-4xl font-light text-slate-800 min-w-[80px] text-center">
              {Math.round(localTemp)}°
            </div>
            <button
              onClick={() => handleTempChange(1)}
              className="w-12 h-12 rounded-full glass-button text-slate-700 text-2xl font-light transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
            >
              +
            </button>
          </div>
          <div className="text-xs text-center mt-2">
            {isPendingSubmit ? (
              <span className="text-blue-500">Saving in a moment...</span>
            ) : (
              <span className="text-slate-400">Range: {minTemp}° - {maxTemp}°</span>
            )}
          </div>
        </div>
      )}

      {/* Mode Selection */}
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-wide mb-3">Mode</div>
        <div className="grid grid-cols-3 gap-2">
          {hvacModes.map((mode) => {
            const isActive = currentMode === mode
            const colors = MODE_COLORS[mode] || MODE_COLORS.off
            return (
              <button
                key={mode}
                onClick={() => handleModeChange(mode)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-300 ${
                  isActive
                    ? `${colors} ring-1 ring-current shadow-lg`
                    : 'glass-panel text-slate-500 hover:bg-slate-100'
                }`}
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d={MODE_ICONS[mode] || MODE_ICONS.auto} />
                </svg>
                <span className="text-xs font-medium">
                  {MODE_LABELS[mode] || mode}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Additional Info */}
      <div className="text-xs text-slate-400 text-center">
        {entity.attributes.friendly_name || entity.entity_id}
      </div>
    </div>
  )
}
