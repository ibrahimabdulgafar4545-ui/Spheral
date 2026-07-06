import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FiMapPin, FiGlobe, FiCalendar, FiEdit2, FiMoreHorizontal,
  FiUserPlus, FiMessageCircle, FiCamera, FiGrid, FiList,
  FiBriefcase, FiBook, FiHeart, FiUser, FiMap, FiTrash2, FiCheck, FiClock,
  FiMail, FiPhone, FiTrendingUp, FiLink, FiShield, FiBookmark, FiPlayCircle, FiCheckCircle
} from 'react-icons/fi';
import { BsPeopleFill } from 'react-icons/bs';
import MainLayout from '../components/layout/MainLayout';
import Post from '../components/feed/Post';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import VerifiedBadge from '../components/ui/VerifiedBadge';
import CreatePostBox from '../components/feed/CreatePostBox';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { usersAPI } from '../api/users';
import { friendsAPI } from '../api/friends';
import { postsAPI } from '../api/posts';
import { reelsAPI } from '../api/reels';
import { getCroppedImg } from '../utils/cropImage';
import { formatCount, fullDate, getAssetUrl } from '../utils/helpers';

export default function ProfilePage() {
  const { userId } = useParams();
  const { user: currentUser, posts, showToast, openConversation, acceptFriendRequest, rejectFriendRequest, loadFriendsData, updateCurrentUser } = useApp();
  const { t } = useLanguage();
  const [profileUser, setProfileUser] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [userReels, setUserReels] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [friendStatus, setFriendStatus] = useState('none'); // 'none', 'pending_sent', 'pending_received', 'friends'
  const [pendingRequestId, setPendingRequestId] = useState(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [archivedPosts, setArchivedPosts] = useState([]);
  const [loadingArchived, setLoadingArchived] = useState(false);

  // Cover Crop State
  const [coverToCrop, setCoverToCrop] = useState(null);
  const [cropping, setCropping] = useState(false);
  const moreMenuRef = useRef(null);

  const isOwn = profileUser?.id === currentUser?.id || profileUser?._id === currentUser?.id;

  const loadProfile = async () => {
    const targetId = userId || currentUser?.id || currentUser?._id;
    if (!targetId) return;
    try {
      setLoading(true);
      const res = await usersAPI.getProfile(targetId);
      if (res.success) {
        console.log('🔍 Diagnostic: Loaded profile user data:', res.user);
        setProfileUser(res.user);
        setFriends(res.user.friends || []);

        // Load user posts
        const postRes = await usersAPI.getPosts(targetId);
        if (postRes.success) {
          setUserPosts(postRes.posts.map(p => ({ ...p, id: p._id })));
        }

        // Load user reels
        try {
          const reelsRes = await reelsAPI.getUserReels(targetId);
          if (reelsRes.success) {
            setUserReels(reelsRes.reels);
          }
        } catch (e) {
          console.error("Failed to load user reels", e);
        }

        // Determine friend status
        const statusRes = await friendsAPI.checkStatus(targetId);
        if (statusRes.success) {
          setFriendStatus(statusRes.status);
          if (statusRes.requestId) {
            setPendingRequestId(statusRes.requestId);
          }
        }
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadArchivedPosts = async () => {
    try {
      setLoadingArchived(true);
      const res = await postsAPI.getArchivedPosts();
      if (res.success) {
        setArchivedPosts(res.posts.map(p => ({ ...p, id: p._id })));
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to load archived posts');
    } finally {
      setLoadingArchived(false);
    }
  };

  useEffect(() => {
    setActiveTab('posts');
    loadProfile();
  }, [userId, currentUser]);

  useEffect(() => {
    if (activeTab === 'archived' && isOwn) {
      loadArchivedPosts();
    }
  }, [activeTab]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === 'cover') {
      setCoverToCrop(URL.createObjectURL(file));
      // Reset input so they can pick the same file again if they cancel
      e.target.value = null;
      return;
    }

    await uploadImageFile(file, type);
  };

  const uploadImageFile = async (file, type) => {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await usersAPI.uploadImage(currentUser.id || currentUser._id, formData, type);
      if (res.success) {
        showToast('success', `${type === 'cover' ? 'Cover photo' : 'Avatar'} updated!`);
        updateCurrentUser(res.user);
        loadProfile();
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleSaveCoverCrop = async (croppedFile) => {
    setCropping(true);
    await uploadImageFile(croppedFile, 'cover');
    setCropping(false);
    setCoverToCrop(null);
  };

  const handleRemoveImage = async (type) => {
    if (!window.confirm(`Are you sure you want to remove your ${type === 'cover' ? 'cover photo' : 'profile picture'}?`)) return;
    
    try {
      const fields = {};
      if (type === 'cover') fields.coverPhoto = '';
      if (type === 'avatar') fields.avatar = '';
      
      const res = await usersAPI.updateProfile(currentUser.id || currentUser._id, fields);
      if (res.success) {
        showToast('success', `${type === 'cover' ? 'Cover photo' : 'Profile picture'} removed!`);
        updateCurrentUser(res.user);
        loadProfile();
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleAddFriend = async () => {
    try {
      const res = await friendsAPI.sendRequest(profileUser._id || profileUser.id);
      if (res.success) {
        if (res.status === 'friends') {
          setFriendStatus('friends');
          showToast('success', 'Mutual friend request auto-accepted. You are now friends!');
        } else {
          setFriendStatus('pending_sent');
          showToast('success', 'Friend request sent!');
        }
        loadProfile();
        loadFriendsData();
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleCancelRequest = async () => {
    try {
      const res = await friendsAPI.cancelRequest(profileUser._id || profileUser.id);
      if (res.success) {
        setFriendStatus('none');
        setPendingRequestId(null);
        showToast('info', 'Friend request cancelled');
        loadProfile();
        loadFriendsData();
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleUnfriend = async () => {
    if (!window.confirm(`Are you sure you want to unfriend ${profileUser.name}?`)) return;
    try {
      const res = await friendsAPI.removeFriend(profileUser._id || profileUser.id);
      if (res.success) {
        setFriendStatus('none');
        showToast('info', `Unfriended ${profileUser.name}`);
        loadProfile();
        loadFriendsData();
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleAcceptRequest = async () => {
    if (!pendingRequestId) return;
    try {
      const res = await acceptFriendRequest(pendingRequestId);
      if (res.success) {
        setFriendStatus('friends');
        loadProfile();
        loadFriendsData();
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleRejectRequest = async () => {
    if (!pendingRequestId) return;
    try {
      const res = await rejectFriendRequest(pendingRequestId);
      if (res.success) {
        setFriendStatus('none');
        loadProfile();
        loadFriendsData();
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  if (loading || !profileUser) {
    return (
      <MainLayout hideRight>
        <div className="flex justify-center items-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  const canSeeSection = (settingValue) => {
    if (isOwn) return true;
    if (settingValue === 'public') return true;
    if (settingValue === 'friends' && friendStatus === 'friends') return true;
    return false;
  };

  const canSeeFriends = canSeeSection(profileUser?.privacySettings?.friendsVisibility || 'public');
  const canSeeFollowing = canSeeSection(profileUser?.privacySettings?.followingVisibility || 'public');

  const stats = [
    { label: t('profile.posts'), value: formatCount(userPosts.length) },
    { label: t('reels.title'), value: formatCount(userReels.length) },
    { label: t('profile.friends'), value: canSeeFriends ? formatCount(profileUser?.friendsCount) : '🔒' },
    { label: t('profile.followers'), value: canSeeFollowing ? formatCount(profileUser?.followersCount) : '🔒' },
    { label: t('profile.following'), value: canSeeFollowing ? formatCount(profileUser?.followingCount) : '🔒' },
  ];

  return (
    <MainLayout hideRight>
      <div className="max-w-[900px] mx-auto w-full select-none animate-fade-in">

        {/* Cover + Avatar */}
        <div className="card mb-4 relative z-20">
          <div className="relative h-64 md:h-80 bg-sp-hover overflow-hidden group">
            {profileUser?.coverPhoto ? (
              <img
                src={getAssetUrl(profileUser.coverPhoto)}
                alt="Cover"
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-gray-800 to-gray-900 border-b border-sp-border" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            {isOwn && (
              <div className="absolute bottom-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {profileUser?.coverPhoto && (
                  <button onClick={() => handleRemoveImage('cover')} className="bg-black/50 hover:bg-black/70 text-white p-2.5 rounded-lg backdrop-blur-sm transition-colors text-red-400 hover:text-red-500" title="Remove cover photo">
                    <FiTrash2 size={16} />
                  </button>
                )}
                <label className="flex items-center gap-2 bg-black/50 hover:bg-black/70 text-white text-sm font-medium px-3 py-2 rounded-lg backdrop-blur-sm transition-colors cursor-pointer">
                  <FiCamera size={15} />
                  {t('profile.changeCover')}
                  <input type="file" onChange={(e) => handleImageUpload(e, 'cover')} className="hidden" accept="image/*" />
                </label>
              </div>
            )}
          </div>

          {/* Profile row */}
          <div className="px-4 md:px-6 pb-4 relative">
            {/* Avatar */}
            <div className="relative -mt-16 mb-3 inline-block group">
              <Avatar
                src={profileUser?.avatar}
                alt={profileUser?.name}
                size="32"
                className="border-4 border-sp-card shadow-xl"
              />
              {isOwn && (
                <div className="absolute bottom-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity translate-y-1">
                  {profileUser?.avatar && (
                    <button onClick={() => handleRemoveImage('avatar')} className="w-8 h-8 bg-sp-overlay border border-sp-border rounded-full flex items-center justify-center text-sp-red hover:text-red-500 hover:bg-sp-hover transition-colors shadow-lg" title="Remove avatar">
                      <FiTrash2 size={14} />
                    </button>
                  )}
                  <label className="w-8 h-8 bg-sp-overlay border border-sp-border rounded-full flex items-center justify-center text-sp-text hover:bg-sp-hover transition-colors cursor-pointer shadow-lg">
                    <FiCamera size={14} />
                    <input type="file" onChange={(e) => handleImageUpload(e, 'avatar')} className="hidden" accept="image/*" />
                  </label>
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-2xl font-bold text-sp-text">{profileUser?.name}</h1>
                  {profileUser?.verified && (
                    <VerifiedBadge size={19} />
                  )}
                </div>
                {profileUser?.isProfessional && profileUser?.category && (
                  <p className="text-xs font-semibold px-2 py-0.5 rounded bg-sp-blue/10 text-sp-blue inline-block mt-0.5 mb-1.5">
                    {profileUser.category}
                  </p>
                )}
                <p className="text-sp-muted text-sm">@{profileUser?.username}</p>
                <p className="text-sp-muted text-sm mt-1">
                  {profileUser?.isProfessional ? (
                    <span>
                      {canSeeFollowing 
                        ? `${formatCount(profileUser?.followersCount || 0)} followers · ${formatCount(profileUser?.followingCount || 0)} following` 
                        : 'Followers & following hidden 🔒'}
                    </span>
                  ) : (
                    <span>
                      {canSeeFriends 
                        ? `${formatCount(profileUser?.friendsCount || 0)} friends` 
                        : 'Friends list hidden 🔒'}
                    </span>
                  )}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {isOwn ? (
                  <div className="flex items-center gap-2">
                    {profileUser?.isProfessional && (
                      <Link to="/professional-dashboard">
                        <Button variant="primary" icon={<FiTrendingUp size={15} />}>
                          {t('profile.professional')}
                        </Button>
                      </Link>
                    )}
                    <Link to="/settings">
                      <Button variant="secondary" icon={<FiEdit2 size={15} />}>
                        {t('profile.editProfile')}
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    {friendStatus === 'friends' && (
                      <Button onClick={handleUnfriend} variant="secondary" icon={<FiCheck size={15} />} className="text-green-500 hover:text-sp-red hover:bg-sp-red/10 border-sp-border transition-colors">
                        {profileUser?.isProfessional ? t('profile.following') : t('friends.allFriends')}
                      </Button>
                    )}
                    {friendStatus === 'pending_sent' && (
                      <Button onClick={handleCancelRequest} variant="secondary" icon={<FiClock size={15} />} className="text-sp-muted bg-sp-hover hover:bg-sp-hover/80 hover:text-sp-red border-sp-border transition-colors">
                        {profileUser?.isProfessional ? t('profile.following') : t('common.cancel')}
                      </Button>
                    )}
                    {friendStatus === 'pending_received' && (
                      <div className="flex gap-2">
                        <Button onClick={handleAcceptRequest} variant="primary">
                          {t('friends.accept')}
                        </Button>
                        <Button onClick={handleRejectRequest} variant="secondary">
                          {t('friends.decline')}
                        </Button>
                      </div>
                    )}
                    {friendStatus === 'none' && (
                      <Button onClick={handleAddFriend} variant="primary" icon={<FiUserPlus size={15} />} id="add-friend-btn">
                        {profileUser?.isProfessional ? t('common.follow') : t('profile.addFriend')}
                      </Button>
                    )}
                    <Button
                      onClick={() => openConversation(profileUser)}
                      variant="secondary"
                      icon={<FiMessageCircle size={15} />}
                    >
                      {t('profile.messageUser')}
                    </Button>
                  </>
                )}
                <div className="relative" ref={moreMenuRef}>
                  <button
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className="nav-btn"
                    title="More options"
                  >
                    <FiMoreHorizontal size={18} />
                  </button>
                  {showMoreMenu && (
                    <div className="absolute right-0 mt-2 w-52 rounded-xl bg-sp-card border border-sp-border shadow-2xl z-[100] py-1.5 text-left animate-scale-in">
                      {isOwn ? (
                        <>
                          <Link
                            to="/activity-log"
                            onClick={() => setShowMoreMenu(false)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-sp-text hover:bg-sp-hover font-semibold transition-colors"
                          >
                            <FiClock size={16} className="text-sp-sub" />
                            {t('settings.accountInfo')}
                          </Link>
                          <Link
                            to="/settings"
                            onClick={() => setShowMoreMenu(false)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-sp-text hover:bg-sp-hover font-semibold transition-colors"
                          >
                            <FiUser size={16} className="text-sp-sub" />
                            {t('settings.title')}
                          </Link>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={async () => {
                              setShowMoreMenu(false);
                              try {
                                const targetId = profileUser._id || profileUser.id;
                                const isBlocked = currentUser?.blockedUsers?.includes(targetId);
                                const res = await usersAPI.blockUser(targetId);
                                updateCurrentUser({ ...currentUser, blockedUsers: res.blockedUsers });
                                showToast('success', isBlocked ? 'User unblocked successfully!' : 'User blocked successfully!');
                                loadProfile();
                              } catch (e) {
                                showToast('error', 'Failed to block/unblock user');
                              }
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-sp-red hover:bg-sp-red/10 font-semibold transition-colors text-left"
                          >
                            <FiShield size={16} />
                            {currentUser?.blockedUsers?.includes(profileUser._id || profileUser.id) ? t('common.unblock') : t('common.block')}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          navigator.clipboard.writeText(window.location.href);
                          showToast('success', 'Profile link copied!');
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-sp-text hover:bg-sp-hover font-semibold transition-colors border-t border-sp-divider text-left"
                      >
                        <FiLink size={16} className="text-sp-sub" />
                        {t('feed.copyLink')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="mt-4 border-t border-sp-border pt-4">
              {profileUser?.bio && (
                <p className="text-sp-text text-sm leading-relaxed mb-3 max-w-xl">{profileUser.bio}</p>
              )}
              <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                {profileUser?.location && (
                  <div className="flex items-center gap-1.5 text-sp-sub text-sm">
                    <FiMapPin size={14} className="text-sp-blue" />
                    {profileUser.location}
                  </div>
                )}
                {profileUser?.isProfessional && profileUser?.publicContact?.email && (
                  <div className="flex items-center gap-1.5 text-sp-sub text-sm">
                    <FiMail size={14} className="text-purple-500" />
                    <a href={`mailto:${profileUser.publicContact.email}`} className="hover:underline">{profileUser.publicContact.email}</a>
                  </div>
                )}
                {profileUser?.isProfessional && profileUser?.publicContact?.phone && (
                  <div className="flex items-center gap-1.5 text-sp-sub text-sm">
                    <FiPhone size={14} className="text-green-500" />
                    <span>{profileUser.publicContact.phone}</span>
                  </div>
                )}
                {profileUser?.isProfessional && profileUser?.publicContact?.website && (
                  <div className="flex items-center gap-1.5 text-sp-sub text-sm">
                    <FiGlobe size={14} className="text-sp-blue" />
                    <a href={profileUser.publicContact.website.startsWith('http') ? profileUser.publicContact.website : `https://${profileUser.publicContact.website}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {profileUser.publicContact.website}
                    </a>
                  </div>
                )}
                {profileUser?.website && (
                  <div className="flex items-center gap-1.5 text-sp-sub text-sm">
                    <FiGlobe size={14} className="text-sp-blue" />
                    <a href={profileUser.website.startsWith('http') ? profileUser.website : `https://${profileUser.website}`} target="_blank" rel="noreferrer" className="hover:underline text-sp-blue">
                      {profileUser.website}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-sp-sub text-sm">
                  <FiCalendar size={14} className="text-sp-blue" />
                  {t('profile.joinedDate')} {fullDate(profileUser?.createdAt)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Turn on Professional Mode banner */}
        {isOwn && !profileUser?.isProfessional && (
          <div className="card p-5 mb-4 bg-gradient-to-r from-sp-blue/10 to-purple-500/10 border border-sp-blue/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-sp-text">Turn on Professional Mode</h4>
              <p className="text-xs text-sp-muted mt-1">Switch to a Creator account to show category details, public contact info, and view performance insights.</p>
            </div>
            <Link to="/settings#account">
              <Button variant="primary" size="sm">
                Switch Now
              </Button>
            </Link>
          </div>
        )}

        {/* Profile Tabs & Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Left Column: Info Card */}
          <div className="space-y-4">
            {/* Intro Card */}
            <div className="card p-4">
              <h2 className="font-bold text-sp-text mb-3 text-sm">{t('profile.intro')}</h2>
              <div className="flex flex-col gap-2.5 text-sm">
                {profileUser?.age != null && (
                  <div className="flex items-start gap-2.5 text-sp-text">
                    <FiUser className="text-sp-blue mt-0.5" />
                    <span>Age: <span className="font-medium">{profileUser.age}</span></span>
                  </div>
                )}
                {profileUser?.relationshipStatus && (
                  <div className="flex items-start gap-2.5 text-sp-text">
                    <FiHeart className="text-sp-blue mt-0.5" />
                    <span className="font-medium">{profileUser.relationshipStatus}</span>
                  </div>
                )}
                 {(profileUser?.city || profileUser?.country) && (
                  <div className="flex items-start gap-2.5 text-sp-text">
                    <FiMap className="text-sp-blue mt-0.5" />
                    <span>{t('profile.location')}: <span className="font-medium">{[profileUser.city, profileUser.country].filter(Boolean).join(', ')}</span></span>
                  </div>
                )}
                {profileUser?.workplace && (
                  <div className="flex items-start gap-2.5 text-sp-text">
                    <FiBriefcase className="text-sp-blue mt-0.5" />
                    <span>{t('profile.workplace')}: <span className="font-medium">{profileUser.workplace}</span></span>
                  </div>
                )}
                {profileUser?.education && (
                  <div className="flex items-start gap-2.5 text-sp-text">
                    <FiBook className="text-sp-blue mt-0.5" />
                    <span>{t('profile.education')}: <span className="font-medium">{profileUser.education}</span></span>
                  </div>
                )}
                {profileUser?.school && (
                  <div className="flex items-start gap-2.5 text-sp-text">
                    <FiBook className="text-sp-blue mt-0.5" />
                    <span>{t('profile.education')}: <span className="font-medium">{profileUser.school}</span></span>
                  </div>
                )}
                {!profileUser?.age && !profileUser?.relationshipStatus && !profileUser?.city && !profileUser?.country && !profileUser?.workplace && !profileUser?.education && !profileUser?.school && (
                  <div className="text-sp-muted italic text-center py-2">{t('profile.noPostsYet')}</div>
                )}
              </div>
            </div>

            {/* Stats Card */}
            <div className="card p-4">
              <h2 className="font-bold text-sp-text mb-3 text-sm">{t('profile.intro')}</h2>
              <div className="grid grid-cols-2 gap-2 text-center">
                {stats.map((s) => (
                  <div key={s.label} className="bg-sp-overlay p-2 rounded-xl border border-sp-border">
                    <p className="text-lg font-bold text-sp-text">{s.value}</p>
                    <p className="text-[10px] text-sp-muted uppercase font-bold tracking-wider mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Friends Card */}
            {canSeeFriends && (
              <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-bold text-sp-text text-sm">{t('profile.friends')}</h2>
                  <p className="text-xs text-sp-muted mt-0.5">{friends.length} {t('profile.friends').toLowerCase()}</p>
                </div>
                <button onClick={() => setActiveTab('friends')} className="text-xs text-sp-blue font-semibold hover:underline">
                  See all
                </button>
              </div>
              {friends.length === 0 ? (
                <p className="text-xs text-sp-muted py-2">{t('friends.noFriends')}</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {friends.slice(0, 6).map((f) => (
                    <Link key={f._id || f.id} to={`/profile/${f._id || f.id}`} className="text-center group block">
                      <Avatar src={f.avatar} alt={f.name} size="xl" className="mx-auto group-hover:ring-2 group-hover:ring-sp-blue transition-all" />
                      <p className="text-[11px] font-semibold text-sp-text group-hover:text-sp-blue transition-colors truncate mt-1.5 leading-tight px-1">
                        {f.name.split(' ')[0]}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
              </div>
            )}
          </div>

          {/* Right Column: Dynamic Feed / Lists */}
          <div className="md:col-span-2 space-y-4">
            {/* Feed Tabs Selector */}
            <div className="card p-1 flex gap-1 border-sp-border">
              {[
                { id: 'posts', label: t('profile.posts'), icon: <FiGrid size={15} />, show: true },
                { id: 'reels', label: t('reels.title'), icon: <FiPlayCircle size={15} />, show: true },
                { id: 'friends', label: t('profile.friends'), icon: <BsPeopleFill size={15} />, show: canSeeFriends },
                { id: 'archived', label: t('nav.bookmarks'), icon: <FiBookmark size={15} />, show: isOwn }
              ].filter(t => t.show).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all
                    ${activeTab === t.id
                      ? 'bg-sp-blue text-white shadow-glow-sm'
                      : 'text-sp-sub hover:text-sp-text hover:bg-sp-hover'
                    }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab: Posts */}
            {activeTab === 'posts' && (
              <div className="flex flex-col">
                {isOwn && <CreatePostBox />}
                {userPosts.length === 0 ? (
                  <div className="card p-16 text-center text-sp-muted">{t('profile.noPostsYet')}</div>
                ) : (
                  userPosts.map((post) => (
                    <Post
                       key={post.id}
                       post={post}
                       onArchiveToggle={() => {
                         loadProfile();
                       }}
                    />
                  ))
                )}
              </div>
            )}

            {/* Tab: Reels */}
            {activeTab === 'reels' && (
              <div className="card p-6 animate-fade-in">
                <h3 className="font-bold text-sp-text text-base mb-4">{t('reels.title')}</h3>
                {userReels.length === 0 ? (
                  <div className="text-center py-16 flex flex-col items-center justify-center">
                    <p className="text-sm text-sp-muted font-medium mb-4">No reels yet</p>
                    {isOwn && (
                      <Link to="/reels?createReel=true">
                        <Button variant="primary">Create your first reel</Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {userReels.map((reel) => {
                      const reactsCount = reel.reactions?.length || reel.reactionsCount || 0;
                      const commentsCount = reel.comments?.length || 0;

                      return (
                        <Link
                          key={reel.id || reel._id}
                          to={`/reels?id=${reel.id || reel._id}`}
                          className="relative aspect-[9/16] bg-black rounded-xl overflow-hidden group shadow-sm border border-sp-border/40 cursor-pointer block"
                        >
                          {/* Video Preview */}
                          <video
                            src={getAssetUrl(reel.videoUrl)}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            preload="metadata"
                            muted
                            playsInline
                          />
                          
                          {/* Overlays */}
                          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                          
                          {/* Play Icon */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
                              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="ml-0.5">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white text-xs flex items-center justify-between pointer-events-none select-none font-bold">
                            <div className="flex items-center gap-1">
                              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" className="text-red-500">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                              </svg>
                              <span>{reactsCount}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                              </svg>
                              <span>{commentsCount}</span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Friends List */}
            {activeTab === 'friends' && canSeeFriends && (
              <div className="card p-6 animate-fade-in">
                <h3 className="font-bold text-sp-text text-base mb-4">{t('profile.friends')}</h3>
                {friends.length === 0 ? (
                  <p className="text-sm text-sp-muted py-2">No friends found</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {friends.map((f) => (
                      <Link
                        key={f._id || f.id}
                        to={`/profile/${f._id || f.id}`}
                        className="flex items-center gap-3 p-3 bg-sp-overlay hover:bg-sp-hover border border-sp-border rounded-2xl group transition-all"
                      >
                        <Avatar src={f.avatar} alt={f.name} size="md" className="border border-sp-border" />
                        <div className="min-w-0">
                           <p className="font-semibold text-sm text-sp-text group-hover:text-sp-blue transition-colors truncate">{f.name}</p>
                          <p className="text-xs text-sp-muted">@{f.username}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Archived Posts */}
            {activeTab === 'archived' && isOwn && (
              <div className="flex flex-col">
                {loadingArchived ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : archivedPosts.length === 0 ? (
                  <div className="card p-16 text-center text-sp-muted">{t('profile.noPostsYet')}</div>
                ) : (
                  archivedPosts.map((post) => (
                    <Post
                      key={post.id}
                      post={post}
                      onArchiveToggle={() => {
                        loadArchivedPosts();
                        loadProfile();
                      }}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Cover Cropper Modal */}
      {coverToCrop && (
        <div className="fixed inset-0 z-[600] bg-black/90 flex items-center justify-center p-4 animate-fade-in">
          <div className="card-elevated w-full max-w-3xl overflow-hidden animate-scale-in flex flex-col">
            <div className="px-5 py-4 border-b border-sp-divider flex items-center justify-between">
              <h2 className="font-bold text-lg text-sp-text">{t('profile.changeCover')}</h2>
              <button onClick={() => setCoverToCrop(null)} className="nav-btn w-8 h-8">×</button>
            </div>
            <CoverCropEditor 
              imageSrc={coverToCrop} 
              onSave={handleSaveCoverCrop} 
              onCancel={() => setCoverToCrop(null)} 
              saving={cropping}
            />
          </div>
        </div>
      )}
    </MainLayout>
  );
}

function CoverCropEditor({ imageSrc, onSave, onCancel, saving }) {
  const { t } = useLanguage();
  const [offsetY, setOffsetY] = useState(50);

  const handleSave = async () => {
    try {
      const croppedFile = await getCroppedImg(imageSrc, offsetY, 3);
      onSave(croppedFile);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-5 flex flex-col items-center">
      <div className="w-full aspect-[3/1] bg-black rounded-xl overflow-hidden relative shadow-inner border border-sp-border">
        <img 
          src={imageSrc} 
          alt="Crop preview" 
          className="w-full h-full object-cover pointer-events-none"
          style={{ objectPosition: `50% ${offsetY}%` }}
        />
        <div className="absolute inset-0 ring-4 ring-sp-blue/50 ring-inset pointer-events-none rounded-xl" />
      </div>
      
      <div className="w-full mt-6 flex flex-col gap-2">
        <label className="text-sm font-semibold text-sp-sub text-center">Drag to adjust vertical position</label>
        <input 
          type="range" 
          min="0" max="100" 
          value={offsetY} 
          onChange={(e) => setOffsetY(Number(e.target.value))}
          className="w-full max-w-md mx-auto accent-sp-blue"
        />
      </div>

      <div className="flex gap-3 mt-8 w-full max-w-md">
        <button onClick={onCancel} className="btn-secondary flex-1">{t('common.cancel')}</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
          {saving ? <LoadingSpinner size="sm" /> : t('common.save')}
        </button>
      </div>
    </div>
  );
}
