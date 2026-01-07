import { useState, useEffect, useRef } from 'react'
import type { CoverEntity } from '../types/homeAssistant'
import { CoverSupportedFeatures } from '../types/homeAssistant'
import { callService } from '../services/homeAssistant'

interface CoverControlsProps {
  entity: CoverEntity
  onUpdate: (entity: CoverEntity) => void
}

// Icons for different cover device classes
const COVER_ICONS: Record<string, { open: string; closed: string }> = {
  blind: {
    open: 'M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2zm0 4h18v2H3v-2zm0 4h18v2H3v-2z',
    closed: 'M3 3h18v18H3V3zm2 2v14h14V5H5z',
  },
  curtain: {
    open: 'M3 3h7v18H3V3zm11 0h7v18h-7V3z',
    closed: 'M3 3h18v18H3V3zm2 2v14h14V5H5z',
  },
  garage: {
    open: 'M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H4V8h16v12zM4 6V4h16v2H4z',
    closed: 'M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H4V4h16v16z',
  },
  gate: {
    open: 'M12 2L2 7v15h4v-9h12v9h4V7L12 2zm0 10c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z',
    closed: 'M12 2L2 7v15h20V7L12 2zm0 10c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z',
  },
  shade: {
    open: 'M20 19V3H4v16H2v2h20v-2h-2zM6 5h12v2H6V5z',
    closed: 'M20 19V3H4v16H2v2h20v-2h-2zM6 5h12v12H6V5z',
  },
  shutter: {
    open: 'M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2z',
    closed: 'M3 3h18v18H3V3zm2 2v14h14V5H5z',
  },
  window: {
    open: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h6v6h8v8z',
    closed: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z',
  },
  door: {
    open: 'M19 19V5c0-1.1-.9-2-2-2H7c-1.1 0-2 .9-2 2v14H3v2h18v-2h-2zm-2 0H7V5h10v14zm-4-8h2v2h-2v-2z',
    closed: 'M19 19V5c0-1.1-.9-2-2-2H7c-1.1 0-2 .9-2 2v14H3v2h18v-2h-2zm-2 0H7V5h10v14z',
  },
  default: {
    open: 'M19 19V5c0-1.1-.9-2-2-2H7c-1.1 0-2 .9-2 2v14H3v2h18v-2h-2zM7 5h10v14H7V5z',
    closed: 'M19 19V5c0-1.1-.9-2-2-2H7c-1.1 0-2 .9-2 2v14H3v2h18v-2h-2zm-6 0H7V5h6v14z',
  },
}

export function CoverControls({ entity, onUpdate }: CoverControlsProps) {
  const [loading, setLoading] = useState(false)
  const [localPosition, setLocalPosition] = useState(entity.attributes.current_position ?? 0)
  const [localTiltPosition, setLocalTiltPosition] = useState(entity.attributes.current_tilt_position ?? 0)
  const pendingPositionRef = useRef<number | null>(null)
  const pendingTiltRef = useRef<number | null>(null)

  // Sync local state when entity prop changes, but not if we have pending changes
  useEffect(() => {
    const entityPos = entity.attributes.current_position ?? 0
    const entityTilt = entity.attributes.current_tilt_position ?? 0

    // Clear pending if HA now matches
    if (pendingPositionRef.current !== null && Math.abs(entityPos - pendingPositionRef.current) <= 2) {
      pendingPositionRef.current = null
    }
    if (pendingTiltRef.current !== null && Math.abs(entityTilt - pendingTiltRef.current) <= 2) {
      pendingTiltRef.current = null
    }

    // Only sync from entity if we don't have pending changes
    if (pendingPositionRef.current === null) {
      setLocalPosition(entityPos)
    }
    if (pendingTiltRef.current === null) {
      setLocalTiltPosition(entityTilt)
    }
  }, [entity.attributes.current_position, entity.attributes.current_tilt_position])

  const state = entity.state // open, closed, opening, closing, stopped
  const position = entity.attributes.current_position ?? 0
  const tiltPosition = entity.attributes.current_tilt_position ?? 0
  const deviceClass = entity.attributes.device_class || 'default'
  const supportedFeatures = entity.attributes.supported_features || 0

  // Check what features are supported
  const supportsOpen = (supportedFeatures & CoverSupportedFeatures.OPEN) !== 0
  const supportsClose = (supportedFeatures & CoverSupportedFeatures.CLOSE) !== 0
  const supportsSetPosition = (supportedFeatures & CoverSupportedFeatures.SET_POSITION) !== 0
  const supportsStop = (supportedFeatures & CoverSupportedFeatures.STOP) !== 0
  const supportsTilt = (supportedFeatures & CoverSupportedFeatures.SET_TILT_POSITION) !== 0

  const isOpen = state === 'open' || position > 0
  const isClosed = state === 'closed' || position === 0
  const isMoving = state === 'opening' || state === 'closing'

  const icons = COVER_ICONS[deviceClass] || COVER_ICONS.default

  const handleOpen = async () => {
    setLoading(true)
    try {
      onUpdate({ ...entity, state: 'opening' })
      await callService('cover', 'open_cover', {
        entity_id: entity.entity_id,
      })
    } catch (error) {
      console.error('Failed to open cover:', error)
      onUpdate(entity)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = async () => {
    setLoading(true)
    try {
      onUpdate({ ...entity, state: 'closing' })
      await callService('cover', 'close_cover', {
        entity_id: entity.entity_id,
      })
    } catch (error) {
      console.error('Failed to close cover:', error)
      onUpdate(entity)
    } finally {
      setLoading(false)
    }
  }

  const handleStop = async () => {
    setLoading(true)
    try {
      onUpdate({ ...entity, state: 'stopped' })
      await callService('cover', 'stop_cover', {
        entity_id: entity.entity_id,
      })
    } catch (error) {
      console.error('Failed to stop cover:', error)
      onUpdate(entity)
    } finally {
      setLoading(false)
    }
  }

  const handlePositionChange = async (newPosition: number) => {
    setLocalPosition(newPosition)
  }

  const handlePositionCommit = async () => {
    if (localPosition === position) return

    pendingPositionRef.current = localPosition // Mark as pending until HA confirms
    setLoading(true)
    try {
      onUpdate({
        ...entity,
        state: localPosition > 0 ? 'open' : 'closed',
        attributes: { ...entity.attributes, current_position: localPosition },
      })
      await callService('cover', 'set_cover_position', {
        entity_id: entity.entity_id,
        position: localPosition,
      })
    } catch (error) {
      console.error('Failed to set cover position:', error)
      pendingPositionRef.current = null // Clear pending on error
      onUpdate(entity)
    } finally {
      setLoading(false)
    }
  }

  const handleTiltChange = async (newTilt: number) => {
    setLocalTiltPosition(newTilt)
  }

  const handleTiltCommit = async () => {
    if (localTiltPosition === tiltPosition) return

    pendingTiltRef.current = localTiltPosition // Mark as pending until HA confirms
    setLoading(true)
    try {
      onUpdate({
        ...entity,
        attributes: { ...entity.attributes, current_tilt_position: localTiltPosition },
      })
      await callService('cover', 'set_cover_tilt_position', {
        entity_id: entity.entity_id,
        tilt_position: localTiltPosition,
      })
    } catch (error) {
      console.error('Failed to set tilt position:', error)
      pendingTiltRef.current = null // Clear pending on error
      onUpdate(entity)
    } finally {
      setLoading(false)
    }
  }

  // Get status label
  const getStatusLabel = () => {
    if (state === 'opening') return 'Opening...'
    if (state === 'closing') return 'Closing...'
    if (state === 'stopped') return 'Stopped'
    if (supportsSetPosition && position !== undefined) {
      if (position === 100) return 'Fully Open'
      if (position === 0) return 'Closed'
      return `${position}% Open`
    }
    return state === 'open' ? 'Open' : 'Closed'
  }

  // Get device class label
  const getDeviceClassLabel = () => {
    return deviceClass.charAt(0).toUpperCase() + deviceClass.slice(1)
  }

  return (
    <div className={`space-y-6 ${loading ? 'opacity-70 pointer-events-none' : ''}`}>
      {/* Status Display */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-3xl font-light text-slate-800">
            {supportsSetPosition ? `${position}%` : (isOpen ? 'Open' : 'Closed')}
          </div>
          <div className="text-sm text-slate-500">{getStatusLabel()}</div>
        </div>
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
            isOpen
              ? 'bg-blue-500/15 text-blue-600 glow-blue'
              : 'glass-panel text-slate-400'
          }`}
        >
          <svg
            className={`w-8 h-8 ${isMoving ? 'animate-pulse' : ''}`}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d={isOpen ? icons.open : icons.closed} />
          </svg>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-3">
        {supportsOpen && (
          <button
            onClick={handleOpen}
            disabled={isOpen && !isMoving}
            className={`flex-1 flex flex-col items-center gap-1.5 p-4 rounded-xl transition-all duration-300 ${
              isOpen && !isMoving
                ? 'glass-panel opacity-40 text-slate-400 cursor-not-allowed'
                : 'glass-panel text-slate-600 hover:bg-slate-100 active:scale-95'
            }`}
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
            </svg>
            <span className="text-xs font-medium">Open</span>
          </button>
        )}

        {supportsStop && (
          <button
            onClick={handleStop}
            className="flex-1 flex flex-col items-center gap-1.5 p-4 rounded-xl transition-all duration-300 glass-panel text-slate-600 hover:bg-slate-100 active:scale-95"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h12v12H6z"/>
            </svg>
            <span className="text-xs font-medium">Stop</span>
          </button>
        )}

        {supportsClose && (
          <button
            onClick={handleClose}
            disabled={isClosed && !isMoving}
            className={`flex-1 flex flex-col items-center gap-1.5 p-4 rounded-xl transition-all duration-300 ${
              isClosed && !isMoving
                ? 'glass-panel opacity-40 text-slate-400 cursor-not-allowed'
                : 'glass-panel text-slate-600 hover:bg-slate-100 active:scale-95'
            }`}
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
            </svg>
            <span className="text-xs font-medium">Close</span>
          </button>
        )}
      </div>

      {/* Position Slider */}
      {supportsSetPosition && (
        <div className="glass-panel p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-3">Position</div>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm w-12">Closed</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={localPosition}
              onChange={(e) => handlePositionChange(Number(e.target.value))}
              onMouseUp={handlePositionCommit}
              onTouchEnd={handlePositionCommit}
              className="slider-3d flex-1"
            />
            <span className="text-slate-400 text-sm w-10 text-right">Open</span>
          </div>
          <div className="text-center text-sm text-slate-700 mt-2">{localPosition}%</div>
        </div>
      )}

      {/* Tilt Position Slider */}
      {supportsTilt && (
        <div className="glass-panel p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-3">Tilt</div>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm w-8">0°</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={localTiltPosition}
              onChange={(e) => handleTiltChange(Number(e.target.value))}
              onMouseUp={handleTiltCommit}
              onTouchEnd={handleTiltCommit}
              className="slider-3d flex-1"
            />
            <span className="text-slate-400 text-sm w-12 text-right">90°</span>
          </div>
          <div className="text-center text-sm text-slate-700 mt-2">{localTiltPosition}%</div>
        </div>
      )}

      {/* Device Info */}
      <div className="text-xs text-slate-400 text-center">
        {getDeviceClassLabel()} • {entity.attributes.friendly_name || entity.entity_id}
      </div>
    </div>
  )
}
