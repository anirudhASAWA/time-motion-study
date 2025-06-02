import React, { useState } from 'react';
import { Plus, Download, Settings, FileText, Menu, X, BarChart3, Save, LogOut } from 'lucide-react';

// Clean Mobile Action Bar with Slide-up Menu
function MobileActionBar({ 
  onAddProcess, 
  onExport, 
  onToggleSetupMode, 
  onViewRecordings,
  setupMode = false,
  showRecordings = false,
  // ✅ NEW: Add prop to show if recordings need refresh
  recordingsNeedRefresh = false
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  const handleAction = (action) => {
    action();
    setIsMenuOpen(false);
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  const menuItems = [
    {
      icon: FileText,
      label: showRecordings ? 'Hide Recordings' : 'View Recordings',
      action: onViewRecordings,
      color: 'bg-indigo-500 hover:bg-indigo-600',
      description: 'View all recorded time entries',
      // ✅ NEW: Show indicator if recordings need refresh
      hasIndicator: recordingsNeedRefresh && !showRecordings
    },
    {
      icon: BarChart3,
      label: 'Analytics Dashboard',
      action: () => {}, // You can connect this to analytics
      color: 'bg-purple-500 hover:bg-purple-600',
      description: 'View process analytics and metrics'
    },
    {
      icon: Download,
      label: 'Export Data',
      action: onExport,
      color: 'bg-green-500 hover:bg-green-600',
      description: 'Export data to Excel or CSV'
    },
    {
      icon: Save,
      label: 'Backup Data',
      action: () => {}, // You can connect this to backup
      color: 'bg-orange-500 hover:bg-orange-600',
      description: 'Create a backup of your data'
    },
    {
      icon: Settings,
      label: setupMode ? 'Exit Setup Mode' : 'Enter Setup Mode',
      action: onToggleSetupMode,
      color: setupMode 
        ? 'bg-red-500 hover:bg-red-600' 
        : 'bg-yellow-500 hover:bg-yellow-600',
      description: setupMode 
        ? 'Exit setup mode to enable timers' 
        : 'Enter setup mode to configure processes'
    }
  ];

  return (
    <>
      {/* Backdrop */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 z-40 transition-opacity duration-300"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Slide-up Menu */}
      <div 
        className={`
          fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-300 ease-out
          ${isMenuOpen ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        <div className="bg-white rounded-t-2xl shadow-2xl border-t border-gray-200 max-h-[80vh] overflow-hidden">
          {/* Menu Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Quick Actions</h3>
              <p className="text-sm text-gray-500">Choose an action to perform</p>
            </div>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Menu Items */}
          <div className="p-4 overflow-y-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
            <div className="space-y-3">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleAction(item.action)}
                  className={`
                    w-full flex items-center gap-4 p-4 rounded-xl text-white font-medium 
                    transition-all duration-200 active:scale-98 transform ${item.color}
                    shadow-sm hover:shadow-md relative
                  `}
                >
                  <div className="flex-shrink-0">
                    <item.icon size={24} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold">{item.label}</div>
                    <div className="text-sm opacity-90 font-normal">{item.description}</div>
                  </div>
                  {/* ✅ NEW: Show indicator for recordings if they need refresh */}
                  {item.hasIndicator && (
                    <div className="absolute top-2 right-2">
                      <div className="w-3 h-3 bg-orange-400 rounded-full border-2 border-white"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
            
            {/* Quick Stats */}
            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Quick Info</h4>
              <div className="text-xs text-gray-500 space-y-1">
                {setupMode ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    Setup Mode is currently active
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    Ready for time tracking
                  </div>
                )}
                {/* ✅ NEW: Show recordings update status */}
                {recordingsNeedRefresh && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                    New recordings available to view
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200">
        <div className="flex p-3 gap-3" style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}>
          {/* Add Process - Primary Action */}
          <button
            onClick={() => handleAction(onAddProcess)}
            className="flex-1 flex items-center justify-center gap-3 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white py-4 rounded-xl font-semibold transition-all duration-200 active:scale-98 shadow-lg"
          >
            <Plus size={22} />
            <span>Add Process</span>
          </button>

          {/* Menu Toggle */}
          <button
            onClick={toggleMenu}
            className={`
              flex items-center justify-center w-16 h-16 rounded-xl font-medium 
              transition-all duration-200 active:scale-98 shadow-lg relative
              ${isMenuOpen 
                ? 'bg-gray-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }
            `}
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            {/* ✅ NEW: Show indicator on menu button if recordings need refresh */}
            {recordingsNeedRefresh && !isMenuOpen && (
              <div className="absolute top-1 right-1">
                <div className="w-3 h-3 bg-orange-400 rounded-full border-2 border-white"></div>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Spacer to prevent content from being hidden */}
      <div className="h-24" />
    </>
  );
}

// Mobile Modal Component (unchanged, but optimized)
export function MobileModal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(85vh-80px)]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// Mobile Add Process Modal (enhanced)
export function MobileAddProcessModal({ isOpen, onClose, onSubmit }) {
  const [processName, setProcessName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (processName.trim() && !isSubmitting) {
      setIsSubmitting(true);
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      
      try {
        await onSubmit(processName.trim());
        setProcessName('');
        onClose();
      } catch (error) {
        console.error('Error adding process:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  // Reset form when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setProcessName('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  return (
    <MobileModal isOpen={isOpen} onClose={onClose} title="Add New Process">
      <div className="space-y-6">
        <div>
          <label htmlFor="process-name" className="block text-sm font-semibold text-gray-700 mb-3">
            Process Name
          </label>
          <input
            id="process-name"
            type="text"
            value={processName}
            onChange={(e) => setProcessName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter process name..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            autoFocus
            disabled={isSubmitting}
          />
          <p className="text-xs text-gray-500 mt-2">
            Give your process a clear, descriptive name
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-xl font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!processName.trim() || isSubmitting}
            className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Adding...
              </>
            ) : (
              <>
                <Plus size={18} />
                Add Process
              </>
            )}
          </button>
        </div>
      </div>
    </MobileModal>
  );
}

export default MobileActionBar;