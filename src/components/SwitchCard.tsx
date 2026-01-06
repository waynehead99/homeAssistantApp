import { useState, useCallback } from 'react'
import type { SwitchEntity } from '../types/homeAssistant'
import { callService } from '../services/homeAssistant'
import { useHomeAssistantContext } from '../context/HomeAssistantContext'
import { PowerIcon, EyeSlashIcon } from './icons'

interface SwitchCardProps {
  entity: SwitchEntity
  onHide?: (entityId: string) => void
  onEditName?: () => void
}

export function SwitchCard({ entity, onHide, onEditName }: SwitchCardProps) {
  const { updateEntity } = useHomeAssistantContext()
  const [isLoading, setIsLoading] = useState(false)

  const isOn = entity.state === 'on'
  const friendlyName = entity.attributes.friendly_name || entity.entity_id.split('.')[1].replace(/_/g, ' ')

  const handleToggle = useCallback(async () => {
    setIsLoading(true)
    try {
      const newState = isOn ? 'off' : 'on'
      updateEntity({ ...entity, state: newState })

      await callService('switch', isOn ? 'turn_off' : 'turn_on', {
        entity_id: entity.entity_id,
      })
    } catch (error) {
      updateEntity(entity)
      console.error('Failed to toggle switch:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isOn, entity, updateEntity])

  return (
    <div
      className={`bg-slate-800 rounded-xl p-4 transition-all ${
        isOn ? 'ring-1 ring-green-400/30' : ''
      } ${isLoading ? 'opacity-75' : ''}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg ${isOn ? 'bg-green-400/20' : 'bg-slate-700'}`}>
            <PowerIcon className={`w-5 h-5 ${isOn ? 'text-green-400' : 'text-slate-500'}`} />
          </div>
          <div className="min-w-0">
            {onEditName ? (
              <button
                onClick={onEditName}
                className="font-medium text-white truncate text-sm hover:text-blue-400 transition-colors flex items-center gap-1"
              >
                {friendlyName}
                <svg className="w-3 h-3 text-slate-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                </svg>
              </button>
            ) : (
              <h3 className="font-medium text-white truncate text-sm">{friendlyName}</h3>
            )}
            <p className="text-xs text-slate-400">{isOn ? 'On' : 'Off'}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onHide && (
            <button
              onClick={() => onHide(entity.entity_id)}
              className="p-1.5 text-slate-600 hover:text-slate-400 transition-colors"
              title="Hide"
            >
              <EyeSlashIcon className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleToggle}
            disabled={isLoading}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              isOn ? 'bg-green-400' : 'bg-slate-600'
            } ${isLoading ? 'cursor-wait' : 'cursor-pointer'}`}
            role="switch"
            aria-checked={isOn}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                isOn ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
