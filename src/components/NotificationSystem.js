import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

// Notification System Component
function NotificationSystem() {
  const [notifications, setNotifications] = useState([]);

  // Auto-remove notifications after duration
  useEffect(() => {
    notifications.forEach(notification => {
      if (notification.autoClose) {
        const timer = setTimeout(() => {
          removeNotification(notification.id);
        }, notification.duration || 3000);

        return () => clearTimeout(timer);
      }
    });
  }, [notifications]);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'error':
        return <AlertCircle className="text-red-600" size={20} />;
      case 'info':
      default:
        return <Info className="text-blue-600" size={20} />;
    }
  };

  const getBackgroundColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            min-w-80 max-w-96 p-4 rounded-lg border shadow-lg transition-all duration-300 transform
            ${getBackgroundColor(notification.type)}
            animate-slide-in
          `}
        >
          <div className="flex items-start gap-3">
            {getIcon(notification.type)}
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{notification.title}</h4>
              {notification.message && (
                <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
              )}
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Hook to use notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState([]);

  const showNotification = (title, message = '', type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    const notification = {
      id,
      title,
      message,
      type,
      duration,
      autoClose: duration > 0
    };

    setNotifications(prev => [...prev, notification]);

    // Return function to manually close
    return () => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    };
  };

  const showSuccess = (title, message = '', duration = 3000) => {
    return showNotification(title, message, 'success', duration);
  };

  const showError = (title, message = '', duration = 5000) => {
    return showNotification(title, message, 'error', duration);
  };

  const showInfo = (title, message = '', duration = 3000) => {
    return showNotification(title, message, 'info', duration);
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return {
    notifications,
    showNotification,
    showSuccess,
    showError,
    showInfo,
    clearAll,
    NotificationSystem: () => <NotificationSystem notifications={notifications} setNotifications={setNotifications} />
  };
}

// Updated NotificationSystem to accept props
function NotificationSystemWithProps({ notifications, setNotifications }) {
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'error':
        return <AlertCircle className="text-red-600" size={20} />;
      case 'info':
      default:
        return <Info className="text-blue-600" size={20} />;
    }
  };

  const getBackgroundColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  // Auto-remove notifications
  useEffect(() => {
    notifications.forEach(notification => {
      if (notification.autoClose) {
        const timer = setTimeout(() => {
          removeNotification(notification.id);
        }, notification.duration || 3000);

        return () => clearTimeout(timer);
      }
    });
  }, [notifications]);

  return (
    <>
      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`
              min-w-80 max-w-96 p-4 rounded-lg border shadow-lg transition-all duration-300 transform
              ${getBackgroundColor(notification.type)}
              animate-slide-in
            `}
          >
            <div className="flex items-start gap-3">
              {getIcon(notification.type)}
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{notification.title}</h4>
                {notification.message && (
                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                )}
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export { NotificationSystemWithProps as NotificationSystem };
export default NotificationSystem;