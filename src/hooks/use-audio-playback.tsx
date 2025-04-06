"use client"

import { useRef, useCallback, useEffect } from "react"
import type { Track, AudioPill } from "@/lib/types"

export function useAudioPlayback(
  audioPills: AudioPill[],
  tracks: Track[],
  setCurrentTime: (time: number) => void,
  setIsPlaying: (isPlaying: boolean) => void,
) {
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map())
  const startTimeRef = useRef<number>(0)
  const animationFrameRef = useRef<number | null>(null)
  const scheduledPillsRef = useRef<Set<string>>(new Set())
  const currentPositionRef = useRef<number>(0)
  const isPlayingRef = useRef<boolean>(false)
  const lastUpdateTimeRef = useRef<number>(0)
  const movedPillsRef = useRef<Map<string, { startTime: number; trackId: string }>>(new Map())
  const lastSetTimeRef = useRef<number>(0)
  const pillPositionsRef = useRef<Map<string, { startTime: number; trackId: string }>>(new Map())

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== "undefined" && !audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    return () => {
      stopAllAudio()
      if (audioContextRef.current?.state !== "closed") {
        audioContextRef.current?.close()
      }
    }
  }, []) // Empty dependency array - only run once on mount

  // Keep track of the latest pill positions
  useEffect(() => {
    // Update our reference of pill positions
    audioPills.forEach((pill) => {
      pillPositionsRef.current.set(pill.id, {
        startTime: pill.startTime,
        trackId: pill.trackId,
      })
    })

    // Remove any pills that no longer exist
    const pillIds = new Set(audioPills.map((pill) => pill.id))
    Array.from(pillPositionsRef.current.keys()).forEach((id) => {
      if (!pillIds.has(id)) {
        pillPositionsRef.current.delete(id)
      }
    })
  }, [audioPills])

  // Update the current time during playback
  const updateCurrentTime = () => {
    if (!audioContextRef.current || !isPlayingRef.current) return

    const elapsed = audioContextRef.current.currentTime - startTimeRef.current
    currentPositionRef.current = elapsed

    // Only update the state if the time has changed significantly (prevent excessive updates)
    if (Math.abs(elapsed - lastSetTimeRef.current) > 0.05) {
      setCurrentTime(elapsed)
      lastSetTimeRef.current = elapsed
    }

    // Check if we need to schedule more audio pills
    const now = Date.now()
    if (now - lastUpdateTimeRef.current > 500) {
      // Check more frequently (every 500ms)
      lastUpdateTimeRef.current = now
      checkAndScheduleUpcomingPills(elapsed)
    }

    animationFrameRef.current = requestAnimationFrame(updateCurrentTime)
  }

  // Check for upcoming pills that need to be scheduled
  const checkAndScheduleUpcomingPills = 
    (currentPosition: number) => {
      // Look ahead by 5 seconds to schedule upcoming pills
      const lookAheadTime = currentPosition + 5

      audioPills.forEach((pill) => {
        // If the pill starts within our look-ahead window and isn't already scheduled
        if (
          pill.startTime > currentPosition &&
          pill.startTime <= lookAheadTime &&
          !scheduledPillsRef.current.has(pill.id)
        ) {
          console.log(`Scheduling upcoming pill ${pill.id} at position ${pill.startTime}`)
          schedulePill(pill)
        }
      })

      // Check for moved pills that need to be scheduled
      movedPillsRef.current.forEach((movedInfo, pillId) => {
        const pill = audioPills.find((p) => p.id === pillId)
        if (
          pill &&
          pill.startTime > currentPosition &&
          pill.startTime <= lookAheadTime &&
          !scheduledPillsRef.current.has(pillId)
        ) {
          console.log(`Scheduling moved pill ${pillId} at new position ${pill.startTime}`)
          schedulePill(pill)
          // Remove from moved pills after scheduling
          movedPillsRef.current.delete(pillId)
        }
      })
    }

  // Force stop the audio context to ensure all audio stops
  const forceStopAudio = () => {
    if (!audioContextRef.current) return

    // Suspend the audio context to immediately stop all audio
    if (audioContextRef.current.state === "running") {
      audioContextRef.current.suspend().catch((err) => {
        console.error("Failed to suspend audio context:", err)
      })
    }

    // Create a new audio context to ensure a clean state
    const oldContext = audioContextRef.current
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()

    // Close the old context after a short delay
    setTimeout(() => {
      if (oldContext.state !== "closed") {
        oldContext.close().catch((err) => {
          console.error("Failed to close old audio context:", err)
        })
      }
    }, 100)
  }

  // Stop all audio and clear resources
  const stopAllAudio = useCallback(() => {
    console.log("Stopping all audio")

    // Cancel the animation frame first
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // Stop all audio source nodes
    sourceNodesRef.current.forEach((node, id) => {
      console.log("Stopping node for pill:", id)
      try {
        node.stop()
        node.disconnect()
      } catch (e) {
        console.error("Error stopping node:", e)
      }
    })

    // Force stop any potentially playing audio
    forceStopAudio()

    // Clear all references
    sourceNodesRef.current.clear()
    scheduledPillsRef.current.clear()
    movedPillsRef.current.clear()
    isPlayingRef.current = false

    // Update the UI state
    setIsPlaying(false)
  }, [setIsPlaying, forceStopAudio])

  // Stop a specific audio pill
  const stopPill = useCallback((pillId: string) => {
    const sourceNode = sourceNodesRef.current.get(pillId)
    if (sourceNode) {
      try {
        sourceNode.stop()
        sourceNode.disconnect()
      } catch (e) {
        // Node might already be stopped
      }

      sourceNodesRef.current.delete(pillId)
      scheduledPillsRef.current.delete(pillId)
    }
  }, [])

  // Play audio from a specific time
  const play = useCallback(
    (startPosition = 0) => {
      console.log("Starting playback from position:", startPosition)

      if (!audioContextRef.current) {
        console.error("Audio context not initialized")
        return
      }

      // First, ensure all currently playing audio is stopped
      stopAllAudio()

      // If the audio context is suspended (browser autoplay policy), resume it
      if (audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume().catch((err) => {
          console.error("Failed to resume audio context:", err)
        })
      }

      // Reset the audio context if it's in a closed state
      if (audioContextRef.current.state === "closed") {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      // Set the start reference time - this is the key to fixing the negative start time issue
      // We need to set this to the current audio context time, not relative to the startPosition
      startTimeRef.current = audioContextRef.current.currentTime - startPosition
      currentPositionRef.current = startPosition
      isPlayingRef.current = true
      lastUpdateTimeRef.current = Date.now()
      lastSetTimeRef.current = startPosition
      movedPillsRef.current.clear() // Clear moved pills tracking

      console.log("Scheduling audio pills...")

      // Schedule all pills that should play
      audioPills.forEach((pill) => {
        // Only schedule pills that start after our current position or are currently playing
        if (pill.startTime <= startPosition && pill.startTime + pill.duration > startPosition) {
          // This pill should already be playing
          const offset = startPosition - pill.startTime
          console.log(`Scheduling pill ${pill.id} with offset ${offset}`)
          schedulePill(pill, offset)
        } else if (pill.startTime > startPosition && pill.startTime < startPosition + 5) {
          // This pill will play in the near future (next 5 seconds)
          console.log(`Scheduling future pill ${pill.id}`)
          schedulePill(pill)
        }
      })

      // Start the animation frame to update current time
      animationFrameRef.current = requestAnimationFrame(updateCurrentTime)

      // Update the UI state
      setIsPlaying(true)
      console.log("Playback started")
    },
    [audioPills, stopAllAudio, updateCurrentTime, setIsPlaying],
  )

  // Schedule a single audio pill to play with precise timing
  const schedulePill = useCallback(
    (pill: AudioPill, offset = 0) => {
      if (!audioContextRef.current) return

      // If this pill is already scheduled, stop it first to prevent duplicates
      if (scheduledPillsRef.current.has(pill.id)) {
        stopPill(pill.id)
      }

      try {
        const source = audioContextRef.current.createBufferSource()
        source.buffer = pill.audioBuffer
        source.connect(audioContextRef.current.destination)

        // Calculate when this pill should start relative to the audio context's current time
        const pillDelayTime = pill.startTime - currentPositionRef.current
        const pillStartTime = Math.max(0, audioContextRef.current.currentTime + pillDelayTime)

        console.log(
          `Scheduling pill ${pill.id} to play at audio context time ${pillStartTime} (current position: ${currentPositionRef.current}, pill start: ${pill.startTime}, delay: ${pillDelayTime})`,
        )

        // If the pill should have already started (negative delay), adjust the offset
        let adjustedOffset = offset
        if (pillDelayTime < 0) {
          // Add the absolute value of the negative delay to the offset
          adjustedOffset = offset - pillDelayTime
          console.log(`Adjusted offset for pill ${pill.id} from ${offset} to ${adjustedOffset} due to negative delay`)
        }

        // Start the source node with the adjusted parameters
        source.start(pillDelayTime < 0 ? audioContextRef.current.currentTime : pillStartTime, adjustedOffset)

        // Store the source node for later stopping
        sourceNodesRef.current.set(pill.id, source)
        scheduledPillsRef.current.add(pill.id)

        // Set up cleanup when this pill finishes playing
        source.onended = () => {
          console.log(`Pill ${pill.id} playback ended`)
          sourceNodesRef.current.delete(pill.id)
          scheduledPillsRef.current.delete(pill.id)
        }
      } catch (error) {
        console.error("Error scheduling audio pill:", error)
        // Make sure we clean up if there was an error
        scheduledPillsRef.current.delete(pill.id)
      }
    },
    [stopPill],
  )

  // Pause playback
  const pause = useCallback(() => {
    console.log("Pausing audio playback")

    // Store the current position before stopping
    const pausedPosition = currentPositionRef.current
    console.log(`Pausing at position: ${pausedPosition}`)

    // Cancel the animation frame first to stop the timeline
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // Force stop any potentially playing audio
    forceStopAudio()

    // Stop all audio source nodes
    sourceNodesRef.current.forEach((node, id) => {
      console.log(`Stopping node for pill: ${id}`)
      try {
        node.stop()
        node.disconnect()
      } catch (e) {
        console.error(`Error stopping node for pill ${id}:`, e)
      }
    })

    // Clear all references
    sourceNodesRef.current.clear()
    scheduledPillsRef.current.clear()
    movedPillsRef.current.clear()
    isPlayingRef.current = false

    // Update the UI state
    setIsPlaying(false)

    console.log("Playback paused, all audio stopped")
  }, [setIsPlaying, forceStopAudio])

  // Update a specific pill's position without stopping playback
  const updatePillPosition = useCallback(
    (pillId: string, newTrackId: string, newStartTime: number) => {
      if (!isPlayingRef.current) return

      const currentPosition = currentPositionRef.current
      const pill = audioPills.find((p) => p.id === pillId)

      if (!pill) return

      // Get the previous position from our tracking map
      const prevPosition = pillPositionsRef.current.get(pillId)

      console.log(
        `Updating pill ${pillId} position from ${prevPosition?.startTime || pill.startTime} to ${newStartTime} (current position: ${currentPosition})`,
      )

      // Always stop the pill first to prevent duplicate playback
      stopPill(pillId)

      // Update our tracking map with the new position
      pillPositionsRef.current.set(pillId, {
        startTime: newStartTime,
        trackId: newTrackId,
      })

      // If the pill should be playing now (current time is within its duration)
      if (newStartTime <= currentPosition && newStartTime + pill.duration > currentPosition) {
        // Calculate the offset into the audio
        const offset = currentPosition - newStartTime

        // Schedule it with the new offset
        const updatedPill = { ...pill, startTime: newStartTime, trackId: newTrackId }
        console.log(`Scheduling pill ${pillId} immediately with offset ${offset}`)
        schedulePill(updatedPill, offset)
      }
      // If the pill will play in the near future, schedule it
      else if (newStartTime > currentPosition && newStartTime < currentPosition + 5) {
        // Schedule it for future playback
        const updatedPill = { ...pill, startTime: newStartTime, trackId: newTrackId }
        console.log(`Scheduling pill ${pillId} for future playback at ${newStartTime}`)
        schedulePill(updatedPill)
      }
      // If the pill is moved to a future position beyond our look-ahead window
      else if (newStartTime > currentPosition + 5) {
        // Track this pill as moved to ensure it gets scheduled when the playhead reaches it
        console.log(`Tracking moved pill ${pillId} for future scheduling at ${newStartTime}`)
        movedPillsRef.current.set(pillId, {
          startTime: newStartTime,
          trackId: newTrackId,
        })
      }
    },
    [audioPills, stopPill, schedulePill],
  )

  // Update the audio sequence (called when tracks or pills change)
  const updateAudioSequence = useCallback(() => {
    // If we're currently playing, restart from current position to apply changes
    if (isPlayingRef.current) {
      const currentPosition = currentPositionRef.current

      // First, stop any pills that are no longer in the correct position
      scheduledPillsRef.current.forEach((pillId) => {
        const pill = audioPills.find((p) => p.id === pillId)
        if (!pill || pill.startTime > currentPosition || pill.startTime + pill.duration <= currentPosition) {
          stopPill(pillId)
        }
      })

      // Check for pills that should be playing at the current position
      audioPills.forEach((pill) => {
        if (
          pill.startTime <= currentPosition &&
          pill.startTime + pill.duration > currentPosition &&
          !scheduledPillsRef.current.has(pill.id)
        ) {
          // Calculate the offset into the audio
          const offset = currentPosition - pill.startTime
          schedulePill(pill, offset)
        } else if (
          pill.startTime > currentPosition &&
          pill.startTime < currentPosition + 5 &&
          !scheduledPillsRef.current.has(pill.id)
        ) {
          schedulePill(pill)
        }
      })
    }
  }, [audioPills, schedulePill, stopPill])

  // Set the current time position without playing
  const setCurrentTimePosition = useCallback((time: number) => {
    currentPositionRef.current = time
    lastSetTimeRef.current = time
  }, [])

  return {
    play,
    pause,
    updateAudioSequence,
    setCurrentTimePosition,
    updatePillPosition,
  }
}

