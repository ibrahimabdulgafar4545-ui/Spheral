import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ToastContainer } from './components/ui/Toast';
import ChatBox from './components/ui/ChatBox';
import CallOverlay from './components/chat/CallOverlay';
import CreativeEditor from './components/ui/CreativeEditor';
import PwaPrompt from './components/ui/PwaPrompt';

// Pages
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import FriendsPage from './pages/FriendsPage';
import GroupsPage from './pages/GroupsPage';
import GroupDetailPage from './pages/GroupDetailPage';
import NotificationsPage from './pages/NotificationsPage';
import SearchPage from './pages/SearchPage';
import SettingsPage from './pages/SettingsPage';
import ReelsPage from './pages/ReelsPage';
import HelpCenterPage from './pages/HelpCenterPage';
import ActivityLogPage from './pages/ActivityLogPage';
import PrivacyCheckupPage from './pages/PrivacyCheckupPage';
import MessagesPage from './pages/MessagesPage';
import ProfessionalDashboardPage from './pages/ProfessionalDashboardPage';
import NotFoundPage from './pages/NotFoundPage';
import SavedPage from './pages/SavedPage';
import EventsPage from './pages/EventsPage';
import MemoriesPage from './pages/MemoriesPage';
import LiveStreamPage from './pages/LiveStreamPage';
import { PageLoader } from './components/ui/LoadingSpinner';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import GuidelinesPage from './pages/GuidelinesPage';
import AboutPage from './pages/AboutPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import VerificationCelebrationModal from './components/modals/VerificationCelebrationModal';

// Protected Route Wrapper
import AdminRoute from './components/routing/AdminRoute';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useApp();

  if (loading) {
    return <PageLoader />;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Auth Route Wrapper
function AuthRoute({ children }) {
  const { isAuthenticated, loading } = useApp();

  if (loading) {
    return <PageLoader />;
  }

  const isAddingAccount = window.location.search.includes('add_account=true');

  return (isAuthenticated && !isAddingAccount) ? <Navigate to="/" replace /> : children;
}

function MainApp() {
  const { 
    toast, hideToast, callState, callData, acceptCall, declineCall, endCall, user,
    sharedEmbed, closeShareToStory, handleShareToStoryComplete,
    showVerificationCelebration, closeVerificationCelebration
  } = useApp();

  return (
    <>
      <Routes>
        {/* Auth pages */}
        <Route path="/login"  element={<AuthRoute><LoginPage /></AuthRoute>} />
        <Route path="/signup" element={<AuthRoute><SignupPage /></AuthRoute>} />

        {/* Protected app pages */}
        <Route path="/"                  element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/profile/:userId"   element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/friends"           element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
        <Route path="/groups"            element={<ProtectedRoute><GroupsPage /></ProtectedRoute>} />
        <Route path="/groups/:groupId"   element={<ProtectedRoute><GroupDetailPage /></ProtectedRoute>} />
        <Route path="/notifications"     element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/search"            element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
        <Route path="/settings"          element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/messages"          element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
        <Route path="/bookmarks"         element={<ProtectedRoute><SavedPage /></ProtectedRoute>} />
        <Route path="/events"            element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
        <Route path="/memories"          element={<ProtectedRoute><MemoriesPage /></ProtectedRoute>} />
        <Route path="/reels"             element={<ProtectedRoute><ReelsPage /></ProtectedRoute>} />
        <Route path="/help-center"       element={<ProtectedRoute><HelpCenterPage /></ProtectedRoute>} />
        <Route path="/activity-log"      element={<ProtectedRoute><ActivityLogPage /></ProtectedRoute>} />
        <Route path="/privacy-checkup"   element={<ProtectedRoute><PrivacyCheckupPage /></ProtectedRoute>} />
        <Route path="/professional-dashboard" element={<ProtectedRoute><ProfessionalDashboardPage /></ProtectedRoute>} />
        <Route path="/live/:channelName"  element={<ProtectedRoute><LiveStreamPage /></ProtectedRoute>} />

        {/* Admin Route */}
        <Route path="/admin"             element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />

        {/* Public Information Pages */}
        <Route path="/terms"      element={<TermsPage />} />
        <Route path="/privacy"    element={<PrivacyPage />} />
        <Route path="/guidelines" element={<GuidelinesPage />} />
        <Route path="/about"      element={<AboutPage />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* Global Messenger Overlay */}
      <ChatBox />

      {/* Global Call Overlay (Signaling events) */}
      <CallOverlay
        callState={callState}
        callData={callData}
        onAccept={acceptCall}
        onDecline={declineCall}
        onEnd={endCall}
        currentUser={user}
      />

      {/* Global Story Embed Editor Overlay */}
      {sharedEmbed && (
        <CreativeEditor
          file={null}
          embed={sharedEmbed}
          type="story"
          onComplete={handleShareToStoryComplete}
          onCancel={closeShareToStory}
        />
      )}

      {/* Global Toast Alerts */}
      {toast && (
        <ToastContainer
          toasts={[toast]}
          onDismiss={hideToast}
        />
      )}

      {/* Verification Celebration Modal */}
      <VerificationCelebrationModal
        isOpen={showVerificationCelebration}
        onClose={closeVerificationCelebration}
      />

      {/* PWA Update, Install and Notification Prompts */}
      <PwaPrompt />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <MainApp />
      </AppProvider>
    </BrowserRouter>
  );
}
