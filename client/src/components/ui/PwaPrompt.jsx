import { useState, useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { FiDownload, FiRefreshCw, FiX, FiBell } from 'react-icons/fi';

export default function PwaPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);

  // ── 1. Service Worker registration & updates ────────────────────────────
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered successfully:', r);
    },
    onRegisterError(error) {
      console.error('SW Registration failed:', error);
    }
  });

  // ── 2. Handle Custom Install Prompt ─────────────────────────────────────
  useEffect(() => {
    // Check if app is already running in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone 
      || document.referrer.includes('android-app://');

    if (isStandalone) {
      console.log('Spheral PWA is running in standalone mode.');
      return;
    }

    // Check if user dismissed prompt for this session
    const isDismissed = sessionStorage.getItem('spheral_pwa_install_dismissed') === 'true';

    const handleBeforeInstallPrompt = (e) => {
      // Prevent browser's default prompt
      e.preventDefault();
      // Store the event so we can trigger it later
      setInstallPrompt(e);
      
      if (!isDismissed) {
        // Show our custom banner after 3 seconds for better UX
        const timer = setTimeout(() => {
          setShowInstallBanner(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Track when app is installed successfully
    const handleAppInstalled = () => {
      console.log('Spheral was successfully installed!');
      setInstallPrompt(null);
      setShowInstallBanner(false);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    setShowInstallBanner(false);
    
    // Show the native browser install prompt
    installPrompt.prompt();
    
    // Wait for the user's response
    const { outcome } = await installPrompt.userChoice;
    console.log(`PWA install prompt choice outcome: ${outcome}`);
    
    // Clear prompt ref
    setInstallPrompt(null);
  };

  const handleDismissInstall = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem('spheral_pwa_install_dismissed', 'true');
  };

  // ── 3. Push Notification Permission Preparation ───────────────────────
  useEffect(() => {
    // Check if browser supports notifications
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      return;
    }

    // Check if permission is default (not granted and not denied)
    const isPermissionDefault = Notification.permission === 'default';
    const isNotifyDismissed = sessionStorage.getItem('spheral_push_prep_dismissed') === 'true';

    if (isPermissionDefault && !isNotifyDismissed) {
      const timer = setTimeout(() => {
        setShowNotificationBanner(true);
      }, 8000); // Show notification prep banner after 8 seconds
      return () => clearTimeout(timer);
    }
  }, []);

  const handleEnableNotifications = async () => {
    setShowNotificationBanner(false);
    try {
      const permission = await Notification.requestPermission();
      console.log('Notification permission request result:', permission);
      
      if (permission === 'granted') {
        // Ready for push notifications. The service worker can handle push subscriptions.
        const registration = await navigator.serviceWorker.ready;
        console.log('Service Worker is ready to handle push subscriptions:', registration);
      }
    } catch (err) {
      console.warn('Failed to request notification permission:', err);
    }
  };

  const handleDismissNotifications = () => {
    setShowNotificationBanner(false);
    sessionStorage.setItem('spheral_push_prep_dismissed', 'true');
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-[9999] flex flex-col gap-3.5 max-w-sm pointer-events-none select-none">
      
      {/* 1. App Update Banner */}
      {needRefresh && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 pointer-events-auto animate-bounce md:animate-none">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 flex-shrink-0">
              <FiRefreshCw className="animate-spin text-lg" />
            </div>
            <div>
              <h4 className="text-white text-xs font-bold font-sans">Update Available</h4>
              <p className="text-[10px] text-zinc-400 font-semibold leading-relaxed mt-0.5">A new version of Spheral is available. Update now to access the latest features.</p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setNeedRefresh(false)}
              className="px-3.5 py-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 text-[10px] font-black transition cursor-pointer"
            >
              Later
            </button>
            <button
              onClick={() => updateServiceWorker(true)}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black shadow-lg transition cursor-pointer flex items-center gap-1 active:scale-[0.97]"
            >
              Update Now
            </button>
          </div>
        </div>
      )}

      {/* 2. Custom Install PWA Banner */}
      {showInstallBanner && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 pointer-events-auto animate-fade-in relative">
          <button
            onClick={handleDismissInstall}
            className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 transition"
          >
            <FiX size={15} />
          </button>
          
          <div className="flex items-start gap-3 pr-4">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white flex-shrink-0 font-black text-sm">
              S
            </div>
            <div>
              <h4 className="text-white text-xs font-bold font-sans">Install Spheral App</h4>
              <p className="text-[10px] text-zinc-400 font-semibold leading-relaxed mt-0.5">Add Spheral to your home screen for quick, fullscreen mobile access and better performance.</p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleInstallClick}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black shadow-lg transition cursor-pointer flex items-center gap-1.5 active:scale-[0.97]"
            >
              <FiDownload size={12} />
              Install Now
            </button>
          </div>
        </div>
      )}

      {/* 3. Push Notification Enable Banner */}
      {showNotificationBanner && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 pointer-events-auto animate-fade-in relative">
          <button
            onClick={handleDismissNotifications}
            className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 transition"
          >
            <FiX size={15} />
          </button>

          <div className="flex items-start gap-3 pr-4">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 flex-shrink-0">
              <FiBell size={18} />
            </div>
            <div>
              <h4 className="text-white text-xs font-bold font-sans">Enable Notifications</h4>
              <p className="text-[10px] text-zinc-400 font-semibold leading-relaxed mt-0.5">Stay connected! Allow push alerts to receive instant notifications when friends message or call you.</p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleEnableNotifications}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black shadow-lg transition cursor-pointer active:scale-[0.97]"
            >
              Turn On Alerts
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
