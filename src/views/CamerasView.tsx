import { useState, useEffect, useMemo } from 'react'
import { useHomeAssistantContext } from '../context/HomeAssistantContext'
import { cameraService } from '../services/homeAssistant'
import { LiveCameraStream } from '../components/LiveCameraStream'
import { filterCameras, isFrigateCamera } from '../utils/cameraFilters'
import type { FrigateEvent, CameraEntity } from '../types/homeAssistant'

// Component to load camera snapshot with auth
function CameraSnapshot({
  camera,
  className = '',
  refreshTrigger = 0,
  isFrigate = false
}: {
  camera: CameraEntity
  className?: string
  refreshTrigger?: number
  isFrigate?: boolean
}) {
  const [imageUrl, setImageUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let mounted = true
    let currentUrl = ''

    const loadSnapshot = async () => {
      setLoading(true)
      setError(false)

      // Revoke old URL before creating new one
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl)
      }

      const url = await cameraService.getSnapshot(camera.entity_id, isFrigate)
      if (mounted) {
        if (url) {
          currentUrl = url
          setImageUrl(url)
        } else {
          setError(true)
        }
        setLoading(false)
      }
    }

    loadSnapshot()

    return () => {
      mounted = false
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl)
      }
    }
  }, [camera.entity_id, refreshTrigger, isFrigate])

  if (loading && !imageUrl) {
    return (
      <div className={`bg-slate-200 flex items-center justify-center ${className}`}>
        <div className="animate-pulse w-8 h-8 bg-slate-300 rounded-full" />
      </div>
    )
  }

  if (error || !imageUrl) {
    return (
      <div className={`bg-slate-200 flex items-center justify-center ${className}`}>
        <svg className="w-8 h-8 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z"/>
          <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.245 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3h-15a3 3 0 01-3-3V9.574c0-1.416.997-2.664 2.429-2.909.382-.064.766-.123 1.152-.177a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM6.75 12.75a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0zm12-1.5a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd"/>
        </svg>
      </div>
    )
  }

  return (
    <img
      src={imageUrl}
      alt={camera.attributes.friendly_name || camera.entity_id}
      className={className}
    />
  )
}

export function CamerasView() {
  const { cameras: allCameras } = useHomeAssistantContext()
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null)
  const [frigateEvents, setFrigateEvents] = useState<FrigateEvent[]>([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Filter out tablets, recordings, etc.
  const cameras = useMemo(() => filterCameras(allCameras), [allCameras])

  // Create a map of camera entity_id -> isFrigateCamera
  const frigateCameraMap = useMemo(() => {
    const map = new Map<string, boolean>()
    cameras.forEach((camera) => {
      map.set(camera.entity_id, isFrigateCamera(camera))
    })
    return map
  }, [cameras])

  // Check if we have any Frigate cameras
  const hasFrigateCameras = useMemo(
    () => Array.from(frigateCameraMap.values()).some((v) => v),
    [frigateCameraMap]
  )

  // Fetch Frigate events on mount (only if we have Frigate cameras)
  useEffect(() => {
    if (!hasFrigateCameras) return

    const fetchEvents = async () => {
      const events = await cameraService.getAllFrigateEvents(20)
      setFrigateEvents(events)
    }
    fetchEvents()

    // Refresh events every 30 seconds
    const interval = setInterval(fetchEvents, 30000)
    return () => clearInterval(interval)
  }, [hasFrigateCameras])

  // Auto-refresh camera snapshots every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTrigger(t => t + 1)
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatEventTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString()
  }


  if (cameras.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <div className="glass-card p-8 text-center">
          <svg className="w-16 h-16 mb-4 mx-auto opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
          </svg>
          <p className="text-slate-700">No cameras found</p>
          <p className="text-sm text-slate-500 mt-1">Add camera integrations in Home Assistant</p>
        </div>
      </div>
    )
  }

  // Full screen camera view with live stream
  if (selectedCamera) {
    const camera = cameras.find(c => c.entity_id === selectedCamera)
    if (!camera) {
      setSelectedCamera(null)
      return null
    }
    const name = camera.attributes.friendly_name || selectedCamera.split('.')[1].replace(/_/g, ' ')
    const isFrigate = frigateCameraMap.get(selectedCamera) || false

    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-white/95 backdrop-blur-xl border-b border-slate-200 z-10">
          <h2 className="text-lg font-medium text-slate-800 capitalize">{name}</h2>
          <button
            onClick={() => setSelectedCamera(null)}
            className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Live Camera Stream */}
        <div className="flex-1 flex items-center justify-center bg-black">
          <LiveCameraStream
            camera={camera}
            isFrigate={isFrigate}
            onError={() => {
              // Fallback handled in component
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Camera Grid */}
      <div className="grid grid-cols-2 gap-3">
        {cameras.map(camera => {
          const name = camera.attributes.friendly_name || camera.entity_id.split('.')[1].replace(/_/g, ' ')
          const cameraName = camera.entity_id.replace('camera.', '')
          const isFrigate = frigateCameraMap.get(camera.entity_id) || false
          const cameraEvents = isFrigate ? frigateEvents.filter(e => e.camera === cameraName) : []

          return (
            <button
              key={camera.entity_id}
              onClick={() => setSelectedCamera(camera.entity_id)}
              className="glass-card overflow-hidden text-left hover:ring-2 hover:ring-blue-500/50 hover:glow-blue transition-all duration-300"
            >
              {/* Snapshot */}
              <div className="aspect-video bg-slate-200 relative">
                <CameraSnapshot
                  camera={camera}
                  className="w-full h-full object-cover"
                  refreshTrigger={refreshTrigger}
                  isFrigate={isFrigate}
                />
                {/* Event badge */}
                {cameraEvents.length > 0 && (
                  <div className="absolute top-2 right-2 bg-blue-500/90 backdrop-blur-sm text-white text-xs font-medium px-1.5 py-0.5 rounded-lg shadow-lg">
                    {cameraEvents.length}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-2">
                <p className="font-medium text-slate-800 text-sm capitalize truncate">{name}</p>
                {cameraEvents.length > 0 && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {cameraEvents[0].label} · {formatEventTime(cameraEvents[0].start_time)}
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Recent Events */}
      {frigateEvents.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-600 mb-3">Recent Detections</h3>
          <div className="space-y-2">
            {frigateEvents.slice(0, 10).map(event => {
              const cameraName = event.camera.replace(/_/g, ' ')
              // Get score from whichever field is available
              const score = event.top_score ?? event.score ?? event.data?.top_score ?? event.data?.score ?? 0
              const thumbnailUrl = cameraService.getFrigateThumbnailUrl(event.id)

              return (
                <div
                  key={event.id}
                  className="glass-card p-3 flex items-center gap-3"
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-12 glass-panel rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={thumbnailUrl}
                      alt={`${event.label} detection`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Hide broken image and show icon fallback
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center', 'text-slate-400')
                      }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm capitalize">
                      {event.label} detected
                    </p>
                    <p className="text-xs text-slate-500 capitalize">
                      {cameraName} · {formatEventTime(event.start_time)}
                    </p>
                  </div>

                  {/* Confidence */}
                  {score > 0 && (
                    <div className="text-right">
                      <span className="text-xs text-slate-500">
                        {Math.round(score * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
