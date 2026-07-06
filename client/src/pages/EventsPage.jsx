import { useState, useEffect } from 'react';
import { FiCalendar, FiMapPin, FiUsers, FiClock, FiPlus, FiX } from 'react-icons/fi';
import { useSearchParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { eventsAPI } from '../api/events';
import { useApp } from '../context/AppContext';

export default function EventsPage() {
  const { showToast } = useApp();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  // Fetch events from database on mount
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await eventsAPI.getEvents();
      if (res.success) {
        setEvents(res.events || []);
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setShowCreate(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('create');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const toggleRsvp = async (id) => {
    try {
      const res = await eventsAPI.rsvpEvent(id);
      if (res.success) {
        setEvents((evs) =>
          evs.map((e) =>
            e.id === id
              ? { ...e, rsvped: res.rsvped, membersCount: res.membersCount }
              : e
          )
        );
        showToast('success', res.rsvped ? 'You are going to this event!' : 'RSVP cancelled');
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to RSVP');
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const res = await eventsAPI.createEvent({
        title,
        description,
        location,
        date,
        time
      });
      if (res.success) {
        setEvents((prev) => [res.event, ...prev]);
        setShowCreate(false);
        setTitle('');
        setDescription('');
        setLocation('');
        setDate('');
        setTime('');
        showToast('success', 'Event published successfully!');
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to create event');
    }
  };

  return (
    <MainLayout hideRight>
      <div className="max-w-[850px] mx-auto w-full px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-sp-text flex items-center gap-2.5">
              <FiCalendar className="text-sp-blue" />
              Events
            </h1>
            <p className="text-sm text-sp-sub mt-1">Discover local meetups, conferences, and gatherings</p>
          </div>
          <button 
            onClick={() => setShowCreate(true)} 
            className="px-6 py-3 bg-sp-blue hover:bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-sm shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer w-full sm:w-auto"
          >
            <FiPlus size={18} /> Create Event
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sp-blue" />
          </div>
        ) : events.length === 0 ? (
          <div className="card p-10 text-center text-sp-muted flex flex-col items-center justify-center">
            <FiCalendar size={48} className="opacity-30 mb-3" />
            <p className="text-sm">No events found. Be the first to host one!</p>
            <button 
              onClick={() => setShowCreate(true)} 
              className="mt-4 px-5 py-2.5 bg-sp-blue hover:bg-blue-600 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Host Event
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {events.map((e) => (
              <div key={e.id} className="card overflow-hidden flex flex-col group animate-fade-up border border-sp-border/50 shadow-sm hover:border-sp-border transition-colors">
                <div className="relative h-48 overflow-hidden">
                  <img src={e.image} alt="" className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h2 className="font-bold text-lg text-sp-text hover:text-sp-blue transition-colors leading-snug">{e.title}</h2>
                    <p className="text-xs text-sp-muted mt-2 flex items-center gap-1.5"><FiClock size={13} className="text-sp-blue" /> {e.date} · {e.time}</p>
                    <p className="text-xs text-sp-muted mt-1.5 flex items-center gap-1.5"><FiMapPin size={13} className="text-sp-blue" /> {e.location}</p>
                    <p className="text-sm text-sp-sub mt-4 leading-relaxed line-clamp-3">{e.description}</p>
                  </div>
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-sp-divider">
                    <span className="text-xs text-sp-muted flex items-center gap-1.5"><FiUsers size={13} /> {e.membersCount} going</span>
                    <button
                      onClick={() => toggleRsvp(e.id)}
                      className={`px-5 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                        e.rsvped 
                          ? 'bg-sp-overlay text-sp-text border border-sp-border hover:bg-sp-hover' 
                          : 'bg-sp-blue hover:bg-blue-600 text-white shadow-sm'
                      }`}
                    >
                      {e.rsvped ? 'Going ✓' : 'RSVP'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="card-elevated w-full max-w-md animate-scale-in">
            <div className="px-5 py-4 border-b border-sp-divider flex items-center justify-between">
              <h2 className="font-bold text-lg text-sp-text">Create Event</h2>
              <button onClick={() => setShowCreate(false)} className="nav-btn w-9 h-9 flex items-center justify-center text-xl">×</button>
            </div>
            <form onSubmit={handleCreateEvent} className="p-5 space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider">Event Title</label>
                <input type="text" required placeholder="Event name" value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider">Date</label>
                  <input type="text" required placeholder="e.g. July 25, 2026" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider">Time</label>
                  <input type="text" required placeholder="e.g. 2:00 PM" value={time} onChange={(e) => setTime(e.target.value)} className="input" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider">Location</label>
                <input type="text" required placeholder="e.g. Dolores Park" value={location} onChange={(e) => setLocation(e.target.value)} className="input" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider">Description</label>
                <textarea rows={3} placeholder="Event description" value={description} onChange={(e) => setDescription(e.target.value)} className="input resize-none" />
              </div>
              <button 
                type="submit" 
                className="w-full py-3 mt-4 bg-sp-blue hover:bg-blue-600 text-white rounded-xl font-bold text-sm shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                Publish Event
              </button>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
