import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiMoreHorizontal, FiBookmark, FiFlag, FiUserMinus,
  FiGlobe, FiLock, FiShare2, FiMessageCircle, FiMapPin,
  FiX, FiExternalLink, FiTrash2, FiThumbsUp, FiHeart, FiSmile, FiEye, FiFrown, FiMinusCircle, FiStar
} from 'react-icons/fi';
import { BsBookmarkFill } from 'react-icons/bs';
import { useApp } from '../../context/AppContext';
import { timeAgo, formatCount, getAssetUrl, parseMentions } from '../../utils/helpers';
import CommentSection from './CommentSection';
import Avatar from '../ui/Avatar';
import clsx from 'clsx';
import ReportModal from '../modals/ReportModal';
import { usersAPI } from '../../api/users';
import UserDisplay from '../ui/UserDisplay';

import ReactionPicker from '../ui/ReactionPicker';
import { getReactionIcon } from '../ui/ReactionIcons';

// Keep REACTIONS for icon rendering, but ReactionPicker handles UI
const REACTIONS = [
  { key: 'like',  icon: FiThumbsUp, label: 'Like',    color: '#1a73e8' },
  { key: 'love',  icon: FiHeart,    label: 'Love',    color: '#ef4444' },
  { key: 'care',  icon: FiSmile,    label: 'Care',    color: '#ec4899' },
  { key: 'haha',  icon: FiSmile,    label: 'Haha',    color: '#f59e0b' },
  { key: 'wow',   icon: FiEye,      label: 'Wow',     color: '#f59e0b' },
  { key: 'sad',   icon: FiFrown,    label: 'Sad',     color: '#3b82f6' },
  { key: 'angry', icon: FiMinusCircle, label: 'Angry', color: '#ef4444' },
];

export default function Post({ post, onArchiveToggle }) {
  const { toggleLike, reactPost, deletePost, archivePost, user, shareToStory, showToast } = useApp();
  const navigate = useNavigate();
  const [showShareMenu, setShowShareMenu]   = useState(false);
  const shareRef                            = useRef(null);
  const [showComments, setShowComments]     = useState(false);
  const [showMenu, setShowMenu]             = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reaction, setReaction]             = useState(post.currentReaction || (post.liked ? 'like' : null));
  const [localLikes, setLocalLikes]         = useState(post.likesCount);
  const [localComments, setLocalComments]   = useState(post.commentsCount);
  const [expanded, setExpanded]             = useState(false);
  const [saved, setSaved]                   = useState(post.saved || false);
  const [imageOpen, setImageOpen]           = useState(false);
  const [localReactions, setLocalReactions] = useState(post.reactions || []);

  useEffect(() => {
    setLocalComments(post.commentsCount);
  }, [post.commentsCount]);

  useEffect(() => {
    setLocalLikes(post.likesCount);
    setReaction(post.currentReaction || (post.liked ? 'like' : null));
    setLocalReactions(post.reactions || []);
  }, [post.likesCount, post.liked, post.currentReaction, post.reactions]);

  useEffect(() => {
    const clickOutside = (e) => {
      if (shareRef.current && !shareRef.current.contains(e.target)) {
        setShowShareMenu(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const isOwn = post.author?._id === user?.id || post.author?.id === user?.id;
  const MAX = 280;
  const isLong = post.content.length > MAX;
  const displayContent = expanded || !isLong ? post.content : post.content.slice(0, MAX) + '…';

  const getTopReactions = () => {
    if (!localReactions || localReactions.length === 0) return [];
    const counts = {};
    localReactions.forEach(r => {
      if (r && r.type) {
        counts[r.type] = (counts[r.type] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);
  };

  const currentReaction = REACTIONS.find((r) => r.key === reaction);

  // Hover/long‑press logic moved to ReactionPicker component
  const handleReactionPick = (r) => {
    const wasReacted = !!reaction;
    const newReaction = reaction === r.key ? null : r.key;
    setReaction(newReaction);
    if (newReaction) {
      if (!wasReacted) setLocalLikes((n) => n + 1);
    } else {
      setLocalLikes((n) => Math.max(0, n - 1));
    }
    const myId = user?.id || user?._id || 'me';
    setLocalReactions(prev => {
      const filtered = prev.filter(item => (item.user?._id || item.user || '').toString() !== myId.toString());
      if (newReaction) {
        return [...filtered, { user: myId, type: newReaction }];
      }
      return filtered;
    });
    reactPost(post.id || post._id, newReaction);
  };

  const handleLikeClick = () => {
    const wasReacted = !!reaction;
    const newReaction = wasReacted ? null : 'like';
    setReaction(newReaction);
    if (newReaction) {
      setLocalLikes((n) => n + 1);
    } else {
      setLocalLikes((n) => Math.max(0, n - 1));
    }
    const myId = user?.id || user?._id || 'me';
    setLocalReactions(prev => {
      const filtered = prev.filter(item => (item.user?._id || item.user || '').toString() !== myId.toString());
      if (newReaction) {
        return [...filtered, { user: myId, type: newReaction }];
      }
      return filtered;
    });
    reactPost(post.id || post._id, newReaction);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      deletePost(post.id || post._id);
    }
  };

  const handleArchive = async () => {
    if (window.confirm(`Are you sure you want to ${post.archived ? 'unarchive' : 'archive'} this post?`)) {
      const res = await archivePost(post.id || post._id);
      if (res?.success && onArchiveToggle) {
        onArchiveToggle(post.id || post._id);
      }
    }
  };

  return (
    <>
      <article className="card mb-3 overflow-hidden animate-fade-up">
        {/* Header */}
        <div className="flex items-start justify-between p-4 pb-3">
          <UserDisplay
            user={post.author}
            size="md"
            avatarClassName="ring-2 ring-sp-border hover:ring-sp-blue transition-all"
            nameClassName="text-[15px] font-semibold hover:text-sp-blue transition-colors"
            subText={
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-sp-muted">{timeAgo(post.createdAt)}</span>
                {post.location && (
                  <>
                    <span className="text-sp-faint">·</span>
                    <span className="text-xs text-sp-muted flex items-center gap-0.5">
                      <FiMapPin size={10} />
                      {post.location}
                    </span>
                  </>
                )}
                <span className="text-sp-faint">·</span>
                {post.privacy === 'public'
                  ? <FiGlobe size={11} className="text-sp-muted" />
                  : <FiLock size={11} className="text-sp-muted" />
                }
              </div>
            }
          >
            {post.feeling && (
              <span className="text-sp-sub text-sm flex items-center gap-1">— is feeling {post.feeling} <FiStar size={12} className="text-yellow-400" /></span>
            )}
          </UserDisplay>

          {/* Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-sp-muted hover:text-sp-text hover:bg-sp-hover transition-all"
            >
              <FiMoreHorizontal size={18} />
            </button>
            {showMenu && (
              <div className="dropdown w-52 right-0 top-9 animate-scale-in">
                <div className="p-1.5">
                  <button
                    onClick={() => { setSaved(!saved); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-colors text-left text-sp-text hover:bg-sp-hover"
                  >
                    {saved ? <BsBookmarkFill size={15} /> : <FiBookmark size={15} />}
                    {saved ? 'Unsave Post' : 'Save Post'}
                  </button>
                  {isOwn && (
                    <>
                      <button
                        onClick={() => { handleArchive(); setShowMenu(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-colors text-left text-sp-text hover:bg-sp-hover"
                      >
                        <FiBookmark size={15} />
                        {post.archived ? 'Unarchive Post' : 'Archive Post'}
                      </button>
                      <button
                        onClick={() => { handleDelete(); setShowMenu(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-colors text-left text-sp-red hover:bg-sp-red/10 border-t border-sp-divider"
                      >
                        <FiTrash2 size={15} />
                        Delete Post
                      </button>
                    </>
                  )}
                  {!isOwn && (
                    <>
                      <button
                        onClick={() => setShowMenu(false)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-colors text-left text-sp-text hover:bg-sp-hover"
                      >
                        <FiUserMinus size={15} />
                        Unfollow user
                      </button>
                      <button
                        onClick={() => { setShowReportModal(true); setShowMenu(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-colors text-left text-sp-red hover:bg-sp-red/10 border-t border-sp-divider"
                      >
                        <FiFlag size={15} />
                        Report Post
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-3">
          <p className="text-sp-text text-[15px] leading-relaxed whitespace-pre-line">
            {parseMentions(displayContent).map((part, idx) => {
              if (part.isMention) {
                return (
                  <span
                    key={idx}
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const userId = await usersAPI.getIdByUsername(part.username);
                        if (userId) navigate(`/profile/${userId}`);
                      } catch (err) {
                        console.error('Mention click failed', err);
                      }
                    }}
                    className="text-sp-blue hover:underline cursor-pointer font-bold inline-block"
                  >
                    {part.text}
                  </span>
                );
              }
              return part.text;
            })}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-sp-blue text-sm font-semibold hover:underline mt-1"
            >
              {expanded ? 'See less' : 'See more'}
            </button>
          )}
          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {post.tags.map((tag) => (
                <span key={tag} className="text-sp-blue text-sm hover:underline cursor-pointer font-medium">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Image */}
        {post.image && (
          <div
            className="overflow-hidden cursor-zoom-in border-t border-b border-sp-divider"
            onClick={() => setImageOpen(true)}
          >
            <img
              src={post.image.startsWith('http') ? post.image : `http://localhost:5000${post.image}`}
              alt=""
              className="w-full max-h-[520px] object-cover hover:brightness-95 transition-all duration-500"
              loading="lazy"
            />
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-sp-divider bg-sp-surface/20">
          <button className="flex items-center gap-1.5 hover:underline">
            {getTopReactions().length > 0 ? (
              <span className="flex -space-x-1 mr-1">
                {getTopReactions().map((type) => (
                  <span key={type} className="w-5.5 h-5.5 rounded-full bg-sp-elevated flex items-center justify-center ring-1 ring-sp-bg scale-90 transition-transform duration-300">
                    {getReactionIcon(type, 14, true)}
                  </span>
                ))}
              </span>
            ) : (
              <span className="w-5 h-5 rounded-full bg-sp-elevated flex items-center justify-center text-[11px] ring-1 ring-sp-bg">
                <FiThumbsUp size={10} className="text-sp-muted" />
              </span>
            )}
            <span className="text-xs text-sp-sub font-semibold">{formatCount(localLikes)}</span>
          </button>
          <div className="flex items-center gap-3 text-xs text-sp-sub">
            <button
              onClick={() => setShowComments(!showComments)}
              className="hover:underline hover:text-sp-text transition-colors"
            >
              {formatCount(localComments)} comments
            </button>
            <span className="text-sp-faint">·</span>
            <span>{formatCount(post.sharesCount)} shares</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center border-t border-sp-divider px-1 py-0.5">
          <div className="relative flex-1">
            <ReactionPicker
              onSelect={(type) => {
                const r = REACTIONS.find((item) => item.key === type);
                if (r) handleReactionPick(r);
              }}
              current={reaction}
              positionClass="left-0"
            >
              <button
                onClick={handleLikeClick}
                className={clsx(
                  'react-btn w-full',
                  reaction ? 'text-sp-blue' : ''
                )}
                style={currentReaction ? { color: currentReaction.color } : {}}
              >
                <span className="text-lg flex items-center justify-center">
                  {reaction ? getReactionIcon(reaction, 18, true) : <FiThumbsUp size={18} />}
                </span>
                <span>{currentReaction ? currentReaction.label : 'Like'}</span>
              </button>
            </ReactionPicker>
          </div>

          <button
            onClick={() => setShowComments(!showComments)}
            className="react-btn flex-1"
          >
            <FiMessageCircle size={18} />
            <span>Comment</span>
          </button>

          <div className="relative flex-1" ref={shareRef}>
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="react-btn w-full"
            >
              <FiShare2 size={18} />
              <span>Share</span>
            </button>
            {showShareMenu && (
              <div className="dropdown bottom-12 right-0 w-44 py-1.5 bg-sp-card border border-sp-border rounded-xl shadow-dropdown z-40 animate-scale-in">
                <button
                  onClick={() => {
                    setShowShareMenu(false);
                    shareToStory({
                      contentType: 'post',
                      contentId: post.id || post._id,
                      authorId: post.author?._id || post.author?.id,
                      authorName: post.author?.name || 'Anonymous User',
                      authorAvatar: post.author?.avatar || '',
                      content: post.content || '',
                      mediaUrl: post.image || '',
                    });
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs rounded-lg text-left text-sp-text hover:bg-sp-hover font-semibold transition-colors"
                >
                  <FiExternalLink size={14} className="text-sp-blue" />
                  Share to Story
                </button>
                <button
                  onClick={() => {
                    setShowShareMenu(false);
                    navigator.clipboard.writeText(`${window.location.origin}/profile/${post.author?._id || post.author?.id}`);
                    showToast('success', 'Profile link copied to clipboard!');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs rounded-lg text-left text-sp-text hover:bg-sp-hover font-semibold transition-colors"
                >
                  <FiBookmark size={14} className="text-sp-muted" />
                  Copy Link
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Comment section */}
        {showComments && (
          <CommentSection
            postId={post.id || post._id}
            onCommentAdded={() => setLocalComments((c) => c + 1)}
            onCommentDeleted={() => setLocalComments((c) => Math.max(0, c - 1))}
          />
        )}
      </article>

      {/* Lightbox Modal */}
      {imageOpen && post.image && (
        <div
          className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setImageOpen(false)}
        >
          <button className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <FiX size={20} />
          </button>
          <img
            src={post.image.startsWith('http') ? post.image : `http://localhost:5000${post.image}`}
            alt=""
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-card-lg animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <ReportModal
          contentId={post.id || post._id}
          contentType="post"
          onClose={() => setShowReportModal(false)}
        />
      )}
    </>
  );
}
