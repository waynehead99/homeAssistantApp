import { useState, useCallback } from 'react'
import type { LightEntity } from '../types/homeAssistant'
import { lightService } from '../services/homeAssistant'
import { useHomeAssistantContext } from '../context/HomeAssistantContext'
import { Slider } from './Slider'
import { LightBulbIcon, EyeSlashIcon } from './icons'

interface LightCardProps {
  light: LightEntity
  onHide?: (entityId: string) => void
  onEditName?: () => void
}

export function LightCard({ light, onHide, onEditName }: LightCardProps) {
  const { updateEntity } = useHomeAssistantContext()
  const [isLoading, setIsLoading] = useState(false)

  const isOn = light.state === 'on'
  const brightness = light.attributes.brightness
  const brightnessPct = brightness ? Math.round((brightness / 255) * 100) : 0
  const friendlyName = light.attributes.friendly_name || light.entity_id.split('.')[1].replace(/_/g, ' ')

  const [localBrightness, setLocalBrightness] = useState(brightnessPct)

  if (Math.abs(localBrightness - brightnessPct) > 5 && !isLoading) {
    setLocalBrightness(brightnessPct)
  }

  const handleToggle = useCallback(async () => {
    setIsLoading(true)
    try {
      const newState = isOn ? 'off' : 'on'
      updateEntity({ ...light, state: newState })

      if (isOn) {
        await lightService.turnOff(light.entity_id)
      } else {
        await lightService.turnOn(light.entity_id)
      }
    } catch (error) {
      updateEntity(light)
      console.error('Failed to toggle light:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isOn, light, updateEntity])

  const handleBrightnessChange = useCallback((value: number) => {
    setLocalBrightness(value)
  }, [])

  const handleBrightnessChangeEnd = useCallback(
    async (value: number) => {
      setIsLoading(true)
      try {
        updateEntity({
          ...light,
          state: value > 0 ? 'on' : 'off',
          attributes: {
            ...light.attributes,
            brightness: Math.round((value / 100) * 255),
          },
        })

        await lightService.setBrightness(light.entity_id, value)
      } catch (error) {
        updateEntity(light)
        setLocalBrightness(brightnessPct)
        console.error('Failed to set brightness:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [light, updateEntity, brightnessPct]
  )

  const supportsBrightness = light.attributes.supported_color_modes?.some(
    (mode) => mode !== 'onoff'
  )

  return (
    <div
      className={`bg-slate-800 rounded-xl p-4 transition-all ${
        isOn ? 'ring-1 ring-yellow-400/30 bg-slate-800/80' : ''
      } ${isLoading ? 'opacity-75' : ''}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg ${isOn ? 'bg-yellow-400/20' : 'bg-slate-700'}`}>
            <LightBulbIcon
              className={`w-5 h-5 ${isOn ? 'text-yellow-400' : 'text-slate-500'}`}
              filled={isOn}
            />
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
            <p className="text-xs text-slate-400">
              {isOn ? (supportsBrightness ? `${localBrightness}%` : 'On') : 'Off'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onHide && (
            <button
              onClick={() => onHide(light.entity_id)}
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
              isOn ? 'bg-yellow-400' : 'bg-slate-600'
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

      {/* Brightness slider */}
      {supportsBrightness && (
        <div className={`transition-opacity ${isOn ? 'opacity-100' : 'opacity-40'}`}>
          <Slider
            value={isOn ? localBrightness : 0}
            min={1}
            max={100}
            onChange={handleBrightnessChange}
            onChangeEnd={handleBrightnessChangeEnd}
            disabled={!isOn || isLoading}
          />
        </div>
      )}
    </div>
  )
}
