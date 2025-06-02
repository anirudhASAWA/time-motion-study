// src/hooks/useSetupMode.js
// Setup mode for disabling timers during configuration

import { useState, useContext, createContext } from 'react';

// Create Setup Mode Context
const SetupModeContext = createContext();

// Setup Mode Provider Component
export function SetupModeProvider({ children }) {
  const [setupMode, setSetupMode] = useState(false);
  const [lockedTimers, setLockedTimers] = useState(new Set());

  const enableSetupMode = (timerHook) => {
    setSetupMode(true);
    
    // Stop all running timers and lock them
    if (timerHook) {
      timerHook.cleanupAllTimers();
    }
    
    console.log('Setup mode enabled - All timers disabled');
  };

  const disableSetupMode = () => {
    setSetupMode(false);
    setLockedTimers(new Set());
    console.log('Setup mode disabled - Timers enabled');
  };

  const toggleSetupMode = (timerHook) => {
    if (setupMode) {
      disableSetupMode();
    } else {
      enableSetupMode(timerHook);
    }
  };

  const isTimerLocked = (processId, subprocessId) => {
    if (!setupMode) return false;
    // In setup mode, all timers are locked
    return setupMode;
  };

  const value = {
    setupMode,
    enableSetupMode,
    disableSetupMode,
    toggleSetupMode,
    isTimerLocked,
    lockedTimers
  };

  return (
    <SetupModeContext.Provider value={value}>
      {children}
    </SetupModeContext.Provider>
  );
}

// Hook to use Setup Mode
export function useSetupMode() {
  const context = useContext(SetupModeContext);
  if (!context) {
    throw new Error('useSetupMode must be used within a SetupModeProvider');
  }
  return context;
}

// Setup Mode Banner Component
export function SetupModeBanner({ onExit }) {
  return (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex">
            <div className="flex-shrink-0">
              {/* Warning Icon */}
              <svg 
                className="h-5 w-5 text-yellow-400" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path 
                  fillRule="evenodd" 
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
                  clipRule="evenodd" 
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Setup Mode Active</strong> - All timers are disabled. Configure your processes safely.
              </p>
            </div>
          </div>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              onClick={onExit}
              className="inline-flex bg-yellow-100 rounded-md p-1.5 text-yellow-500 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-100 focus:ring-yellow-600 transition-colors"
            >
              <span className="sr-only">Exit setup mode</span>
              {/* Close Icon */}
              <svg 
                className="h-5 w-5" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path 
                  fillRule="evenodd" 
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
                  clipRule="evenodd" 
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Setup Mode Toggle Button Component
export function SetupModeToggle({ setupMode, onToggle, className = "" }) {
  return (
    <button
      onClick={onToggle}
      className={`
        px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2
        ${setupMode 
          ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg' 
          : 'bg-blue-500 hover:bg-blue-600 text-white'
        }
        ${className}
      `}
    >
      {/* Settings/Gear Icon */}
      <svg 
        className={`w-4 h-4 transition-transform ${setupMode ? 'rotate-180' : ''}`} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
        />
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
        />
      </svg>
      <span>{setupMode ? 'Exit Setup' : 'Setup Mode'}</span>
    </button>
  );
}

// Compact Setup Mode Toggle (for mobile)
export function CompactSetupModeToggle({ setupMode, onToggle, className = "" }) {
  return (
    <button
      onClick={onToggle}
      className={`
        p-2 rounded-lg font-medium transition-all duration-200
        ${setupMode 
          ? 'bg-red-500 hover:bg-red-600 text-white' 
          : 'bg-blue-500 hover:bg-blue-600 text-white'
        }
        ${className}
      `}
      title={setupMode ? 'Exit Setup Mode' : 'Enter Setup Mode'}
    >
      <svg 
        className={`w-5 h-5 transition-transform ${setupMode ? 'rotate-180' : ''}`} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
        />
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
        />
      </svg>
    </button>
  );
}

// Setup Mode Indicator (for showing current state)
export function SetupModeIndicator({ setupMode }) {
  if (!setupMode) return null;

  return (
    <div className="fixed top-4 left-4 z-40">
      <div className="bg-yellow-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        <span className="text-sm font-medium">Setup Mode</span>
      </div>
    </div>
  );
}

// Helper function to check if setup mode is active
export function isSetupModeActive(setupModeHook) {
  return setupModeHook?.setupMode || false;
}

// Helper function to safely toggle setup mode
export function safeToggleSetupMode(setupModeHook, timerHook) {
  if (setupModeHook && typeof setupModeHook.toggleSetupMode === 'function') {
    setupModeHook.toggleSetupMode(timerHook);
    return true;
  }
  console.warn('Setup mode hook not available');
  return false;
}

// CSS styles for setup mode (to be added to your global CSS or as a styled component)
export const setupModeStyles = `
  .setup-mode-active {
    opacity: 0.7;
    pointer-events: none;
  }
  
  .setup-mode-active button[disabled] {
    cursor: not-allowed;
  }
  
  .setup-mode-banner {
    animation: slideDown 0.3s ease-out;
  }
  
  @keyframes slideDown {
    from {
      transform: translateY(-100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  .setup-mode-toggle {
    position: relative;
  }
  
  .setup-mode-toggle::after {
    content: '';
    position: absolute;
    inset: -2px;
    border: 2px solid currentColor;
    border-radius: inherit;
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  .setup-mode-toggle:focus::after {
    opacity: 0.3;
  }
`;

// Export everything as default for convenience
export default {
  SetupModeProvider,
  useSetupMode,
  SetupModeBanner,
  SetupModeToggle,
  CompactSetupModeToggle,
  SetupModeIndicator,
  isSetupModeActive,
  safeToggleSetupMode,
  setupModeStyles
};