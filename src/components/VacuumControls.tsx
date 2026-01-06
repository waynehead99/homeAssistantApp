import { useState } from 'react'
import type { VacuumEntity } from '../types/homeAssistant'
import { callService } from '../services/homeAssistant'

interface VacuumControlsProps {
  entity: VacuumEntity
  onUpdate: (entity: VacuumEntity) => void
}

const STATE_INFO: Record<string, { label: string; color: string }> = {
  cleaning: { label: 'Cleaning', color: 'text-green-400' },
  docked: { label: 'Docked', color: 'text-blue-400' },
  idle: { label: 'Idle', color: 'text-slate-400' },
  paused: { label: 'Paused', color: 'text-yellow-400' },
  returning: { label: 'Returning', color: 'text-purple-400' },
  error: { label: 'Error', color: 'text-red-400' },
}

export function VacuumControls({ entity, onUpdate }: VacuumControlsProps) {
  const [loading, setLoading] = useState(false)

  const currentState = entity.state
  const battery = entity.attributes.battery_level
  const fanSpeed = entity.attributes.fan_speed
  const fanSpeeds = entity.attributes.fan_speed_list || []
  const status = entity.attributes.status
  const stateInfo = STATE_INFO[currentState] || { label: currentState, color: 'text-slate-400' }

  const isCleaning = ['cleaning', 'on'].includes(currentState)
  const isPaused = currentState === 'paused'
  const isDocked = currentState === 'docked'

  const handleCommand = async (command: string) => {
    setLoading(true)
    try {
      let newState = currentState
      switch (command) {
        case 'start':
          newState = 'cleaning'
          break
        case 'pause':
          newState = 'paused'
          break
        case 'return_to_base':
          newState = 'returning'
          break
        case 'stop':
          newState = 'idle'
          break
      }
      onUpdate({ ...entity, state: newState })
      await callService('vacuum', command, { entity_id: entity.entity_id })
    } catch (error) {
      console.error('Failed to send command:', error)
      onUpdate(entity)
    } finally {
      setLoading(false)
    }
  }

  const handleFanSpeed = async (speed: string) => {
    setLoading(true)
    try {
      onUpdate({
        ...entity,
        attributes: { ...entity.attributes, fan_speed: speed },
      })
      await callService('vacuum', 'set_fan_speed', {
        entity_id: entity.entity_id,
        fan_speed: speed,
      })
    } catch (error) {
      console.error('Failed to set fan speed:', error)
      onUpdate(entity)
    } finally {
      setLoading(false)
    }
  }

  const getBatteryColor = () => {
    if (!battery) return 'text-slate-400'
    if (battery <= 20) return 'text-red-400'
    if (battery <= 50) return 'text-yellow-400'
    return 'text-green-400'
  }

  return (
    <div className={`space-y-6 ${loading ? 'opacity-70 pointer-events-none' : ''}`}>
      {/* Status Display */}
      <div className="text-center">
        {/* Vacuum Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-700 mb-3">
          <svg className={`w-10 h-10 ${stateInfo.color} ${isCleaning ? 'animate-pulse' : ''}`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z" />
          </svg>
        </div>
        <div className={`text-xl font-medium ${stateInfo.color}`}>
          {stateInfo.label}
        </div>
        {status && status !== currentState && (
          <div className="text-sm text-slate-400 mt-1">{status}</div>
        )}
      </div>

      {/* Battery */}
      {battery !== undefined && (
        <div className="bg-slate-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Battery</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-slate-600 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    battery <= 20 ? 'bg-red-400' : battery <= 50 ? 'bg-yellow-400' : 'bg-green-400'
                  }`}
                  style={{ width: `${battery}%` }}
                />
              </div>
              <span className={`text-sm font-medium ${getBatteryColor()}`}>
                {battery}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Controls */}
      <div className="grid grid-cols-3 gap-3">
        {/* Start/Resume Button */}
        {!isCleaning && (
          <button
            onClick={() => handleCommand('start')}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-green-400/10 hover:bg-green-400/20 text-green-400 transition-colors"
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span className="text-sm font-medium">{isPaused ? 'Resume' : 'Start'}</span>
          </button>
        )}

        {/* Pause Button */}
        {isCleaning && (
          <button
            onClick={() => handleCommand('pause')}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 transition-colors"
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
            <span className="text-sm font-medium">Pause</span>
          </button>
        )}

        {/* Stop Button */}
        <button
          onClick={() => handleCommand('stop')}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-red-400/10 hover:bg-red-400/20 text-red-400 transition-colors"
        >
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h12v12H6z" />
          </svg>
          <span className="text-sm font-medium">Stop</span>
        </button>

        {/* Return to Base Button */}
        {!isDocked && (
          <button
            onClick={() => handleCommand('return_to_base')}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-400/10 hover:bg-blue-400/20 text-blue-400 transition-colors"
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
            <span className="text-sm font-medium">Dock</span>
          </button>
        )}
      </div>

      {/* Fan Speed */}
      {fanSpeeds.length > 0 && (
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-wide mb-3">Fan Speed</div>
          <div className="flex flex-wrap gap-2">
            {fanSpeeds.map((speed) => (
              <button
                key={speed}
                onClick={() => handleFanSpeed(speed)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  fanSpeed === speed
                    ? 'bg-purple-400/20 text-purple-400 ring-1 ring-purple-400/50'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {speed.charAt(0).toUpperCase() + speed.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Entity info */}
      <div className="text-xs text-slate-500 text-center">
        {entity.attributes.friendly_name || entity.entity_id}
      </div>
    </div>
  )
}
