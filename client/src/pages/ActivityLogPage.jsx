import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useApp } from '../context/AppContext';
import { activityAPI } from '../api/activity';
import { timeAgo } from '../utils/helpers';
import { FiClock, FiMessageSquare, FiHeart, FiEdit3 } from 'react-icons/fi';

export default function ActivityLogPage() {
  const { showToast } = useApp();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await activityAPI.getActivity();
        setActivities(res.activity || []);
      } catch (err) {
        showToast('error', 'Failed to load activity log');
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'post': return <FiEdit3 className="text-sp-blue" />;
      case 'like': return <FiHeart className="text-red-500" />;
      case 'comment': return <FiMessageSquare className="text-green-500" />;
      default: return <FiClock className="text-sp-muted" />;
    }
  };

  return (
    <MainLayout hideRight>
      <div className="max-w-[700px] mx-auto mt-4 px-4 pb-12 select-none">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-sp-blue/10 text-sp-blue flex items-center justify-center">
            <FiClock size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-sp-text">Activity Log</h1>
            <p className="text-sp-muted text-sm">A chronological record of your interactions</p>
          </div>
        </div>

        <div className="card p-4 min-h-[400px]">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sp-blue"></div>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12 text-sp-muted">
              <FiClock size={48} className="mx-auto mb-3 opacity-20" />
              <p>No recent activity found.</p>
            </div>
          ) : (
            <div className="relative border-l border-sp-divider ml-4 space-y-6 py-2">
              {activities.map((item) => (
                <div key={item.id} className="relative pl-6">
                  <span className="absolute -left-3.5 top-1 w-7 h-7 rounded-full bg-sp-card border border-sp-border flex items-center justify-center shadow-sm">
                    {getIcon(item.type)}
                  </span>
                  <div className="bg-sp-overlay rounded-xl p-3 border border-sp-border/50 shadow-sm hover:border-sp-border transition-colors">
                    <p className="text-sm text-sp-text font-medium mb-1">{item.text}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-sp-muted">{timeAgo(item.timestamp)}</span>
                      {item.link && (
                        <Link to={item.link} className="text-xs text-sp-blue hover:underline font-semibold">
                          View
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
