import { useState } from 'react'
import { callService } from '../services/homeAssistant'
import type { LockEntity } from '../types/homeAssistant'

interface LockControlsProps {
  entity: LockEntity
  onUpdate: (entity: LockEntity) => void
}

export function LockControls({ entity, onUpdate }: LockControlsProps) {
  const [loading, setLoading] = useState(false)

  const isLocked = entity.state === 'locked'
  const isUnlocked = entity.state === 'unlocked'
  const isJammed = entity.state === 'jammed'
  const isLocking = entity.state === 'locking'
  const isUnlocking = entity.state === 'unlocking'

  const handleLock = async () => {
    setLoading(true)
    try {
      onUpdate({ ...entity, state: 'locking' })
      await callService('lock', 'lock', { entity_id: entity.entity_id })
      onUpdate({ ...entity, state: 'locked' })
    } catch (error) {
      onUpdate(entity)
      console.error('Failed to lock:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUnlock = async () => {
    setLoading(true)
    try {
      onUpdate({ ...entity, state: 'unlocking' })
      await callService('lock', 'unlock', { entity_id: entity.entity_id })
      onUpdate({ ...entity, state: 'unlocked' })
    } catch (error) {
      onUpdate(entity)
      console.error('Failed to unlock:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = () => {
    if (isLocked) return 'text-green-600'
    if (isUnlocked) return 'text-yellow-600'
    if (isJammed) return 'text-red-600'
    return 'text-blue-600'
  }

  const getStatusText = () => {
    if (isLocked) return 'Locked'
    if (isUnlocked) return 'Unlocked'
    if (isJammed) return 'Jammed'
    if (isLocking) return 'Locking...'
    if (isUnlocking) return 'Unlocking...'
    return entity.state
  }

  return (
    <div className="space-y-6">
      {/* Status Display */}
      <div className="flex items-center justify-center">
        <div className={`text-center ${getStatusColor()}`}>
          <div className="text-6xl mb-2">
            {isLocked ? '🔒' : isJammed ? '⚠️' : '🔓'}
          </div>
          <div className="text-xl font-semibold">{getStatusText()}</div>
          {entity.attributes.changed_by && (
            <div className="text-sm text-slate-400 mt-1">
              Changed by: {entity.attributes.changed_by}
            </div>
          )}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={handleLock}
          disabled={loading || isLocked || isLocking}
          className={`py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 ${
            isLocked
              ? 'bg-gradient-to-br from-green-400/20 to-emerald-500/10 text-green-600 ring-1 ring-green-400/30'
              : 'glass-panel text-slate-700 hover:bg-green-500/20 hover:text-green-600'
          } ${(loading || isLocking) ? 'opacity-50' : ''}`}
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl">🔒</span>
            <span>Lock</span>
          </div>
        </button>

        <button
          onClick={handleUnlock}
          disabled={loading || isUnlocked || isUnlocking}
          className={`py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 ${
            isUnlocked
              ? 'bg-gradient-to-br from-yellow-400/20 to-amber-500/10 text-yellow-600 ring-1 ring-yellow-400/30'
              : 'glass-panel text-slate-700 hover:bg-yellow-500/20 hover:text-yellow-600'
          } ${(loading || isUnlocking) ? 'opacity-50' : ''}`}
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl">🔓</span>
            <span>Unlock</span>
          </div>
        </button>
      </div>

      {/* Jammed Warning */}
      {isJammed && (
        <div className="glass-panel bg-red-500/10 border-red-500/30 p-4 text-center">
          <p className="text-red-600 font-medium">Lock is jammed!</p>
          <p className="text-sm text-slate-500 mt-1">Check the lock mechanism</p>
        </div>
      )}
    </div>
  )
}
