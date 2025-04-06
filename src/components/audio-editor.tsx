"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause, Upload } from "lucide-react"
import AudioUploader from "./audio-uploader"
import Timeline from "./timeline"
import type { Track, AudioPill } from "@/lib/types"
import { useAudioPlayback } from "@/hooks/use-audio-playback"

export default function AudioEditor() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [audioPills, setAudioPills] = useState<AudioPill[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [showUploader, setShowUploader] = useState(false)
  const [pausedPosition, setPausedPosition] = useState(0)

  const { play, pause, updateAudioSequence, setCurrentTimePosition, updatePillPosition } = useAudioPlayback(
    audioPills,
    tracks,
    setCurrentTime,
    setIsPlaying,
  )

  // Update audio sequence when tracks or pills change
  useEffect(() => {
    updateAudioSequence()
  }, [tracks, audioPills, updateAudioSequence])

  // Handle adding audio files
  const handleAddAudio = (file: File, audioBuffer: AudioBuffer, duration: number) => {
    // Create a new track for this audio file
    const newTrackId = `track-${Date.now()}`

    const newPill: AudioPill = {
      id: `pill-${Date.now()}`,
      name: file.name,
      file,
      duration,
      startTime: 0,
      trackId: newTrackId,
      audioBuffer,
    }

    setAudioPills((prev) => [...prev, newPill])

    // Create a new track for this audio file
    const newTrack: Track = {
      id: newTrackId,
      name: file.name,
      pills: [newPill.id],
    }

    setTracks((prev) => [...prev, newTrack])
    setShowUploader(false)
  }

  // Handle moving pills between tracks with improved positioning
  const handleMovePill = useCallback(
    (pillId: string, sourceTrackId: string, destinationTrackId: string, newStartTime: number) => {
      // If destinationTrackId is empty, it means we're removing the pill
      if (destinationTrackId === "") {
        // Remove the pill from audioPills
        setAudioPills((prev) => prev.filter((pill) => pill.id !== pillId))

        // Remove pill from source track
        setTracks((prev) =>
          prev.map((track) => {
            if (track.id === sourceTrackId) {
              return {
                ...track,
                pills: track.pills.filter((id) => id !== pillId),
              }
            }
            return track
          }),
        )

        return
      }

      // Find the pill being moved
      const movedPill = audioPills.find((pill) => pill.id === pillId)
      if (!movedPill) return

      // Check for collisions with other pills in the destination track
      const destinationPills = audioPills.filter((pill) => pill.trackId === destinationTrackId && pill.id !== pillId)

      // Adjust position if there's a collision
      let adjustedStartTime = newStartTime
      let hasCollision = false

      do {
        hasCollision = false

        for (const otherPill of destinationPills) {
          const otherStart = otherPill.startTime
          const otherEnd = otherPill.startTime + otherPill.duration
          const movedEnd = adjustedStartTime + movedPill.duration

          // Check if there's an overlap
          if (
            (adjustedStartTime >= otherStart && adjustedStartTime < otherEnd) ||
            (movedEnd > otherStart && movedEnd <= otherEnd) ||
            (adjustedStartTime <= otherStart && movedEnd >= otherEnd)
          ) {
            // Move after the other pill
            adjustedStartTime = otherEnd + 0.1
            hasCollision = true
            break
          }
        }
      } while (hasCollision)

      console.log(
        `Moving pill ${pillId} from track ${sourceTrackId} to track ${destinationTrackId} at position ${adjustedStartTime}`,
      )

      // If we're playing, update the pill position in real-time
      if (isPlaying) {
        updatePillPosition(pillId, destinationTrackId, adjustedStartTime)
      }

      // Remove pill from source track
      setTracks((prev) =>
        prev.map((track) => {
          if (track.id === sourceTrackId) {
            return {
              ...track,
              pills: track.pills.filter((id) => id !== pillId),
            }
          }
          return track
        }),
      )

      // Add pill to destination track
      setTracks((prev) =>
        prev.map((track) => {
          if (track.id === destinationTrackId) {
            return {
              ...track,
              pills: [...track.pills, pillId],
            }
          }
          return track
        }),
      )

      // Update pill's track ID and start time
      setAudioPills((prev) =>
        prev.map((pill) => {
          if (pill.id === pillId) {
            return {
              ...pill,
              trackId: destinationTrackId,
              startTime: adjustedStartTime,
            }
          }
          return pill
        }),
      )
    },
    [audioPills, isPlaying, updatePillPosition],
  )

  // Handle removing a track
  const handleRemoveTrack = useCallback(
    (trackId: string) => {
      // Get all pill IDs from this track
      const trackToRemove = tracks.find((track) => track.id === trackId)
      if (!trackToRemove) return

      // Remove the track
      setTracks((prev) => prev.filter((track) => track.id !== trackId))

      // Remove all pills associated with this track
      setAudioPills((prev) => prev.filter((pill) => pill.trackId !== trackId))
    },
    [tracks],
  )

  const handleTimelineClick = useCallback(
    (time: number) => {
      setCurrentTime(time)
      setCurrentTimePosition(time)
      setPausedPosition(time) // Update pausedPosition when clicking on timeline

      if (isPlaying) {
        // Stop current playback and start from new position
        pause()
        setTimeout(() => play(time), 100) // Increased delay to ensure audio is fully stopped
      }
    },
    [isPlaying, pause, play, setCurrentTimePosition],
  )

  // Update pausedPosition when currentTime changes during playback
  useEffect(() => {
    if (isPlaying) {
      setPausedPosition(currentTime)
    }
  }, [currentTime, isPlaying])

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      // If already playing, pause and store the current position
      console.log("Toggling playback: pausing at", currentTime)
      setPausedPosition(currentTime)
      pause()
    } else {
      // If not playing, resume from the paused position
      console.log("Toggling playback: playing from", pausedPosition)
      pause() // Call pause first to ensure all audio is stopped
      setTimeout(() => {
        // Use the stored paused position for resuming
        play(pausedPosition)
      }, 100) // Increased delay to ensure audio is fully stopped
    }
  }, [isPlaying, pause, play, currentTime, pausedPosition])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            onClick={togglePlayback}
            variant="default"
            disabled={audioPills.length === 0}
            className="min-w-[100px]"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
            {isPlaying ? "Pause" : "Play"}
          </Button>
          <Button onClick={() => setShowUploader(true)} variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Upload Audio
          </Button>
        </div>
      </div>

      {showUploader && (
        <div className="bg-zinc-100 p-4 rounded-md">
          <AudioUploader onAudioAdded={handleAddAudio} />
        </div>
      )}

      <Timeline
        tracks={tracks}
        audioPills={audioPills}
        currentTime={currentTime}
        onMovePill={handleMovePill}
        onTimelineClick={handleTimelineClick}
        onRemoveTrack={handleRemoveTrack}
        isPlaying={isPlaying}
      />
    </div>
  )
}

