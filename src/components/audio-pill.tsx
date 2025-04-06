"use client"

import type React from "react"

import { useState, useRef } from "react"
import type { AudioPill } from "@/lib/types"
import { GripHorizontal, Music, Trash2 } from "lucide-react"
import WavesurferSimple from "./wavesurfer-simple"

interface AudioPillProps {
  pill: AudioPill
  scale: number
  trackId: string
  isPlaying: boolean
  onRemovePill: () => void
}

export default function AudioPillComponent({ pill, scale, trackId, isPlaying, onRemovePill }: AudioPillProps) {
  const [isDragging, setIsDragging] = useState(false)
  const pillRef = useRef<HTMLDivElement>(null)
  const dragOffsetX = useRef<number>(0)

  const handleDragStart = (e: React.DragEvent) => {
    if (!pillRef.current) return

    // Calculate the offset within the pill where the drag started
    const pillRect = pillRef.current.getBoundingClientRect()
    dragOffsetX.current = e.clientX - pillRect.left

    // Set the data to be transferred
    e.dataTransfer.setData("pill-id", pill.id)
    e.dataTransfer.setData("source-track-id", trackId)
    e.dataTransfer.setData("drag-offset-x", dragOffsetX.current.toString())

    // Create a ghost element for dragging
    const ghostElement = pillRef.current.cloneNode(true) as HTMLDivElement
    ghostElement.style.position = "absolute"
    ghostElement.style.top = "-1000px" // Position off-screen
    ghostElement.style.opacity = "0.8"
    ghostElement.style.pointerEvents = "none"
    document.body.appendChild(ghostElement)

    // Use the ghost element as the drag image
    e.dataTransfer.setDragImage(ghostElement, dragOffsetX.current, 20)

    // Clean up the ghost element after the drag operation
    setTimeout(() => {
      document.body.removeChild(ghostElement)
    }, 0)

    setIsDragging(true)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  // Calculate width based on duration and scale
  const width = Math.max(60, pill.duration * scale)

  // Get a consistent color based on the pill ID
  const pillColor = getRandomPastelColor(pill.id)

  return (
    <div
      ref={pillRef}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`absolute top-2 bottom-2 rounded-md border shadow-sm flex flex-col overflow-hidden cursor-move ${
        isDragging ? "opacity-50" : "opacity-100"
      } transition-all duration-200 ease-in-out`}
      style={{
        left: `${pill.startTime * scale}px`,
        width: `${width}px`,
        minWidth: "60px",
        backgroundColor: pillColor,
        transform: isDragging ? "scale(1.02)" : "scale(1)",
        zIndex: isDragging ? 10 : 1,
      }}
    >
      {/* Top section: Name and audio icon */}
      <div className="bg-black/10 px-2 py-1 text-xs font-medium flex items-center justify-between">
        <div className="flex items-center">
          <Music className="h-3 w-3 mr-1" />
          <span className="truncate">{pill.name}</span>
        </div>
        <GripHorizontal className="h-3 w-3 opacity-50" />
      </div>

      {/* Middle section: Waveform */}
      <div className="flex-1 relative bg-white p-2">
        <div className="absolute inset-0 flex items-center justify-center">
          <WavesurferSimple
            audioBuffer={pill.audioBuffer}
            width={width - 8} // Account for padding
            height={60}
            waveColor="#9ca3af"
          />
        </div>
        <div className="text-xs relative z-10 mt-auto text-right">{formatDuration(pill.duration)}</div>
      </div>

      {/* Bottom section: Delete button */}
      <div className="bg-black/5 px-2 py-1 flex justify-end">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemovePill()
          }}
          className="text-red-500 hover:text-red-600 transition-colors p-1 rounded-full hover:bg-red-100"
          title="Remove audio"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

// Generate a consistent pastel color based on ID
function getRandomPastelColor(id: string): string {
  // Generate a hash from the string
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }

  // Generate pastel color
  const h = hash % 360
  return `hsl(${h}, 70%, 80%)`
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

