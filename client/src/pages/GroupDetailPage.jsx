import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiUsers, FiPlus, FiLock, FiGlobe,
  FiSettings, FiCheck, FiImage, FiEdit3
} from 'react-icons/fi';
import { HiOutlineUserGroup } from 'react-icons/hi';
import Avatar from '../components/ui/Avatar';
import UserDisplay from '../components/ui/UserDisplay';
import MainLayout from '../components/layout/MainLayout';
import Post from '../components/feed/Post';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useApp } from '../context/AppContext';
import { groupsAPI } from '../api/groups';
import { formatCount, getAssetUrl } from '../utils/helpers';
import { useLanguage } from '../context/LanguageContext';
import TextInputWithEmoji from '../components/ui/TextInputWithEmoji';

export default function GroupDetailPage() {
  const { t } = useLanguage();
  const { groupId } = useParams();
  const { toggleGroupJoin, user, showToast } = useApp();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [postText, setPostText] = useState('');
  const [posting, setPosting] = useState(false);

  // Group Edit form state
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPrivacy, setEditPrivacy] = useState('');
  const [editCover, setEditCover] = useState('');
  const [updating, setUpdating] = useState(false);

  const currentUserId = user?.id || user?._id;
  const isAdmin = group?.admins?.some(a => (a._id || a.id) === currentUserId);

  const CATEGORIES = ['Technology', 'Design', 'Business', 'Photography', 'Food & Drink', 'Music'];

  const loadGroupDetail = async () => {
    try {
      setLoading(true);
      const res = await groupsAPI.getDetail(groupId);
      if (res.success) {
        setGroup(res.group);

        // Get group posts
        const postRes = await groupsAPI.getPosts(groupId);
        if (postRes.success) {
          setPosts(postRes.posts.map(p => ({ ...p, id: p._id })));
        }
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroupDetail();
  }, [groupId]);

  useEffect(() => {
    if (group) {
      setEditName(group.name || '');
      setEditDesc(group.description || '');
      setEditCategory(group.category || 'Technology');
      setEditPrivacy(group.privacy || 'public');
      setEditCover(group.cover || '');
    }
  }, [group]);

  const handleDeleteGroup = async () => {
    if (window.confirm('Are you sure you want to delete this group? All posts in this group will be deleted.')) {
      try {
        const res = await groupsAPI.delete(group.id || group._id);
        if (res.success) {
          showToast('success', 'Group deleted successfully');
          navigate('/groups');
        }
      } catch (err) {
        showToast('error', err.message);
      }
    }
  };

  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;

    try {
      setUpdating(true);
      const res = await groupsAPI.update(group.id || group._id, {
        name: editName,
        description: editDesc,
        category: editCategory,
        privacy: editPrivacy,
        cover: editCover,
      });
      if (res.success) {
        showToast('success', 'Group updated successfully');
        setShowEdit(false);
        loadGroupDetail();
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleJoinLeave = async () => {
    try {
      await toggleGroupJoin(group.id || group._id);
      loadGroupDetail(); // refresh stats
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleCreatePost = async (e, stickerUrl) => {
    if (e && e.preventDefault) e.preventDefault();
    const finalContent = stickerUrl || postText;
    if (!finalContent.trim()) return;

    try {
      setPosting(true);
      const res = await groupsAPI.createPost(group.id || group._id, finalContent.trim());
      if (res.success) {
        setPostText('');
        showToast('success', 'Posted to group!');
        loadGroupDetail(); // reload posts
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setPosting(false);
    }
  };

  if (loading || !group) {
    return (
      <MainLayout hideRight>
        <div className="flex justify-center items-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  const members = group.members || [];
  const admins = group.admins || [];

  return (
    <MainLayout hideRight>
      <div className="max-w-[900px] mx-auto">
        {/* Back link */}
        <Link
          to="/groups"
          className="inline-flex items-center gap-2 text-sp-sub hover:text-sp-text transition-colors mb-4 text-sm font-medium"
        >
          <FiArrowLeft size={16} /> Back to Groups
        </Link>

        {/* Group Card Header */}
        <div className="card overflow-hidden mb-4">
          <div className="relative h-56 md:h-72 bg-gradient-to-r from-sp-blue/20 to-purple-500/20 overflow-hidden">
            {group.cover ? (
              <img src={getAssetUrl(group.cover)} alt={group.name} className="w-full h-full object-cover object-center" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sp-muted">
                <HiOutlineUserGroup size={56} className="opacity-40" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white drop-shadow-lg">{group.name}</h1>
                <div className="flex items-center gap-2 text-white/80 text-sm mt-1">
                  {group.privacy === 'public' ? <FiGlobe size={13} /> : <FiLock size={13} />}
                  <span className="capitalize">{group.privacy}</span>
                  <span>·</span>
                  <span>{formatCount(group.memberCount)} members</span>
                  <span>·</span>
                  <span>{group.category}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <>
                    <button
                      onClick={() => setShowEdit(true)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-all"
                    >
                      <FiSettings size={13} /> {t('groups.editGroup')}
                    </button>
                    <button
                      onClick={handleDeleteGroup}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-red-500/80 hover:bg-red-600 text-white backdrop-blur-sm transition-all"
                    >
                      {t('groups.deleteGroup')}
                    </button>
                  </>
                )}
                <button
                  onClick={handleJoinLeave}
                  className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg transition-all
                    ${group.isJoined
                      ? 'bg-white/20 text-white hover:bg-red-500/40 backdrop-blur-sm'
                      : 'bg-sp-blue text-white hover:bg-blue-700 shadow-glow-sm'
                    }`}
                >
                  {group.isJoined ? (<><FiCheck size={14} />{t('groups.joined')}</>) : (<><FiPlus size={14} />{t('groups.joinGroup')}</>)}
                </button>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 bg-sp-card border-t border-sp-divider">
            <p className="text-sp-sub text-sm leading-relaxed">{group.description}</p>
          </div>

          {/* Tabs */}
          <div className="flex border-t border-sp-divider bg-sp-card">
            {[
              { id: 'posts', label: t('groups.posts') },
              { id: 'members', label: t('groups.members') },
              { id: 'about', label: t('groups.about') },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 text-sm font-semibold capitalize transition-all border-b-2
                  ${activeTab === tab.id
                    ? 'border-sp-blue text-sp-blue'
                    : 'border-transparent text-sp-sub hover:text-sp-text hover:bg-sp-hover'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 min-w-0">
            {activeTab === 'posts' && (
              <div>
                {/* Create post in group */}
                {group.isJoined ? (
                  <div className="card p-4 mb-4">
                    <TextInputWithEmoji
                      value={postText}
                      onChange={setPostText}
                      onSubmit={() => handleCreatePost()}
                      onStickerSelect={(url) => handleCreatePost(null, url)}
                      placeholder={t('groups.writeToGroup')}
                      showAvatar={true}
                      avatarSrc={user?.avatar}
                      avatarName={user?.name}
                      panelDirection="below"
                    />
                  </div>
                ) : (
                  <div className="card p-6 text-center text-sp-muted mb-4">
                    <p className="text-sm">{t('groups.joinToPost')}</p>
                  </div>
                )}

                {posts.length === 0 ? (
                  <div className="card p-10 text-center text-sp-muted">
                    <FiEdit3 className="w-12 h-12 mx-auto mb-3 opacity-30 text-sp-blue" />
                    <p className="font-semibold text-sp-text">{t('groups.noPostsYet')}</p>
                    <p className="text-sm mt-1">{t('groups.beFirstToPost')}</p>
                  </div>
                ) : (
                  posts.map((post) => <Post key={post.id} post={post} />)
                )}
              </div>
            )}

            {activeTab === 'members' && (
              <div className="card p-4">
                <h3 className="section-label mb-3">{t('groups.members')} ({members.length})</h3>
                <div className="grid grid-cols-2 gap-3">
                  {members.map((member) => (
                    <UserDisplay
                      key={member._id || member.id}
                      user={member}
                      size="lg"
                      showUsername={true}
                      avatarClassName="rounded-xl"
                      nameClassName="group-hover:text-sp-blue transition-colors"
                      className="p-2 rounded-xl hover:bg-sp-hover transition-colors"
                    />
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="card p-5 space-y-4">
                <h3 className="section-label">{t('groups.aboutThisGroup')}</h3>
                <p className="text-sp-text text-sm leading-relaxed">{group.description}</p>
                <div className="flex flex-col gap-3 text-sm pt-2">
                  <div className="flex items-center gap-2 text-sp-sub">
                    {group.privacy === 'public' ? <FiGlobe size={16} className="text-sp-blue" /> : <FiLock size={16} className="text-sp-blue" />}
                    <span><strong className="text-sp-text">{group.privacy === 'public' ? t('groups.public') : t('groups.private')}</strong> — {t('groups.anyoneCanJoin')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sp-sub">
                    <FiUsers size={16} className="text-sp-blue" />
                    <span><strong className="text-sp-text">{formatCount(group.memberCount)}</strong> {t('groups.members')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebars */}
          <div className="md:w-72 flex-shrink-0 space-y-4">
            <div className="card p-4">
              <h3 className="text-sm font-bold text-sp-text mb-3">{t('groups.admin')}</h3>
              {admins.map((admin) => (
                <UserDisplay
                  key={admin._id || admin.id}
                  user={admin}
                  size="md"
                  nameClassName="group-hover:text-sp-blue transition-colors"
                  className="p-2 rounded-xl hover:bg-sp-hover transition-colors"
                  subText={<p className="text-xs text-sp-muted font-bold mt-0.5">{t('groups.admin')}</p>}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Edit Group Modal ───────────────────────────────── */}
      {showEdit && (
        <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in text-sp-text select-none">
          <div className="card-elevated w-full max-w-lg overflow-hidden animate-scale-in">
            <div className="px-5 py-4 border-b border-sp-divider flex items-center justify-between">
              <h2 className="font-bold text-lg">{t('groups.editGroup')}</h2>
              <button onClick={() => setShowEdit(false)} className="nav-btn w-8 h-8">×</button>
            </div>
            <form onSubmit={handleUpdateGroup} className="p-5 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider">{t('groups.groupName')}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SF Rust Developers"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider">{t('groups.category')}</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="input [color-scheme:dark]"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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
                      onClick={() => setEditPrivacy(p.val)}
                      className={`flex-1 p-3 rounded-xl border text-left transition-all
                        ${editPrivacy === p.val
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
                <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider">{t('groups.coverImage')}</label>
                <input
                  type="text"
                  placeholder="https://example.com/image.jpg"
                  value={editCover}
                  onChange={(e) => setEditCover(e.target.value)}
                  className="input"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider">{t('groups.description')}</label>
                <textarea
                  placeholder="What is this community about?"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={4}
                  className="input resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={updating}
                  className="btn-primary flex-1 py-2.5"
                >
                  {updating ? <LoadingSpinner size="sm" /> : t('groups.saveChanges')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="btn-secondary flex-1 py-2.5"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
