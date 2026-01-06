import { useState, useEffect, useRef } from 'react'
import { cameraService } from '../services/homeAssistant'
import type { CameraEntity } from '../types/homeAssistant'

interface LiveCameraStreamProps {
  camera: CameraEntity
  isFrigate?: boolean
  onError?: () => void
}

export function LiveCameraStream({ camera, isFrigate = false, onError }: LiveCameraStreamProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [useSnapshotFallback, setUseSnapshotFallback] = useState(false)
  const [snapshotUrl, setSnapshotUrl] = useState<string>('')
  const imgRef = useRef<HTMLImageElement>(null)
  const refreshIntervalRef = useRef<number | null>(null)

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
      <div className="w-full h-full flex items-center justify-center bg-black relative">
        <img
          src={snapshotUrl}
          alt={camera.attributes.friendly_name || camera.entity_id}
          className="max-w-full max-h-full object-contain"
        />
        {/* Live indicator */}
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs text-white font-medium">LIVE</span>
        </div>
      </div>
    )
  }

  // MJPEG stream mode (preferred)
  return (
    <div className="w-full h-full flex items-center justify-center bg-black relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
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
        className="max-w-full max-h-full object-contain"
        onError={handleStreamError}
        onLoad={handleStreamLoad}
      />

      {/* Live indicator - show when stream is active */}
      {!loading && !error && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs text-white font-medium">LIVE</span>
          {isFrigateDirect && (
            <span className="text-xs text-slate-400 ml-1">Frigate</span>
          )}
        </div>
      )}
    </div>
  )
}
