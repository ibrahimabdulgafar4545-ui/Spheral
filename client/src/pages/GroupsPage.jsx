import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiPlus, FiGlobe, FiLock, FiSearch, FiGrid, FiList } from 'react-icons/fi';
import { HiOutlineUserGroup } from 'react-icons/hi';
import MainLayout from '../components/layout/MainLayout';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useApp } from '../context/AppContext';
import { groupsAPI } from '../api/groups';
import { formatCount, getAssetUrl } from '../utils/helpers';
import Button from '../components/ui/Button';
import { useLanguage } from '../context/LanguageContext';

const CATEGORIES = ['All', 'Technology', 'Design', 'Business', 'Photography', 'Food & Drink', 'Music'];

export default function GroupsPage() {
  const { t } = useLanguage();
  const { groups, toggleGroupJoin, loadGroups, showToast } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeCat, setActiveCat] = useState('All');
  const [searchVal, setSearchVal] = useState('');
  const [localGroups, setLocalGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setShowCreate(true);
      // Clean up search param so it doesn't reopen on refresh
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('create');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Group Create Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Technology');
  const [privacy, setPrivacy] = useState('public');
  const [creating, setCreating] = useState(false);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const cat = activeCat === 'All' ? '' : activeCat;
      const res = await groupsAPI.list(searchVal, cat);
      if (res.success) {
        setLocalGroups(res.groups);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [activeCat, searchVal]);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setCreating(true);
      const res = await groupsAPI.create({
        name,
        description,
        category,
        privacy,
      });
      if (res.success) {
        setShowCreate(false);
        setName('');
        setDescription('');
        loadGroups(); // Refresh context groups
        fetchGroups(); // Refresh local list
        showToast('success', 'Group created successfully!');
      }
    } catch (err) {
      console.error(err);
      showToast('error', err.response?.data?.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  return (
    <MainLayout hideRight>
      <div className="max-w-[950px] mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-sp-text flex items-center gap-2">
              <HiOutlineUserGroup className="text-sp-blue" />
              {t('groups.title')}
            </h1>
            <p className="text-sm text-sp-sub mt-1">Discover communities and join discussions</p>
          </div>
          <Button
            onClick={() => setShowCreate(true)}
            variant="primary"
            size="md"
            icon={<FiPlus size={16} />}
            className="self-start sm:self-auto"
          >
            {t('groups.createGroup')}
          </Button>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sp-muted" size={16} />
            <input
              type="text"
              placeholder={t('groups.title')}
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="input pl-10 text-sm"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scroll py-0.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap
                  ${activeCat === c
                    ? 'bg-sp-blue text-white shadow-glow-sm'
                    : 'bg-sp-card border border-sp-border text-sp-sub hover:text-sp-text hover:bg-sp-hover'
                  }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Group Grid list */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div>
            {localGroups.length === 0 ? (
              <div className="card p-16 text-center text-sp-muted">
                <HiOutlineUserGroup className="w-12 h-12 mx-auto mb-3 opacity-30 text-sp-blue" />
                <p className="font-semibold text-sp-text">{t('groups.noGroups')}</p>
                <p className="text-sm mt-1">{t('groups.noGroupsSubtext')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {localGroups.map((g) => (
                  <div key={g.id || g._id} className="card overflow-hidden flex flex-col group animate-fade-up">
                    <div className="relative h-32 bg-gradient-to-r from-sp-blue/20 to-purple-500/20 overflow-hidden">
                       {g.cover ? (
                         <img src={getAssetUrl(g.cover)} alt="" className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-sp-muted">
                           <HiOutlineUserGroup size={32} className="opacity-40" />
                         </div>
                       )}
                     </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-sp-muted">
                          {g.privacy === 'public' ? <FiGlobe size={12} /> : <FiLock size={12} />}
                          <span>{g.privacy === 'public' ? t('groups.public') : t('groups.private')}</span>
                          <span>·</span>
                          <span>{g.category}</span>
                        </div>
                        <Link to={`/groups/${g.id || g._id}`} className="font-bold text-sp-text hover:text-sp-blue transition-colors block mt-2 text-base leading-snug">
                          {g.name}
                        </Link>
                        <p className="text-xs text-sp-sub mt-1.5 clamp-2 leading-relaxed">{g.description}</p>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-sp-divider">
                        <span className="text-xs text-sp-muted font-semibold">{formatCount(g.memberCount)} {t('groups.members')}</span>
                        <Button
                          onClick={async () => {
                            await toggleGroupJoin(g.id || g._id);
                            fetchGroups(); // refresh list
                          }}
                          size="sm"
                          variant={g.isJoined ? 'secondary' : 'primary'}
                          className={g.isJoined ? 'text-sp-muted font-bold' : 'font-bold'}
                        >
                          {g.isJoined ? t('groups.joined') : t('groups.joinGroup')}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Create Group Modal ───────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="card-elevated w-full max-w-lg overflow-hidden animate-scale-in">
            <div className="px-5 py-4 border-b border-sp-divider flex items-center justify-between">
              <h2 className="font-bold text-lg text-sp-text">{t('groups.createGroup')}</h2>
              <button onClick={() => setShowCreate(false)} className="nav-btn w-8 h-8">×</button>
            </div>
            <form onSubmit={handleCreateGroup} className="p-5 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider">{t('groups.groupName')}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SF Rust Developers"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider">{t('groups.category')}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input [color-scheme:dark]"
                >
                  {CATEGORIES.slice(1).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider">{t('groups.privacy')}</label>
                <div className="flex gap-2">
                  {[
                    { val: 'public', label: 'Public', desc: 'Anyone can find and join' },
                    { val: 'private', label: 'Private', desc: 'Only approved users can join' }
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setPrivacy(p.val)}
                      className={`flex-1 p-3 rounded-xl border text-left transition-all
                        ${privacy === p.val
                          ? 'border-sp-blue bg-sp-blue/5 text-sp-blue'
                          : 'border-sp-border bg-sp-overlay text-sp-sub hover:bg-sp-hover'}`}
                    >
                      <p className="font-bold text-sm text-sp-text capitalize">{p.label}</p>
                      <p className="text-[11px] text-sp-muted mt-0.5">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider">{t('groups.description')}</label>
                <textarea
                  placeholder="What is this community about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="input resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  loading={creating}
                  variant="primary"
                  className="flex-1"
                >
                  {t('groups.createGroup')}
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  variant="secondary"
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
