"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import type { Track, AudioPill } from "@/lib/types"
import AudioPillComponent from "./audio-pill"

interface TrackProps {
  track: Track
  index: number
  audioPills: AudioPill[]
  allPills: AudioPill[]
  scale: number
  onMovePill: (pillId: string, sourceTrackId: string, destinationTrackId: string, newStartTime: number) => void
  onRemoveTrack: (trackId: string) => void
  isPlaying: boolean
}

export default function TrackComponent({
  track,
  index,
  audioPills,
  allPills,
  scale,
  onMovePill,
  onRemoveTrack,
  isPlaying,
}: TrackProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [dropIndicatorPosition, setDropIndicatorPosition] = useState<number | null>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)

    // Set the dropEffect to move
    e.dataTransfer.dropEffect = "move"

    // Calculate and show drop indicator position
    if (trackRef.current) {
      const trackRect = trackRef.current.getBoundingClientRect()
      const offsetX = e.clientX - trackRect.left
      const dragOffsetX = Number.parseInt(e.dataTransfer.getData("drag-offset-x") || "0", 10)

      // Adjust position by drag offset if available
      const adjustedPosition = Math.max(0, (offsetX - dragOffsetX) / scale)
      // Round to nearest 0.5 second for better precision
      const roundedPosition = Math.round(adjustedPosition * 2) / 2
      setDropIndicatorPosition(roundedPosition * scale)
    }
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
    setDropIndicatorPosition(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    setDropIndicatorPosition(null)

    const pillId = e.dataTransfer.getData("pill-id")
    const sourceTrackId = e.dataTransfer.getData("source-track-id")
    const dragOffsetX = Number.parseInt(e.dataTransfer.getData("drag-offset-x") || "0", 10)

    if (!pillId || !trackRef.current) return

    // Calculate the drop position in seconds
    const trackRect = trackRef.current.getBoundingClientRect()
    const offsetX = e.clientX - trackRect.left

    // Adjust position by drag offset if available
    let newStartTime = (offsetX - dragOffsetX) / scale

    // Ensure we don't go negative
    newStartTime = Math.max(0, newStartTime)

    // Round to nearest 0.5 second for better precision
    const roundedStartTime = Math.round(newStartTime * 2) / 2

    onMovePill(pillId, sourceTrackId, track.id, roundedStartTime)
  }

  // Clean up drop indicator when component unmounts
  useEffect(() => {
    return () => {
      setDropIndicatorPosition(null)
    }
  }, [])

  return (
    <div
      ref={trackRef}
      className={`h-32 border-b relative ${
        isDragOver ? "bg-blue-50" : index % 2 === 0 ? "bg-white" : "bg-gray-50"
      } transition-colors duration-200`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Track label - small badge in top-left corner */}
      <div className="absolute top-1 left-1 z-10 bg-zinc-100 px-2 py-0.5 rounded-md text-xs font-medium">
        Track {index + 1}
      </div>

      <div className="h-full relative">
        {/* Drop position indicator */}
        {dropIndicatorPosition !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-20"
            style={{ left: `${dropIndicatorPosition}px` }}
          />
        )}

        {audioPills.map((pill) => (
          <AudioPillComponent
            key={pill.id}
            pill={pill}
            scale={scale}
            trackId={track.id}
            isPlaying={isPlaying}
            onRemovePill={() => {
              // Remove the pill from the track
              onMovePill(pill.id, track.id, "", -1)

              // If this was the last pill, remove the track
              if (audioPills.length === 1) {
                onRemoveTrack(track.id)
              }
            }}
          />
        ))}
      </div>
    </div>
  )
}

