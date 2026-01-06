import { useCallback, useRef, useState } from 'react'

interface SliderProps {
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
  onChangeEnd?: (value: number) => void
  disabled?: boolean
  className?: string
}

export function Slider({
  value,
  min = 0,
  max = 100,
  onChange,
  onChangeEnd,
  disabled = false,
  className = '',
}: SliderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const sliderRef = useRef<HTMLDivElement>(null)

  const calculateValue = useCallback(
    (clientX: number) => {
      if (!sliderRef.current) return value

      const rect = sliderRef.current.getBoundingClientRect()
      const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      return Math.round(min + percentage * (max - min))
    },
    [min, max, value]
  )

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return
    e.preventDefault()
    setIsDragging(true)
    const newValue = calculateValue(e.clientX)
    onChange(newValue)

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newVal = calculateValue(moveEvent.clientX)
      onChange(newVal)
    }

    const handleMouseUp = (upEvent: MouseEvent) => {
      setIsDragging(false)
      const finalValue = calculateValue(upEvent.clientX)
      onChangeEnd?.(finalValue)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return
    setIsDragging(true)
    const touch = e.touches[0]
    const newValue = calculateValue(touch.clientX)
    onChange(newValue)

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const touchMove = moveEvent.touches[0]
      const newVal = calculateValue(touchMove.clientX)
      onChange(newVal)
    }

    const handleTouchEnd = (endEvent: TouchEvent) => {
      setIsDragging(false)
      const touchEnd = endEvent.changedTouches[0]
      const finalValue = calculateValue(touchEnd.clientX)
      onChangeEnd?.(finalValue)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }

    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd)
  }

  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div
      ref={sliderRef}
      className={`relative h-8 flex items-center cursor-pointer select-none touch-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Track background */}
      <div className="absolute inset-x-0 h-2 bg-slate-600 rounded-full">
        {/* Filled portion */}
        <div
          className="absolute inset-y-0 left-0 bg-blue-500 rounded-full transition-all duration-75"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Thumb */}
      <div
        className={`absolute w-5 h-5 bg-white rounded-full shadow-md transform -translate-x-1/2 transition-transform ${
          isDragging ? 'scale-110' : ''
        }`}
        style={{ left: `${percentage}%` }}
      />
    </div>
  )
}
