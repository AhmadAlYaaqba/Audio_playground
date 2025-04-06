"use client"

import { useEffect, useRef } from "react"
import WaveSurfer from "wavesurfer.js"

interface WavesurferSimpleProps {
  audioBuffer: AudioBuffer
  width: number
  height?: number
  waveColor?: string
}

export default function WavesurferClient({
  audioBuffer,
  width,
  height = 40,
  waveColor = "#9ca3af",
}: WavesurferSimpleProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Create peaks data directly from the audio buffer
    const createPeaksData = (buffer: AudioBuffer, numPoints = 200) => {
      const channelData = buffer.getChannelData(0)
      const samplesPerPoint = Math.floor(channelData.length / numPoints)
      const peaks = []

      for (let i = 0; i < numPoints; i++) {
        let max = 0
        for (let j = 0; j < samplesPerPoint; j++) {
          const idx = i * samplesPerPoint + j
          if (idx < channelData.length) {
            const value = Math.abs(channelData[idx])
            if (value > max) max = value
          }
        }
        peaks.push(max)
      }

      return peaks
    }

    try {
      // Create a new WaveSurfer instance with minimal options
      const wavesurfer = WaveSurfer.create({
        container: containerRef.current,
        waveColor,
        progressColor: waveColor,
        height,
        width,
        cursorWidth: 0,
        barWidth: 1,
        barGap: 2,
        normalize: true,
        interact: false,
      })

      // Generate peaks data
      const peaks = createPeaksData(audioBuffer)

      // Use the peaks data directly instead of loading a file
      if (typeof wavesurfer.loadDecodedBuffer === "function") {
        // For WaveSurfer v6+
        wavesurfer.loadDecodedBuffer(audioBuffer)
      } else if (typeof wavesurfer.load === "function" && typeof wavesurfer.drawBuffer === "function") {
        // For older versions, we'll try to draw the buffer directly
        // This is a workaround and may not work in all versions
        wavesurfer.empty()
        wavesurfer.drawBuffer()
      } else {
        // Fallback to drawing with canvas
        drawWaveformWithCanvas()
      }

      // Clean up
      return () => {
        wavesurfer.destroy()
      }
    } catch (error) {
      console.error("Error with WaveSurfer:", error)
      // Fallback to canvas drawing
      drawWaveformWithCanvas()
    }

    // Fallback function to draw waveform with canvas
    function drawWaveformWithCanvas() {
      if (!containerRef.current) return

      // Clear the container
      containerRef.current.innerHTML = ""

      // Create a canvas element
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      // Add the canvas to the container
      containerRef.current.appendChild(canvas)

      // Get the context and draw the waveform
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Clear the canvas
      ctx.clearRect(0, 0, width, height)

      // Get audio data
      const channelData = audioBuffer.getChannelData(0)
      const numPoints = Math.min(width, 200)
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

      // Draw the waveform
      const centerY = height / 2

      ctx.strokeStyle = waveColor
      ctx.lineWidth = 1
      ctx.beginPath()

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
    }
  }, [audioBuffer, width, height, waveColor])

  return <div ref={containerRef} style={{ width: `${width}px`, height: `${height}px`, backgroundColor: "white" }} />
}

