"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import type { Track, AudioPill } from "@/lib/types"
import TrackComponent from "./track"
import TimelineRuler from "./timeline-ruler"

interface TimelineProps {
  tracks: Track[]
  audioPills: AudioPill[]
  currentTime: number
  onMovePill: (pillId: string, sourceTrackId: string, destinationTrackId: string, newStartTime: number) => void
  onTimelineClick: (time: number) => void
  onRemoveTrack: (trackId: string) => void
  isPlaying: boolean
}

export default function Timeline({
  tracks,
  audioPills,
  currentTime,
  onMovePill,
  onTimelineClick,
  onRemoveTrack,
  isPlaying,
}: TimelineProps) {
  const [scale, setScale] = useState(100) // pixels per second
  const [maxDuration, setMaxDuration] = useState(60) // default 60 seconds timeline
  const timelineRef = useRef<HTMLDivElement>(null)
  const timelineContentRef = useRef<HTMLDivElement>(null)

  // Calculate the maximum duration based on pills placement
  useEffect(() => {
    if (audioPills.length === 0) return

    const maxEndTime = Math.max(
      ...audioPills.map((pill) => pill.startTime + pill.duration),
      60, // Minimum 60 seconds
    )

    // Add 10 seconds of padding
    setMaxDuration(Math.ceil(maxEndTime) + 10)
  }, [audioPills])

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return

    const rect = timelineRef.current.getBoundingClientRect()
    const scrollLeft = timelineRef.current.scrollLeft
    const offsetX = e.clientX - rect.left + scrollLeft

    const clickedTime = offsetX / scale

    onTimelineClick(clickedTime)
  }

  // Scroll to the current playhead position
  useEffect(() => {
    if (!timelineRef.current || !isPlaying) return

    const playheadPosition = currentTime * scale
    const container = timelineRef.current
    const containerWidth = container.clientWidth

    // Only scroll if the playhead is outside the visible area
    if (playheadPosition < container.scrollLeft || playheadPosition > container.scrollLeft + containerWidth - 100) {
      container.scrollTo({
        left: playheadPosition - containerWidth / 2,
        behavior: "smooth",
      })
    }
  }, [currentTime, scale, isPlaying])

  return (
    <div className="border rounded-md bg-zinc-50 overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b bg-zinc-100">
        <h3 className="font-medium">Timeline</h3>
        <div className="flex items-center gap-2">
          <label htmlFor="zoom" className="text-sm">
            Zoom:
          </label>
          <input
            id="zoom"
            type="range"
            min="50"
            max="200"
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="w-24"
          />
        </div>
      </div>

      <div
        className="relative overflow-auto"
        ref={timelineRef}
        onClick={handleTimelineClick}
        style={{ maxHeight: "600px" }}
      >
        {/* Fixed header with ruler */}
        <div className="sticky top-0 z-20">
          <TimelineRuler scale={scale} duration={maxDuration} />
        </div>

        <div
          ref={timelineContentRef}
          className="relative"
          style={{ minHeight: "300px", width: `${maxDuration * scale}px` }}
        >
          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
            style={{ left: `${currentTime * scale}px` }}
          />

          {tracks.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              No tracks yet. Upload an audio file to get started.
            </div>
          ) : (
            tracks.map((track, index) => (
              <TrackComponent
                key={track.id}
                track={track}
                index={index}
                audioPills={audioPills.filter((pill) => pill.trackId === track.id)}
                scale={scale}
                onMovePill={onMovePill}
                onRemoveTrack={onRemoveTrack}
                isPlaying={isPlaying}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

