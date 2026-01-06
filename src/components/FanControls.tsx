import { useState } from 'react'
import type { FanEntity } from '../types/homeAssistant'
import { FanSupportedFeatures } from '../types/homeAssistant'
import { callService } from '../services/homeAssistant'

interface FanControlsProps {
  entity: FanEntity
  onUpdate: (entity: FanEntity) => void
}

const PRESET_ICONS: Record<string, string> = {
  auto: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z',
  low: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
  medium: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-11h2v4h-2zm0 6h2v2h-2z',
  high: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v8h-2zm0 10h2v2h-2z',
}

export function FanControls({ entity, onUpdate }: FanControlsProps) {
  const [loading, setLoading] = useState(false)
  const [localPercentage, setLocalPercentage] = useState(entity.attributes.percentage || 0)

  const isOn = entity.state === 'on'
  const percentage = entity.attributes.percentage || 0
  const presetMode = entity.attributes.preset_mode
  const presetModes = entity.attributes.preset_modes || []
  const oscillating = entity.attributes.oscillating
  const direction = entity.attributes.direction
  const supportedFeatures = entity.attributes.supported_features || 0

  // Check what features are supported
  const supportsSpeed = (supportedFeatures & FanSupportedFeatures.SET_SPEED) !== 0
  const supportsOscillate = (supportedFeatures & FanSupportedFeatures.OSCILLATE) !== 0
  const supportsDirection = (supportedFeatures & FanSupportedFeatures.DIRECTION) !== 0
  const supportsPresetMode = (supportedFeatures & FanSupportedFeatures.PRESET_MODE) !== 0 && presetModes.length > 0

  const handleToggle = async () => {
    setLoading(true)
    try {
      const newState = isOn ? 'off' : 'on'
      onUpdate({ ...entity, state: newState })
      await callService('fan', isOn ? 'turn_off' : 'turn_on', {
        entity_id: entity.entity_id,
      })
    } catch (error) {
      console.error('Failed to toggle fan:', error)
      onUpdate(entity)
    } finally {
      setLoading(false)
    }
  }

  const handleSpeedChange = async (newPercentage: number) => {
    setLocalPercentage(newPercentage)
  }

  const handleSpeedCommit = async () => {
    if (localPercentage === percentage) return

    setLoading(true)
    try {
      onUpdate({
        ...entity,
        state: localPercentage > 0 ? 'on' : 'off',
        attributes: { ...entity.attributes, percentage: localPercentage },
      })
      await callService('fan', 'set_percentage', {
        entity_id: entity.entity_id,
        percentage: localPercentage,
      })
    } catch (error) {
      console.error('Failed to set fan speed:', error)
      onUpdate(entity)
    } finally {
      setLoading(false)
    }
  }

  const handlePresetMode = async (mode: string) => {
    setLoading(true)
    try {
      onUpdate({
        ...entity,
        state: 'on',
        attributes: { ...entity.attributes, preset_mode: mode },
      })
      await callService('fan', 'set_preset_mode', {
        entity_id: entity.entity_id,
        preset_mode: mode,
      })
    } catch (error) {
      console.error('Failed to set preset mode:', error)
      onUpdate(entity)
    } finally {
      setLoading(false)
    }
  }

  const handleOscillate = async () => {
    setLoading(true)
    try {
      const newOscillating = !oscillating
      onUpdate({
        ...entity,
        attributes: { ...entity.attributes, oscillating: newOscillating },
      })
      await callService('fan', 'oscillate', {
        entity_id: entity.entity_id,
        oscillating: newOscillating,
      })
    } catch (error) {
      console.error('Failed to toggle oscillation:', error)
      onUpdate(entity)
    } finally {
      setLoading(false)
    }
  }

  const handleDirection = async () => {
    setLoading(true)
    try {
      const newDirection = direction === 'forward' ? 'reverse' : 'forward'
      onUpdate({
        ...entity,
        attributes: { ...entity.attributes, direction: newDirection },
      })
      await callService('fan', 'set_direction', {
        entity_id: entity.entity_id,
        direction: newDirection,
      })
    } catch (error) {
      console.error('Failed to set direction:', error)
      onUpdate(entity)
    } finally {
      setLoading(false)
    }
  }

  // Get speed label
  const getSpeedLabel = () => {
    if (presetMode) return presetMode.charAt(0).toUpperCase() + presetMode.slice(1)
    if (percentage === 0) return 'Off'
    if (percentage <= 33) return 'Low'
    if (percentage <= 66) return 'Medium'
    return 'High'
  }

  return (
    <div className={`space-y-6 ${loading ? 'opacity-70 pointer-events-none' : ''}`}>
      {/* Power Toggle */}
      <div className="bg-slate-700/50 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Fan Icon */}
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isOn ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-600/50 text-slate-500'
            }`}>
              <svg className={`w-6 h-6 ${isOn ? 'animate-spin' : ''}`} style={{ animationDuration: '2s' }} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 11c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 2c0-3.31-2.69-6-6-6V3L6 9l6 6v-4c2.21 0 4 1.79 4 4h4zm-12 0c0 3.31 2.69 6 6 6v4l6-6-6-6v4c-2.21 0-4-1.79-4-4H6z"/>
              </svg>
            </div>
            <div>
              <div className="text-white font-medium">Power</div>
              <div className="text-sm text-slate-400">
                {isOn ? `${getSpeedLabel()} - ${percentage}%` : 'Off'}
              </div>
            </div>
          </div>
          {/* Toggle Switch */}
          <button
            onClick={handleToggle}
            className={`relative w-14 h-8 rounded-full transition-colors ${
              isOn ? 'bg-blue-500' : 'bg-slate-600'
            }`}
          >
            <div
              className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
                isOn ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Speed Slider */}
      {supportsSpeed && isOn && (
        <div className="bg-slate-700/50 rounded-xl p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wide mb-3">Speed</div>
          <div className="flex items-center gap-4">
            <span className="text-slate-500 text-sm w-8">0%</span>
            <input
              type="range"
              min={0}
              max={100}
              step={entity.attributes.percentage_step || 1}
              value={localPercentage}
              onChange={(e) => handleSpeedChange(Number(e.target.value))}
              onMouseUp={handleSpeedCommit}
              onTouchEnd={handleSpeedCommit}
              className="flex-1 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-slate-500 text-sm w-12 text-right">100%</span>
          </div>
          <div className="text-center text-sm text-white mt-2">{localPercentage}%</div>
        </div>
      )}

      {/* Preset Modes */}
      {supportsPresetMode && (
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-wide mb-3">Preset Mode</div>
          <div className="grid grid-cols-3 gap-2">
            {presetModes.map((mode) => {
              const isActive = presetMode === mode
              return (
                <button
                  key={mode}
                  onClick={() => handlePresetMode(mode)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-blue-400/20 text-blue-400 ring-1 ring-blue-400/30'
                      : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d={PRESET_ICONS[mode.toLowerCase()] || PRESET_ICONS.auto} />
                  </svg>
                  <span className="text-xs font-medium capitalize">
                    {mode.replace(/_/g, ' ')}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Oscillation & Direction Controls */}
      {(supportsOscillate || supportsDirection) && (
        <div className="flex gap-3">
          {/* Oscillate Toggle */}
          {supportsOscillate && (
            <button
              onClick={handleOscillate}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl transition-all ${
                oscillating
                  ? 'bg-green-400/20 text-green-400 ring-1 ring-green-400/30'
                  : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
              </svg>
              <span className="text-sm font-medium">Oscillate</span>
            </button>
          )}

          {/* Direction Toggle */}
          {supportsDirection && (
            <button
              onClick={handleDirection}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl transition-all ${
                direction === 'reverse'
                  ? 'bg-purple-400/20 text-purple-400 ring-1 ring-purple-400/30'
                  : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <svg
                className={`w-5 h-5 transition-transform ${direction === 'reverse' ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
              </svg>
              <span className="text-sm font-medium">
                {direction === 'reverse' ? 'Reverse' : 'Forward'}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Entity Info */}
      <div className="text-xs text-slate-500 text-center">
        {entity.attributes.friendly_name || entity.entity_id}
      </div>
    </div>
  )
}
