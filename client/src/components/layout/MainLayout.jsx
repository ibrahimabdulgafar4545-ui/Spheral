import Navbar from './Navbar';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import LiveNotificationBanner from '../ui/LiveNotificationBanner';

export default function MainLayout({ children, hideRight = false, hideSidebars = false }) {
  return (
    <div className="min-h-screen bg-sp-bg">
      <Navbar />
      <LiveNotificationBanner />
      <div className="pt-[calc(3.5rem+env(safe-area-inset-top,0px))]">
        {hideSidebars ? (
          <main className="min-h-[calc(100vh-3.5rem)] min-h-[calc(100dvh-3.5rem)] pb-20 md:pb-0">{children}</main>
        ) : (
          <div className="max-w-screen-xl mx-auto flex gap-0 px-0 sm:px-3">
            <LeftSidebar />
            <main className="flex-1 min-w-0 py-4 px-2 sm:px-3 pb-20 md:pb-4">{children}</main>
            {!hideRight && <RightSidebar />}
          </div>
        )}
      </div>
    </div>
  );
}
