import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useApp } from '../context/AppContext';
import { reelsAPI } from '../api/reels';
import { friendsAPI } from '../api/friends';
import {
  FiHeart, FiMessageCircle, FiShare2, FiMusic, FiVolume2, FiVolumeX,
  FiPlus, FiX, FiSend, FiBookmark, FiDownload, FiMoreVertical,
  FiLink, FiThumbsDown, FiThumbsUp, FiFlag, FiTrash2, FiExternalLink,
  FiSmile, FiPaperclip, FiEdit2
} from 'react-icons/fi';
import { BsBookmarkFill } from 'react-icons/bs';
import Avatar from '../components/ui/Avatar';
import VerifiedBadge from '../components/ui/VerifiedBadge';
import UserDisplay from '../components/ui/UserDisplay';
import CreativeEditor from '../components/ui/CreativeEditor';
import ReportModal from '../components/modals/ReportModal';
import ReactionPicker from '../components/ui/ReactionPicker';
import { getReactionIcon } from '../components/ui/ReactionIcons';
import { getAssetUrl, timeAgo } from '../utils/helpers';
import CommentActionsMenu from '../components/ui/CommentActionsMenu';
import { useLanguage } from '../context/LanguageContext';
import TextInputWithEmoji from '../components/ui/TextInputWithEmoji';
import clsx from 'clsx';

const SOUNDS_LIBRARY = [
  { id: 'track_1', title: 'Summer Breeze', artist: 'BeatLounge', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 'track_2', title: 'Lofi Chill Vibes', artist: 'Lofi Dreamer', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 'track_3', title: 'Acoustic Morning', artist: 'Guitarist', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { id: 'track_4', title: 'Neon Sunset', artist: 'DJ Sunset', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
  { id: 'track_5', title: 'Tech Groove', artist: 'Cyberpunk', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
  { id: 'track_6', title: 'Smooth Night Out', artist: 'Jazzman', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3' },
  { id: 'track_7', title: 'Ambient Cloudscape', artist: 'Skyline', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3' },
  { id: 'track_8', title: 'Retro Synth Wave', artist: 'Synth kid', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
  { id: 'track_9', title: 'Energetic Bounce', artist: 'Club Bass', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3' },
  { id: 'track_10', title: 'Classical Serenade', artist: 'Pianist Duo', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3' }
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReelsPage() {
  const { t } = useLanguage();
  const { user, showToast, shareToStory, socket } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reels, setReels]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef              = useRef(null);
  const [activeReelId, setActiveReelId] = useState(null);
  const [reelsMuted, setReelsMuted] = useState(true);

  // Reel Creation Flow
  const [pendingFile, setPendingFile]           = useState(null);
  const [creativeData, setCreativeData]         = useState(null); // { overlays, audioUrl, audioName }
  const [captionInput, setCaptionInput]         = useState('');
  const [showCaptionModal, setShowCaptionModal] = useState(false);

  // Comments panel
  const [commentReel, setCommentReel]     = useState(null);
  const [commentText, setCommentText]     = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');

  // Share panel
  const [shareReel, setShareReel] = useState(null);

  useEffect(() => {
    reelsAPI.getReels()
      .then(res => {
        const list = res.reels || [];
        const mapped = list.map(r => ({
          ...r,
          likesCount: r.likesCount !== undefined ? r.likesCount : (r.likes?.length || 0)
        }));
        setReels(mapped);
        
        const initialId = searchParams.get('id');
        if (initialId && mapped.some(r => (r.id || r._id) === initialId)) {
          setActiveReelId(initialId);
        } else if (mapped.length > 0) {
          setActiveReelId(mapped[0].id || mapped[0]._id);
        }
      })
      .catch(() => showToast('error', 'Failed to load reels'))
      .finally(() => setLoading(false));
  }, []);

  // Real-time Reel Comments Sync via Socket.io
  useEffect(() => {
    if (!socket) return;

    const handleCommentAdded = ({ reelId, comments }) => {
      setCommentReel(curr => {
        if (curr && (curr._id === reelId || curr.id === reelId)) {
          return { ...curr, comments };
        }
        return curr;
      });
      setReels(prev =>
        prev.map(r => ((r._id === reelId || r.id === reelId) ? { ...r, comments } : r))
      );
    };

    const handleCommentEdited = ({ reelId, comments }) => {
      setCommentReel(curr => {
        if (curr && (curr._id === reelId || curr.id === reelId)) {
          return { ...curr, comments };
        }
        return curr;
      });
      setReels(prev =>
        prev.map(r => ((r._id === reelId || r.id === reelId) ? { ...r, comments } : r))
      );
    };

    const handleCommentDeleted = ({ reelId, commentId }) => {
      setCommentReel(curr => {
        if (curr && (curr._id === reelId || curr.id === reelId)) {
          const updated = (curr.comments || []).filter(c => c._id !== commentId);
          return { ...curr, comments: updated };
        }
        return curr;
      });
      setReels(prev =>
        prev.map(r => {
          if (r._id === reelId || r.id === reelId) {
            const updated = (r.comments || []).filter(c => c._id !== commentId);
            return { ...r, comments: updated };
          }
          return r;
        })
      );
    };

    const handleCommentReacted = ({ reelId, comments }) => {
      setCommentReel(curr => {
        if (curr && (curr._id === reelId || curr.id === reelId)) {
          return { ...curr, comments };
        }
        return curr;
      });
      setReels(prev =>
        prev.map(r => ((r._id === reelId || r.id === reelId) ? { ...r, comments } : r))
      );
    };

    socket.on('reelCommentAdded', handleCommentAdded);
    socket.on('reelCommentEdited', handleCommentEdited);
    socket.on('reelCommentDeleted', handleCommentDeleted);
    socket.on('reelCommentReacted', handleCommentReacted);

    return () => {
      socket.off('reelCommentAdded', handleCommentAdded);
      socket.off('reelCommentEdited', handleCommentEdited);
      socket.off('reelCommentDeleted', handleCommentDeleted);
      socket.off('reelCommentReacted', handleCommentReacted);
    };
  }, [socket]);

  // Cleanup preview audio if it existed
  useEffect(() => {
    return () => {
      // no-op now, handled by CreativeEditor
    };
  }, []);

  useEffect(() => {
    if (searchParams.get('createReel') === 'true') {
      fileInputRef.current?.click();
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('createReel');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // ── Upload ──────────────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setPendingFile(file);
    setCreativeData(null);
  };

  const handleCreativeComplete = (data) => {
    setCreativeData(data);
    setCaptionInput('');
    setShowCaptionModal(true);
  };

  const handleSubmitReel = async () => {
    if (!pendingFile || !creativeData) return;
    const fd = new FormData();
    fd.append('video', pendingFile);
    fd.append('caption', captionInput || '');
    fd.append('audioName', creativeData.audioName || 'Original Audio');
    if (creativeData.audioUrl) fd.append('audioUrl', creativeData.audioUrl);
    if (creativeData.customAudioFile) fd.append('customAudio', creativeData.customAudioFile);
    if (creativeData.overlays && creativeData.overlays.length > 0) {
      fd.append('overlays', JSON.stringify(creativeData.overlays));
    }

    try {
      setUploading(true);
      setShowCaptionModal(false);
      const res = await reelsAPI.uploadReel(fd);
      if (res.success) {
        setReels(p => [res.reel, ...p]);
        setActiveReelId(res.reel.id || res.reel._id);
        showToast('success', 'Reel uploaded!');
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to upload reel');
    } finally {
      setUploading(false);
      setPendingFile(null);
      setCreativeData(null);
    }
  };

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleLike = async (id) => {
    try {
      const res = await reelsAPI.likeReel(id);
      setReels(p => p.map(r => (r.id || r._id) === id ? { ...r, liked: res.liked, likesCount: res.likesCount } : r));
    } catch { showToast('error', 'Failed to like'); }
  };

  const handleSave = async (id) => {
    try {
      const res = await reelsAPI.saveReel(id);
      setReels(p => p.map(r => (r.id || r._id) === id ? { ...r, saved: res.saved } : r));
      showToast('success', res.saved ? 'Reel saved!' : 'Reel unsaved');
    } catch { showToast('error', 'Failed to save'); }
  };

  const handleNotInterested = async (id) => {
    try {
      await reelsAPI.notInterested(id);
      setReels(p => p.filter(r => (r.id || r._id) !== id));
      showToast('success', "We'll show fewer like this");
    } catch { showToast('error', 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this reel?')) return;
    try {
      await reelsAPI.deleteReel(id);
      setReels(p => p.filter(r => (r.id || r._id) !== id));
      showToast('success', 'Reel deleted');
    } catch { showToast('error', 'Failed to delete reel'); }
  };

  const handleShare = async (reel) => {
    setShareReel(reel);
    try { await reelsAPI.shareReel(reel.id || reel._id); } catch { /* silent */ }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/reels`).then(() => showToast('success', 'Link copied!'));
  };

  const handleDownload = async (reel) => {
    try {
      showToast('info', 'Downloading video, please wait...');
      const url = getAssetUrl(reel.videoUrl);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `reel-${reel.id || reel._id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      
      showToast('success', 'Download complete!');
    } catch (err) {
      console.error('Download error:', err);
      // Fallback: Open in new tab
      window.open(getAssetUrl(reel.videoUrl), '_blank');
      showToast('info', 'Opened video in a new tab.');
    }
  };

  // ── Comments ─────────────────────────────────────────────────────────────────
  const [showEmojis, setShowEmojis] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [customStickers, setCustomStickers] = useState(() => {
    try { return JSON.parse(localStorage.getItem('spheral_custom_stickers') || '[]'); } catch { return []; }
  });
  const stickerFileRef = useRef(null);
  const [selectedSticker, setSelectedSticker] = useState(null);

  const appendEmoji = (emoji) => {
    setCommentText(prev => prev + emoji);
    setShowEmojis(false);
  };

  const handleStickerClick = (url) => {
    setSelectedSticker(url);
    setShowStickers(false);
  };

  const submitComment = async (stickerUrl) => {
    if (!commentReel) return;
    const finalSticker = stickerUrl || selectedSticker;
    if (!commentText.trim() && !finalSticker) { return; }
    setCommentLoading(true);
    try {
      const payload = finalSticker
        ? { text: '', type: 'sticker', fileUrl: finalSticker }
        : { text: commentText.trim() };
      const res = await reelsAPI.commentOnReelFull(commentReel.id || commentReel._id, payload);
      setCommentText('');
      setSelectedSticker(null);
      if (res.success) {
        const updated = { ...commentReel, comments: res.comments };
        setCommentReel(updated);
        setReels(p => p.map(r => (r.id || r._id) === (commentReel.id || commentReel._id) ? updated : r));
      }
    } catch { showToast('error', 'Failed to post comment'); }
    finally { setCommentLoading(false); }
  };

  const handleDeleteReelComment = async (commentId) => {
    if (!commentReel) return;
    try {
      await reelsAPI.deleteComment(commentReel.id || commentReel._id, commentId);
      const updatedComments = (commentReel.comments || []).filter(c => c._id !== commentId);
      const updated = { ...commentReel, comments: updatedComments };
      setCommentReel(updated);
      setReels(p => p.map(r => (r.id || r._id) === (commentReel.id || commentReel._id) ? updated : r));
      showToast('success', 'Comment deleted');
    } catch { showToast('error', 'Failed to delete comment'); }
  };

  const handleEditReelComment = async (commentId) => {
    if (!editCommentText.trim() || !commentReel) { setEditingCommentId(null); return; }
    try {
      const res = await reelsAPI.editComment(commentReel.id || commentReel._id, commentId, editCommentText.trim());
      if (res.success) {
        const updatedComments = (commentReel.comments || []).map(c =>
          c._id === commentId ? { ...c, text: editCommentText.trim(), isEdited: true } : c
        );
        const updated = { ...commentReel, comments: updatedComments };
        setCommentReel(updated);
        setReels(p => p.map(r => (r.id || r._id) === (commentReel.id || commentReel._id) ? updated : r));
        showToast('success', 'Comment updated');
      }
    } catch { showToast('error', 'Failed to edit comment'); }
    finally { setEditingCommentId(null); setEditCommentText(''); }
  };

  const handleCommentReact = async (commentId, reactionType) => {
    if (!commentReel) return;
    try {
      const res = await reelsAPI.reactComment(commentReel.id || commentReel._id, commentId, reactionType);
      if (res.success) {
        const updated = { ...commentReel, comments: res.comments };
        setCommentReel(updated);
        setReels(p => p.map(r => (r.id || r._id) === (commentReel.id || commentReel._id) ? updated : r));
      }
    } catch {
      showToast('error', 'Failed to react to comment');
    }
  };

  return (
    <MainLayout hideRight>
      <div className="max-w-[500px] mx-auto h-[calc(100vh-64px)] h-[calc(100dvh-64px)] relative bg-black md:rounded-xl overflow-hidden shadow-2xl pb-[env(safe-area-inset-bottom,0px)]">

        <input type="file" ref={fileInputRef} onChange={handleFileChange}
          accept="video/mp4,video/quicktime,video/webm" className="hidden" />

        {/* Feed */}
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
          </div>
        ) : reels.length === 0 ? (
          <div className="flex flex-col h-full items-center justify-center text-white p-6 text-center">
            <FiMusic size={48} className="mb-4 opacity-40" />
            <h2 className="text-xl font-bold mb-2">{t('reels.noReels')}</h2>
            <p className="text-sm opacity-60 mb-6">{t('reels.beFirst')}</p>
            <button onClick={() => fileInputRef.current?.click()} className="btn-primary flex items-center gap-2">
              <FiPlus /> {t('reels.uploadReel')}
            </button>
          </div>
        ) : (
          <div className="h-full overflow-y-scroll snap-y snap-mandatory no-scroll" style={{ scrollBehavior: 'smooth' }}>
            {reels.map(reel => (
              <ReelItem
                key={reel.id || reel._id}
                reel={reel}
                currentUser={user}
                isActive={activeReelId === (reel.id || reel._id)}
                onVisible={() => setActiveReelId(reel.id || reel._id)}
                onLike={() => handleLike(reel.id || reel._id)}
                onSave={() => handleSave(reel.id || reel._id)}
                onComment={() => setCommentReel(reel)}
                onShare={() => handleShare(reel)}
                onDownload={() => handleDownload(reel)}
                onCopyLink={handleCopyLink}
                onNotInterested={() => handleNotInterested(reel.id || reel._id)}
                onDelete={() => handleDelete(reel.id || reel._id)}
                muted={reelsMuted}
                setMuted={setReelsMuted}
              />
            ))}
          </div>
        )}



        {/* Uploading overlay */}
        {uploading && (
          <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center text-white">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mb-4" />
            <p className="font-semibold">{t('reels.processing')}</p>
          </div>
        )}

        {/* Caption modal */}
        {showCaptionModal && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center animate-fade-in">
            <div className="bg-sp-card w-full md:max-w-sm rounded-t-3xl md:rounded-2xl p-6 border border-sp-border shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sp-text text-lg">{t('reels.uploadReel')}</h3>
                <button onClick={() => { setShowCaptionModal(false); setPendingFile(null); setCreativeData(null); }}>
                  <FiX size={20} className="text-sp-muted" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Audio Info */}
                {creativeData?.audioName && (
                  <div className="bg-sp-overlay rounded-xl p-3 border border-sp-border/55 flex items-center gap-2">
                    <FiMusic size={14} className="text-sp-blue animate-pulse animate-spin-slow" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-sp-muted font-semibold uppercase tracking-wider">{t('reels.title')}</p>
                      <p className="text-xs text-sp-text font-bold truncate mt-0.5">{creativeData.audioName}</p>
                    </div>
                  </div>
                )}

                {/* Caption Input */}
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider">{t('reels.addCaption')}</label>
                  <textarea
                    rows={3}
                    placeholder={t('reels.addCaption')}
                    value={captionInput}
                    onChange={(e) => setCaptionInput(e.target.value)}
                    className="input resize-none"
                  />
                </div>

                {/* Submit button */}
                <button
                  onClick={handleSubmitReel}
                  className="w-full py-3 bg-sp-blue hover:bg-blue-600 text-white rounded-xl font-bold text-sm shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center"
                >
                  {t('feed.sharePost')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Comments Panel */}
        {commentReel && (
          <div className="absolute inset-0 z-50 flex flex-col animate-fade-in" onClick={() => setCommentReel(null)}>
            <div className="flex-1" />
            <div className="bg-sp-card rounded-t-3xl border-t border-sp-border max-h-[72%] flex flex-col"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-sp-divider flex-shrink-0">
                <h3 className="font-bold text-sp-text text-base">
                  Comments <span className="text-sp-muted font-normal text-sm ml-1">({commentReel.comments?.length || 0})</span>
                </h3>
                <button onClick={() => setCommentReel(null)}><FiX size={20} className="text-sp-muted" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {(commentReel.comments || []).length === 0 ? (
                  <div className="text-center py-10 text-sp-muted">
                    <FiMessageCircle size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No comments yet. Be the first!</p>
                  </div>
                ) : (
                  (commentReel.comments || []).map((c, i) => {
                    const isCommentOwn = c.user && String(c.user._id || c.user.id) === String(user?.id || user?._id);
                    const userReaction = c.reactions?.find(r => String(r.user?._id || r.user) === String(user?.id || user?._id))?.type || null;
                    return (
                      <div key={c._id || i} className="flex items-start gap-3">
                        <button onClick={() => navigate(`/profile/${c.user?._id || c.user?.id}`)} className="flex-shrink-0">
                          <Avatar src={c.user?.avatar} alt={c.user?.name} size="sm" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="bg-sp-overlay rounded-2xl px-3 py-2">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex items-center gap-1">
                                <button onClick={() => navigate(`/profile/${c.user?._id || c.user?.id}`)} className="text-xs font-semibold text-sp-text hover:text-sp-blue transition-colors">
                                  {c.user?.name}
                                </button>
                                {c.user?.verified && <VerifiedBadge size={11} />}
                              </div>
                              {isCommentOwn && (
                                <CommentActionsMenu
                                  onEdit={() => {
                                    setEditingCommentId(c._id);
                                    setEditCommentText(c.type === 'sticker' ? '' : c.text);
                                  }}
                                  onDelete={() => handleDeleteReelComment(c._id)}
                                />
                              )}
                            </div>
                            {editingCommentId === c._id ? (
                              <div className="flex items-center gap-2 mt-1">
                                <input
                                  autoFocus
                                  value={editCommentText}
                                  onChange={e => setEditCommentText(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') handleEditReelComment(c._id); if (e.key === 'Escape') setEditingCommentId(null); }}
                                  className="flex-1 bg-sp-surface border border-sp-blue rounded-lg px-2 py-1 text-sm text-sp-text focus:outline-none"
                                />
                                <button onClick={() => handleEditReelComment(c._id)} className="text-xs text-sp-blue font-bold">Save</button>
                                <button onClick={() => setEditingCommentId(null)} className="text-xs text-sp-muted">Cancel</button>
                              </div>
                            ) : (
                              <p className="text-sm text-sp-text mt-0.5">
                                {c.type === 'sticker' ? <img src={c.fileUrl} alt="sticker" className="w-16 h-16" /> : c.text}
                                {c.isEdited && <span className="text-[10px] text-sp-muted ml-1">(edited)</span>}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 mt-1 ml-2">
                            <span className="text-[11px] text-sp-muted">{timeAgo(c.createdAt)}</span>
                            <ReactionPicker
                              onSelect={(type) => handleCommentReact(c._id, type)}
                              current={userReaction}
                              positionClass="left-0"
                            >
                              <button
                                onClick={() => handleCommentReact(c._id, userReaction ? null : 'like')}
                                className={clsx(
                                  'text-[12px] font-bold transition-colors cursor-pointer flex items-center gap-1',
                                  userReaction ? 'text-sp-blue' : 'text-sp-muted hover:text-sp-blue'
                                )}
                              >
                                {userReaction ? (
                                  <span className="flex items-center gap-1">
                                    {getReactionIcon(userReaction, 13, true)}
                                    <span>{userReaction.charAt(0).toUpperCase() + userReaction.slice(1)}</span>
                                  </span>
                                ) : 'Like'}
                              </button>
                            </ReactionPicker>
                            {c.reactions?.length > 0 && (
                              <span className="text-[12px] text-sp-muted flex items-center gap-0.5">
                                {getReactionIcon(c.reactions[0]?.type || 'like', 12, true)} <span>{c.reactions.length}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                {selectedSticker && (
                  <div className="flex justify-end p-2">
                    <div className="relative">
                      <img src={selectedSticker} alt="selected" className="w-16 h-16 rounded-lg" />
                      <button onClick={() => setSelectedSticker(null)} className="absolute -top-2 -right-2 bg-sp-card rounded-full p-0.5"><FiX size={12} /></button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="px-4 py-3 border-t border-sp-divider flex-shrink-0">
                <TextInputWithEmoji
                  value={commentText}
                  onChange={setCommentText}
                  onSubmit={() => submitComment()}
                  onStickerSelect={(url) => submitComment(url)}
                  placeholder="Add a comment..."
                  showAvatar={true}
                  avatarSrc={user?.avatar}
                  avatarName={user?.name}
                  panelDirection="above"
                />
              </div>
            </div>
          </div>
        )}

        {/* Share Panel */}
        {shareReel && (
          <div className="absolute inset-0 z-50 flex flex-col animate-fade-in" onClick={() => setShareReel(null)}>
            <div className="flex-1" />
            <div className="bg-sp-card rounded-t-3xl border-t border-sp-border p-5" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-sp-text text-base">Share Reel</h3>
                <button onClick={() => setShareReel(null)}><FiX size={20} className="text-sp-muted" /></button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: FiLink,        label: 'Copy Link',    action: () => { handleCopyLink(); setShareReel(null); } },
                  { icon: FiDownload,    label: 'Download',     action: () => { handleDownload(shareReel); setShareReel(null); } },
                  { icon: shareReel.saved ? BsBookmarkFill : FiBookmark,
                                         label: shareReel.saved ? 'Unsave' : 'Save',
                                         action: () => { handleSave(shareReel.id || shareReel._id); setShareReel(null); } },
                  { icon: FiMessageCircle, label: 'Send in Chat', action: () => { showToast('info', 'Open Messages to share'); setShareReel(null); } },
                  { icon: FiExternalLink, label: 'Share to Story', action: () => {
                    shareToStory({
                      contentType: 'reel',
                      contentId: shareReel.id || shareReel._id,
                      authorId: shareReel.author?._id || shareReel.author?.id,
                      authorName: shareReel.author?.name || 'Anonymous User',
                      authorAvatar: shareReel.author?.avatar || '',
                      content: shareReel.caption || '',
                      mediaUrl: '',
                    });
                    setShareReel(null);
                  }},
                  { icon: FiShare2,      label: 'More',         action: () => {
                    if (navigator.share) navigator.share({ title: shareReel.caption || 'Reel', url: `${window.location.origin}/reels` });
                    else handleCopyLink();
                    setShareReel(null);
                  }},
                ].map(({ icon: Icon, label, action }) => (
                  <button key={label} onClick={action}
                    className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-sp-overlay hover:bg-sp-hover transition-colors border border-sp-border">
                    <div className="w-10 h-10 rounded-full bg-sp-blue/10 text-sp-blue flex items-center justify-center">
                      <Icon size={18} />
                    </div>
                    <span className="text-xs text-sp-text font-medium text-center">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {pendingFile && !creativeData && (
        <CreativeEditor 
          file={pendingFile} 
          type="reel"
          onComplete={handleCreativeComplete}
          onCancel={() => setPendingFile(null)} 
        />
      )}
    </MainLayout>
  );
}

// ─── Individual Reel Item ─────────────────────────────────────────────────────
function ReelItem({ reel, currentUser, isActive, onVisible, onLike, onSave, onComment, onShare, onDownload, onCopyLink, onNotInterested, onDelete, muted, setMuted }) {
  const videoRef = useRef(null);
  const itemRef  = useRef(null);
  const menuRef  = useRef(null);
  const navigate = useNavigate();

  const [paused, setPaused]     = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const { showToast }           = useApp();
  const [reaction, setReaction] = useState(reel.currentReaction || null);
  const [localLikes, setLocalLikes] = useState(reel.reactions?.length || 0);

  // Gesture Controls States & Refs
  const [holdingDirection, setHoldingDirection] = useState(null);
  const [heartPopups, setHeartPopups] = useState([]);
  const pointerTimerRef = useRef(null);
  const lastTapRef = useRef(0);
  const isHoldingRef = useRef(false);
  const rewindIntervalRef = useRef(null);

  const cleanUpHold = () => {
    if (pointerTimerRef.current) {
      clearTimeout(pointerTimerRef.current);
      pointerTimerRef.current = null;
    }
    if (rewindIntervalRef.current) {
      clearInterval(rewindIntervalRef.current);
      rewindIntervalRef.current = null;
    }
    if (isHoldingRef.current) {
      isHoldingRef.current = false;
      setHoldingDirection(null);
      if (videoRef.current) {
        videoRef.current.playbackRate = 1.0;
        if (!paused) {
          videoRef.current.play().catch(() => {});
        }
      }
      if (audioObjRef.current) {
        audioObjRef.current.playbackRate = 1.0;
        if (!paused && isActive) {
          audioObjRef.current.play().catch(() => {});
        }
      }
    }
  };

  const handlePointerDown = (e) => {
    if (e.button !== 0) return;
    const clientX = e.clientX;
    const currentTarget = e.currentTarget;

    pointerTimerRef.current = setTimeout(() => {
      isHoldingRef.current = true;
      const rect = currentTarget.getBoundingClientRect();
      const relativeX = clientX - rect.left;
      const isRight = relativeX > rect.width / 2;

      if (isRight) {
        setHoldingDirection('forward');
        if (videoRef.current) videoRef.current.playbackRate = 2.0;
        if (audioObjRef.current) audioObjRef.current.playbackRate = 2.0;
      } else {
        setHoldingDirection('rewind');
        if (videoRef.current) videoRef.current.pause();
        if (audioObjRef.current) audioObjRef.current.pause();
        rewindIntervalRef.current = setInterval(() => {
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 0.3);
            if (audioObjRef.current) {
              audioObjRef.current.currentTime = videoRef.current.currentTime;
            }
          }
        }, 80);
      }
    }, 450);
  };

  const handlePointerUp = (e) => {
    if (pointerTimerRef.current) {
      clearTimeout(pointerTimerRef.current);
      pointerTimerRef.current = null;
    }
    if (isHoldingRef.current) {
      cleanUpHold();
      return;
    }

    const now = Date.now();
    const delay = now - lastTapRef.current;

    if (delay < 300) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const heartId = Math.random();
      setHeartPopups(prev => [...prev, { id: heartId, x, y }]);
      setTimeout(() => {
        setHeartPopups(prev => prev.filter(h => h.id !== heartId));
      }, 800);

      if (!reaction) {
        setReaction('love');
        setLocalLikes(l => l + 1);
        reelsAPI.reactReel(reel.id || reel._id, 'love').catch(() => {
          setReaction(null);
          setLocalLikes(l => Math.max(0, l - 1));
          showToast('error', 'Failed to react');
        });
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        if (lastTapRef.current === now) {
          togglePlay();
        }
      }, 300);
    }
  };

  const handlePointerLeave = () => {
    cleanUpHold();
  };

  useEffect(() => {
    return () => {
      if (pointerTimerRef.current) clearTimeout(pointerTimerRef.current);
      if (rewindIntervalRef.current) clearInterval(rewindIntervalRef.current);
    };
  }, []);

  const isOwner =
    String(currentUser?.id   || currentUser?._id) ===
    String(reel.author?._id  || reel.author?.id);

  const [commentLoading, setCommentLoading] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);

  const submitComment = async () => {
    if (!commentReel) return;
    if (!commentText.trim() && !selectedSticker) return;
    setCommentLoading(true);
    const payload = {
      text: commentText.trim(),
      type: selectedSticker ? 'sticker' : 'text',
      fileUrl: selectedSticker || undefined,
    };
    try {
      if (editingCommentId) {
        await reelsAPI.editComment(commentReel._id, editingCommentId, payload);
        setEditingCommentId(null);
      } else {
        await reelsAPI.commentOnReelFull(commentReel._id, payload);
      }
      setCommentText('');
      setSelectedSticker(null);
      setCommentLoading(false);
    } catch (e) {
      showToast('error', 'Failed to post comment');
      setCommentLoading(false);
    }
  };

  // Check initial follow/friendship status
  useEffect(() => {
    const authorId = reel.author?._id || reel.author?.id;
    if (!authorId || isOwner) return;
    
    friendsAPI.checkStatus(authorId)
      .then(res => {
        if (res.success) {
          setFollowed(res.status === 'friends' || res.status === 'pending_sent');
        }
      })
      .catch(() => {});
  }, [reel.author, isOwner]);

  // IntersectionObserver — triggers active state when scrolled into view
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onVisible(); },
      { threshold: 0.6 }
    );
    if (itemRef.current) obs.observe(itemRef.current);
    return () => obs.disconnect();
  }, [onVisible]);

  // Scroll active reel into view on load
  useEffect(() => {
    if (isActive && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: 'auto', block: 'center' });
    }
  }, [isActive]);

  const audioObjRef = useRef(null);

  // Initialize background audio element
  useEffect(() => {
    audioObjRef.current = new Audio();
    return () => {
      if (audioObjRef.current) {
        audioObjRef.current.pause();
        audioObjRef.current = null;
      }
    };
  }, []);

  // Sync background audio source
  useEffect(() => {
    if (!audioObjRef.current) return;
    audioObjRef.current.pause();
    if (reel.audioUrl) {
      audioObjRef.current.src = getAssetUrl(reel.audioUrl);
      audioObjRef.current.loop = true;
    } else {
      audioObjRef.current.src = '';
    }
  }, [reel.audioUrl]);

  // Sync audio controls with video controls
  useEffect(() => {
    if (!audioObjRef.current || !reel.audioUrl) return;
    audioObjRef.current.muted = muted;
    if (isActive && !paused) {
      audioObjRef.current.play().catch(() => {});
    } else {
      audioObjRef.current.pause();
    }
  }, [isActive, paused, muted, reel.audioUrl]);

  // Sync drift between video and audio
  useEffect(() => {
    if (!videoRef.current || !audioObjRef.current || !reel.audioUrl) return;
    const handleTimeUpdate = () => {
      if (Math.abs(videoRef.current.currentTime - audioObjRef.current.currentTime) > 0.4) {
        audioObjRef.current.currentTime = videoRef.current.currentTime;
      }
    };
    const video = videoRef.current;
    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [reel.audioUrl]);

  // Auto play/pause based on active state
  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = reel.audioUrl ? true : muted;
      videoRef.current.play().catch(() => {
        videoRef.current.muted = true;
        setMuted(true);
        videoRef.current.play().catch(() => {});
      });
      setPaused(false);
    } else {
      videoRef.current.pause();
    }
  }, [isActive, reel.audioUrl]);

  // Close menu on outside click
  useEffect(() => {
    const fn = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setPaused(false);
    } else {
      videoRef.current.pause();
      setPaused(true);
    }
  };

  const toggleMute = e => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const next = !muted;
    setMuted(next);
    videoRef.current.muted = reel.audioUrl ? true : next;
  };

  const goToProfile = e => {
    e.stopPropagation();
    const authorId = reel.author?._id || reel.author?.id;
    if (authorId) navigate(`/profile/${authorId}`);
  };

  // Three-dot menu definition
  const menuItems = [
    { icon: FiThumbsUp,   label: 'Interested',      action: () => { onLike(); setShowMenu(false); } },
    { icon: FiThumbsDown, label: 'Not Interested',   action: () => { onNotInterested(); setShowMenu(false); } },
    {
      icon: reel.saved ? BsBookmarkFill : FiBookmark,
      label: reel.saved ? 'Unsave Reel' : 'Save Reel',
      action: () => { onSave(); setShowMenu(false); }
    },
    { icon: FiDownload,   label: 'Download',         action: () => { onDownload(); setShowMenu(false); } },
    { icon: FiLink,       label: 'Copy Link',        action: () => { onCopyLink(); setShowMenu(false); } },
    ...(isOwner ? [{
      icon: FiTrash2, label: 'Delete Reel',
      action: () => { onDelete(); setShowMenu(false); },
      danger: true
    }] : []),
    { icon: FiFlag, label: 'Report', action: () => { setShowReportModal(true); setShowMenu(false); } },
  ];

  return (
    <div ref={itemRef} className="h-full w-full snap-start relative bg-black flex items-center justify-center"
      style={{ minHeight: '100%' }}>

      {/* Video */}
      <video ref={videoRef} src={getAssetUrl(reel.videoUrl)}
        className="h-full w-full object-cover cursor-pointer"
        loop playsInline muted={muted}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave} />

      {/* Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20 pointer-events-none" />

      {/* Double-tap Heart Popups */}
      {heartPopups.map(heart => (
        <div
          key={heart.id}
          className="absolute text-red-500 pointer-events-none z-50 animate-heart-pop"
          style={{
            left: `${heart.x}px`,
            top: `${heart.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <svg className="w-20 h-20 fill-current drop-shadow-2xl" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </div>
      ))}

      {/* Hold-to-seek HUD indicator */}
      {holdingDirection && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-full flex items-center gap-2 border border-white/10 z-40 text-xs font-black tracking-widest text-white uppercase select-none animate-pulse">
          <span>{holdingDirection === 'forward' ? '»» 2.0x Fast' : '«« Rewind'}</span>
        </div>
      )}

      {/* Render Overlays */}
      {reel.overlays?.map(overlay => (
        <div
          key={overlay.id || Math.random().toString()}
          className="absolute -translate-x-1/2 -translate-y-1/2 font-bold drop-shadow-xl pointer-events-none z-20 select-none text-white text-center"
          style={{ 
            left: `${overlay.x}%`, 
            top: `${overlay.y}%`, 
            transform: `translate(-50%, -50%) scale(${overlay.scale || 1})`,
            color: overlay.color || '#fff',
            fontSize: overlay.type === 'sticker' ? '3.5rem' : '1.8rem'
          }}
        >
          {overlay.content}
        </div>
      ))}

      {/* Paused indicator */}
      {paused && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 bg-black/40 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* Mute toggle — top left */}
      <button onClick={toggleMute}
        className="absolute top-4 left-4 z-20 w-9 h-9 bg-black/40 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-black/60 transition pointer-events-auto">
        {muted ? <FiVolumeX size={16} /> : <FiVolume2 size={16} />}
      </button>

      {/* ── Side buttons — right column, from bottom ── */}
      <div className="absolute right-3.5 bottom-20 flex flex-col items-center z-20 pointer-events-auto">

        {/* Profile Avatar / Follow Button (+) */}
        <div className="relative flex flex-col items-center mb-6">
          <div className="relative w-12 h-12">
            <button
              onClick={goToProfile}
              className="w-full h-full rounded-full border-2 border-white/90 overflow-hidden shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center bg-black/40"
              title="View Profile"
            >
              <Avatar src={reel.author?.avatar} alt={reel.author?.name} className="w-full h-full" />
            </button>
            {!isOwner && !followed && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await friendsAPI.sendRequest(reel.author?._id || reel.author?.id);
                    setFollowed(true);
                    showToast('success', `Following and friend request sent to ${reel.author?.name || 'user'}!`);
                  } catch (err) {
                    showToast('error', err.message || 'Failed to follow');
                  }
                }}
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5.5 h-5.5 bg-red-500 rounded-full flex items-center justify-center text-white border border-white hover:scale-115 active:scale-95 transition-all shadow-md cursor-pointer z-30 animate-scale-in before:absolute before:inset-[-12px] before:content-['']"
                title="Follow"
              >
                <FiPlus size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Options Stack (Like, Comment, Share, Save, More) */}
        <div className="flex flex-col gap-3.5 items-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const wasReacted = !!reaction;
                const newType = wasReacted ? null : 'love';
                setReaction(newType);
                if (newType) {
                  setLocalLikes(l => l + 1);
                } else {
                  setLocalLikes(l => Math.max(0, l - 1));
                }
                reelsAPI.reactReel(reel.id || reel._id, newType).catch(() => {
                  showToast('error', 'Failed to react');
                  setReaction(reaction);
                  setLocalLikes(localLikes);
                });
              }}
              className="flex flex-col items-center group py-0.5"
            >
              <div className={`w-11 h-11 rounded-full backdrop-blur flex items-center justify-center transition
                ${reaction ? 'bg-white/20' : 'bg-black/40 group-hover:bg-black/60'}`}>
                {reaction ? (
                  getReactionIcon(reaction, 26, true)
                ) : (
                  <FiHeart size={20} className="text-white" />
                )}
              </div>
              <span className="text-white text-[10px] font-semibold drop-shadow mt-1">
                {reaction ? 'Loved' : 'Love'}
              </span>
            </button>
            <span className="text-white text-[10px] font-semibold drop-shadow mt-0.5">{localLikes}</span>

          {/* Comment */}
          <button onClick={e => { e.stopPropagation(); onComment(); }} className="flex flex-col items-center group py-0.5">
            <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white group-hover:bg-black/60 transition">
              <FiMessageCircle size={20} />
            </div>
            <span className="text-white text-[10px] font-semibold drop-shadow mt-0.5">
              {reel.comments?.length ?? reel.commentsCount ?? 0}
            </span>
          </button>

          {/* Share */}
          <button onClick={e => { e.stopPropagation(); onShare(); }} className="flex flex-col items-center group py-0.5">
            <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white group-hover:bg-black/60 transition">
              <FiShare2 size={20} />
            </div>
            <span className="text-white text-[10px] font-semibold drop-shadow mt-0.5">{reel.sharesCount || 0}</span>
          </button>

          {/* Save */}
          <button onClick={e => { e.stopPropagation(); onSave(); }} className="flex flex-col items-center group py-0.5">
            <div className={`w-11 h-11 rounded-full backdrop-blur flex items-center justify-center transition
              ${reel.saved ? 'bg-sp-blue/30' : 'bg-black/40 group-hover:bg-black/60'}`}>
              {reel.saved
                ? <BsBookmarkFill size={18} className="text-sp-blue" />
                : <FiBookmark size={18} className="text-white" />
              }
            </div>
            <span className="text-white text-[10px] font-semibold drop-shadow mt-0.5">Save</span>
          </button>

          {/* Three-dot ⋮ — sits at the bottom of the side rail */}
          <div ref={menuRef} className="relative flex flex-col items-center py-0.5">
            <button onClick={e => { e.stopPropagation(); setShowMenu(v => !v); }}
              className="w-11 h-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white hover:bg-black/60 transition">
              <FiMoreVertical size={20} />
            </button>
            <span className="text-white text-[10px] font-semibold drop-shadow mt-2.3">More</span>

            {/* Dropdown — floats left, opens upward */}
            {showMenu && (
              <div className="absolute right-14 bottom-0 w-52 bg-sp-card border border-sp-border rounded-2xl shadow-2xl overflow-hidden animate-scale-in z-50">
                {menuItems.map(({ icon: Icon, label, action, danger }) => (
                  <button key={label} onClick={e => { e.stopPropagation(); action(); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-sp-hover transition-colors text-left
                      ${danger ? 'text-red-400' : 'text-sp-text'}`}>
                    <Icon size={16} className={`flex-shrink-0 ${danger ? 'text-red-400' : 'text-sp-muted'}`} />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom info — author + caption */}
      <div className="absolute bottom-16 md:bottom-5 left-4 right-20 z-20 pointer-events-auto pb-[env(safe-area-inset-bottom,0px)]" onClick={e => e.stopPropagation()}>

        <div onClick={goToProfile} className="cursor-pointer mb-2 group">
          <UserDisplay
            user={reel.author}
            size="sm"
            link={false}
            avatarClassName="border-2 border-white/30 group-hover:border-white/70 transition"
            nameClassName="!text-white font-bold leading-tight group-hover:underline drop-shadow"
            subText={<p className="text-white/50 text-xs">{timeAgo(reel.createdAt)}</p>}
          />
        </div>

        {reel.caption && (
          <p className="text-white/90 text-sm drop-shadow line-clamp-2 leading-snug mb-2 pl-0.5">
            {reel.caption}
          </p>
        )}
        <div className="flex items-center gap-1.5 text-white/70 text-xs font-semibold bg-black/25 backdrop-blur px-2.5 py-1 rounded-full w-max max-w-full">
          <FiMusic size={11} className="animate-spin-slow" />
          <span className="truncate">
            {reel.audioName && reel.audioName !== 'Original Audio' ? reel.audioName : `Original Audio · ${reel.author?.name}`}
          </span>
        </div>
      </div>
      {/* Report Modal */}
      {showReportModal && (
        <ReportModal
          contentId={reel.id || reel._id}
          contentType="reel"
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
