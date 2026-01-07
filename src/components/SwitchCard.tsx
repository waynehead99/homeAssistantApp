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
      className={`glass-card p-4 transition-all duration-300 ${isLoading ? 'opacity-75' : ''}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`p-2.5 rounded-xl transition-all duration-300 ${
            isOn
              ? 'bg-gradient-to-br from-green-400/25 to-emerald-500/15'
              : 'glass-panel'
          }`}>
            <PowerIcon className={`w-5 h-5 transition-all duration-300 ${isOn ? 'text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'text-slate-400'}`} />
          </div>
          <div className="min-w-0">
            {onEditName ? (
              <button
                onClick={onEditName}
                className="font-medium text-slate-800 text-sm hover:text-blue-600 transition-colors flex items-start gap-1 text-left"
              >
                <span className="line-clamp-2 leading-tight">{friendlyName}</span>
                <svg className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                </svg>
              </button>
            ) : (
              <h3 className="font-medium text-slate-800 text-sm line-clamp-2 leading-tight">{friendlyName}</h3>
            )}
            <p className="text-xs text-slate-500">{isOn ? 'On' : 'Off'}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onHide && (
            <button
              onClick={() => onHide(entity.entity_id)}
              className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
              title="Hide"
            >
              <EyeSlashIcon className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleToggle}
            disabled={isLoading}
            className={`toggle-3d relative w-12 h-7 rounded-full transition-all duration-300 ${
              isOn ? 'bg-gradient-to-r from-green-400 to-emerald-400' : 'bg-slate-300'
            } ${isLoading ? 'cursor-wait' : 'cursor-pointer'}`}
            role="switch"
            aria-checked={isOn}
          >
            <div
              className={`toggle-3d-knob w-5 h-5 top-1 bg-gradient-to-b from-white to-slate-100 rounded-full transition-transform duration-300 ${
                isOn ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
