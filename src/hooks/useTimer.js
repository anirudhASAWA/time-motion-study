// src/hooks/useEnhancedTimer.js
// Fixed timer hook with instant lap restart and better performance

import { useState, useEffect, useRef, useCallback } from 'react';

export function useEnhancedTimer(setupMode = false, notifications = null) {
  const [timers, setTimers] = useState({});
  const intervalRefs = useRef({});
  const setupModeRef = useRef(setupMode);

  // Update setup mode ref when it changes
  useEffect(() => {
    setupModeRef.current = setupMode;
    
    // Only stop timers if setup mode is enabled and we have running timers
    if (setupMode) {
      console.log('Setup mode enabled - stopping all timers');
      cleanupAllTimers();
    }
  }, [setupMode]);

  // Format time (hh:mm:ss)
  const formatTime = useCallback((milliseconds) => {
    const totalSeconds = Math.floor(Math.abs(milliseconds) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Start a timer
  const startTimer = useCallback((processId, subprocessId) => {
    // Check setup mode
    if (setupModeRef.current) {
      console.log('Timer start blocked - Setup mode is active');
      if (notifications) {
        notifications.showError('Timer Disabled', 'Exit setup mode to start timers');
      }
      return false;
    }

    const timerKey = `${processId}-${subprocessId}`;
    
    // Don't start if already running
    if (timers[timerKey]?.running) {
      console.log('Timer already running:', timerKey);
      return false;
    }

    const startTime = Date.now();
    
    console.log('Starting timer:', timerKey);

    // Create the timer state
    const newTimer = {
      running: true,
      startTime: startTime,
      elapsedTime: 0,
      laps: []
    };

    // Update state immediately
    setTimers(prev => ({
      ...prev,
      [timerKey]: newTimer
    }));

    // Start the interval
    const intervalId = setInterval(() => {
      setTimers(prev => {
        const currentTimer = prev[timerKey];
        if (!currentTimer || !currentTimer.running) {
          clearInterval(intervalId);
          return prev;
        }

        const elapsed = Date.now() - currentTimer.startTime;
        return {
          ...prev,
          [timerKey]: {
            ...currentTimer,
            elapsedTime: elapsed
          }
        };
      });
    }, 100); // Update every 100ms

    // Store interval reference
    intervalRefs.current[timerKey] = intervalId;

    if (notifications) {
      notifications.showSuccess('Timer Started', 'Timer is now running');
    }

    console.log(`Timer started successfully: ${timerKey}`);
    return true;
  }, [timers, notifications]);

  // Stop a timer and return the final time
  const stopTimer = useCallback((processId, subprocessId) => {
    const timerKey = `${processId}-${subprocessId}`;
    const timer = timers[timerKey];
    
    if (!timer || !timer.running) {
      console.log('No active timer to stop:', timerKey);
      return null;
    }

    // Clear the interval
    if (intervalRefs.current[timerKey]) {
      clearInterval(intervalRefs.current[timerKey]);
      delete intervalRefs.current[timerKey];
    }

    // Calculate final elapsed time
    const finalElapsed = Date.now() - timer.startTime;

    // Update timer state to stopped
    setTimers(prev => ({
      ...prev,
      [timerKey]: {
        ...prev[timerKey],
        running: false,
        elapsedTime: finalElapsed
      }
    }));

    const timeData = {
      timeMilliseconds: finalElapsed,
      startTime: new Date(timer.startTime).toISOString(),
      endTime: new Date().toISOString(),
      formattedTime: formatTime(finalElapsed)
    };

    console.log(`Timer stopped: ${timerKey}, Duration: ${timeData.formattedTime}`);
    return timeData;
  }, [timers, formatTime]);

  // Record a lap and IMMEDIATELY restart the timer
  const recordLap = useCallback((processId, subprocessId) => {
    const timerKey = `${processId}-${subprocessId}`;
    const timer = timers[timerKey];
    
    if (!timer || !timer.running) {
      console.log('No active timer for lap:', timerKey);
      return null;
    }

    const lapTime = Date.now();
    const elapsedTime = lapTime - timer.startTime;
    
    // Create lap data
    const lapData = {
      timeMilliseconds: elapsedTime,
      startTime: new Date(timer.startTime).toISOString(),
      endTime: new Date(lapTime).toISOString(),
      formattedTime: formatTime(elapsedTime),
      lapNumber: (timer.laps?.length || 0) + 1
    };

    // IMMEDIATELY restart the timer with new start time
    const newStartTime = Date.now(); // Use current time for immediate restart
    
    // Update timer state with lap recorded and new start time
    setTimers(prev => ({
      ...prev,
      [timerKey]: {
        ...prev[timerKey],
        laps: [...(prev[timerKey].laps || []), lapData],
        startTime: newStartTime, // Reset start time IMMEDIATELY
        elapsedTime: 0 // Reset elapsed time
      }
    }));

    console.log(`Lap recorded and timer restarted: ${timerKey}, Lap time: ${lapData.formattedTime}`);
    return lapData;
  }, [timers, formatTime]);

  // Reset a timer
  const resetTimer = useCallback((processId, subprocessId) => {
    const timerKey = `${processId}-${subprocessId}`;
    
    // Clear interval if running
    if (intervalRefs.current[timerKey]) {
      clearInterval(intervalRefs.current[timerKey]);
      delete intervalRefs.current[timerKey];
    }

    // Remove timer from state
    setTimers(prev => {
      const newTimers = { ...prev };
      delete newTimers[timerKey];
      return newTimers;
    });

    console.log(`Timer reset: ${timerKey}`);
  }, []);

  // Get timer display
  const getTimerDisplay = useCallback((processId, subprocessId) => {
    const timerKey = `${processId}-${subprocessId}`;
    const timer = timers[timerKey];
    
    if (!timer) {
      return '00:00:00';
    }
    
    return formatTime(timer.elapsedTime);
  }, [timers, formatTime]);

  // Check if timer is running
  const isTimerRunning = useCallback((processId, subprocessId) => {
    const timerKey = `${processId}-${subprocessId}`;
    return timers[timerKey]?.running || false;
  }, [timers]);

  // Get last lap time for display
  const getLastLapTime = useCallback((processId, subprocessId) => {
    const timerKey = `${processId}-${subprocessId}`;
    const timer = timers[timerKey];
    const laps = timer?.laps || [];
    
    if (laps.length === 0) return null;
    
    const lastLap = laps[laps.length - 1];
    return {
      formattedTime: lastLap.formattedTime,
      lapNumber: lastLap.lapNumber
    };
  }, [timers]);

  // Get all active timers
  const getActiveTimers = useCallback(() => {
    const activeTimers = [];
    Object.entries(timers).forEach(([timerKey, timer]) => {
      if (timer.running) {
        const [processId, subprocessId] = timerKey.split('-');
        activeTimers.push({
          processId,
          subprocessId,
          timerKey,
          elapsedTime: timer.elapsedTime,
          formattedTime: formatTime(timer.elapsedTime)
        });
      }
    });
    return activeTimers;
  }, [timers, formatTime]);

  // Clean up all timers
  const cleanupAllTimers = useCallback(() => {
    console.log('Cleaning up all timers');
    
    Object.values(intervalRefs.current).forEach(intervalId => {
      clearInterval(intervalId);
    });
    intervalRefs.current = {};
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
    stopTimer,
    resetTimer,
    recordLap,
    
    // Query functions
    getTimerDisplay,
    isTimerRunning,
    getLastLapTime, // NEW: Get last recorded lap time
    getActiveTimers,
    
    // Utility functions
    formatTime,
    cleanupAllTimers,
    
    // State
    timers
  };
}