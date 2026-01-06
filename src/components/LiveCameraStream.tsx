import { useState, useEffect, useRef, useCallback } from 'react'
import { cameraService } from '../services/homeAssistant'
import type { CameraEntity } from '../types/homeAssistant'

interface LiveCameraStreamProps {
  camera: CameraEntity
  isFrigate?: boolean
  onError?: () => void
}

const MIN_ZOOM = 1
const MAX_ZOOM = 5

export function LiveCameraStream({ camera, isFrigate = false, onError }: LiveCameraStreamProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [useSnapshotFallback, setUseSnapshotFallback] = useState(false)
  const [snapshotUrl, setSnapshotUrl] = useState<string>('')
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const refreshIntervalRef = useRef<number | null>(null)

  // Zoom and pan state
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null)
  const lastPinchDistanceRef = useRef<number | null>(null)
  const lastTapRef = useRef<number>(0)
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null)

  // Calculate bounds for panning
  const getBounds = useCallback(() => {
    if (!containerRef.current) return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
    const rect = containerRef.current.getBoundingClientRect()
    const scaledWidth = rect.width * scale
    const scaledHeight = rect.height * scale
    const maxX = Math.max(0, (scaledWidth - rect.width) / 2)
    const maxY = Math.max(0, (scaledHeight - rect.height) / 2)
    return { minX: -maxX, maxX, minY: -maxY, maxY }
  }, [scale])

  // Clamp position to bounds
  const clampPosition = useCallback((x: number, y: number) => {
    const bounds = getBounds()
    return {
      x: Math.max(bounds.minX, Math.min(bounds.maxX, x)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, y)),
    }
  }, [getBounds])

  // Reset zoom
  const resetZoom = useCallback(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [])

  // Handle double tap to zoom
  const handleDoubleTap = useCallback((clientX: number, clientY: number) => {
    if (scale > 1) {
      resetZoom()
    } else {
      setScale(2.5)
      // Zoom towards tap point
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const offsetX = clientX - rect.left - rect.width / 2
        const offsetY = clientY - rect.top - rect.height / 2
        const newPos = clampPosition(-offsetX * 0.5, -offsetY * 0.5)
        setPosition(newPos)
      }
    }
  }, [scale, resetZoom, clampPosition])

  // Touch handlers for pinch zoom and pan
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Check for double tap
      const now = Date.now()
      if (now - lastTapRef.current < 300) {
        handleDoubleTap(e.touches[0].clientX, e.touches[0].clientY)
        lastTapRef.current = 0
        return
      }
      lastTapRef.current = now

      // Start drag
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      dragStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        posX: position.x,
        posY: position.y,
      }
      if (scale > 1) {
        setIsDragging(true)
      }
    } else if (e.touches.length === 2) {
      // Start pinch
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastPinchDistanceRef.current = Math.sqrt(dx * dx + dy * dy)
    }
  }, [scale, position, handleDoubleTap])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastPinchDistanceRef.current !== null) {
      // Pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const distance = Math.sqrt(dx * dx + dy * dy)
      const delta = distance / lastPinchDistanceRef.current
      lastPinchDistanceRef.current = distance

      setScale(s => {
        const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, s * delta))
        if (newScale === 1) {
          setPosition({ x: 0, y: 0 })
        }
        return newScale
      })
    } else if (e.touches.length === 1 && isDragging && dragStartRef.current) {
      // Pan
      const dx = e.touches[0].clientX - dragStartRef.current.x
      const dy = e.touches[0].clientY - dragStartRef.current.y
      const newPos = clampPosition(dragStartRef.current.posX + dx, dragStartRef.current.posY + dy)
      setPosition(newPos)
    }
  }, [isDragging, clampPosition])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
    lastPinchDistanceRef.current = null
    lastTouchRef.current = null
    dragStartRef.current = null

    // Reset position if zoomed out
    if (scale <= 1) {
      setPosition({ x: 0, y: 0 })
    }
  }, [scale])

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setScale(s => {
      const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, s * delta))
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 })
      }
      return newScale
    })
  }, [])

  // Mouse drag for desktop
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true)
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        posX: position.x,
        posY: position.y,
      }
    }
  }, [scale, position])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && dragStartRef.current) {
      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y
      const newPos = clampPosition(dragStartRef.current.posX + dx, dragStartRef.current.posY + dy)
      setPosition(newPos)
    }
  }, [isDragging, clampPosition])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    dragStartRef.current = null
  }, [])

  // Double click to zoom (desktop)
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    handleDoubleTap(e.clientX, e.clientY)
  }, [handleDoubleTap])

  // Get the stream URL - Frigate direct if it's a Frigate camera, else HA proxy
  const streamUrl = cameraService.getStreamUrl(camera.entity_id, isFrigate)
  const isFrigateDirect = isFrigate && cameraService.isFrigateConfigured()

  // Rapid snapshot refresh fallback for "live" view when MJPEG fails
  useEffect(() => {
    if (!useSnapshotFallback) return

    let mounted = true
    let currentUrl = ''

    const refreshSnapshot = async () => {
      const url = await cameraService.getSnapshot(camera.entity_id, isFrigate)
      if (mounted && url) {
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl)
        }
        currentUrl = url
        setSnapshotUrl(url)
        setLoading(false)
      }
    }

    // Initial load
    refreshSnapshot()

    // Refresh every 500ms for near-live experience
    refreshIntervalRef.current = window.setInterval(refreshSnapshot, 500)

    return () => {
      mounted = false
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl)
      }
    }
  }, [useSnapshotFallback, camera.entity_id, isFrigate])

  const handleStreamError = () => {
    console.warn('Stream failed, switching to snapshot mode')
    setError(true)
    setUseSnapshotFallback(true)
    onError?.()
  }

  const handleStreamLoad = () => {
    setLoading(false)
    setError(false)
  }

  // Transform style for zoom/pan
  const transformStyle = {
    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
    transition: isDragging ? 'none' : 'transform 0.2s ease-out',
  }

  // Common container props for zoom/pan
  const containerProps = {
    ref: containerRef,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onWheel: handleWheel,
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseUp,
    onDoubleClick: handleDoubleClick,
  }

  // Snapshot fallback mode
  if (useSnapshotFallback) {
    if (!snapshotUrl) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
            <p className="text-slate-400">Loading camera...</p>
          </div>
        </div>
      )
    }

    return (
      <div
        {...containerProps}
        className={`w-full h-full flex items-center justify-center bg-black relative overflow-hidden ${isDragging ? 'cursor-grabbing' : scale > 1 ? 'cursor-grab' : ''}`}
      >
        <img
          src={snapshotUrl}
          alt={camera.attributes.friendly_name || camera.entity_id}
          className="max-w-full max-h-full object-contain select-none"
          style={transformStyle}
          draggable={false}
        />
        {/* Live indicator */}
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full z-10">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs text-white font-medium">LIVE</span>
        </div>
        {/* Zoom indicator */}
        {scale > 1 && (
          <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full z-10">
            <span className="text-xs text-white font-medium">{scale.toFixed(1)}x</span>
            <button
              onClick={(e) => { e.stopPropagation(); resetZoom(); }}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Reset
            </button>
          </div>
        )}
      </div>
    )
  }

  // MJPEG stream mode (preferred)
  return (
    <div
      {...containerProps}
      className={`w-full h-full flex items-center justify-center bg-black relative overflow-hidden ${isDragging ? 'cursor-grabbing' : scale > 1 ? 'cursor-grab' : ''}`}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
            <p className="text-slate-400">
              {isFrigateDirect ? 'Connecting to Frigate...' : 'Loading stream...'}
            </p>
          </div>
        </div>
      )}

      <img
        ref={imgRef}
        src={streamUrl}
        alt={camera.attributes.friendly_name || camera.entity_id}
        className="max-w-full max-h-full object-contain select-none"
        style={transformStyle}
        onError={handleStreamError}
        onLoad={handleStreamLoad}
        draggable={false}
      />

      {/* Live indicator - show when stream is active */}
      {!loading && !error && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full z-10">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs text-white font-medium">LIVE</span>
          {isFrigateDirect && (
            <span className="text-xs text-slate-400 ml-1">Frigate</span>
          )}
        </div>
      )}

      {/* Zoom indicator */}
      {scale > 1 && (
        <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full z-10">
          <span className="text-xs text-white font-medium">{scale.toFixed(1)}x</span>
          <button
            onClick={(e) => { e.stopPropagation(); resetZoom(); }}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  )
}
