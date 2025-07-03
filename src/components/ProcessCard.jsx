import React, { useState, useCallback, useEffect } from 'react';
import { Play, Square, RotateCcw, Plus, Trash2, Edit3, Clock, Zap, Pause, ChevronUp, ChevronDown, X } from 'lucide-react';
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
  onTimeReadingAdded = () => {}
}) {
  const [newSubprocessName, setNewSubprocessName] = useState('');
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(process.name);
  const [isAddingSubprocess, setIsAddingSubprocess] = useState(false);

  // ✅ FIXED: Better sequence state management
  const [localSequenceMode, setLocalSequenceMode] = useState(process.sequence_mode || false);
  const [localSequenceIndex, setLocalSequenceIndex] = useState(process.current_sequence_index || 0);

  // ✅ FIXED: Sync local state with process changes and ensure valid index
  useEffect(() => {
    setLocalSequenceMode(process.sequence_mode || false);
    
    // ✅ IMPORTANT: Ensure sequence index is valid
    let validIndex = process.current_sequence_index || 0;
    
    // If sequence mode is enabled but index is invalid, set to 0
    if (process.sequence_mode && process.subprocesses?.length > 0) {
      if (validIndex < 0 || validIndex >= process.subprocesses.length) {
        validIndex = 0;
        console.log(`🔧 Fixed invalid sequence index: ${process.current_sequence_index} -> ${validIndex}`);
      }
    } else if (!process.sequence_mode) {
      validIndex = -1; // Disabled state
    }
    
    setLocalSequenceIndex(validIndex);
  }, [process.sequence_mode, process.current_sequence_index, process.subprocesses?.length]);

  // Use local state for immediate responsiveness
  const sequenceMode = localSequenceMode;
  const currentSequenceIndex = localSequenceIndex;

  console.log(`🔍 ProcessCard Debug: sequenceMode=${sequenceMode}, currentIndex=${currentSequenceIndex}, subprocessCount=${process.subprocesses?.length || 0}`);

  const addSubprocess = useCallback(async () => {
    if (!newSubprocessName.trim() || isAddingSubprocess) return;
    
    setIsAddingSubprocess(true);
    hapticFeedback();
    
    try {
      const newSubprocess = await db.addSubprocess(process.id, newSubprocessName.trim());
      if (newSubprocess) {
        setNewSubprocessName('');
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

  // ✅ NEW: Delete subprocess function
  const deleteSubprocess = useCallback(async (subprocessId, subprocessName) => {
    if (!window.confirm(`Delete subprocess "${subprocessName}" and all its time readings? This action cannot be undone.`)) {
      return;
    }

    hapticFeedback();
    
    try {
      console.log('🗑️ Deleting subprocess:', subprocessId);
      
      // Stop timer if running for this subprocess
      if (timerHook.isTimerRunning(process.id, subprocessId)) {
        timerHook.resetTimer(process.id, subprocessId);
      }
      
      await db.deleteSubprocess(subprocessId);
      await onReloadProcesses();
      
      notifications?.showSuccess('Subprocess Deleted', `"${subprocessName}" and all its data have been removed`);
    } catch (error) {
      console.error('❌ Error deleting subprocess:', error);
      notifications?.showError('Delete Error', 'Failed to delete subprocess');
    }
  }, [process.id, timerHook, onReloadProcesses, notifications, hapticFeedback]);

  // ✅ NEW: Reorder subprocess function
  const reorderSubprocess = useCallback(async (subprocessId, direction) => {
    hapticFeedback();
    
    try {
      const subprocesses = [...(process.subprocesses || [])];
      const currentIndex = subprocesses.findIndex(sp => sp.id === subprocessId);
      
      if (currentIndex === -1) return;
      
      let newIndex;
      if (direction === 'up' && currentIndex > 0) {
        newIndex = currentIndex - 1;
      } else if (direction === 'down' && currentIndex < subprocesses.length - 1) {
        newIndex = currentIndex + 1;
      } else {
        return; // Can't move further
      }
      
      // Swap the subprocesses
      [subprocesses[currentIndex], subprocesses[newIndex]] = [subprocesses[newIndex], subprocesses[currentIndex]];
      
      // Update order_index for both subprocesses
      await Promise.all([
        db.updateSubprocess(subprocesses[currentIndex].id, { order_index: currentIndex }),
        db.updateSubprocess(subprocesses[newIndex].id, { order_index: newIndex })
      ]);
      
      await onReloadProcesses();
      notifications?.showSuccess('Subprocess Reordered', 'Subprocess order has been updated');
      
    } catch (error) {
      console.error('❌ Error reordering subprocess:', error);
      notifications?.showError('Reorder Error', 'Failed to reorder subprocess');
    }
  }, [process.subprocesses, onReloadProcesses, notifications, hapticFeedback]);

  const saveEdit = async () => {
    if (editName.trim() && editName !== process.name) {
      hapticFeedback();
      await onUpdateProcess(process.id, { name: editName });
      notifications?.showSuccess('Process Updated', 'Process name has been updated');
    }
    setEditing(false);
  };

  // ✅ FIXED: Sequence mode toggle with proper index initialization
  const toggleSequenceMode = async () => {
    const newSequenceMode = !sequenceMode;
    hapticFeedback();
    
    console.log(`🔄 Toggling sequence mode: ${sequenceMode} -> ${newSequenceMode}`);
    
    // Update local state immediately
    setLocalSequenceMode(newSequenceMode);
    
    if (!newSequenceMode) {
      // Disabling sequence mode - stop all timers and reset
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
      // ✅ FIXED: Enabling sequence mode - set to first subprocess (index 0)
      if (process.subprocesses && process.subprocesses.length > 0) {
        setLocalSequenceIndex(0); // Always start at first subprocess
        
        // Stop any currently running timers
        process.subprocesses.forEach((subprocess) => {
          if (timerHook.isTimerRunning(process.id, subprocess.id)) {
            timerHook.stopTimer(process.id, subprocess.id);
          }
        });
        
        console.log(`✅ Sequence mode enabled - set to first subprocess (index 0)`);
      } else {
        setLocalSequenceIndex(-1); // No subprocesses available
        console.log('⚠️ Sequence mode enabled but no subprocesses available');
      }
    }
    
    // Update database
    const updates = { 
      sequence_mode: newSequenceMode,
      current_sequence_index: newSequenceMode && process.subprocesses?.length > 0 ? 0 : -1
    };
    
    try {
      await onUpdateProcess(process.id, updates);
      
      const message = newSequenceMode 
        ? `Sequence Mode enabled - Ready for first subprocess`
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

  // ✅ FIXED: Next Step with better index management
  const moveToNextSubprocess = async () => {
    if (!sequenceMode || !process.subprocesses?.length) {
      console.log('❌ Cannot move to next: sequenceMode=', sequenceMode, 'subprocesses=', process.subprocesses?.length);
      notifications?.showError('Sequence Error', 'Sequence mode must be enabled with subprocesses');
      return;
    }

    hapticFeedback();
    
    // ✅ FIXED: Ensure current index is valid
    let currentIndex = currentSequenceIndex;
    if (currentIndex < 0 || currentIndex >= process.subprocesses.length) {
      currentIndex = 0;
      setLocalSequenceIndex(0);
      console.log(`🔧 Fixed invalid current index: ${currentSequenceIndex} -> 0`);
    }
    
    const currentSubprocess = process.subprocesses[currentIndex];
    if (!currentSubprocess) {
      console.log('❌ No subprocess found at index:', currentIndex);
      notifications?.showError('Sequence Error', 'Invalid subprocess index');
      return;
    }
    
    console.log(`📊 Next Step: Current subprocess "${currentSubprocess.name}" (index ${currentIndex})`);
    
    // Check if current subprocess has running timer and record time
    let timeData = null;
    const isCurrentTimerRunning = timerHook.isTimerRunning(process.id, currentSubprocess.id);
    
    if (isCurrentTimerRunning) {
      console.log(`⏱️ Timer is running for "${currentSubprocess.name}" - recording time`);
      
      timeData = timerHook.stopTimer(process.id, currentSubprocess.id);
      
      if (timeData) {
        const recordData = {
          timeMilliseconds: timeData.timeMilliseconds,
          startTime: timeData.startTime,
          endTime: timeData.endTime,
          formattedTime: timeData.formattedTime,
          shouldRecord: true
        };
        
        // Save to database and notify parent
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
            
            onTimeReadingAdded();
            console.log('📢 Parent notified of new time reading');
            
          } catch (error) {
            console.error('❌ Error saving time reading:', error);
            notifications?.showError('Save Error', 'Failed to save time reading');
          }
        }, 0);
        
        // Update subprocess display
        if (window.updateSubprocessLastTime && window.updateSubprocessLastTime[`${process.id}-${currentSubprocess.id}`]) {
          window.updateSubprocessLastTime[`${process.id}-${currentSubprocess.id}`](timeData.formattedTime);
        }
        
        notifications?.showSuccess('Time Recorded', 
          `${currentSubprocess.name}: ${timeData.formattedTime}`);
      }
    }
    
    // ✅ FIXED: Calculate next subprocess index
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
    
    // ✅ FIXED: Update local state immediately for responsive UI
    setLocalSequenceIndex(nextIndex);
    
    // Stop any other running timers and start the next one
    process.subprocesses.forEach((subprocess, index) => {
      if (index !== nextIndex && timerHook.isTimerRunning(process.id, subprocess.id)) {
        console.log(`🛑 Stopping timer for: ${subprocess.name}`);
        timerHook.stopTimer(process.id, subprocess.id);
      }
    });
    
    // Start next subprocess timer
    const success = timerHook.startTimer(process.id, nextSubprocess.id);
    if (success) {
      console.log(`✅ Started timer for: ${nextSubprocess.name}`);
      notifications?.showInfo('Next Step', `Now timing: ${nextSubprocess.name}`);
    } else {
      console.log(`❌ Failed to start timer for: ${nextSubprocess.name}`);
      notifications?.showError('Timer Error', `Could not start timer for ${nextSubprocess.name}`);
    }
    
    // Update database in background
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
                  title="Edit process name"
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
              title="Delete process"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        
        {/* ✅ ENHANCED: Better sequence mode display */}
        {sequenceMode && (
          <div className="mt-2 px-3 py-2 bg-blue-100 border border-blue-200 rounded text-sm">
            <div className="flex items-center justify-between">
              <span className="text-blue-800 font-medium">
                <Clock className="inline mr-1" size={14} />
                Sequence Mode Active
              </span>
              {process.subprocesses?.length > 0 && currentSequenceIndex >= 0 && (
                <span className="text-blue-600">
                  Step {currentSequenceIndex + 1} of {process.subprocesses.length}
                  {process.subprocesses[currentSequenceIndex] && 
                    ` (${process.subprocesses[currentSequenceIndex].name})`
                  }
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

        {/* ✅ FIXED: Subprocesses with better active detection */}
        <div className="space-y-3">
          {(process.subprocesses || []).map((subprocess, index) => {
            // ✅ FIXED: Proper active detection
            const isActiveInSequence = sequenceMode && currentSequenceIndex === index;
            
            console.log(`🔍 Subprocess "${subprocess.name}" (index ${index}): isActive=${isActiveInSequence}, currentIndex=${currentSequenceIndex}, sequenceMode=${sequenceMode}`);
            
            return (
              <SubprocessCard
                key={subprocess.id}
                processId={process.id}
                subprocess={subprocess}
                subprocessIndex={index}
                totalSubprocesses={process.subprocesses?.length || 0}
                timerHook={timerHook}
                onReloadProcesses={onReloadProcesses}
                onDeleteSubprocess={deleteSubprocess}
                onReorderSubprocess={reorderSubprocess} // ✅ NEW: Pass reorder function
                isActiveInSequence={isActiveInSequence}
                sequenceMode={sequenceMode}
                notifications={notifications}
                isMobile={isMobile}
                hapticFeedback={hapticFeedback}
                onTimeReadingAdded={onTimeReadingAdded}
              />
            );
          })}
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

// ✅ UPDATED: SubprocessCard with reorder controls and delete latest reading
function SubprocessCard({ 
  processId, 
  subprocess, 
  subprocessIndex,
  totalSubprocesses,
  timerHook, 
  onReloadProcesses,
  onDeleteSubprocess,
  onReorderSubprocess, // ✅ NEW: Reorder function
  isActiveInSequence,
  sequenceMode,
  notifications,
  isMobile = false,
  hapticFeedback = () => {},
  onTimeReadingAdded = () => {}
}) {
  const [activityType, setActivityType] = useState(subprocess.activity_type || '');
  const [remarks, setRemarks] = useState('');
  const [personCount, setPersonCount] = useState(subprocess.person_count || 1);
  const [rating, setRating] = useState(subprocess.rating || 100);
  const [productionQty, setProductionQty] = useState(subprocess.production_qty || 0);
  const [lastRecordedTime, setLastRecordedTime] = useState(null);
  const [canDeleteLatest, setCanDeleteLatest] = useState(false); // ✅ NEW: Track if can delete latest
  
  // ✅ NEW: Editing state for subprocess
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(subprocess.name);

  const isRunning = timerHook.isTimerRunning(processId, subprocess.id);
  const timerDisplay = timerHook.getTimerDisplay(processId, subprocess.id);

  // ✅ Enhanced debugging for active state
  console.log(`🎯 SubprocessCard "${subprocess.name}": isActiveInSequence=${isActiveInSequence}, sequenceMode=${sequenceMode}`);

  useEffect(() => {
    const timerLastTime = timerHook && typeof timerHook.getLastRecordedTime === 'function' 
      ? timerHook.getLastRecordedTime(processId, subprocess.id) 
      : null;
    
    if (timerLastTime && timerLastTime !== lastRecordedTime) {
      setLastRecordedTime(timerLastTime);
      setCanDeleteLatest(true); // ✅ NEW: Enable delete latest when new reading is recorded
    }
  }, [timerHook, processId, subprocess.id, lastRecordedTime]);

  // ✅ NEW: Delete latest reading function
  const deleteLatestReading = useCallback(async () => {
    if (!window.confirm('Delete the latest time reading for this subprocess?')) {
      return;
    }

    hapticFeedback();
    
    try {
      // Get the latest reading for this subprocess
      const readings = await db.getSubprocessReadings(subprocess.id, 1);
      
      if (readings && readings.length > 0) {
        const latestReading = readings[0];
        await db.deleteTimeReading(latestReading.id);
        
        setLastRecordedTime(null);
        setCanDeleteLatest(false);
        onTimeReadingAdded(); // Refresh the recordings view
        
        notifications?.showSuccess('Reading Deleted', 'Latest time reading has been removed');
      } else {
        notifications?.showError('No Reading', 'No time reading found to delete');
      }
    } catch (error) {
      console.error('❌ Error deleting latest reading:', error);
      notifications?.showError('Delete Error', 'Failed to delete latest reading');
    }
  }, [subprocess.id, onTimeReadingAdded, notifications, hapticFeedback]);

  // ✅ NEW: Save subprocess edits
  const saveSubprocessEdit = async () => {
    if (editName.trim() && editName !== subprocess.name) {
      hapticFeedback();
      try {
        await db.updateSubprocess(subprocess.id, { name: editName.trim() });
        await onReloadProcesses();
        notifications?.showSuccess('Subprocess Updated', 'Subprocess name has been updated');
      } catch (error) {
        console.error('Error updating subprocess:', error);
        notifications?.showError('Update Error', 'Failed to update subprocess');
        setEditName(subprocess.name); // Revert on error
      }
    }
    setIsEditing(false);
  };

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

  // ✅ FIXED: Stop now pauses instead of resetting
  const handleStop = () => {
    hapticFeedback();
    console.log(`⏸️ Pause button pressed for: ${subprocess.name}`);
    
    const timeData = timerHook.pauseTimer(processId, subprocess.id);
    
    if (timeData) {
      notifications?.showInfo('Timer Paused', 
        `Timer paused at ${timeData.formattedTime}`);
    }
  };

  const handleLap = () => {
    hapticFeedback();
    console.log(`📊 Lap button pressed for: ${subprocess.name}`);
    
    const timeData = timerHook.recordLap(processId, subprocess.id);
    
    if (timeData && timeData.shouldRecord) {
      setLastRecordedTime(timeData.formattedTime);
      setCanDeleteLatest(true); // ✅ NEW: Enable delete latest after lap
      
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

  // ✅ NEW: Separate reset function
  const handleReset = () => {
    hapticFeedback();
    timerHook.resetTimer(processId, subprocess.id);
    setLastRecordedTime(null);
    notifications?.showInfo('Timer Reset', 'Timer has been reset to 00:00:00');
  };

  useEffect(() => {
    if (window.updateSubprocessLastTime) {
      window.updateSubprocessLastTime[`${processId}-${subprocess.id}`] = (time) => {
        console.log(`🎯 Updating last recorded time for ${subprocess.name}: ${time}`);
        setLastRecordedTime(time);
        setCanDeleteLatest(true); // ✅ NEW: Enable delete latest when time is updated
      };
    } else {
      window.updateSubprocessLastTime = {
        [`${processId}-${subprocess.id}`]: (time) => {
          console.log(`🎯 Updating last recorded time for ${subprocess.name}: ${time}`);
          setLastRecordedTime(time);
          setCanDeleteLatest(true); // ✅ NEW: Enable delete latest when time is updated
        }
      };
    }
    
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
      {/* ✅ ENHANCED: Subprocess Header with reorder controls and edit functionality */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {/* ✅ NEW: Reorder controls */}
            <div className="flex flex-col">
              <button
                onClick={() => onReorderSubprocess(subprocess.id, 'up')}
                disabled={subprocessIndex === 0}
                className={`p-1 rounded ${subprocessIndex === 0 ? 'text-gray-300' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'}`}
                title="Move up"
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={() => onReorderSubprocess(subprocess.id, 'down')}
                disabled={subprocessIndex === totalSubprocesses - 1}
                className={`p-1 rounded ${subprocessIndex === totalSubprocesses - 1 ? 'text-gray-300' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'}`}
                title="Move down"
              >
                <ChevronDown size={14} />
              </button>
            </div>

            {isEditing ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="font-medium text-gray-800 text-sm md:text-base bg-white border border-gray-300 rounded px-2 py-1 flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && saveSubprocessEdit()}
                  autoFocus
                />
                <button
                  onClick={saveSubprocessEdit}
                  className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditName(subprocess.name);
                    setIsEditing(false);
                  }}
                  className="px-2 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-xs"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <h4 className="font-medium text-gray-800 text-sm md:text-base">{subprocess.name}</h4>
                
                {/* ✅ Edit button for subprocess */}
                <button
                  onClick={() => {
                    hapticFeedback();
                    setIsEditing(true);
                  }}
                  className="p-1 text-gray-500 hover:text-gray-700"
                  title="Edit subprocess name"
                >
                  <Edit3 size={12} />
                </button>
                
                {/* ✅ Delete button for subprocess */}
                <button
                  onClick={() => {
                    hapticFeedback();
                    onDeleteSubprocess(subprocess.id, subprocess.name);
                  }}
                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                  title="Delete subprocess"
                >
                  <Trash2 size={12} />
                </button>
              </>
            )}
            
            {!isEditing && isActiveInSequence && (
              <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full font-medium">
                ACTIVE
              </span>
            )}
            {!isEditing && sequenceMode && !isActiveInSequence && (
              <span className="px-2 py-1 bg-gray-300 text-gray-600 text-xs rounded-full">
                WAITING
              </span>
            )}
          </div>
          
          {/* Timer display */}
          <div className="text-xl md:text-2xl font-mono text-blue-600 mb-2 bg-blue-50 px-3 py-2 rounded-lg text-center border min-w-[140px]">
            {timerDisplay}
          </div>
          
          {/* Last Recorded Time Display with Delete Latest button */}
          {lastRecordedTime && (
            <div className="mb-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm">
              <div className="flex items-center justify-between">
                <span className="text-green-800 font-medium">
                  ✅ Last: {lastRecordedTime}
                </span>
                {/* ✅ NEW: Delete latest reading button */}
                {canDeleteLatest && (
                  <button
                    onClick={deleteLatestReading}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded"
                    title="Delete latest reading"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ✅ UPDATED: Timer Controls with Pause and Reset */}
      <div className="grid grid-cols-4 gap-2 mb-4">
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
            className="flex items-center justify-center px-3 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors min-h-[44px]"
          >
            <Pause className="mr-1" size={16} />
            Pause
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
          className="flex items-center justify-center px-3 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors min-h-[44px]"
        >
          <RotateCcw className="mr-1" size={14} />
          Reset
        </button>
        
        {/* Empty slot for grid alignment */}
        <div></div>
      </div>

      {/* Form Fields */}
      <div className="space-y-3 text-sm">
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
