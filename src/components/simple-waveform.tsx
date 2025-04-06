"use client"

import { useEffect, useRef } from "react"

interface SimpleWaveformProps {
  audioBuffer: AudioBuffer
  width: number
  height?: number
  color?: string
}

export default function SimpleWaveform({ audioBuffer, width, height = 40, color = "#9ca3af" }: SimpleWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = width
    canvas.height = height

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Get audio data
    const channelData = audioBuffer.getChannelData(0)
    const numPoints = Math.min(width, 200) // Limit the number of points to draw
    const samplesPerPoint = Math.floor(channelData.length / numPoints)

    // Calculate peaks
    const peaks = []
    for (let i = 0; i < numPoints; i++) {
      let peak = 0
      for (let j = 0; j < samplesPerPoint; j++) {
        const idx = i * samplesPerPoint + j
        if (idx < channelData.length) {
          const value = Math.abs(channelData[idx])
          if (value > peak) peak = value
        }
      }
      peaks.push(peak)
    }

    // Find max peak for normalization
    const maxPeak = Math.max(...peaks, 0.01)

    // Draw the waveform as a simple line
    const centerY = height / 2

    // Set line style
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.beginPath()

    // Draw the line
    for (let i = 0; i < peaks.length; i++) {
      const x = (i / peaks.length) * width
      const normalizedPeak = peaks[i] / maxPeak
      const y = centerY - normalizedPeak * centerY * 0.8

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }

    ctx.stroke()
  }, [audioBuffer, width, height, color])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        display: "block",
        backgroundColor: "white",
      }}
    />
  )
}

