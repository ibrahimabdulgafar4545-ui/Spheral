import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiSend, FiMoreHorizontal, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useApp } from '../../context/AppContext';
import { commentsAPI } from '../../api/comments';
import { timeAgo, parseMentions } from '../../utils/helpers';
import { usersAPI } from '../../api/users';
import LoadingSpinner from '../ui/LoadingSpinner';
import Avatar from '../ui/Avatar';
import VerifiedBadge from '../ui/VerifiedBadge';
import clsx from 'clsx';
import ReportModal from '../modals/ReportModal';
import ReactionPicker from '../ui/ReactionPicker';
import { getReactionIcon } from '../ui/ReactionIcons';
import TextInputWithEmoji from '../ui/TextInputWithEmoji';

export default function CommentSection({ postId, onCommentAdded, onCommentDeleted }) {
  const { user, showToast, friendsList } = useApp();
  const navigate = useNavigate();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  // Mentions autocomplete
  const [mentionQuery, setMentionQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);
    const selStart = e.target.selectionStart;
    setCursorPos(selStart);
    const textBeforeCursor = val.slice(0, selStart);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      if (!textAfterAt.includes(' ')) {
        setMentionQuery(textAfterAt);
        setShowSuggestions(true);
        return;
      }
    }
    setShowSuggestions(false);
    setMentionQuery('');
  };

  const selectFriendMention = (friend) => {
    const textBeforeAt = text.slice(0, text.slice(0, cursorPos).lastIndexOf('@'));
    const textAfterCursor = text.slice(cursorPos);
    const inserted = `${textBeforeAt}@${friend.username} ${textAfterCursor}`;
    setText(inserted);
    setShowSuggestions(false);
    setMentionQuery('');
    if (inputRef.current) {
      inputRef.current.focus();
      setTimeout(() => {
        const nextPos = textBeforeAt.length + friend.username.length + 2;
        inputRef.current.setSelectionRange(nextPos, nextPos);
      }, 0);
    }
  };

  const suggestedFriends = (friendsList || []).filter(f =>
    f.username?.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    f.name?.toLowerCase().includes(mentionQuery.toLowerCase())
  ).slice(0, 5);

  const [likedMap, setLikedMap] = useState({});
  const [reactionMap, setReactionMap] = useState({});
  const [likesCountMap, setLikesCountMap] = useState({});
  const [openReplies, setOpenReplies] = useState({});
  const [replyText, setReplyText] = useState({});
  const [reportCommentId, setReportCommentId] = useState(null);
  const inputRef = useRef(null);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const res = await commentsAPI.getComments(postId);
      if (res.success) {
        setComments(res.comments);
        const map = {}, reactMap = {}, countMap = {};
        res.comments.forEach(c => {
          map[c.id || c._id] = c.liked;
          reactMap[c.id || c._id] = c.currentReaction || null;
          countMap[c.id || c._id] = c.likesCount || 0;
        });
        setLikedMap(map);
        setReactionMap(reactMap);
        setLikesCountMap(countMap);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchComments(); }, [postId]);

  const handleStickerSelect = async (stickerUrl) => {
    try {
      const res = await commentsAPI.createComment(postId, stickerUrl);
      if (res.success) {
        fetchComments();
        if (onCommentAdded) onCommentAdded();
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const submit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!text.trim()) return;
    try {
      const res = await commentsAPI.createComment(postId, text.trim());
      if (res.success) {
        setText('');
        fetchComments();
        if (onCommentAdded) onCommentAdded();
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const submitReply = async (commentId, stickerUrl) => {
    const rt = stickerUrl || replyText[commentId];
    if (!rt?.trim()) return;
    try {
      const res = await commentsAPI.addReply(commentId, rt.trim());
      if (res.success) {
        setReplyText(p => ({ ...p, [commentId]: '' }));
        setOpenReplies(p => ({ ...p, [commentId]: false }));
        fetchComments();
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleCommentReact = async (commentId, type) => {
    try {
      const currentReaction = reactionMap[commentId] || null;
      const newReaction = currentReaction === type ? null : type;
      setReactionMap(p => ({ ...p, [commentId]: newReaction }));
      setLikesCountMap(p => {
        const diff = newReaction ? (currentReaction ? 0 : 1) : -1;
        return { ...p, [commentId]: Math.max(0, (p[commentId] || 0) + diff) };
      });
      const res = await commentsAPI.reactComment(commentId, newReaction);
      if (res.success) setLikesCountMap(p => ({ ...p, [commentId]: res.likesCount }));
    } catch (err) {
      showToast('error', err.message);
      fetchComments();
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      const res = await commentsAPI.deleteComment(commentId);
      if (res.success) {
        showToast('success', 'Comment deleted');
        setComments(prev => prev.filter(c => (c.id || c._id) !== commentId));
        if (onCommentDeleted) onCommentDeleted();
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleEdit = async (commentId, newContent) => {
    try {
      const res = await commentsAPI.editComment(commentId, newContent);
      if (res.success) {
        setComments(prev => prev.map(c =>
          (c.id || c._id) === commentId
            ? { ...c, content: res.comment.content, isEdited: true }
            : c
        ));
        showToast('success', 'Comment updated');
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  return (
    <div className="px-4 pt-1 pb-4 border-t border-sp-divider bg-sp-surface/40">
      {loading ? (
        <div className="flex justify-center py-4"><LoadingSpinner size="sm" /></div>
      ) : (
        comments.length > 0 && (
          <div className="flex flex-col gap-3 pt-3 mb-3">
            {comments.map((c) => (
              <CommentItem
                key={c.id || c._id}
                comment={c}
                reaction={reactionMap[c.id || c._id] || null}
                onReact={(type) => handleCommentReact(c.id || c._id, type)}
                likesCount={likesCountMap[c.id || c._id] || 0}
                onReply={() => {
                  setOpenReplies(p => ({ ...p, [c.id || c._id]: !p[c.id || c._id] }));
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                showReplyInput={!!openReplies[c.id || c._id]}
                replyText={replyText[c.id || c._id] || ''}
                onReplyChange={(v) => setReplyText(p => ({ ...p, [c.id || c._id]: v }))}
                onReplySubmit={(stickerUrl) => submitReply(c.id || c._id, stickerUrl)}
                currentUser={user}
                onDelete={() => handleDelete(c.id || c._id)}
                onEdit={(newContent) => handleEdit(c.id || c._id, newContent)}
                onReport={(id) => setReportCommentId(id)}
                navigate={navigate}
              />
            ))}
          </div>
        )
      )}

      {/* Mentions dropdown */}
      {showSuggestions && suggestedFriends.length > 0 && (
        <div className="bg-sp-card border border-sp-border rounded-xl shadow-dropdown py-1 mb-2 max-h-48 overflow-y-auto z-50 relative animate-scale-in">
          {suggestedFriends.map(friend => (
            <button
              key={friend.id || friend._id}
              onClick={() => selectFriendMention(friend)}
              className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-sp-hover transition-colors text-left"
            >
              <Avatar src={friend.avatar} alt={friend.name} size="xs" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-sp-text leading-tight">{friend.name}</p>
                <p className="text-[10px] text-sp-muted">@{friend.username}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* New comment form */}
      <TextInputWithEmoji
        value={text}
        onChange={(v) => handleTextChange({ target: { value: v } })}
        onSubmit={() => submit()}
        onStickerSelect={handleStickerSelect}
        inputRef={inputRef}
        placeholder="Write a comment…"
        showAvatar={true}
        avatarSrc={user?.avatar}
        avatarName={user?.name}
      />

      {reportCommentId && (
        <ReportModal
          contentId={reportCommentId}
          contentType="comment"
          onClose={() => setReportCommentId(null)}
        />
      )}
    </div>
  );
}

// ── CommentItem ──────────────────────────────────────────────────────────────
const isSticker = (content) => {
  if (!content) return false;
  const trimmed = content.trim();
  return (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/') || trimmed.startsWith('/uploads/')) && !trimmed.includes(' ');
};

function CommentItem({ comment, reaction, onReact, likesCount, onReply, showReplyInput, replyText, onReplyChange, onReplySubmit, currentUser, onDelete, onEdit, onReport, navigate }) {
  const isOwn = comment.author?._id === currentUser?.id || comment.author?.id === currentUser?.id;
  const [showMenu, setShowMenu] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const menuRef = useRef(null);

  useEffect(() => {
    const fn = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const handleSaveEdit = async () => {
    if (!editText.trim() || editText.trim() === comment.content) {
      setEditMode(false);
      return;
    }
    await onEdit(editText.trim());
    setEditMode(false);
  };

  return (
    <div className="flex items-start gap-2.5 animate-fade-in">
      <Link to={`/profile/${comment.author?._id || comment.author?.id}`} className="flex-shrink-0">
        <Avatar src={comment.author?.avatar} alt={comment.author?.name} size="sm" />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="bg-sp-overlay rounded-2xl px-3.5 py-2.5 inline-block max-w-full relative group">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Link to={`/profile/${comment.author?._id || comment.author?.id}`} className="text-[13px] font-semibold text-sp-text hover:text-sp-blue transition-colors">
                {comment.author?.name}
              </Link>
              {comment.author?.verified && (
                <VerifiedBadge size={11} />
              )}
            </div>
            {isOwn && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(s => !s)}
                  className="text-sp-muted hover:text-sp-text transition-colors md:opacity-0 md:group-hover:opacity-100 p-0.5 rounded"
                >
                  <FiMoreHorizontal size={14} />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-6 z-50 bg-sp-card border border-sp-border rounded-xl shadow-2xl py-1 w-32 animate-scale-in">
                    <button
                      onClick={() => { setEditMode(true); setEditText(comment.content); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-sp-text hover:bg-sp-hover transition-colors font-semibold"
                    >
                      <FiEdit2 size={13} /> Edit
                    </button>
                    <button
                      onClick={() => { setShowMenu(false); onDelete(); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-400/10 transition-colors font-semibold"
                    >
                      <FiTrash2 size={13} /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {editMode ? (
            <div className="mt-1.5 flex items-center gap-2">
              <input
                autoFocus
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditMode(false); }}
                className="flex-1 bg-sp-surface border border-sp-blue rounded-lg px-2 py-1 text-sm text-sp-text focus:outline-none"
              />
              <button onClick={handleSaveEdit} className="text-xs text-sp-blue font-bold hover:underline">Save</button>
              <button onClick={() => setEditMode(false)} className="text-xs text-sp-muted hover:underline">Cancel</button>
            </div>
          ) : (
            isSticker(comment.content) ? (
              <img src={comment.content} alt="sticker" className="w-20 h-20 object-contain rounded-lg mt-1" />
            ) : (
              <p className="text-sm text-sp-text leading-snug mt-0.5">
                {parseMentions(comment.content).map((part, idx) => {
                  if (part.isMention) {
                    return (
                      <span
                        key={idx}
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const userId = await usersAPI.getIdByUsername(part.username);
                            if (userId) navigate(`/profile/${userId}`);
                          } catch (err) { console.error(err); }
                        }}
                        className="text-sp-blue hover:underline cursor-pointer font-bold inline-block"
                      >
                        {part.text}
                      </span>
                    );
                  }
                  return part.text;
                })}
                {comment.isEdited && (
                  <span className="text-[10px] text-sp-muted ml-1.5 font-normal">(edited)</span>
                )}
              </p>
            )
          )}
        </div>

        <div className="flex items-center gap-3 mt-1 ml-1">
          <span className="text-[11px] text-sp-muted">{timeAgo(comment.createdAt)}</span>
          <ReactionPicker onSelect={onReact} current={reaction} positionClass="left-0">
            <button
              onClick={() => onReact(reaction ? null : 'like')}
              className={clsx(
                'text-[12px] font-bold transition-colors cursor-pointer flex items-center gap-1.5',
                reaction ? 'text-sp-blue' : 'text-sp-muted hover:text-sp-blue'
              )}
            >
              {reaction ? (
                <span className="flex items-center gap-1">
                  {getReactionIcon(reaction, 14, true)}
                  <span>{reaction.charAt(0).toUpperCase() + reaction.slice(1)}</span>
                </span>
              ) : 'Like'}
            </button>
          </ReactionPicker>
          <button onClick={onReply} className="text-[12px] font-bold text-sp-muted hover:text-sp-blue transition-colors">
            Reply
          </button>
          {!isOwn && (
            <button onClick={() => onReport(comment.id || comment._id)} className="text-[12px] font-bold text-sp-muted hover:text-red-500 transition-colors">
              Report
            </button>
          )}
          {likesCount > 0 && (
            <span className="text-[12px] text-sp-muted flex items-center gap-0.5">
              {getReactionIcon(reaction || 'like', 12, true)} <span>{likesCount}</span>
            </span>
          )}
        </div>

        {/* Replies */}
        {comment.replies?.length > 0 && (
          <div className="mt-2 flex flex-col gap-2 ml-2 pl-3 border-l border-sp-divider">
            {comment.replies.map((r) => (
              <div key={r._id || r.id} className="flex items-start gap-2">
                <Link to={`/profile/${r.author?._id || r.author?.id}`} className="flex-shrink-0">
                  <Avatar src={r.author?.avatar} alt={r.author?.name} size="xs" />
                </Link>
                <div className="bg-sp-overlay rounded-2xl px-3 py-2 inline-block">
                  <Link to={`/profile/${r.author?._id || r.author?.id}`} className="text-[12px] font-semibold text-sp-text hover:text-sp-blue transition-colors">
                    {r.author?.name}
                  </Link>
                  {isSticker(r.content) ? (
                    <img src={r.content} alt="sticker" className="w-16 h-16 object-contain rounded-lg mt-1" />
                  ) : (
                    <p className="text-[13px] text-sp-text leading-snug">
                      {parseMentions(r.content).map((part, idx) => {
                        if (part.isMention) {
                          return (
                            <span
                              key={idx}
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const userId = await usersAPI.getIdByUsername(part.username);
                                  if (userId) navigate(`/profile/${userId}`);
                                } catch (err) { console.error(err); }
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
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reply input */}
        {showReplyInput && (
          <div className="mt-2 pl-3">
            <TextInputWithEmoji
              value={replyText}
              onChange={onReplyChange}
              onSubmit={onReplySubmit}
              onStickerSelect={(url) => onReplySubmit(url)}
              placeholder={`Reply to ${comment.author?.name}…`}
              showAvatar={true}
              avatarSrc={currentUser?.avatar}
              avatarName={currentUser?.name}
              panelDirection="above"
            />
          </div>
        )}
      </div>
    </div>
  );
}
