import { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { adminAPI } from '../api/admin';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import { useApp } from '../context/AppContext';
import { FiUsers, FiFlag, FiBarChart2, FiCheck, FiX, FiShield, FiAlertTriangle, FiMessageSquare, FiCheckCircle, FiVolume2, FiSmile, FiMail, FiClock, FiGlobe, FiSettings, FiToggleRight, FiToggleLeft } from 'react-icons/fi';
import clsx from 'clsx';
import { timeAgo, fullDate } from '../utils/helpers';

// ─── Custom SVG Line Chart ──────────────────────────────────────────────────
function SVGLineChart({ data }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => d.count), 5);
  const width = 500;
  const height = 180;
  const padding = 30;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - (d.count / maxVal) * chartHeight;
    return { x, y, ...d };
  });
  
  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25"/>
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = padding + chartHeight * ratio;
          const val = Math.round(maxVal * (1 - ratio));
          return (
            <g key={idx}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="var(--border)" strokeDasharray="3 3" opacity="0.3" />
              <text x={padding - 8} y={y + 4} textAnchor="end" className="fill-sp-muted text-[10px] font-bold">{val}</text>
            </g>
          );
        })}
        <path d={areaD} fill="url(#lineGrad)" />
        <path d={pathD} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, idx) => (
          (p.count > 0 || idx % 5 === 0) && (
            <circle key={idx} cx={p.x} cy={p.y} r="3.5" fill="#3B82F6" stroke="var(--card)" strokeWidth="1.5" />
          )
        ))}
        {points.map((p, idx) => (
          (idx % 6 === 0 || idx === points.length - 1) && (
            <text key={idx} x={p.x} y={height - 8} textAnchor="middle" className="fill-sp-muted text-[9px] font-bold">
              {p.date.substring(5)}
            </text>
          )
        ))}
      </svg>
    </div>
  );
}

// ─── Custom SVG Bar Chart ───────────────────────────────────────────────────
function SVGBarChart({ data }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => d.count), 5);
  const width = 500;
  const height = 180;
  const padding = 30;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const barWidth = (chartWidth / data.length) * 0.7;
  const gap = (chartWidth / data.length) * 0.3;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = padding + chartHeight * ratio;
          const val = Math.round(maxVal * (1 - ratio));
          return (
            <g key={idx}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="var(--border)" strokeDasharray="3 3" opacity="0.3" />
              <text x={padding - 8} y={y + 4} textAnchor="end" className="fill-sp-muted text-[10px] font-bold">{val}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const barHeight = (d.count / maxVal) * chartHeight;
          const x = padding + i * (barWidth + gap) + gap / 2;
          const y = padding + chartHeight - barHeight;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 1)}
                fill={d.count > 0 ? '#3B82F6' : 'var(--border)'}
                opacity={d.count > 0 ? 0.85 : 0.2}
                rx="2"
              />
              {d.count > 0 && <title>{`${d.hour}: ${d.count}`}</title>}
            </g>
          );
        })}
        {data.map((d, i) => (
          (i % 4 === 0) && (
            <text
              key={i}
              x={padding + i * (barWidth + gap) + barWidth / 2 + gap / 2}
              y={height - 8}
              textAnchor="middle"
              className="fill-sp-muted text-[9px] font-bold"
            >
              {d.hour}
            </text>
          )
        ))}
      </svg>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { showToast, user } = useApp();
  const [activeTab, setActiveTab] = useState('reports');
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [replyingTicket, setReplyingTicket] = useState(null);
  const [aiDraft, setAiDraft] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [feedbackList, setFeedbackList] = useState([]);
  const [insights, setInsights] = useState(null);
  const [lastGenerated, setLastGenerated] = useState(null);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  
  // New Admin Capabilities States
  const [systemHealth, setSystemHealth] = useState(null);
  const [geoInsights, setGeoInsights] = useState([]);
  const [scheduledAnnouncements, setScheduledAnnouncements] = useState([]);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailFilter, setEmailFilter] = useState('all');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [systemSettings, setSystemSettings] = useState({ maintenanceMode: false, allowRegistrations: true, requireEmailVerification: false });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'reports') {
        const res = await adminAPI.getReports('pending');
        setReports(res.reports || []);
      } else if (activeTab === 'users') {
        const res = await adminAPI.getUsers(search);
        setUsers(res.users || []);
      } else if (activeTab === 'stats') {
        const res = await adminAPI.getStats();
        setStats(res.stats || null);
        try {
          const resEngagement = await adminAPI.getEngagementAnalytics();
          setEngagement(resEngagement.data || null);
        } catch (err) {
          console.error(err);
        }
        try {
          const resHealth = await adminAPI.getSystemHealth();
          setSystemHealth(resHealth.health || null);
        } catch (err) {
          console.error(err);
        }
        try {
          const resGeo = await adminAPI.getGeoInsights();
          setGeoInsights(resGeo.data || []);
        } catch (err) {
          console.error(err);
        }
      } else if (activeTab === 'tickets') {
        const res = await adminAPI.getTickets('open');
        setTickets(res.tickets || []);
      } else if (activeTab === 'feedback') {
        const resFeedback = await adminAPI.getFeedback();
        setFeedbackList(resFeedback.tickets || []);
        try {
          const resInsights = await adminAPI.getFeedbackInsights();
          setInsights(resInsights.insights || null);
          setLastGenerated(resInsights.lastGenerated || null);
        } catch (e) {
          console.error(e);
        }
      } else if (activeTab === 'broadcast') {
        try {
          const resSched = await adminAPI.getScheduledAnnouncements();
          setScheduledAnnouncements(resSched.scheduled || []);
        } catch (e) {
          console.error(e);
        }
      } else if (activeTab === 'settings') {
        try {
          const resSettings = await adminAPI.getSettings();
          if (resSettings.settings) setSystemSettings(resSettings.settings);
        } catch (e) {
          console.error(e);
        }
      }
    } catch (error) {
      console.error(error);
      // Fallback or silently fail to avoid breaking UI on network errors
    } finally {
      setLoading(false);
    }
  };

  const handleSearchUsers = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleReportAction = async (reportId, actionName) => {
    try {
      await adminAPI.updateReportStatus(reportId, 'resolved', actionName);
      setReports(prev => prev.filter(r => r.id !== reportId && r._id !== reportId));
    } catch (error) {
      console.error(error);
    }
  };

  const handleUserAction = async (userId, actionName) => {
    try {
      await adminAPI.updateUserStatus(userId, actionName);
      setUsers(prev => prev.map(u => (u._id === userId || u.id === userId) ? { ...u, accountStatus: actionName } : u));
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggleSetting = async (key) => {
    try {
      const newValue = !systemSettings[key];
      setSystemSettings(prev => ({ ...prev, [key]: newValue }));
      await adminAPI.updateSettings({ [key]: newValue });
      showToast('success', 'System setting updated.');
    } catch (err) {
      console.error(err);
      setSystemSettings(prev => ({ ...prev, [key]: !prev[key] }));
      showToast('error', 'Failed to update setting.');
    }
  };

  const handleTicketAction = async (ticketId, status) => {
    try {
      await adminAPI.updateTicketStatus(ticketId, status);
      setTickets(prev => prev.filter(t => t._id !== ticketId && t.id !== ticketId));
      showToast('success', 'Ticket resolved successfully');
    } catch (error) {
      console.error(error);
    }
  };

  const handleGenerateAIReply = async (ticket) => {
    setReplyingTicket(ticket);
    setGeneratingAI(true);
    setAiDraft('');
    try {
      const res = await adminAPI.generateAIReply(ticket._id || ticket.id);
      setAiDraft(res.reply || '');
    } catch (error) {
      showToast('error', error.message || 'Failed to generate AI reply');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSendAIReply = async () => {
    if (!replyingTicket || !aiDraft.trim()) return;
    setSendingReply(true);
    try {
      await adminAPI.sendAIReply(replyingTicket._id || replyingTicket.id, aiDraft);
      setTickets(prev => prev.filter(t => t._id !== replyingTicket._id && t.id !== replyingTicket.id));
      setReplyingTicket(null);
      setAiDraft('');
      showToast('success', 'Reply sent and ticket resolved');
    } catch (error) {
      showToast('error', error.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleToggleVerification = async (userId, verified) => {
    try {
      await adminAPI.toggleUserVerification(userId, verified);
      setUsers(prev => prev.map(u => (u._id === userId || u.id === userId) ? { ...u, verified } : u));
      showToast('success', verified ? 'User verified successfully' : 'User verification revoked');
    } catch (error) {
      console.error(error);
      showToast('error', error.message || 'Failed to update verification status');
    }
  };

  const handleToggleAdmin = async (userId, isAdmin) => {
    try {
      await adminAPI.toggleUserAdmin(userId, isAdmin);
      setUsers(prev => prev.map(u => (u._id === userId || u.id === userId) ? { ...u, isAdmin } : u));
      showToast('success', isAdmin ? 'User promoted to administrator' : 'User administrator role revoked');
    } catch (error) {
      console.error(error);
      showToast('error', error.response?.data?.message || error.message || 'Failed to update admin status');
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    setSendingBroadcast(true);
    try {
      await adminAPI.sendBroadcast(broadcastMessage);
      setBroadcastMessage('');
      showToast('success', 'Broadcast announcement sent to all users');
    } catch (error) {
      showToast('error', error.message || 'Failed to send broadcast');
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handleGenerateInsights = async () => {
    setGeneratingInsights(true);
    try {
      const res = await adminAPI.generateFeedbackInsights();
      if (res.success) {
        setInsights(res.insights);
        setLastGenerated(res.lastGenerated);
        showToast('success', 'AI feedback insights generated successfully!');
      } else {
        showToast('info', res.message || 'No feedback found to analyze.');
      }
    } catch (error) {
      showToast('error', error.message || 'Failed to generate insights');
    } finally {
      setGeneratingInsights(false);
    }
  };

  const handleScheduleAnnouncement = async (e) => {
    e.preventDefault();
    if (!broadcastMessage.trim() || !scheduledTime) return;
    try {
      const res = await adminAPI.scheduleAnnouncement(broadcastMessage, scheduledTime);
      if (res.success) {
        showToast('success', 'Announcement scheduled successfully');
        setBroadcastMessage('');
        setScheduledTime('');
        const resSched = await adminAPI.getScheduledAnnouncements();
        setScheduledAnnouncements(resSched.scheduled || []);
      }
    } catch (error) {
      showToast('error', error.response?.data?.message || error.message || 'Failed to schedule announcement');
    }
  };

  const handleSendEmailCampaign = async (e) => {
    e.preventDefault();
    if (!emailSubject.trim() || !emailBody.trim()) return;
    setSendingEmail(true);
    try {
      const res = await adminAPI.sendEmailCampaign(emailSubject, emailBody, emailFilter);
      if (res.success) {
        showToast('success', res.message || `Campaign sent successfully to ${res.count} users.`);
        setEmailSubject('');
        setEmailBody('');
      }
    } catch (error) {
      showToast('error', error.response?.data?.message || error.message || 'Failed to send campaign');
    } finally {
      setSendingEmail(false);
    }
  };

  const tabs = [
    { id: 'reports', label: 'Reports', icon: FiFlag },
    { id: 'users', label: 'Users', icon: FiUsers },
    { id: 'tickets', label: 'Support', icon: FiMessageSquare },
    { id: 'feedback', label: 'Feedback', icon: FiSmile },
    { id: 'broadcast', label: 'Broadcast', icon: FiVolume2 },
    { id: 'email', label: 'Campaigns', icon: FiMail },
    { id: 'stats', label: 'Stats', icon: FiBarChart2 },
    { id: 'settings', label: 'System Controls', icon: FiSettings },
  ];

  return (
    <MainLayout hideSidebars={true}>
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* Left Vertical Sidebar / Navigation */}
          <div className="w-full lg:w-64 flex-shrink-0 space-y-4 lg:sticky lg:top-24 z-10">
            {/* Header Card */}
            <div className="card p-5 flex items-center gap-3.5 shadow-sm border border-sp-border">
              <div className="w-10 h-10 rounded-xl bg-sp-blue/10 text-sp-blue flex items-center justify-center">
                <FiShield size={22} />
              </div>
              <div className="min-w-0 text-left">
                <h1 className="text-base font-bold text-sp-text tracking-tight truncate">Admin Panel</h1>
                <p className="text-sp-muted text-[11px] font-medium truncate">System Administrator</p>
              </div>
            </div>

            {/* Navigation Menu */}
            <div className="card p-2 border border-sp-border space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-black text-sp-muted uppercase tracking-wider text-left">
                Modules
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                {tabs.map((tab) => {
                  const isActiveTab = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all text-left border',
                        isActiveTab
                          ? 'bg-sp-blue/10 text-sp-blue shadow-glow-sm border-sp-blue/20'
                          : 'text-sp-muted hover:text-sp-text hover:bg-sp-hover border-transparent'
                      )}
                    >
                      <tab.icon size={17} />
                      <span className="flex-1 truncate">{tab.label}</span>
                      
                      {/* Optional badges for pending items */}
                      {tab.id === 'reports' && reports.length > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                          {reports.length}
                        </span>
                      )}
                      {tab.id === 'tickets' && tickets.length > 0 && (
                        <span className="bg-purple-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                          {tickets.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Main Content Area */}
          <div className="flex-1 w-full min-w-0">
            <div className="card p-6 min-h-[500px] border border-sp-border shadow-sm">
              {loading ? (
                <div className="flex justify-center items-center h-48">
                  <div className="w-8 h-8 border-4 border-sp-blue/20 border-t-sp-blue rounded-full animate-spin"></div>
                </div>
              ) : (
                <div key={activeTab} className="animate-fade-in transition-all duration-300">
              {/* Reports Tab */}
              {activeTab === 'reports' && (
                <div>
                  <h2 className="text-lg font-bold text-sp-text mb-4">Pending Reports</h2>
                  {reports.length === 0 ? (
                    <div className="text-center py-12 text-sp-muted">
                      <FiCheck size={48} className="mx-auto mb-4 text-sp-blue/50" />
                      <p className="font-semibold text-lg">No pending reports</p>
                      <p className="text-sm">Great job! The platform is clean.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reports.map((report) => (
                        <div key={report._id} className="bg-sp-overlay border border-sp-border rounded-xl p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="uppercase text-[10px] font-bold px-2 py-1 bg-sp-red/10 text-sp-red rounded">
                                  {report.contentType}
                                </span>
                                <span className="text-sm font-semibold text-sp-text">
                                  Reported by {report.reporter?.name || 'Unknown User'}
                                </span>
                                <span className="text-xs text-sp-muted">
                                  {timeAgo(report.createdAt)}
                                </span>
                              </div>
                              <p className="font-bold text-sp-text text-sm mb-1">Reason: {report.reason}</p>
                              {report.description && (
                                <p className="text-sm text-sp-sub mb-3">{report.description}</p>
                              )}
                              <p className="text-xs text-sp-muted">Content ID: {report.contentId}</p>
                            </div>
                            <div className="flex flex-col gap-2 shrink-0 ml-4 w-40">
                              <Button variant="secondary" size="sm" onClick={() => handleReportAction(report._id, 'dismiss_report')}>
                                Dismiss
                              </Button>
                              <Button variant="secondary" size="sm" onClick={() => handleReportAction(report._id, 'warn_user')}>
                                Warn Author
                              </Button>
                              <Button variant="danger" size="sm" onClick={() => handleReportAction(report._id, 'remove_content')}>
                                Remove Content
                              </Button>
                              <Button variant="danger" size="sm" onClick={() => handleReportAction(report._id, 'suspend_user')} className="opacity-80">
                                Suspend Author
                              </Button>
                              <Button variant="danger" size="sm" onClick={() => handleReportAction(report._id, 'ban_user')} className="opacity-80">
                                Ban Author
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Users Tab */}
              {activeTab === 'users' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-sp-text">Manage Users</h2>
                    <form onSubmit={handleSearchUsers} className="flex">
                      <input
                        type="text"
                        placeholder="Search users..."
                        className="input-field rounded-r-none h-10 py-1"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      <button type="submit" className="bg-sp-blue text-white px-4 rounded-r-xl font-semibold hover:bg-sp-blue-dark transition">
                        Search
                      </button>
                    </form>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-sp-border text-sp-muted text-sm uppercase tracking-wider">
                          <th className="pb-3 font-semibold">User</th>
                          <th className="pb-3 font-semibold">Joined</th>
                          <th className="pb-3 font-semibold">Status</th>
                          <th className="pb-3 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(u => (
                          <tr key={u._id} className="border-b border-sp-border/50 hover:bg-sp-hover transition-colors">
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-3">
                                <Avatar src={u.avatar} className="w-10 h-10" />
                                <div>
                                  <p className="font-bold text-sp-text text-sm flex items-center gap-1">
                                    {u.name} 
                                    {u.isAdmin && <FiShield size={12} className="text-sp-blue" title="Admin" />}
                                    {u.verified && <FiCheckCircle size={12} className="text-sp-blue fill-sp-blue/20" title="Verified" />}
                                  </p>
                                  <p className="text-xs text-sp-sub">@{u.username}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 text-sm text-sp-sub">
                              {fullDate(u.createdAt)}
                            </td>
                            <td className="py-3">
                              <span className={clsx(
                                'text-[11px] font-bold px-2 py-1 rounded-full uppercase',
                                u.accountStatus === 'active' ? 'bg-green-500/10 text-green-500' :
                                u.accountStatus === 'suspended' ? 'bg-yellow-500/10 text-yellow-500' :
                                'bg-red-500/10 text-red-500'
                              )}>
                                {u.accountStatus || 'active'}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              {u.accountStatus !== 'active' ? (
                                <button
                                  onClick={() => handleUserAction(u._id, 'active')}
                                  className="text-xs font-bold text-green-500 hover:text-green-400 bg-green-500/10 px-3 py-1.5 rounded-lg transition"
                                >
                                  Reactivate
                                </button>
                              ) : (
                                  <div className="flex justify-end gap-2">
                                    <button
                                      onClick={() => handleToggleVerification(u._id, !u.verified)}
                                      className={clsx(
                                        "text-xs font-bold px-3 py-1.5 rounded-lg transition",
                                        u.verified ? "text-sp-muted hover:text-sp-text bg-sp-hover" : "text-sp-blue hover:text-sp-blue-dark bg-sp-blue/10"
                                      )}
                                    >
                                      {u.verified ? 'Unverify' : 'Verify'}
                                    </button>
                                    {(u._id !== user?.id && u._id !== user?._id && u.id !== user?.id && u.id !== user?._id) && (
                                      <button
                                        onClick={() => handleToggleAdmin(u._id, !u.isAdmin)}
                                        className={clsx(
                                          "text-xs font-bold px-3 py-1.5 rounded-lg transition",
                                          u.isAdmin ? "text-red-500 hover:text-red-650 bg-red-500/10" : "text-sp-blue hover:text-sp-blue-dark bg-sp-blue/10"
                                        )}
                                      >
                                        {u.isAdmin ? 'Demote Admin' : 'Promote Admin'}
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleUserAction(u._id, 'suspended')}
                                      className="text-xs font-bold text-yellow-500 hover:text-yellow-400 bg-yellow-500/10 px-3 py-1.5 rounded-lg transition"
                                    >
                                      Suspend
                                    </button>
                                    <button
                                      onClick={() => handleUserAction(u._id, 'banned')}
                                      className="text-xs font-bold text-red-500 hover:text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg transition"
                                    >
                                      Ban
                                    </button>
                                  </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tickets Tab */}
              {activeTab === 'tickets' && (
                <div>
                  <h2 className="text-lg font-bold text-sp-text mb-4">Open Support Tickets</h2>
                  {tickets.length === 0 ? (
                    <div className="text-center py-12 text-sp-muted">
                      <FiCheck size={48} className="mx-auto mb-4 text-sp-blue/50" />
                      <p className="font-semibold text-lg">Inbox zero</p>
                      <p className="text-sm">No open support tickets.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {tickets.map((ticket) => (
                        <div key={ticket._id} className="bg-sp-overlay border border-sp-border rounded-xl p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className={clsx("uppercase text-[10px] font-bold px-2 py-1 rounded", ticket.type === 'feedback' ? "bg-sp-blue/10 text-sp-blue" : "bg-purple-500/10 text-purple-500")}>
                                  {ticket.type}
                                </span>
                                <span className="text-sm font-semibold text-sp-text">
                                  From {ticket.user?.name || 'Unknown User'}
                                </span>
                                <span className="text-xs text-sp-muted">
                                  {timeAgo(ticket.createdAt)}
                                </span>
                              </div>
                              {ticket.subject && <p className="font-bold text-sp-text text-sm mb-1">{ticket.subject}</p>}
                              <p className="text-sm text-sp-sub mb-3 whitespace-pre-wrap">{ticket.message}</p>
                              <p className="text-xs text-sp-muted">Ticket ID: {ticket._id}</p>
                            </div>
                            <div className="flex flex-col gap-2 shrink-0 ml-4 w-32">
                              <Button variant="secondary" size="sm" onClick={() => handleTicketAction(ticket._id, 'resolved')}>
                                Mark Resolved
                              </Button>
                              <Button variant="primary" size="sm" onClick={() => handleGenerateAIReply(ticket)}>
                                AI Auto Reply
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => window.location.href = `mailto:${ticket.user?.email}?subject=Re: ${ticket.subject || 'Your Support Ticket'}`}>
                                Email Reply
                              </Button>
                            </div>
                          </div>
                          {replyingTicket && (replyingTicket._id === ticket._id || replyingTicket.id === ticket._id) && (
                            <div className="mt-4 pt-4 border-t border-sp-border">
                              <p className="text-xs font-bold text-sp-muted mb-2 uppercase">AI Suggested Draft (Editable)</p>
                              {generatingAI ? (
                                <div className="text-xs text-sp-muted py-2 animate-pulse">Generating AI suggestion...</div>
                              ) : (
                                <div>
                                  <textarea
                                    className="w-full bg-sp-card border border-sp-border rounded-lg p-2 text-sm text-sp-text focus:outline-none focus:border-sp-blue h-32 resize-y"
                                    value={aiDraft}
                                    onChange={(e) => setAiDraft(e.target.value)}
                                    placeholder="AI reply suggestion will load here. You can edit it before sending."
                                  />
                                  <div className="flex gap-2 justify-end mt-2">
                                    <Button variant="secondary" size="sm" onClick={() => { setReplyingTicket(null); setAiDraft(''); }}>
                                      Cancel
                                    </Button>
                                    <Button variant="primary" size="sm" onClick={handleSendAIReply} disabled={sendingReply || !aiDraft.trim()}>
                                      {sendingReply ? 'Sending...' : 'Approve & Send Email'}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Broadcast Tab */}
              {activeTab === 'broadcast' && (
                <div className="space-y-8 text-left">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Left: Compose Form */}
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-xl font-bold text-sp-text">Broadcast Announcement</h2>
                        <p className="text-xs text-sp-sub mt-1">
                          Send a notification to all registered users immediately, or schedule it for a future date/time.
                        </p>
                      </div>

                      <form onSubmit={isScheduling ? handleScheduleAnnouncement : handleSendBroadcast} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-sp-muted uppercase mb-2">Delivery Type</label>
                          <div className="flex gap-2 p-1 bg-sp-overlay border border-sp-border rounded-xl">
                            <button
                              type="button"
                              onClick={() => setIsScheduling(false)}
                              className={clsx(
                                "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                                !isScheduling ? "bg-sp-card text-sp-blue shadow-sm border border-sp-border text-sp-text" : "text-sp-muted hover:text-sp-text"
                              )}
                            >
                              Send Immediately
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsScheduling(true)}
                              className={clsx(
                                "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                                isScheduling ? "bg-sp-card text-sp-blue shadow-sm border border-sp-border text-sp-text" : "text-sp-muted hover:text-sp-text"
                              )}
                            >
                              Schedule for Later
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-sp-muted uppercase mb-2">Announcement Message</label>
                          <textarea
                            value={broadcastMessage}
                            onChange={(e) => setBroadcastMessage(e.target.value)}
                            className="w-full bg-sp-overlay border border-sp-border rounded-xl p-3 text-sm text-sp-text focus:outline-none focus:border-sp-blue h-36 resize-y"
                            placeholder="Write your announcement here..."
                            required
                          />
                        </div>

                        {isScheduling && (
                          <div className="animate-fade-down">
                            <label className="block text-xs font-bold text-sp-muted uppercase mb-2">Target Date & Time</label>
                            <input
                              type="datetime-local"
                              required
                              value={scheduledTime}
                              onChange={(e) => setScheduledTime(e.target.value)}
                              className="w-full bg-sp-overlay border border-sp-border rounded-xl p-3 text-sm text-sp-text focus:outline-none focus:border-sp-blue"
                            />
                          </div>
                        )}

                        <div className="flex justify-end">
                          <Button type="submit" variant="primary" disabled={sendingBroadcast || !broadcastMessage.trim()}>
                            {isScheduling
                              ? 'Schedule Announcement'
                              : sendingBroadcast ? 'Sending Broadcast...' : 'Broadcast to All Users'}
                          </Button>
                        </div>
                      </form>
                    </div>

                    {/* Right: Scheduled Queue */}
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-xl font-bold text-sp-text flex items-center gap-2">
                          <FiClock className="text-sp-blue" />
                          Scheduled Queue
                        </h2>
                        <p className="text-xs text-sp-sub mt-1">
                          Announcements scheduled to fire in the future.
                        </p>
                      </div>

                      <div className="bg-sp-overlay border border-sp-border rounded-2xl p-4 min-h-[250px] flex flex-col justify-between">
                        {scheduledAnnouncements.length === 0 ? (
                          <div className="text-center py-12 text-sp-muted my-auto">
                            <FiClock size={36} className="mx-auto text-sp-faint mb-2" />
                            <p className="font-bold text-sm">Queue is empty</p>
                            <p className="text-xs text-sp-muted mt-0.5">No upcoming broadcasts scheduled.</p>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                            {scheduledAnnouncements.map((s) => (
                              <div key={s._id || s.id} className="bg-sp-card border border-sp-border rounded-xl p-4 space-y-2">
                                <p className="text-xs font-bold text-sp-blue">
                                  Scheduled for: {new Date(s.scheduledFor).toLocaleString()}
                                </p>
                                <p className="text-sm text-sp-sub leading-relaxed whitespace-pre-wrap">{s.message}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Feedback Tab */}
              {activeTab === 'feedback' && (
                <div className="space-y-6 text-left">
                  <div className="flex justify-between items-center border-b border-sp-divider pb-4">
                    <div>
                      <h2 className="text-xl font-bold text-sp-text">User Feedback & AI Insights</h2>
                      <p className="text-xs text-sp-sub mt-1">Review feedback and see automated sentiment analysis and priority themes.</p>
                    </div>
                    <Button
                      variant="primary"
                      onClick={handleGenerateInsights}
                      disabled={generatingInsights}
                    >
                      {generatingInsights ? 'Analyzing...' : 'Generate Insights'}
                    </Button>
                  </div>

                  {/* AI Insights Section */}
                  {insights ? (
                    <div className="bg-sp-overlay border border-sp-border rounded-2xl p-5 space-y-4 shadow-sm animate-fade-up">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-sp-muted uppercase tracking-wider">Overall Sentiment:</span>
                          <span className={clsx(
                            'text-xs font-black px-2.5 py-1 rounded-full uppercase border',
                            insights.sentiment === 'Positive' && 'bg-green-500/10 text-green-500 border-green-500/20',
                            insights.sentiment === 'Negative' && 'bg-red-500/10 text-red-500 border-red-500/20',
                            insights.sentiment === 'Mixed' && 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                          )}>
                            {insights.sentiment}
                          </span>
                        </div>
                        {lastGenerated && (
                          <span className="text-[11px] text-sp-muted">
                            Last Generated: {timeAgo(lastGenerated)}
                          </span>
                        )}
                      </div>

                      <div className="space-y-3 mt-2">
                        <h3 className="text-sm font-bold text-sp-text uppercase tracking-wider text-sp-muted">Categorized Feedback Themes</h3>
                        
                        <div className="grid gap-3">
                          {insights.themes?.map((t, idx) => (
                            <div key={idx} className={clsx(
                              'border p-4 rounded-xl flex flex-col gap-2 relative overflow-hidden transition-all',
                              t.highPriority
                                ? 'bg-red-500/5 border-red-500/30'
                                : 'bg-sp-card border-sp-border'
                            )}>
                              {t.highPriority && (
                                <span className="absolute top-3 right-3 text-[10px] font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                  High Priority
                                </span>
                              )}
                              <div className="flex items-center gap-2.5">
                                <span className="font-bold text-sp-text text-sm sm:text-base">{t.themeName}</span>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sp-overlay border border-sp-border text-sp-blue">
                                  {t.count} {t.count === 1 ? 'mention' : 'mentions'}
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm text-sp-sub leading-relaxed">{t.summary}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-sp-border rounded-2xl p-8 text-center bg-sp-card/30">
                      <FiBarChart2 size={36} className="mx-auto text-sp-faint mb-3" />
                      <p className="font-bold text-sp-text text-sm">No insights generated yet</p>
                      <p className="text-xs text-sp-muted mt-1 max-w-sm mx-auto">Click "Generate Insights" above to scan the last 30 days of user feedback submissions using AI.</p>
                    </div>
                  )}

                  {/* Raw Feedback List */}
                  <div>
                    <h3 className="text-base font-bold text-sp-text mb-4">Raw Feedback Submissions</h3>
                    {feedbackList.length === 0 ? (
                      <div className="text-center py-10 text-sp-muted border border-sp-border rounded-xl">
                        <p className="text-sm">No feedback submissions found.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {feedbackList.map((f) => (
                          <div key={f._id || f.id} className="bg-sp-card border border-sp-border rounded-xl p-4 flex items-start gap-3">
                            <Avatar src={f.user?.avatar} alt={f.user?.name} size="sm" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-sp-text truncate">{f.user?.name || 'Anonymous'}</p>
                                <span className="text-xs text-sp-muted flex-shrink-0">{timeAgo(f.createdAt)}</span>
                              </div>
                              <p className="text-[10px] text-sp-muted mt-0.5">@{f.user?.username || 'user'}</p>
                              <p className="text-sm text-sp-sub mt-2 leading-relaxed whitespace-pre-wrap bg-sp-overlay p-3 rounded-lg border border-sp-border/50 text-left">
                                {f.message}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Email Campaign Tab */}
              {activeTab === 'email' && (
                <div className="space-y-6 text-left animate-fade-in">
                  <div>
                    <h2 className="text-xl font-bold text-sp-text">Bulk Email Campaigns</h2>
                    <p className="text-xs text-sp-sub mt-1">
                      Compose and transmit bulk marketing/notification emails to users via Brevo. Unsubscribe links are automatically appended.
                    </p>
                  </div>

                  <form onSubmit={handleSendEmailCampaign} className="space-y-5 bg-sp-overlay border border-sp-border rounded-2xl p-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Subject */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-sp-muted uppercase tracking-wider">Email Subject</label>
                        <input
                          type="text"
                          required
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          className="w-full bg-sp-card border border-sp-border rounded-xl p-3 text-sm text-sp-text focus:outline-none focus:border-sp-blue"
                          placeholder="e.g. Weekly Spheral Highlights"
                        />
                      </div>

                      {/* Recipient Filter */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-sp-muted uppercase tracking-wider">Target Audience Filter</label>
                        <select
                          value={emailFilter}
                          onChange={(e) => setEmailFilter(e.target.value)}
                          className="w-full bg-sp-card border border-sp-border rounded-xl p-3 text-sm text-sp-text focus:outline-none focus:border-sp-blue"
                        >
                          <option value="all">All Active Registered Users</option>
                          <option value="inactive">Inactive Users (Inactive for 30+ days)</option>
                          <option value="verified">Verified Users Only</option>
                        </select>
                        <p className="text-[10px] text-sp-muted leading-tight">
                          Note: Users who have explicitly opted-out or unsubscribed from marketing campaigns will be automatically skipped to ensure legal compliance.
                        </p>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-sp-muted uppercase tracking-wider">Email Content (HTML Supported)</label>
                      <textarea
                        required
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        className="w-full bg-sp-card border border-sp-border rounded-xl p-4 text-sm text-sp-text focus:outline-none focus:border-sp-blue h-64 resize-y"
                        placeholder="Write your email body here... HTML markup like <p>, <strong>, and <a> is fully supported."
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={sendingEmail || !emailSubject.trim() || !emailBody.trim()}
                      >
                        {sendingEmail ? 'Dispatching Campaign...' : 'Send Bulk Campaign'}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Stats Tab */}
              {activeTab === 'stats' && stats && (
                <div className="space-y-6 text-left">
                  <div>
                    <h2 className="text-xl font-bold text-sp-text">Platform Metrics & Engagement</h2>
                    <p className="text-xs text-sp-sub mt-1">Real-time statistics and historical user behavior analysis.</p>
                  </div>

                  {/* System Health Monitor */}
                  {systemHealth && (
                    <div className="bg-sp-overlay border border-sp-border rounded-xl p-5 space-y-3">
                      <h3 className="text-sm font-bold text-sp-text uppercase tracking-wider text-sp-muted">System Health & Diagnostics</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Database Connection */}
                        <div className="bg-sp-card border border-sp-border rounded-xl p-4 flex items-center gap-3">
                          <div className={clsx(
                            'w-3 h-3 rounded-full animate-pulse',
                            systemHealth.database === 'up' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                          )} />
                          <div>
                            <p className="text-[10px] font-bold text-sp-muted uppercase tracking-wider">Database Status</p>
                            <p className="text-sm font-bold text-sp-text mt-0.5">{systemHealth.database === 'up' ? 'Online' : 'Offline'}</p>
                          </div>
                        </div>

                        {/* Process Uptime */}
                        <div className="bg-sp-card border border-sp-border rounded-xl p-4 flex items-center gap-3">
                          <FiClock size={18} className="text-sp-blue" />
                          <div>
                            <p className="text-[10px] font-bold text-sp-muted uppercase tracking-wider">Server Uptime</p>
                            <p className="text-sm font-bold text-sp-text mt-0.5">
                              {Math.floor(systemHealth.uptime / 3600)}h {Math.floor((systemHealth.uptime % 3600) / 60)}m
                            </p>
                          </div>
                        </div>

                        {/* 500 Error rate in 24h */}
                        <div className="bg-sp-card border border-sp-border rounded-xl p-4 flex items-center gap-3">
                          <FiShield size={18} className={clsx(systemHealth.errorCount24h > 0 ? 'text-yellow-500' : 'text-green-500')} />
                          <div>
                            <p className="text-[10px] font-bold text-sp-muted uppercase tracking-wider">500 Errors (24h)</p>
                            <p className="text-sm font-bold text-sp-text mt-0.5">{systemHealth.errorCount24h} logged</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Core Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { label: 'Total Users', value: stats.totalUsers },
                      { label: 'Total Posts', value: stats.totalPosts },
                      { label: 'Total Reels', value: stats.totalReels },
                      { label: 'Signups (Last 7d)', value: stats.signups7Days },
                      { label: 'Signups (Last 30d)', value: stats.signups30Days },
                      { label: 'Active Users (24h)', value: stats.activeUsers24h },
                    ].map((stat, i) => (
                      <div key={i} className="bg-sp-overlay border border-sp-border rounded-xl p-4 flex flex-col justify-center items-center text-center">
                        <p className="text-sp-muted text-[10px] font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                        <p className="text-2xl font-black text-sp-text">{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  {engagement && (
                    <>
                      {/* Active & Retention Panel */}
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* DAU / MAU Ratio */}
                        <div className="bg-sp-overlay border border-sp-border rounded-xl p-5 flex flex-col justify-between">
                          <div>
                            <h3 className="text-sm font-bold text-sp-text uppercase tracking-wider text-sp-muted">User Activity Ratio (Stickiness)</h3>
                            <p className="text-xs text-sp-sub mt-1">Percentage of monthly active users who return daily.</p>
                          </div>
                          <div className="flex items-center gap-6 mt-4">
                            <div className="text-center">
                              <p className="text-3xl font-black text-sp-blue">
                                {engagement.mau > 0 ? Math.round((engagement.dau / engagement.mau) * 100) : 0}%
                              </p>
                              <p className="text-[10px] font-bold text-sp-muted uppercase mt-0.5">DAU / MAU</p>
                            </div>
                            <div className="flex-1 text-xs text-sp-sub space-y-1">
                              <div className="flex justify-between"><span>Daily Active Users (DAU):</span> <span className="font-bold text-sp-text">{engagement.dau}</span></div>
                              <div className="flex justify-between"><span>Monthly Active Users (MAU):</span> <span className="font-bold text-sp-text">{engagement.mau}</span></div>
                            </div>
                          </div>
                        </div>

                        {/* Retention Rate */}
                        <div className="bg-sp-overlay border border-sp-border rounded-xl p-5 flex flex-col justify-between">
                          <div>
                            <h3 className="text-sm font-bold text-sp-text uppercase tracking-wider text-sp-muted">Day-7 Retention</h3>
                            <p className="text-xs text-sp-sub mt-1">Percentage of users who return exactly 7 days after signup.</p>
                          </div>
                          <div className="flex items-center gap-6 mt-4">
                            <div className="text-center">
                              <p className="text-3xl font-black text-purple-500">
                                {engagement.retention?.rate || 0}%
                              </p>
                              <p className="text-[10px] font-bold text-sp-muted uppercase mt-0.5">Retention</p>
                            </div>
                            <div className="flex-1 text-xs text-sp-sub space-y-1">
                              <div className="flex justify-between"><span>Cohort Size:</span> <span className="font-bold text-sp-text">{engagement.retention?.cohortTotal || 0}</span></div>
                              <div className="flex justify-between"><span>Active Since:</span> <span className="font-bold text-sp-text">{engagement.retention?.cohortActive || 0}</span></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Charts Grid */}
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* New Signups Chart */}
                        <div className="bg-sp-card border border-sp-border rounded-xl p-5 space-y-3">
                          <h3 className="text-sm font-bold text-sp-text uppercase tracking-wider text-sp-muted text-left">New Signups (Last 30 Days)</h3>
                          <SVGLineChart data={engagement.signupsOverTime} />
                        </div>

                        {/* Peak Usage Hours */}
                        <div className="bg-sp-card border border-sp-border rounded-xl p-5 space-y-3">
                          <h3 className="text-sm font-bold text-sp-text uppercase tracking-wider text-sp-muted text-left">Peak Activity Hours</h3>
                          <SVGBarChart data={engagement.hourlyActivity} />
                        </div>
                      </div>

                      {/* Feature Usage Breakdown */}
                      <div className="bg-sp-overlay border border-sp-border rounded-xl p-5">
                        <h3 className="text-sm font-bold text-sp-text uppercase tracking-wider text-sp-muted mb-4 text-left">Feature Usage Breakdown (Last 30d)</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          {[
                            { label: 'Messages Sent', count: engagement.featureUsage?.messages || 0 },
                            { label: 'Posts Created', count: engagement.featureUsage?.posts || 0 },
                            { label: 'Reels Created', count: engagement.featureUsage?.reels || 0 },
                            { label: 'Stories Posted', count: engagement.featureUsage?.stories || 0 },
                            { label: 'Live Started', count: engagement.featureUsage?.liveStreams || 0 },
                          ].map((item, idx) => (
                            <div key={idx} className="bg-sp-card border border-sp-border rounded-xl p-3 text-center">
                              <p className="text-[10px] font-bold text-sp-muted uppercase truncate">{item.label}</p>
                              <p className="text-xl font-bold text-sp-text mt-1">{item.count}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Geographic Insights */}
                      {geoInsights && geoInsights.length > 0 && (
                        <div className="bg-sp-card border border-sp-border rounded-xl p-5 space-y-3">
                          <h3 className="text-sm font-bold text-sp-text uppercase tracking-wider text-sp-muted text-left">Geographic Signup Source Insights</h3>
                          <p className="text-xs text-sp-sub mt-1 text-left">Top registration locations determined via IP address lookup.</p>
                          <div className="grid gap-4 mt-4">
                            {geoInsights.slice(0, 5).map((g, idx) => {
                              const totalCount = geoInsights.reduce((sum, item) => sum + item.count, 0);
                              const percentage = totalCount > 0 ? Math.round((g.count / totalCount) * 100) : 0;
                              return (
                                <div key={idx} className="space-y-1">
                                  <div className="flex justify-between items-center text-xs font-semibold">
                                    <span className="text-sp-text flex items-center gap-2">
                                      <FiGlobe size={14} className="text-sp-blue animate-spin-slow" />
                                      {g.country}
                                    </span>
                                    <span className="text-sp-sub">{g.count} {g.count === 1 ? 'user' : 'users'} ({percentage}%)</span>
                                  </div>
                                  <div className="w-full bg-sp-overlay h-2 rounded-full overflow-hidden border border-sp-border/50">
                                    <div
                                      className="bg-sp-blue h-full rounded-full"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* System Settings Tab */}
              {activeTab === 'settings' && (
                <div className="space-y-6 text-left animate-fade-in">
                  <div>
                    <h2 className="text-xl font-bold text-sp-text">System Controls</h2>
                    <p className="text-xs text-sp-sub mt-1">Configure global application settings and access control.</p>
                  </div>

                  <div className="bg-sp-overlay border border-sp-border rounded-2xl p-6 space-y-6">
                    
                    {/* Maintenance Mode */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-sp-text flex items-center gap-2">
                          <FiAlertTriangle className="text-yellow-500" />
                          Maintenance Mode
                        </h3>
                        <p className="text-xs text-sp-sub mt-1">Disable general access to the site (Admins can still login).</p>
                      </div>
                      <button 
                        onClick={() => handleToggleSetting('maintenanceMode')}
                        className={clsx("text-3xl transition-colors", systemSettings.maintenanceMode ? "text-sp-blue" : "text-sp-muted")}
                      >
                        {systemSettings.maintenanceMode ? <FiToggleRight /> : <FiToggleLeft />}
                      </button>
                    </div>

                    <div className="h-px w-full bg-sp-border/50" />

                    {/* Allow Registrations */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-sp-text flex items-center gap-2">
                          <FiUsers className="text-sp-blue" />
                          Allow New Registrations
                        </h3>
                        <p className="text-xs text-sp-sub mt-1">Enable or disable new users from creating accounts.</p>
                      </div>
                      <button 
                        onClick={() => handleToggleSetting('allowRegistrations')}
                        className={clsx("text-3xl transition-colors", systemSettings.allowRegistrations ? "text-sp-blue" : "text-sp-muted")}
                      >
                        {systemSettings.allowRegistrations ? <FiToggleRight /> : <FiToggleLeft />}
                      </button>
                    </div>

                    <div className="h-px w-full bg-sp-border/50" />

                    {/* Require Email Verification */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-sp-text flex items-center gap-2">
                          <FiShield className="text-sp-blue" />
                          Require Email Verification
                        </h3>
                        <p className="text-xs text-sp-sub mt-1">Force users to verify their email address before logging in.</p>
                      </div>
                      <button 
                        onClick={() => handleToggleSetting('requireEmailVerification')}
                        className={clsx("text-3xl transition-colors", systemSettings.requireEmailVerification ? "text-sp-blue" : "text-sp-muted")}
                      >
                        {systemSettings.requireEmailVerification ? <FiToggleRight /> : <FiToggleLeft />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
