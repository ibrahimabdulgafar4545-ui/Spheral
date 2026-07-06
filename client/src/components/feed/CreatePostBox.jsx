import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiImage, FiSmile, FiX, FiGlobe, FiLock, FiChevronDown, FiHeart, FiStar, FiSun, FiCoffee, FiActivity, FiWind, FiFrown } from 'react-icons/fi';
import { HiOutlineEmojiHappy } from 'react-icons/hi';
import { MdOutlineAddLocationAlt } from 'react-icons/md';
import { useApp } from '../../context/AppContext';
import LoadingSpinner from '../ui/LoadingSpinner';
import Avatar from '../ui/Avatar';

const FEELINGS = [
  { icon: FiSmile, label: 'Happy' },
  { icon: FiSun, label: 'Cool' },
  { icon: FiStar, label: 'Excited' },
  { icon: FiHeart, label: 'Loved' },
  { icon: FiActivity, label: 'Celebrating' },
  { icon: FiCoffee, label: 'Thoughtful' },
  { icon: FiWind, label: 'Tired' },
  { icon: FiFrown, label: 'Frustrated' }
];

export default function CreatePostBox() {
  const { user, addPost, showToast, friendsList } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen]           = useState(false);
  const [content, setContent]     = useState('');
  const [file, setFile]           = useState(null);
  const [preview, setPreview]     = useState('');
  const [showFeelings, setShowFeelings] = useState(false);
  const [feeling, setFeeling]     = useState('');
  const [privacy, setPrivacy]     = useState('public');
  const [posting, setPosting]     = useState(false);

  // Mentions autocomplete states
  const [mentionQuery, setMentionQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);

  const handleContentChange = (e) => {
    const val = e.target.value;
    setContent(val);

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
    const textBeforeAt = content.slice(0, content.slice(0, cursorPos).lastIndexOf('@'));
    const textAfterCursor = content.slice(cursorPos);
    const inserted = `${textBeforeAt}@${friend.username} ${textAfterCursor}`;
    setContent(inserted);
    setShowSuggestions(false);
    setMentionQuery('');
    
    const textarea = document.getElementById('post-textarea');
    if (textarea) {
      textarea.focus();
      setTimeout(() => {
        const nextPos = textBeforeAt.length + friend.username.length + 2;
        textarea.setSelectionRange(nextPos, nextPos);
      }, 0);
    }
  };

  const suggestedFriends = (friendsList || []).filter(friend => 
    friend.username?.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    friend.name?.toLowerCase().includes(mentionQuery.toLowerCase())
  ).slice(0, 5);

  useEffect(() => {
    if (searchParams.get('createPost') === 'true') {
      setOpen(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('createPost');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const reset = () => {
    setContent('');
    setPreview('');
    setFile(null);
    setShowFeelings(false);
    setFeeling('');
    setOpen(false);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const submit = async () => {
    if (!content.trim() && !file) return;
    setPosting(true);

    try {
      const formData = new FormData();
      formData.append('content', content.trim());
      formData.append('privacy', privacy);
      if (feeling) {
        formData.append('feeling', feeling.toLowerCase());
      }
      if (file) {
        formData.append('image', file);
      }

      const res = await addPost(formData);
      if (res.success) {
        reset();
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="card mb-3 animate-fade-up overflow-hidden">
      {/* Collapsed state */}
      <div className="flex items-center gap-3 p-4">
        <Avatar src={user?.avatar} alt={user?.name} className="w-10 h-10 rounded-full ring-2 ring-sp-border" />
        <button
          onClick={() => setOpen(true)}
          className="flex-1 text-left bg-sp-overlay hover:bg-sp-hover border border-sp-border rounded-full px-4 py-2.5 text-sp-muted text-sm transition-all"
        >
          What's on your mind, {user?.name?.split(' ')[0]}?
        </button>
      </div>

      {/* Quick Actions */}
      {!open && (
        <div className="flex items-stretch border-t border-sp-divider">
          <label className="flex items-center justify-center gap-2 flex-1 py-2.5 text-sp-sub text-sm font-semibold hover:bg-sp-hover transition-colors border-r border-sp-divider cursor-pointer">
            <FiImage className="text-green-400" size={18} />
            <span>Photo/Video</span>
            <input type="file" onChange={handleFileChange} className="hidden" accept="image/*" />
          </label>
          <button
            onClick={() => { setOpen(true); setShowFeelings(true); }}
            className="flex items-center justify-center gap-2 flex-1 py-2.5 text-sp-sub text-sm font-semibold hover:bg-sp-hover transition-colors border-r border-sp-divider last:border-0"
          >
            <HiOutlineEmojiHappy className="text-yellow-400" size={18} />
            <span>Feeling</span>
          </button>
        </div>
      )}

      {/* Expanded state */}
      {open && (
        <div className="border-t border-sp-divider animate-fade-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-sp-divider">
            <div className="flex items-center gap-3">
              <Avatar src={user?.avatar} alt={user?.name} className="w-9 h-9 rounded-full" />
              <div>
                <p className="font-semibold text-sp-text text-sm">{user?.name}</p>
                <button
                  onClick={() => setPrivacy(p => p === 'public' ? 'private' : 'public')}
                  className="flex items-center gap-1 bg-sp-overlay border border-sp-border rounded-full px-2.5 py-0.5 text-xs font-semibold text-sp-text hover:bg-sp-hover transition-colors mt-0.5"
                >
                  {privacy === 'public' ? <FiGlobe size={11} /> : <FiLock size={11} />}
                  <span className="capitalize">{privacy}</span>
                  <FiChevronDown size={10} />
                </button>
              </div>
            </div>
            <button onClick={reset} className="nav-btn">
              <FiX size={18} />
            </button>
          </div>

          <div className="px-4 py-3">
            <textarea
              id="post-textarea"
              autoFocus
              value={content}
              onChange={handleContentChange}
              placeholder={`What's on your mind, ${user?.name?.split(' ')[0]}?`}
              rows={4}
              className="w-full bg-transparent text-sp-text placeholder-sp-muted text-[17px] resize-none focus:outline-none leading-relaxed"
            />
            {feeling && (
              <p className="text-sp-sub text-sm mt-1">— is feeling {feeling}</p>
            )}
            
            {/* Mentions dropdown list */}
            {showSuggestions && suggestedFriends.length > 0 && (
              <div className="bg-sp-card border border-sp-border rounded-xl shadow-dropdown py-1 mt-2 max-h-48 overflow-y-auto z-50 relative animate-scale-in">
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
          </div>

          {/* Selected image preview */}
          {preview && (
            <div className="relative mx-4 mb-3 rounded-xl overflow-hidden">
              <img src={preview} alt="" className="w-full max-h-72 object-cover" />
              <button
                onClick={() => { setPreview(''); setFile(null); }}
                className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <FiX size={14} />
              </button>
            </div>
          )}

          {/* Feelings picker */}
          {showFeelings && (
            <div className="px-4 mb-3">
              <p className="text-xs text-sp-muted mb-2 font-semibold uppercase tracking-wider">How are you feeling?</p>
              <div className="flex flex-wrap gap-2">
                {FEELINGS.map((f) => (
                  <button
                    key={f.label}
                    onClick={() => { setFeeling(f.label); setShowFeelings(false); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border
                      ${feeling === f.label
                        ? 'bg-sp-blue text-white border-sp-blue'
                        : 'bg-sp-overlay border-sp-border text-sp-text hover:bg-sp-hover'
                      }`}
                  >
                    <f.icon size={14} />
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-sp-divider">
            <div className="flex items-center gap-1">
              <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-sp-sub hover:bg-sp-hover transition-colors cursor-pointer">
                <FiImage size={17} className="text-green-400" />
                <span className="hidden sm:inline">Photo</span>
                <input type="file" onChange={handleFileChange} className="hidden" accept="image/*" />
              </label>
              <button
                onClick={() => { setShowFeelings(!showFeelings); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors
                  ${showFeelings ? 'bg-yellow-500/10 text-yellow-400' : 'text-sp-sub hover:bg-sp-hover'}`}
              >
                <HiOutlineEmojiHappy size={17} />
                <span className="hidden sm:inline">Feeling</span>
              </button>
            </div>

            <button
              onClick={submit}
              disabled={(!content.trim() && !file) || posting}
              className="btn-primary btn-md disabled:opacity-40 min-w-[90px]"
            >
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
