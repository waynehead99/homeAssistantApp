import type { CameraEntity } from '../types/homeAssistant'

// Patterns to exclude from camera list
const EXCLUDED_PATTERNS = [
  /tablet/i,
  /last.?recording/i,
  /recording/i,
  /screenshot/i,
  /snapshot/i, // Exclude snapshot-only entities
]

// Specific cameras to exclude (Ring, Eufy, etc.)
const EXCLUDED_CAMERA_NAMES = new Set([
  'front_door_live_view',
  'frontdoorliveview',
  'front_door',
  'camper_door_side',
  'camperdoorside',
  'hitch',
  'rear',
  'driver_side',
  'driverside',
])

// Explicit list of Frigate camera names (from entity_id, without camera. prefix)
// Only these cameras will be shown and use Frigate API
const FRIGATE_CAMERA_NAMES = new Set([
  'drivewayleft',
  'drivewayright',
  'frontdoor',
  'garage',
  'backyard',
  'sideyard',
  'gate',
])

// Check if a camera should be excluded from the list
export function shouldExcludeCamera(camera: CameraEntity): boolean {
  const cameraName = camera.entity_id.replace('camera.', '').toLowerCase()
  const friendlyName = (camera.attributes.friendly_name || '').toLowerCase()

  // Check explicit exclusion list
  if (EXCLUDED_CAMERA_NAMES.has(cameraName)) {
    return true
  }

  // Check exclusion patterns
  return EXCLUDED_PATTERNS.some(
    (pattern) => pattern.test(cameraName) || pattern.test(friendlyName)
  )
}

// Check if a camera is a Frigate camera (should use Frigate API)
export function isFrigateCamera(camera: CameraEntity): boolean {
  const cameraName = camera.entity_id.replace('camera.', '').toLowerCase()

  // Only cameras in our explicit Frigate list are Frigate cameras
  return FRIGATE_CAMERA_NAMES.has(cameraName)
}

// Filter cameras for display - only show Frigate cameras
export function filterCameras(cameras: CameraEntity[]): CameraEntity[] {
  return cameras.filter((camera) => {
    // Exclude unwanted cameras
    if (shouldExcludeCamera(camera)) {
      return false
    }
    // Only include Frigate cameras
    return isFrigateCamera(camera)
  })
}
