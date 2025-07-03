// src/hooks/useEnhancedTimer.js
// Enhanced version with pause functionality and improved stop/reset behavior

import { useState, useEffect, useRef, useCallback } from 'react';

export function useEnhancedTimer(setupMode = false, notifications = null) {
  const [timers, setTimers] = useState({});
  const intervalRefs = useRef({});
  const setupModeRef = useRef(setupMode);
  const timersRef = useRef({}); // Direct reference for instant updates

  // Update setup mode ref when it changes
  useEffect(() => {
    setupModeRef.current = setupMode;
    
    if (setupMode) {
      console.log('⚙️ Setup mode enabled - stopping all timers');
      cleanupAllTimers();
    }
  }, [setupMode]);

  // Sync timersRef with state for instant access
  useEffect(() => {
    timersRef.current = timers;
  }, [timers]);

  // Format time (hh:mm:ss.cs)
  const formatTime = useCallback((milliseconds) => {
    const totalMs = Math.abs(milliseconds);
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const centiseconds = Math.floor((totalMs % 1000) / 10);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  }, []);

  // Start a timer
  const startTimer = useCallback((processId, subprocessId) => {
    if (setupModeRef.current) {
      console.log('🚫 Timer start blocked - Setup mode is active');
      if (notifications) {
        notifications.showError('Timer Disabled', 'Exit setup mode to start timers');
      }
      return false;
    }

    const timerKey = `${processId}-${subprocessId}`;
    const existingTimer = timersRef.current[timerKey];
    
    // If timer exists and is paused, resume it
    if (existingTimer && !existingTimer.running && existingTimer.pausedAt) {
      console.log('▶️ Resuming paused timer:', timerKey);
      
      const pausedDuration = existingTimer.pausedAt - existingTimer.startTime;
      const newStartTime = Date.now() - pausedDuration;
      
      const resumedTimer = {
        ...existingTimer,
        running: true,
        startTime: newStartTime,
        pausedAt: null
      };
      
      // Update both ref and state immediately
      timersRef.current[timerKey] = resumedTimer;
      
      setTimers(prev => ({
        ...prev,
        [timerKey]: resumedTimer
      }));
      
      // Restart interval
      const intervalId = setInterval(() => {
        const currentTimer = timersRef.current[timerKey];
        if (!currentTimer || !currentTimer.running) {
          clearInterval(intervalId);
          return;
        }
      
        const elapsed = Date.now() - currentTimer.startTime;
        
        // Update ref immediately
        timersRef.current[timerKey] = {
          ...currentTimer,
          elapsedTime: elapsed
        };
        
        // Update state
        setTimers(prev => ({
          ...prev,
          [timerKey]: {
            ...prev[timerKey],
            elapsedTime: elapsed
          }
        }));
      }, 50);

      intervalRefs.current[timerKey] = intervalId;
      console.log(`✅ Timer resumed successfully: ${timerKey}`);
      return true;
    }
    
    if (existingTimer?.running) {
      console.log('⚠️ Timer already running:', timerKey);
      return false;
    }

    const startTime = Date.now();
    console.log('▶️ Starting new timer:', timerKey);

    const newTimer = {
      running: true,
      startTime: startTime,
      elapsedTime: 0,
      laps: [],
      lastRecordedTime: null,
      pausedAt: null
    };

    // Update both ref and state immediately
    timersRef.current[timerKey] = newTimer;
    
    setTimers(prev => ({
      ...prev,
      [timerKey]: newTimer
    }));

    // Start interval with 50ms updates for smooth display
    const intervalId = setInterval(() => {
      const currentTimer = timersRef.current[timerKey];
      if (!currentTimer || !currentTimer.running) {
        clearInterval(intervalId);
        return;
      }
    
      const elapsed = Date.now() - currentTimer.startTime;
      
      // Update ref immediately
      timersRef.current[timerKey] = {
        ...currentTimer,
        elapsedTime: elapsed
      };
      
      // Update state
      setTimers(prev => ({
        ...prev,
        [timerKey]: {
          ...prev[timerKey],
          elapsedTime: elapsed
        }
      }));
    }, 50);

    intervalRefs.current[timerKey] = intervalId;

    console.log(`✅ Timer started successfully: ${timerKey}`);
    return true;
  }, [notifications]);

  // ✅ NEW: Pause timer (stops but keeps time data)
  const pauseTimer = useCallback((processId, subprocessId) => {
    const timerKey = `${processId}-${subprocessId}`;
    const timer = timersRef.current[timerKey];
    
    if (!timer || !timer.running) {
      console.log('⚠️ No active timer to pause:', timerKey);
      return null;
    }

    console.log('⏸️ Pausing timer:', timerKey);

    if (intervalRefs.current[timerKey]) {
      clearInterval(intervalRefs.current[timerKey]);
      delete intervalRefs.current[timerKey];
    }

    const pauseTime = Date.now();
    const finalElapsed = pauseTime - timer.startTime;
    const pausedTimer = {
      ...timer,
      running: false,
      elapsedTime: finalElapsed,
      pausedAt: pauseTime
    };

    // Update both ref and state
    timersRef.current[timerKey] = pausedTimer;
    
    setTimers(prev => ({
      ...prev,
      [timerKey]: pausedTimer
    }));

    // Return time data but mark it as NOT for recording
    const timeData = {
      timeMilliseconds: finalElapsed,
      startTime: new Date(timer.startTime).toISOString(),
      endTime: new Date(pauseTime).toISOString(),
      formattedTime: formatTime(finalElapsed),
      shouldRecord: false  // Flag to indicate this should NOT be saved
    };

    console.log(`⏸️ Timer paused: ${timerKey}, Duration: ${timeData.formattedTime}`);
    return timeData;
  }, [formatTime]);

  // ✅ UPDATED: Stop timer (same as pause for backward compatibility)
  const stopTimer = useCallback((processId, subprocessId) => {
    return pauseTimer(processId, subprocessId);
  }, [pauseTimer]);

  // ✅ UPDATED: Record lap with INSTANT restart and better sequence handling
  const recordLap = useCallback((processId, subprocessId) => {
    const timerKey = `${processId}-${subprocessId}`;
    const timer = timersRef.current[timerKey];
    
    if (!timer || !timer.running) {
      console.log('⚠️ No active timer for lap:', timerKey);
      return null;
    }
  
    const lapEndTime = Date.now();
    const elapsedTime = lapEndTime - timer.startTime;
    const newStartTime = Date.now(); // Immediate restart time
    
    console.log(`📊 Recording lap for ${timerKey}, elapsed: ${elapsedTime}ms`);
    
    const lapData = {
      timeMilliseconds: elapsedTime,
      startTime: new Date(timer.startTime).toISOString(),
      endTime: new Date(lapEndTime).toISOString(),
      formattedTime: formatTime(elapsedTime),
      lapNumber: (timer.laps?.length || 0) + 1,
      shouldRecord: true  // Flag to indicate this SHOULD be saved
    };
  
    // ✅ INSTANT UPDATE: Reset timer immediately for continuous timing
    const updatedTimer = {
      ...timer,
      laps: [...(timer.laps || []), lapData],
      startTime: newStartTime,  // Immediate restart
      elapsedTime: 0,           // Reset to zero
      lastRecordedTime: lapData.formattedTime,
      pausedAt: null            // Clear any pause state
    };
  
    // ✅ Update refs and state immediately - no delays
    timersRef.current[timerKey] = updatedTimer;
    
    setTimers(prev => ({
      ...prev,
      [timerKey]: updatedTimer
    }));
  
    console.log(`✅ Lap recorded and timer restarted: ${timerKey}, Lap: ${lapData.formattedTime}`);
    return lapData;
  }, [formatTime]);

  // ✅ UPDATED: Reset timer (completely clears timer)
  const resetTimer = useCallback((processId, subprocessId) => {
    const timerKey = `${processId}-${subprocessId}`;
    
    console.log('🔄 Resetting timer:', timerKey);
    
    if (intervalRefs.current[timerKey]) {
      clearInterval(intervalRefs.current[timerKey]);
      delete intervalRefs.current[timerKey];
    }

    // Remove from both ref and state
    delete timersRef.current[timerKey];
    
    setTimers(prev => {
      const newTimers = { ...prev };
      delete newTimers[timerKey];
      return newTimers;
    });

    console.log(`✅ Timer reset: ${timerKey}`);
  }, []);

  // Get timer display - OPTIMIZED for real-time updates
  const getTimerDisplay = useCallback((processId, subprocessId) => {
    const timerKey = `${processId}-${subprocessId}`;
    const timer = timersRef.current[timerKey] || timers[timerKey];
    
    if (!timer) {
      return '00:00:00.00';
    }
    
    if (timer.running && timer.startTime) {
      const currentElapsed = Date.now() - timer.startTime;
      return formatTime(currentElapsed);
    }
    
    // For stopped/paused timers, use stored elapsed time
    return formatTime(timer.elapsedTime || 0);
  }, [timers, formatTime]);

  // Check if timer is running
  const isTimerRunning = useCallback((processId, subprocessId) => {
    const timerKey = `${processId}-${subprocessId}`;
    const timer = timersRef.current[timerKey] || timers[timerKey];
    return timer?.running || false;
  }, [timers]);

  // ✅ NEW: Check if timer is paused
  const isTimerPaused = useCallback((processId, subprocessId) => {
    const timerKey = `${processId}-${subprocessId}`;
    const timer = timersRef.current[timerKey] || timers[timerKey];
    return timer && !timer.running && timer.pausedAt && timer.elapsedTime > 0;
  }, [timers]);

  // Get last recorded time for display
  const getLastRecordedTime = useCallback((processId, subprocessId) => {
    const timerKey = `${processId}-${subprocessId}`;
    const timer = timersRef.current[timerKey] || timers[timerKey];
    return timer?.lastRecordedTime || null;
  }, [timers]);

  // Get all active timers
  const getActiveTimers = useCallback(() => {
    const activeTimers = [];
    const currentTimers = timersRef.current;
    
    Object.entries(currentTimers).forEach(([timerKey, timer]) => {
      if (timer.running) {
        const [processId, subprocessId] = timerKey.split('-');
        const currentElapsed = Date.now() - timer.startTime;
        activeTimers.push({
          processId,
          subprocessId,
          timerKey,
          elapsedTime: currentElapsed,
          formattedTime: formatTime(currentElapsed)
        });
      }
    });
    return activeTimers;
  }, [formatTime]);

  // Clean up all timers
  const cleanupAllTimers = useCallback(() => {
    console.log('🧹 Cleaning up all timers');
    
    Object.values(intervalRefs.current).forEach(intervalId => {
      clearInterval(intervalId);
    });
    intervalRefs.current = {};
    timersRef.current = {};
    setTimers({});
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAllTimers();
    };
  }, [cleanupAllTimers]);

  return {
    // Core timer functions
    startTimer,
    stopTimer,      // Now stops/pauses WITHOUT recording
    pauseTimer,     // ✅ NEW: Explicit pause function
    resetTimer,     // Completely resets timer
    recordLap,      // Records time and restarts immediately
    
    // Query functions
    getTimerDisplay,
    isTimerRunning,
    isTimerPaused,  // ✅ NEW: Check if paused
    getLastRecordedTime,
    getActiveTimers,
    
    // Utility functions
    formatTime,
    cleanupAllTimers,
    
    // State
    timers
  };
}
