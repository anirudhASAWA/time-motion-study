// src/App.js
// Enhanced version with delete individual readings functionality

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { auth, db } from './data/supabase.js';
import { useEnhancedTimer } from './hooks/useEnhancedTimer.js';
import { useNotifications } from './components/NotificationSystem.js';
import { SetupModeProvider, useSetupMode, SetupModeBanner, SetupModeToggle } from './hooks/useSetupMode.js';
import { exportToAdvancedExcel, exportToCSV } from './utils/excelExport.js';
import AuthForm from './components/AuthForm.jsx';
import ProcessCard from './components/ProcessCard.jsx';
import MobileActionBar, { MobileAddProcessModal } from './components/MobileActionbar.jsx';
import ProjectDashboard from './components/ProjectDashboard.jsx';
import { Clock, Plus, Download, LogOut, FileText, ArrowLeft, Trash2 } from 'lucide-react';

// Main App Component wrapped with providers
function App() {
  return (
    <SetupModeProvider>
      <AppContent />
    </SetupModeProvider>
  );
}

// Main App Content
function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentProject, setCurrentProject] = useState(null);
  const [processes, setProcesses] = useState([]);
  const [newProcessName, setNewProcessName] = useState('');
  const [showTimeReadings, setShowTimeReadings] = useState(false);
  const [timeReadings, setTimeReadings] = useState([]);
  const [showMobileAddModal, setShowMobileAddModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isAddingProcess, setIsAddingProcess] = useState(false);
  
  // ✅ Track if recordings view needs refresh
  const [recordingsNeedRefresh, setRecordingsNeedRefresh] = useState(false);
  
  // ✅ Ref to track current project for cleanup
  const currentProjectRef = useRef(null);
  
  // Hooks
  const { setupMode, toggleSetupMode } = useSetupMode();
  const notifications = useNotifications();
  const timerHook = useEnhancedTimer(setupMode, notifications);

  // ✅ Auto-refresh recordings when new data is added
  const refreshRecordingsIfVisible = useCallback(async () => {
    if (showTimeReadings && currentProject?.id) {
      console.log('🔄 Auto-refreshing recordings view...');
      try {
        const allReadings = await db.getTimeReadingsForProject(currentProject.id);
        setTimeReadings(allReadings || []);
        setRecordingsNeedRefresh(false);
        console.log('✅ Recordings refreshed:', (allReadings || []).length);
      } catch (error) {
        console.error('❌ Error auto-refreshing recordings:', error);
      }
    } else if (recordingsNeedRefresh) {
      console.log('📝 Recordings need refresh when view opens');
    }
  }, [showTimeReadings, currentProject?.id, recordingsNeedRefresh]);

  // ✅ Auto-refresh effect
  useEffect(() => {
    if (recordingsNeedRefresh) {
      refreshRecordingsIfVisible();
    }
  }, [recordingsNeedRefresh, refreshRecordingsIfVisible]);

  // ✅ NEW: Delete individual time reading function
  const deleteTimeReading = useCallback(async (readingId, subprocessName, formattedTime) => {
    if (!window.confirm(`Delete time reading "${formattedTime}" for ${subprocessName}? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log('🗑️ Deleting time reading:', readingId);
      
      await db.deleteTimeReading(readingId);
      
      // Refresh the recordings view
      await refreshRecordingsIfVisible();
      
      notifications.showSuccess('Reading Deleted', `Time reading for ${subprocessName} has been removed`);
      
    } catch (error) {
      console.error('❌ Error deleting time reading:', error);
      notifications.showError('Delete Error', 'Failed to delete time reading');
    }
  }, [refreshRecordingsIfVisible, notifications]);

  // ✅ Enhanced project selection with proper cleanup
  const handleSelectProject = async (project) => {
    try {
      console.log('🎯 Selecting project:', project);
      
      // ✅ Clear all stale data immediately
      console.log('🧹 Cleaning up previous project data...');
      setTimeReadings([]);
      setProcesses([]);
      setRecordingsNeedRefresh(false);
      timerHook.cleanupAllTimers();
      
      // Update current project
      setCurrentProject(project);
      currentProjectRef.current = project;
      
      // Load new project data
      console.log('🔄 Loading processes for project:', project.id);
      await loadProcessesForProject(project.id);
      
      // ✅ If recordings view is open, load new recordings immediately
      if (showTimeReadings) {
        console.log('🔄 Loading recordings for new project...');
        await loadTimeReadingsForProject(project.id);
      }
      
      notifications.showSuccess('Project Loaded', `Now working on: ${project.company_name}`);
    } catch (error) {
      console.error('❌ Error selecting project:', error);
      notifications.showError('Load Error', 'Failed to load project');
    }
  };

  // ✅ Enhanced back to projects with proper cleanup
  const handleBackToProjects = () => {
    console.log('🔙 Going back to projects dashboard');
    
    // ✅ Comprehensive cleanup
    setCurrentProject(null);
    currentProjectRef.current = null;
    setProcesses([]);
    setTimeReadings([]);
    setRecordingsNeedRefresh(false);
    setShowTimeReadings(false);
    timerHook.cleanupAllTimers();
    
    notifications.showInfo('Project Saved', 'Your work has been saved');
  };

  // ✅ Project-specific time readings loader
  const loadTimeReadingsForProject = async (projectId) => {
    try {
      console.log('🔄 Loading time readings for project:', projectId);
      const allReadings = await db.getTimeReadingsForProject(projectId);
      setTimeReadings(allReadings || []);
      setRecordingsNeedRefresh(false);
      console.log('✅ Time readings loaded for project:', projectId, 'Count:', (allReadings || []).length);
    } catch (error) {
      notifications.showError('Load Error', 'Failed to load time readings');
      console.error('❌ Error loading time readings:', error);
      setTimeReadings([]);
    }
  };

  // ✅ Enhanced time readings loader with project validation
  const loadTimeReadings = async () => {
    if (!currentProject?.id) {
      console.log('❌ No current project for time readings');
      setTimeReadings([]);
      return;
    }
    
    await loadTimeReadingsForProject(currentProject.id);
  };

  // ✅ Enhanced toggle with immediate data loading
  const toggleViewRecordings = async () => {
    const willShow = !showTimeReadings;
    setShowTimeReadings(willShow);
    
    if (willShow) {
      if (recordingsNeedRefresh || timeReadings.length === 0) {
        console.log('🔄 Loading recordings on view open...');
        await loadTimeReadings();
      }
    }
  };

  // ✅ Function to notify when new time reading is added
  const notifyNewTimeReading = useCallback(() => {
    console.log('📢 New time reading added - flagging for refresh');
    setRecordingsNeedRefresh(true);
    
    if (showTimeReadings) {
      setTimeout(() => {
        refreshRecordingsIfVisible();
      }, 100);
    }
  }, [showTimeReadings, refreshRecordingsIfVisible]);

  // Check viewport size with debounced resize
  useEffect(() => {
    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setIsMobile(window.innerWidth <= 768);
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  // Check if user is signed in when app starts
  useEffect(() => {
    checkUser();
    
    const { data: { subscription } } = auth.onAuthChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
        setCurrentProject(null);
        currentProjectRef.current = null;
        setProcesses([]);
        setTimeReadings([]);
        setRecordingsNeedRefresh(false);
        timerHook.cleanupAllTimers();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await auth.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error checking user:', error);
      notifications.showError('Authentication Error', 'Please refresh and try again');
    } finally {
      setLoading(false);
    }
  };

  // =================== PROJECT MANAGEMENT FUNCTIONS ===================
  
  const handleCreateProject = async (projectData) => {
    try {
      console.log('🚀 Creating project in App.js:', projectData);
      
      const newProject = await db.createProject(projectData);
      console.log('✅ Project created:', newProject);
      
      await handleSelectProject(newProject);
      
      notifications.showSuccess('Project Created', `${projectData.company_name} project has been created`);
      return newProject;
    } catch (error) {
      console.error('❌ Error creating project:', error);
      notifications.showError('Create Error', 'Failed to create project');
      throw error;
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Delete this project and all its data? This action cannot be undone.')) {
      return;
    }

    try {
      console.log('🗑️ Deleting project:', projectId);
      await db.deleteProject(projectId);
      
      if (currentProject && currentProject.id === projectId) {
        handleBackToProjects();
      }
      
      notifications.showSuccess('Project Deleted', 'Project and all data have been removed');
    } catch (error) {
      console.error('❌ Error deleting project:', error);
      notifications.showError('Delete Error', 'Failed to delete project');
    }
  };

  const loadProcessesForProject = async (projectId) => {
    try {
      console.log('🔄 Loading processes for project:', projectId);
      setProcesses([]);
      
      const data = await db.getProcessesByProject(projectId);
      setProcesses(data || []);
      console.log('✅ Loaded processes for project:', projectId, 'Count:', (data || []).length);
    } catch (error) {
      notifications.showError('Load Error', 'Failed to load processes');
      console.error('❌ Error loading processes:', error);
      setProcesses([]);
    }
  };

  // =================== PROCESS MANAGEMENT FUNCTIONS ===================

  const addProcess = async (name = newProcessName) => {
    console.log('🚀 Add Process called with:', { name, currentProject: currentProject?.id, isAddingProcess });
    
    if (!name.trim()) {
      console.log('❌ No process name provided');
      notifications.showError('Process Name Required', 'Please enter a process name');
      return;
    }
    
    if (isAddingProcess) {
      console.log('❌ Already adding a process');
      return;
    }
    
    if (!currentProject) {
      console.log('❌ No current project selected');
      notifications.showError('No Project', 'Please select a project first');
      return;
    }
    
    setIsAddingProcess(true);
    
    try {
      console.log('📤 Adding process to project:', currentProject.id);
      
      const newProcess = await db.addProcess(name.trim(), currentProject.id);
      console.log('✅ Process created:', newProcess);
      
      setProcesses(prev => {
        const updated = [...(prev || []), newProcess];
        console.log('📝 Updated processes list:', updated.length, 'processes');
        return updated;
      });
      setNewProcessName('');
      
      notifications.showSuccess('Process Added', `"${name}" has been created`);
    } catch (error) {
      console.error('❌ Error adding process:', error);
      notifications.showError('Add Error', `Failed to add process: ${error.message}`);
    } finally {
      setIsAddingProcess(false);
    }
  };

  const updateProcess = async (processId, updates) => {
    try {
      setProcesses(prev => (prev || []).map(p => 
        p.id === processId ? { ...p, ...updates } : p
      ));
      
      setTimeout(async () => {
        try {
          await db.updateProcess(processId, updates);
          notifications.showSuccess('Process Updated', 'Process has been updated');
        } catch (error) {
          if (currentProject?.id) {
            loadProcessesForProject(currentProject.id);
          }
          notifications.showError('Update Error', 'Failed to update process');
          console.error('Error updating process:', error);
        }
      }, 0);
    } catch (error) {
      notifications.showError('Update Error', 'Failed to update process');
      console.error('Error updating process:', error);
    }
  };

  const deleteProcess = async (processId) => {
    if (!window.confirm('Delete this process and all its data?')) {
      return;
    }

    try {
      setProcesses((processes || []).filter(p => p.id !== processId));
      timerHook.cleanupAllTimers();
      setRecordingsNeedRefresh(true);
      
      setTimeout(async () => {
        try {
          await db.deleteProcess(processId);
          notifications.showSuccess('Process Deleted', 'Process and all data have been removed');
        } catch (error) {
          if (currentProject?.id) {
            loadProcessesForProject(currentProject.id);
          }
          notifications.showError('Delete Error', 'Failed to delete process');
          console.error('Error deleting process:', error);
        }
      }, 0);
    } catch (error) {
      notifications.showError('Delete Error', 'Failed to delete process');
      console.error('Error deleting process:', error);
    }
  };

  // =================== EXPORT FUNCTION ===================

  const handleExport = async () => {
    try {
      if (!currentProject) {
        notifications.showError('No Project', 'Please select a project first');
        return;
      }
      
      console.log('📤 Exporting data for project:', currentProject.company_name);
      
      const processesWithReadings = await Promise.all(
        (processes || []).map(async (process) => {
          const processWithSubprocesses = { ...process };
          
          if (process.subprocesses && process.subprocesses.length > 0) {
            processWithSubprocesses.subprocesses = await Promise.all(
              process.subprocesses.map(async (subprocess) => {
                const readings = await db.getSubprocessReadings(subprocess.id);
                return { ...subprocess, time_readings: readings };
              })
            );
          }
          
          return processWithSubprocesses;
        })
      );

      if (processesWithReadings.every(p => !p.subprocesses?.some(sub => sub.time_readings?.length > 0))) {
        notifications.showError('No Data', 'No time readings to export for this project');
        return;
      }

      const filename = `${currentProject.company_name}_${currentProject.plant_name}_${currentProject.product}`
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase();
      
      console.log('📁 Export filename:', filename);
      
      const result = await exportToAdvancedExcel(processesWithReadings, filename);
      
      if (result.success) {
        notifications.showSuccess('Export Successful', 
          `Data exported for ${currentProject.company_name} - ${currentProject.plant_name}`);
      } else {
        const csvResult = exportToCSV(processesWithReadings, filename);
        if (csvResult.success) {
          notifications.showSuccess('CSV Export', 
            `CSV exported for ${currentProject.company_name} - ${currentProject.plant_name}`);
        } else {
          throw new Error(csvResult.error);
        }
      }
    } catch (error) {
      notifications.showError('Export Failed', error.message);
      console.error('Export error:', error);
    }
  };

  // =================== UI HELPER FUNCTIONS ===================

  const handleSetupModeToggle = () => {
    console.log('Toggling setup mode from:', setupMode);
    toggleSetupMode(timerHook);
  };

  const handleSignOut = async () => {
    try {
      timerHook.cleanupAllTimers();
      await auth.signOut();
      notifications.showInfo('Signed Out', 'You have been signed out successfully');
    } catch (error) {
      notifications.showError('Sign Out Error', 'Failed to sign out');
      console.error('Sign out error:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isAddingProcess) {
      addProcess();
    }
  };

  const hapticFeedback = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  // =================== RENDER LOGIC ===================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Clock className="animate-spin text-blue-500 mx-auto mb-4" size={48} />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Clock className="text-blue-500 mr-3" size={32} />
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Time & Motion Study</h1>
            </div>
            <p className="text-gray-600 text-lg">Professional time tracking and process analysis</p>
          </div>
          
          <AuthForm onSuccess={checkUser} />
        </div>
        <notifications.NotificationSystem />
      </div>
    );
  }

  if (!currentProject) {
    return (
      <>
        <ProjectDashboard 
          user={user}
          onSelectProject={handleSelectProject}
          onCreateProject={handleCreateProject}
          onDeleteProject={handleDeleteProject}
          notifications={notifications}
        />
        <notifications.NotificationSystem />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {setupMode && (
        <SetupModeBanner onExit={handleSetupModeToggle} />
      )}

      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-2 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={handleBackToProjects}
                className="mr-3 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Projects"
              >
                <ArrowLeft size={isMobile ? 18 : 20} className="text-gray-600" />
              </button>
              
              <Clock className="text-blue-500 mr-2" size={isMobile ? 20 : 28} />
              <div>
                <h1 className="text-lg md:text-xl font-bold text-gray-800">
                  {isMobile 
                    ? (currentProject.company_name?.length > 25 
                        ? currentProject.company_name.substring(0, 25) + '...' 
                        : currentProject.company_name)
                    : currentProject.company_name
                  }
                </h1>
                {!isMobile && (
                  <p className="text-sm text-gray-600">
                    {currentProject.plant_name && `${currentProject.plant_name} • `}
                    {currentProject.study_performed_by}
                  </p>
                )}
              </div>
              
              {setupMode && (
                <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                  SETUP
                </span>
              )}
            </div>
            
            {!isMobile && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={toggleViewRecordings}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors flex items-center"
                >
                  <FileText className="mr-2" size={16} />
                  {showTimeReadings ? 'Hide' : 'View'} Recordings
                  {recordingsNeedRefresh && !showTimeReadings && (
                    <span className="ml-1 w-2 h-2 bg-orange-400 rounded-full"></span>
                  )}
                </button>
                
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center"
                >
                  <Download className="mr-2" size={16} />
                  Export
                </button>
                
                <SetupModeToggle 
                  setupMode={setupMode} 
                  onToggle={handleSetupModeToggle} 
                />
                
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center"
                >
                  <LogOut className="mr-2" size={16} />
                  Sign Out
                </button>
              </div>
            )}

            {isMobile && (
              <button
                onClick={() => {
                  hapticFeedback();
                  handleSignOut();
                }}
                className="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
          
          {isMobile && (
            <div className="mt-2 text-xs text-gray-600">
              {currentProject.plant_name && `${currentProject.plant_name} • `}
              Study by: {currentProject.study_performed_by}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-2 md:px-4 py-4 md:py-8">
        {!isMobile && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Add New Process</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={newProcessName}
                onChange={(e) => setNewProcessName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter process name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                disabled={isAddingProcess}
              />
              <button
                onClick={() => addProcess()}
                disabled={isAddingProcess}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg font-medium transition-colors flex items-center"
              >
                <Plus className="mr-2" size={16} />
                {isAddingProcess ? 'Adding...' : 'Add Process'}
              </button>
            </div>
          </div>
        )}

        {/* ✅ ENHANCED: Time Readings Section with Delete Individual Readings */}
        {showTimeReadings && (
          <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg md:text-xl font-bold">Time Recordings</h2>
                  {recordingsNeedRefresh && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                      Updates Available
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Showing recordings for: {currentProject?.company_name} - {currentProject?.plant_name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadTimeReadings}
                  className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg transition-colors"
                  title="Refresh recordings"
                >
                  🔄 Refresh
                </button>
                <button
                  onClick={() => setShowTimeReadings(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕ Close
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-2 md:px-4 py-2 text-left text-sm">Process</th>
                    <th className="border border-gray-300 px-2 md:px-4 py-2 text-left text-sm">Subprocess</th>
                    <th className="border border-gray-300 px-2 md:px-4 py-2 text-left text-sm">Time</th>
                    <th className="border border-gray-300 px-2 md:px-4 py-2 text-left text-sm">Activity</th>
                    <th className="border border-gray-300 px-2 md:px-4 py-2 text-left text-sm">Persons</th>
                    <th className="border border-gray-300 px-2 md:px-4 py-2 text-left text-sm">Rating</th>
                    <th className="border border-gray-300 px-2 md:px-4 py-2 text-left text-sm">Remarks</th>
                    <th className="border border-gray-300 px-2 md:px-4 py-2 text-left text-sm">Recorded</th>
                    <th className="border border-gray-300 px-2 md:px-4 py-2 text-center text-sm">Actions</th> {/* ✅ NEW: Actions column */}
                  </tr>
                </thead>
                <tbody>
                  {(timeReadings || []).map((reading) => {
                    const formattedTime = `${Math.round(reading.time_milliseconds / 1000)}s`;
                    const subprocessName = reading.subprocesses?.name || 'Unknown';
                    
                    return (
                      <tr key={reading.id} className="text-sm hover:bg-gray-50"> {/* ✅ Added hover effect */}
                        <td className="border border-gray-300 px-2 md:px-4 py-2">{reading.processes?.name || 'Unknown'}</td>
                        <td className="border border-gray-300 px-2 md:px-4 py-2">{subprocessName}</td>
                        <td className="border border-gray-300 px-2 md:px-4 py-2 font-mono">{formattedTime}</td>
                        <td className="border border-gray-300 px-2 md:px-4 py-2">{reading.activity_type || '-'}</td>
                        <td className="border border-gray-300 px-2 md:px-4 py-2">{reading.person_count || 1}</td>
                        <td className="border border-gray-300 px-2 md:px-4 py-2">{reading.rating || 100}%</td>
                        <td className="border border-gray-300 px-2 md:px-4 py-2">{reading.remarks || '-'}</td>
                        <td className="border border-gray-300 px-2 md:px-4 py-2">{new Date(reading.created_at).toLocaleString()}</td>
                        <td className="border border-gray-300 px-2 md:px-4 py-2 text-center"> {/* ✅ NEW: Delete button */}
                          <button
                            onClick={() => deleteTimeReading(reading.id, subprocessName, formattedTime)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            title={`Delete reading: ${formattedTime} for ${subprocessName}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {(timeReadings || []).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="mx-auto mb-2 text-gray-400" size={32} />
                  <p>No time recordings yet for this project.</p>
                  <p className="text-xs">Start timing some processes to see recordings here!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Processes List */}
        <div className="space-y-4 md:space-y-6">
          {(processes || []).map((process) => (
            <ProcessCard 
              key={process.id} 
              process={process}
              onDeleteProcess={deleteProcess}
              onUpdateProcess={updateProcess}
              onReloadProcesses={() => loadProcessesForProject(currentProject.id)}
              timerHook={timerHook}
              notifications={notifications}
              isMobile={isMobile}
              hapticFeedback={hapticFeedback}
              onTimeReadingAdded={notifyNewTimeReading}
            />
          ))}
        </div>

        {(processes || []).length === 0 && (
          <div className="text-center py-12">
            <Clock className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">
              No processes yet for this project. Add your first process {isMobile ? 'using the + button below' : 'above'}!
            </p>
          </div>
        )}
      </div>

      {isMobile && (
        <MobileActionBar
          onAddProcess={() => setShowMobileAddModal(true)}
          onExport={handleExport}
          onToggleSetupMode={handleSetupModeToggle}
          onViewRecordings={toggleViewRecordings}
          setupMode={setupMode}
          showRecordings={showTimeReadings}
          recordingsNeedRefresh={recordingsNeedRefresh}
        />
      )}

      <MobileAddProcessModal
        isOpen={showMobileAddModal}
        onClose={() => setShowMobileAddModal(false)}
        onSubmit={addProcess}
      />

      <notifications.NotificationSystem />
    </div>
  );
}

export default App;
