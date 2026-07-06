import { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useApp } from '../context/AppContext';
import { usersAPI } from '../api/users';
import { FiTrendingUp, FiEye, FiUsers, FiArrowLeft, FiGrid } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';

export default function ProfessionalDashboardPage() {
  const { user, showToast } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    if (!user) return;
    usersAPI.getInsights(user.id || user._id)
      .then(res => {
        if (res.success) {
          setInsights(res.insights);
        }
      })
      .catch(() => showToast('error', 'Failed to load insights'))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <MainLayout hideRight>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sp-blue" />
        </div>
      </MainLayout>
    );
  }

  const {
    profileVisits = { total: 0, last7d: 0, last30d: 0, daily: [0,0,0,0,0,0,0] },
    postViews = { total: 0, last7d: 0, last30d: 0, daily: [0,0,0,0,0,0,0] },
    followers = { total: 0, growth7d: 0, growth30d: 0 },
    labels = []
  } = insights || {};

  const maxVal = Math.max(...profileVisits.daily, ...postViews.daily, 5);

  return (
    <MainLayout hideRight>
      <div className="max-w-[1000px] mx-auto select-none mt-4 px-4 pb-10">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="nav-btn text-sp-text hover:bg-sp-hover">
              <FiArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-sp-text">Professional Dashboard</h1>
              <p className="text-sm text-sp-muted">Welcome, {user?.name}. Track your account performance below.</p>
            </div>
          </div>
          <Link to="/settings#account" className="btn-secondary text-xs">
            Settings
          </Link>
        </div>

        {/* Overview Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          
          {/* Card 1: Profile Visits */}
          <div className="card p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-sp-muted">Profile Visits</span>
              <span className="w-10 h-10 bg-sp-blue/10 text-sp-blue rounded-xl flex items-center justify-center">
                <FiEye size={20} />
              </span>
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-sp-text tracking-tight">{profileVisits.total}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">
                  +{profileVisits.last7d} this week
                </span>
                <span className="text-[11px] text-sp-muted">+{profileVisits.last30d} last 30d</span>
              </div>
            </div>
          </div>

          {/* Card 2: Post Views */}
          <div className="card p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-sp-muted">Post Views</span>
              <span className="w-10 h-10 bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center">
                <FiGrid size={20} />
              </span>
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-sp-text tracking-tight">{postViews.total}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">
                  +{postViews.last7d} this week
                </span>
                <span className="text-[11px] text-sp-muted">+{postViews.last30d} last 30d</span>
              </div>
            </div>
          </div>

          {/* Card 3: Followers Growth */}
          <div className="card p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-sp-muted">Follower Growth</span>
              <span className="w-10 h-10 bg-green-500/10 text-green-500 rounded-xl flex items-center justify-center">
                <FiUsers size={20} />
              </span>
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-sp-text tracking-tight">{followers.total}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 flex items-center gap-1">
                  <FiTrendingUp size={12} /> +{followers.growth7d} this week
                </span>
                <span className="text-[11px] text-sp-muted">+{followers.growth30d} last 30d</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts & Analytical Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Chart 1: Profile Visits Daily */}
          <div className="card p-6">
            <h3 className="text-base font-bold text-sp-text mb-6">Profile Visits (Last 7 Days)</h3>
            <div className="h-60 flex items-end justify-between gap-2 px-2 pt-4 relative border-b border-l border-sp-border">
              {profileVisits.daily.map((val, idx) => {
                const heightPercent = Math.max(8, Math.round((val / maxVal) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group">
                    <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[10px] px-1.5 py-0.5 rounded shadow z-10">
                      {val} visits
                    </div>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full bg-gradient-to-t from-sp-blue to-sp-blue/60 rounded-t hover:brightness-110 transition-all cursor-pointer relative"
                    />
                    <span className="text-[10px] text-sp-muted mt-2 rotate-12 sm:rotate-0 whitespace-nowrap">
                      {labels[idx] || ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 2: Post Views Daily */}
          <div className="card p-6">
            <h3 className="text-base font-bold text-sp-text mb-6">Post Views (Last 7 Days)</h3>
            <div className="h-60 flex items-end justify-between gap-2 px-2 pt-4 relative border-b border-l border-sp-border">
              {postViews.daily.map((val, idx) => {
                const heightPercent = Math.max(8, Math.round((val / maxVal) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group">
                    <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[10px] px-1.5 py-0.5 rounded shadow z-10">
                      {val} views
                    </div>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full bg-gradient-to-t from-purple-500 to-purple-500/60 rounded-t hover:brightness-110 transition-all cursor-pointer relative"
                    />
                    <span className="text-[10px] text-sp-muted mt-2 rotate-12 sm:rotate-0 whitespace-nowrap">
                      {labels[idx] || ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </MainLayout>
  );
}
