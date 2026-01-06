import { useState } from 'react'
import type { AlarmEntity } from '../types/homeAssistant'
import { callService } from '../services/homeAssistant'

interface AlarmControlsProps {
  entity: AlarmEntity
  onUpdate: (entity: AlarmEntity) => void
}

const STATE_INFO: Record<string, { label: string; color: string; bgColor: string }> = {
  disarmed: { label: 'Disarmed', color: 'text-green-400', bgColor: 'bg-green-400/20' },
  armed_home: { label: 'Armed Home', color: 'text-yellow-400', bgColor: 'bg-yellow-400/20' },
  armed_away: { label: 'Armed Away', color: 'text-red-400', bgColor: 'bg-red-400/20' },
  armed_night: { label: 'Armed Night', color: 'text-purple-400', bgColor: 'bg-purple-400/20' },
  armed_vacation: { label: 'Armed Vacation', color: 'text-blue-400', bgColor: 'bg-blue-400/20' },
  armed_custom_bypass: { label: 'Armed Custom', color: 'text-orange-400', bgColor: 'bg-orange-400/20' },
  pending: { label: 'Pending', color: 'text-yellow-400', bgColor: 'bg-yellow-400/20' },
  arming: { label: 'Arming...', color: 'text-yellow-400', bgColor: 'bg-yellow-400/20' },
  triggered: { label: 'TRIGGERED', color: 'text-red-500', bgColor: 'bg-red-500/20' },
}

export function AlarmControls({ entity, onUpdate }: AlarmControlsProps) {
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState('')
  const [showKeypad, setShowKeypad] = useState(false)

  const currentState = entity.state
  const codeRequired = entity.attributes.code_arm_required || entity.attributes.code_format
  const stateInfo = STATE_INFO[currentState] || { label: currentState, color: 'text-slate-400', bgColor: 'bg-slate-700' }
  const isArmed = currentState.startsWith('armed')

  const handleArm = async (mode: 'away' | 'home' | 'night') => {
    if (codeRequired && !code) {
      setShowKeypad(true)
      return
    }

    setLoading(true)
    try {
      onUpdate({ ...entity, state: 'arming' })
      await callService('alarm_control_panel', `alarm_arm_${mode}`, {
        entity_id: entity.entity_id,
        ...(code && { code }),
      })
      // State will update from HA
    } catch (error) {
      console.error('Failed to arm:', error)
      onUpdate(entity)
    } finally {
      setLoading(false)
      setCode('')
    }
  }

  const handleDisarm = async () => {
    if (codeRequired && !code) {
      setShowKeypad(true)
      return
    }

    setLoading(true)
    try {
      onUpdate({ ...entity, state: 'disarmed' })
      await callService('alarm_control_panel', 'alarm_disarm', {
        entity_id: entity.entity_id,
        ...(code && { code }),
      })
    } catch (error) {
      console.error('Failed to disarm:', error)
      onUpdate(entity)
    } finally {
      setLoading(false)
      setCode('')
      setShowKeypad(false)
    }
  }

  const handleKeypadPress = (digit: string) => {
    if (digit === 'clear') {
      setCode('')
    } else if (digit === 'back') {
      setCode(prev => prev.slice(0, -1))
    } else {
      setCode(prev => prev + digit)
    }
  }

  return (
    <div className={`space-y-6 ${loading ? 'opacity-70 pointer-events-none' : ''}`}>
      {/* Current State Display */}
      <div className="text-center">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${stateInfo.bgColor}`}>
          <div className={`w-3 h-3 rounded-full ${stateInfo.color.replace('text-', 'bg-')} ${currentState === 'triggered' ? 'animate-pulse' : ''}`} />
          <span className={`text-lg font-medium ${stateInfo.color}`}>
            {stateInfo.label}
          </span>
        </div>
      </div>

      {/* Keypad for code entry */}
      {showKeypad && (
        <div className="bg-slate-700/50 rounded-xl p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wide mb-3 text-center">Enter Code</div>
          <div className="flex justify-center mb-4">
            <div className="bg-slate-800 rounded-lg px-4 py-2 min-w-[120px] text-center">
              <span className="text-2xl tracking-widest text-white">
                {'•'.repeat(code.length) || '----'}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'].map((key) => (
              <button
                key={key}
                onClick={() => handleKeypadPress(key)}
                className={`p-3 rounded-lg text-lg font-medium transition-colors ${
                  key === 'clear' || key === 'back'
                    ? 'bg-slate-600 text-slate-300 hover:bg-slate-500 text-sm'
                    : 'bg-slate-700 text-white hover:bg-slate-600'
                }`}
              >
                {key === 'clear' ? 'CLR' : key === 'back' ? 'DEL' : key}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Arm Buttons */}
      {!isArmed && currentState !== 'arming' && (
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-wide mb-3">Arm System</div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleArm('home')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 transition-colors"
            >
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
              <span className="text-sm font-medium">Home</span>
            </button>
            <button
              onClick={() => handleArm('away')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-red-400/10 hover:bg-red-400/20 text-red-400 transition-colors"
            >
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
              </svg>
              <span className="text-sm font-medium">Away</span>
            </button>
            <button
              onClick={() => handleArm('night')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-purple-400/10 hover:bg-purple-400/20 text-purple-400 transition-colors"
            >
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 2c-1.05 0-2.05.16-3 .46 4.06 1.27 7 5.06 7 9.54 0 4.48-2.94 8.27-7 9.54.95.3 1.95.46 3 .46 5.52 0 10-4.48 10-10S14.52 2 9 2z" />
              </svg>
              <span className="text-sm font-medium">Night</span>
            </button>
          </div>
        </div>
      )}

      {/* Disarm Button */}
      {(isArmed || currentState === 'triggered' || currentState === 'pending') && (
        <button
          onClick={handleDisarm}
          className="w-full py-4 rounded-xl bg-green-500 hover:bg-green-400 text-white font-semibold text-lg transition-colors"
        >
          Disarm
        </button>
      )}

      {/* Code requirement hint */}
      {codeRequired && !showKeypad && (
        <p className="text-xs text-slate-500 text-center">
          Code required to arm/disarm
        </p>
      )}

      {/* Entity info */}
      <div className="text-xs text-slate-500 text-center">
        {entity.attributes.friendly_name || entity.entity_id}
      </div>
    </div>
  )
}
