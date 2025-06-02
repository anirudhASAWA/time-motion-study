import React, { useState, useCallback, useEffect } from 'react';
import { Play, Square, RotateCcw, Plus, Trash2, Edit3, Clock, Zap } from 'lucide-react';
import { db } from '../data/supabase';

function ProcessCard({ 
  process, 
  onDeleteProcess, 
  onUpdateProcess,
  onReloadProcesses,
  timerHook,
  notifications,
  isMobile = false,
  hapticFeedback = () => {},
  // ✅ NEW: Callback to notify parent when time reading is added
  onTimeReadingAdded = () => {}
}) {
  const [newSubprocessName, setNewSubprocessName] = useState('');
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(process.name);
  const [isAddingSubprocess, setIsAddingSubprocess] = useState(false);

  // ✅ CORRECT: Get sequence state from process data, but keep local backup for immediate updates
  const [localSequenceMode, setLocalSequenceMode] = useState(process.sequence_mode || false);
  const [localSequenceIndex, setLocalSequenceIndex] = useState(process.current_sequence_index || -1);

  // Sync local state with process changes
  useEffect(() => {
    setLocalSequenceMode(process.sequence_mode || false);
    setLocalSequenceIndex(process.current_sequence_index || -1);
  }, [process.sequence_mode, process.current_sequence_index]);

  // Use local state for immediate responsiveness, process data as source of truth
  const sequenceMode = localSequenceMode;
  const currentSequenceIndex = localSequenceIndex;

  // Optimized add subprocess with immediate UI update
  const addSubprocess = useCallback(async () => {
    if (!newSubprocessName.trim() || isAddingSubprocess) return;
    
    setIsAddingSubprocess(true);
    hapticFeedback();
    
    try {
      const newSubprocess = await db.addSubprocess(process.id, newSubprocessName.trim());
      if (newSubprocess) {
        setNewSubprocessName('');
        // Immediate UI update without full reload for better performance
        await onReloadProcesses();
        notifications?.showSuccess('Subprocess Added', `"${newSubprocessName.trim()}" has been added`);
      }
    } catch (error) {
      console.error('Error adding subprocess:', error);
      notifications?.showError('Add Error', 'Failed to add subprocess');
    } finally {
      setIsAddingSubprocess(false);
    }
  }, [newSubprocessName, process.id, onReloadProcesses, isAddingSubprocess, notifications, hapticFeedback]);

  const saveEdit = async () => {
    if (editName.trim() && editName !== process.name) {
      hapticFeedback();
      await onUpdateProcess(process.id, { name: editName });
      notifications?.showSuccess('Process Updated', 'Process name has been updated');
    }
    setEditing(false);
  };

  // ✅ FIXED: Sequence mode toggle with proper timer management
  const toggleSequenceMode = async () => {
    const newSequenceMode = !sequenceMode;
    hapticFeedback();
    
    console.log(`🔄 Toggling sequence mode: ${sequenceMode} -> ${newSequenceMode}`);
    
    // 🚀 INSTANT: Update local state immediately
    setLocalSequenceMode(newSequenceMode);
    
    if (!newSequenceMode) {
      // ✅ Disabling sequence mode - stop all timers and reset
      setLocalSequenceIndex(-1);
      
      if (process.subprocesses) {
        process.subprocesses.forEach((subprocess) => {
          if (timerHook.isTimerRunning(process.id, subprocess.id)) {
            timerHook.stopTimer(process.id, subprocess.id);
          }
        });
      }
      
      console.log('✅ Sequence mode disabled - all timers stopped');
    } else {
      // ✅ Enabling sequence mode - prepare but DON'T auto-start
      if (process.subprocesses && process.subprocesses.length > 0) {
        setLocalSequenceIndex(0);
        
        // Stop any currently running timers
        process.subprocesses.forEach((subprocess) => {
          if (timerHook.isTimerRunning(process.id, subprocess.id)) {
            timerHook.stopTimer(process.id, subprocess.id);
          }
        });
        
        console.log('✅ Sequence mode enabled - ready for first subprocess');
        // ✅ DON'T auto-start timer - let user start manually or use Next Step
      }
    }
    
    // 🔄 BACKGROUND: Update database
    const updates = { 
      sequence_mode: newSequenceMode,
      current_sequence_index: newSequenceMode ? 0 : -1
    };
    
    try {
      await onUpdateProcess(process.id, updates);
      
      const message = newSequenceMode 
        ? `Sequence Mode enabled - Use Start/Next Step to begin`
        : `Sequence Mode disabled`;
      
      notifications?.showSuccess('Sequence Mode', message);
      
    } catch (error) {
      // Revert local state on error
      setLocalSequenceMode(!newSequenceMode);
      setLocalSequenceIndex(!newSequenceMode ? 0 : -1);
      console.error('❌ Error updating sequence mode:', error);
      notifications?.showError('Update Error', 'Failed to update sequence mode');
    }
  };

  // ✅ UPDATED: Next Step with automatic time reading notification
  const moveToNextSubprocess = async () => {
    if (!sequenceMode || !process.subprocesses?.length) {
      console.log('❌ Cannot move to next: sequenceMode=', sequenceMode, 'subprocesses=', process.subprocesses?.length);
      notifications?.showError('Sequence Error', 'Sequence mode must be enabled with subprocesses');
      return;
    }

    hapticFeedback();
    
    // ✅ IMPORTANT: Handle case where sequence just started (index might be -1 or 0)
    let currentIndex = currentSequenceIndex;
    if (currentIndex < 0 || currentIndex >= process.subprocesses.length) {
      currentIndex = 0; // Start from first subprocess if invalid index
      setLocalSequenceIndex(0);
    }
    
    const currentSubprocess = process.subprocesses[currentIndex];
    if (!currentSubprocess) {
      console.log('❌ No subprocess found at index:', currentIndex);
      notifications?.showError('Sequence Error', 'Invalid subprocess index');
      return;
    }
    
    console.log(`📊 Next Step: Current subprocess "${currentSubprocess.name}" (index ${currentIndex})`);
    
    // ✅ STEP 1: Check if current subprocess has running timer
    let timeData = null;
    const isCurrentTimerRunning = timerHook.isTimerRunning(process.id, currentSubprocess.id);
    
    if (isCurrentTimerRunning) {
      console.log(`⏱️ Timer is running for "${currentSubprocess.name}" - recording time`);
      
      // Stop timer and get the time (using stopTimer instead of recordLap to avoid restart)
      timeData = timerHook.stopTimer(process.id, currentSubprocess.id);
      
      if (timeData) {
        // Manually create proper time data for recording
        const recordData = {
          timeMilliseconds: timeData.timeMilliseconds,
          startTime: timeData.startTime,
          endTime: timeData.endTime,
          formattedTime: timeData.formattedTime,
          shouldRecord: true
        };
        
        // ✅ UPDATED: Save to database and notify parent
        setTimeout(async () => {
          try {
            await db.saveTimeReading(process.id, currentSubprocess.id, {
              ...recordData,
              remarks: '',
              activityType: currentSubprocess.activity_type || '',
              personCount: currentSubprocess.person_count || 1,
              rating: currentSubprocess.rating || 100,
              productionQty: currentSubprocess.production_qty || 0
            });
            
            // ✅ NEW: Notify parent that new time reading was added
            onTimeReadingAdded();
            console.log('📢 Parent notified of new time reading');
            
          } catch (error) {
            console.error('❌ Error saving time reading:', error);
            notifications?.showError('Save Error', 'Failed to save time reading');
          }
        }, 0);
        
        // ✅ UPDATE: Show the recorded time in the subprocess display
        if (window.updateSubprocessLastTime && window.updateSubprocessLastTime[`${process.id}-${currentSubprocess.id}`]) {
          window.updateSubprocessLastTime[`${process.id}-${currentSubprocess.id}`](timeData.formattedTime);
        }
        
        notifications?.showSuccess('Time Recorded', 
          `${currentSubprocess.name}: ${timeData.formattedTime}`);
      }
    } else {
      console.log(`ℹ️ No timer running for "${currentSubprocess.name}" - moving to next without recording`);
    }
    
    // ✅ STEP 2: Calculate next subprocess index
    let nextIndex = currentIndex + 1;
    if (nextIndex >= process.subprocesses.length) {
      nextIndex = 0; // Loop back to start
      console.log(`🔄 Sequence complete - looping back to first subprocess`);
    }
    
    const nextSubprocess = process.subprocesses[nextIndex];
    if (!nextSubprocess) {
      console.log('❌ No next subprocess found at index:', nextIndex);
      return;
    }
    
    console.log(`➡️ Moving to next subprocess: "${nextSubprocess.name}" (index ${nextIndex})`);
    
    // ✅ STEP 3: Update local state immediately for responsive UI
    setLocalSequenceIndex(nextIndex);
    
    // ✅ STEP 4: Stop any other running timers and start the next one
    // First, stop ALL other timers to ensure clean state
    process.subprocesses.forEach((subprocess, index) => {
      if (index !== nextIndex && timerHook.isTimerRunning(process.id, subprocess.id)) {
        console.log(`🛑 Stopping timer for: ${subprocess.name}`);
        timerHook.stopTimer(process.id, subprocess.id);
      }
    });
    
    // Now start the next subprocess timer
    const success = timerHook.startTimer(process.id, nextSubprocess.id);
    if (success) {
      console.log(`✅ Started timer for: ${nextSubprocess.name}`);
      notifications?.showInfo('Next Step', `Now timing: ${nextSubprocess.name}`);
    } else {
      console.log(`❌ Failed to start timer for: ${nextSubprocess.name}`);
      notifications?.showError('Timer Error', `Could not start timer for ${nextSubprocess.name}`);
    }
    
    // ✅ STEP 5: Update database in background
    try {
      await onUpdateProcess(process.id, { current_sequence_index: nextIndex });
      console.log(`✅ Database updated: sequence index = ${nextIndex}`);
    } catch (error) {
      console.error('❌ Error updating sequence index:', error);
      // Revert local state on database error
      setLocalSequenceIndex(currentIndex);
      notifications?.showError('Update Error', 'Failed to update sequence position');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isAddingSubprocess) {
      addSubprocess();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Process Header */}
      <div className="bg-gray-50 px-4 md:px-6 py-3 md:py-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-lg md:text-xl font-bold bg-white border border-gray-300 rounded px-2 py-1 flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                  autoFocus
                />
                <button
                  onClick={saveEdit}
                  className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h3 className="text-lg md:text-xl font-bold text-gray-800">{process.name}</h3>
                <button
                  onClick={() => {
                    hapticFeedback();
                    setEditing(true);
                  }}
                  className="p-1 text-gray-500 hover:text-gray-700"
                >
                  <Edit3 size={16} />
                </button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSequenceMode}
              className={`px-2 md:px-3 py-1 rounded text-xs md:text-sm font-medium transition-colors ${
                sequenceMode 
                  ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              <Zap className="inline mr-1" size={isMobile ? 12 : 14} />
              {isMobile ? (sequenceMode ? 'SEQ ON' : 'SEQ OFF') : `Sequence ${sequenceMode ? 'ON' : 'OFF'}`}
            </button>
            
            {sequenceMode && process.subprocesses?.length > 0 && (
              <button
                onClick={moveToNextSubprocess}
                className="px-2 md:px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs md:text-sm"
              >
                Next Step
              </button>
            )}
            
            <button
              onClick={() => {
                hapticFeedback();
                onDeleteProcess(process.id);
              }}
              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        
        {sequenceMode && (
          <div className="mt-2 px-3 py-2 bg-blue-100 border border-blue-200 rounded text-sm">
            <div className="flex items-center justify-between">
              <span className="text-blue-800 font-medium">
                <Clock className="inline mr-1" size={14} />
                Sequence Mode Active
              </span>
              {process.subprocesses?.length > 0 && (
                <span className="text-blue-600">
                  Step {currentSequenceIndex + 1} of {process.subprocesses.length}
                </span>
              )}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              Use Start/Stop/Lap buttons normally, or use "Next Step" to auto-advance
            </div>
          </div>
        )}
      </div>

      {/* Process Content */}
      <div className="p-4 md:p-6">
        {/* Add Subprocess */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            value={newSubprocessName}
            onChange={(e) => setNewSubprocessName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add new subprocess..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-sm md:text-base"
            disabled={isAddingSubprocess}
          />
          <button
            onClick={addSubprocess}
            disabled={isAddingSubprocess}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg font-medium transition-colors flex items-center text-sm md:text-base"
          >
            <Plus className="mr-2" size={16} />
            {isAddingSubprocess ? 'Adding...' : 'Add'}
          </button>
        </div>

        {/* Subprocesses */}
        <div className="space-y-3">
          {(process.subprocesses || []).map((subprocess, index) => (
            <SubprocessCard
              key={subprocess.id}
              processId={process.id}
              subprocess={subprocess}
              timerHook={timerHook}
              onReloadProcesses={onReloadProcesses}
              isActiveInSequence={sequenceMode && index === currentSequenceIndex}
              sequenceMode={sequenceMode}
              notifications={notifications}
              isMobile={isMobile}
              hapticFeedback={hapticFeedback}
              // ✅ NEW: Pass callback to notify when time reading is added
              onTimeReadingAdded={onTimeReadingAdded}
            />
          ))}
        </div>

        {(!process.subprocesses || process.subprocesses.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <Clock className="mx-auto mb-2 text-gray-400" size={32} />
            <p>No subprocesses yet. Add one above to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ✅ UPDATED: SubprocessCard with time reading notification
function SubprocessCard({ 
  processId, 
  subprocess, 
  timerHook, 
  onReloadProcesses,
  isActiveInSequence,
  sequenceMode,
  notifications,
  isMobile = false,
  hapticFeedback = () => {},
  // ✅ NEW: Callback to notify parent when time reading is added
  onTimeReadingAdded = () => {}
}) {
  const [activityType, setActivityType] = useState(subprocess.activity_type || '');
  const [remarks, setRemarks] = useState('');
  const [personCount, setPersonCount] = useState(subprocess.person_count || 1);
  const [rating, setRating] = useState(subprocess.rating || 100);
  const [productionQty, setProductionQty] = useState(subprocess.production_qty || 0);
  const [lastRecordedTime, setLastRecordedTime] = useState(null);

  const isRunning = timerHook.isTimerRunning(processId, subprocess.id);
  const timerDisplay = timerHook.getTimerDisplay(processId, subprocess.id);

  // ✅ NEW: Listen for timer changes to update last recorded time from timer hook
  useEffect(() => {
    const timerLastTime = timerHook && typeof timerHook.getLastRecordedTime === 'function' 
      ? timerHook.getLastRecordedTime(processId, subprocess.id) 
      : null;
    
    if (timerLastTime && timerLastTime !== lastRecordedTime) {
      setLastRecordedTime(timerLastTime);
    }
  }, [timerHook, processId, subprocess.id, lastRecordedTime]);

  // ✅ FIXED: Start button works regardless of sequence mode
  const handleStart = () => {
    hapticFeedback();
    console.log(`▶️ Start button pressed for: ${subprocess.name}`);
    
    const success = timerHook.startTimer(processId, subprocess.id);
    if (!success) {
      notifications?.showError('Timer Error', 'Failed to start timer');
    } else {
      notifications?.showSuccess('Timer Started', `Timer started for: ${subprocess.name}`);
    }
  };

  // ✅ FIXED: Stop button works and doesn't record
  const handleStop = () => {
    hapticFeedback();
    console.log(`⏹️ Stop button pressed for: ${subprocess.name}`);
    
    const timeData = timerHook.stopTimer(processId, subprocess.id);
    
    if (timeData) {
      // ✅ Clear last recorded time since this wasn't recorded
      setLastRecordedTime(null);
      notifications?.showInfo('Timer Stopped', 
        `Timer stopped at ${timeData.formattedTime} (not recorded)`);
    }
  };

  // ✅ UPDATED: Lap button with automatic notification to parent
  const handleLap = () => {
    hapticFeedback();
    console.log(`📊 Lap button pressed for: ${subprocess.name}`);
    
    const timeData = timerHook.recordLap(processId, subprocess.id);
    
    if (timeData && timeData.shouldRecord) {
      // ✅ Update the display immediately
      setLastRecordedTime(timeData.formattedTime);
      
      // ✅ UPDATED: Save to database and notify parent
      setTimeout(async () => {
        try {
          await db.saveTimeReading(processId, subprocess.id, {
            ...timeData,
            remarks,
            activityType,
            personCount,
            rating,
            productionQty
          });
          
          // ✅ NEW: Notify parent that new time reading was added
          onTimeReadingAdded();
          console.log('📢 Parent notified of new time reading from lap');
          
        } catch (error) {
          console.error('❌ Error saving time reading:', error);
          notifications?.showError('Save Error', 'Failed to save lap time');
        }
      }, 0);
      
      notifications?.showSuccess('Lap Recorded', 
        `${subprocess.name}: ${timeData.formattedTime} - Timer restarted`);
    }
  };

  const handleReset = () => {
    hapticFeedback();
    timerHook.resetTimer(processId, subprocess.id);
    setLastRecordedTime(null);
    notifications?.showInfo('Timer Reset', 'Timer has been reset');
  };

  // ✅ NEW: Expose function to update last recorded time from parent (for sequence mode)
  useEffect(() => {
    // Create a global reference so parent can update this
    if (window.updateSubprocessLastTime) {
      window.updateSubprocessLastTime[`${processId}-${subprocess.id}`] = (time) => {
        console.log(`🎯 Updating last recorded time for ${subprocess.name}: ${time}`);
        setLastRecordedTime(time);
      };
    } else {
      window.updateSubprocessLastTime = {
        [`${processId}-${subprocess.id}`]: (time) => {
          console.log(`🎯 Updating last recorded time for ${subprocess.name}: ${time}`);
          setLastRecordedTime(time);
        }
      };
    }
    
    // Cleanup on unmount
    return () => {
      if (window.updateSubprocessLastTime && window.updateSubprocessLastTime[`${processId}-${subprocess.id}`]) {
        delete window.updateSubprocessLastTime[`${processId}-${subprocess.id}`];
      }
    };
  }, [processId, subprocess.id, subprocess.name]);

  return (
    <div className={`border rounded-lg p-3 md:p-4 transition-all ${
      isActiveInSequence 
        ? 'border-blue-500 bg-blue-50 shadow-md border-2' 
        : 'border-gray-200 bg-gray-50'
    }`}>
      {/* Subprocess Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-medium text-gray-800 text-sm md:text-base">{subprocess.name}</h4>
            {isActiveInSequence && (
              <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                ACTIVE
              </span>
            )}
            {sequenceMode && !isActiveInSequence && (
              <span className="px-2 py-1 bg-gray-300 text-gray-600 text-xs rounded-full">
                WAITING
              </span>
            )}
          </div>
          
          {/* Timer display */}
          <div className="text-xl md:text-2xl font-mono text-blue-600 mb-2 bg-blue-50 px-3 py-2 rounded-lg text-center border min-w-[140px]">
            {timerDisplay}
          </div>
          
          {/* ✅ FIXED: Last Recorded Time Display - Updated for sequence mode */}
          {lastRecordedTime && (
            <div className="mb-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm">
              <span className="text-green-800 font-medium">
                ✅ Last: {lastRecordedTime}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Timer Controls */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {!isRunning ? (
          <button
            onClick={handleStart}
            className="flex items-center justify-center px-3 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors min-h-[44px]"
          >
            <Play className="mr-1" size={16} />
            Start
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="flex items-center justify-center px-3 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors min-h-[44px]"
          >
            <Square className="mr-1" size={16} />
            Stop
          </button>
        )}
        
        <button
          onClick={handleLap}
          disabled={!isRunning}
          className="flex items-center justify-center px-3 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors min-h-[44px]"
        >
          Lap
        </button>
        
        <button
          onClick={handleReset}
          className="flex items-center justify-center px-3 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors min-h-[44px]"
        >
          <RotateCcw className="mr-1" size={14} />
          Reset
        </button>
      </div>

      {/* Form Fields */}
      <div className="space-y-3 text-sm">
        {/* Row 1: Activity Type and Persons */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-gray-600 mb-1 text-xs font-medium">Activity Type</label>
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm min-h-[44px]"
            >
              <option value="">Select</option>
              <option value="VA">VA (Value Added)</option>
              <option value="NVA">NVA (Non-Value Added)</option>
              <option value="RNVA">RNVA (Required Non-VA)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-gray-600 mb-1 text-xs font-medium">Persons</label>
            <input
              type="number"
              value={personCount}
              onChange={(e) => setPersonCount(parseInt(e.target.value) || 1)}
              min="1"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm min-h-[44px]"
            />
          </div>
        </div>
        
        {/* Row 2: Production and Rating */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-gray-600 mb-1 text-xs font-medium">Production Qty</label>
            <input
              type="number"
              value={productionQty}
              onChange={(e) => setProductionQty(parseInt(e.target.value) || 0)}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm min-h-[44px]"
            />
          </div>
          
          <div>
            <label className="block text-gray-600 mb-1 text-xs font-medium">Rating (%)</label>
            <input
              type="number"
              value={rating}
              onChange={(e) => setRating(parseInt(e.target.value) || 100)}
              min="60"
              max="150"
              step="5"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm min-h-[44px]"
            />
          </div>
        </div>
        
        {/* Row 3: Remarks */}
        <div>
          <label className="block text-gray-600 mb-1 text-xs font-medium">Remarks</label>
          <input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Add remarks..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm min-h-[44px]"
          />
        </div>
      </div>
    </div>
  );
}

export default ProcessCard;