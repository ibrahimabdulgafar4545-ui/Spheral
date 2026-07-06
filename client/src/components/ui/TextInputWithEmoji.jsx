import { useState, useEffect, useRef } from 'react';
import { FiSmile, FiStar, FiSend, FiPlus, FiX } from 'react-icons/fi';
import Avatar from './Avatar';

const EMOJIS = [
  '👍', '❤️', '😆', '😮', '😢', '😡', '😂', '🔥', '👏', '🎉',
  '🙌', '✨', '💡', '💯', '🙋‍♂️', '👀', '😎', '😍', '🤔', '🍕',
  '🎈', '💻', '⭐', '✔️', '🎁', '🍟', '👌'
];

const STICKERS = [
  { id: 'bear', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f43b/512.webp', label: 'Bear' },
  { id: 'cat', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f638/512.webp', label: 'Cat' },
  { id: 'heart', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f/512.webp', label: 'Heart' },
  { id: 'fire', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.webp', label: 'Fire' },
  { id: 'party', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.webp', label: 'Party' },
  { id: 'rocket', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.webp', label: 'Rocket' },
  { id: 'alien', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f47d/512.webp', label: 'Alien' },
  { id: 'sparkles', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2728/512.webp', label: 'Sparkles' },
];

export default function TextInputWithEmoji({
  value,
  onChange,
  onSubmit,
  placeholder = 'Write a comment…',
  onStickerSelect,
  inputRef,
  onKeyDown,
  disabled = false,
  showAvatar = false,
  avatarSrc = '',
  avatarName = '',
  panelDirection = 'above' // 'above' or 'below'
}) {
  const [showEmojis, setShowEmojis] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [customStickers, setCustomStickers] = useState([]);
  const stickerFileRef = useRef(null);
  const containerRef = useRef(null);

  // Load custom stickers from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('spheral_custom_stickers') || '[]');
      setCustomStickers(stored);
    } catch (e) {
      setCustomStickers([]);
    }
  }, []);

  // Close menus on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowEmojis(false);
        setShowStickers(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleEmojiClick = (emoji) => {
    onChange(value + emoji);
    setShowEmojis(false);
    if (inputRef?.current) {
      inputRef.current.focus();
    }
  };

  const handleStickerClick = (url) => {
    if (onStickerSelect) {
      onStickerSelect(url);
    }
    setShowStickers(false);
  };

  const handleAddCustomSticker = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const newSticker = {
        id: `custom_${Date.now()}`,
        url: reader.result,
        label: file.name.split('.')[0]
      };
      const updated = [...customStickers, newSticker];
      setCustomStickers(updated);
      localStorage.setItem('spheral_custom_stickers', JSON.stringify(updated));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDeleteCustomSticker = (id) => {
    const updated = customStickers.filter(s => s.id !== id);
    setCustomStickers(updated);
    localStorage.setItem('spheral_custom_stickers', JSON.stringify(updated));
  };

  const handleSubmitForm = (e) => {
    if (e) e.preventDefault();
    if (disabled || !value.trim()) return;
    onSubmit();
  };

  const panelPositionClass = panelDirection === 'above' ? 'bottom-full mb-3' : 'top-full mt-3';

  return (
    <div className="flex items-center gap-2.5 w-full relative" ref={containerRef}>
      {showAvatar && (
        <Avatar src={avatarSrc} alt={avatarName} size="sm" className="flex-shrink-0" />
      )}
      
      <div className="relative flex-1 flex items-center">
        {/* Emoji Selector Panel */}
        {showEmojis && (
          <div className={`absolute ${panelPositionClass} left-0 z-50 bg-sp-card border border-sp-border rounded-xl p-3 shadow-dropdown w-64 animate-bounce-in grid grid-cols-6 gap-2 max-h-44 overflow-y-auto`}>
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleEmojiClick(emoji)}
                className="text-xl p-1 hover:scale-125 transition-transform duration-100 flex items-center justify-center cursor-pointer text-sp-text"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Sticker Selector Panel */}
        {showStickers && (
          <div className={`absolute ${panelPositionClass} left-0 z-50 bg-sp-card border border-sp-border rounded-2xl p-3 shadow-dropdown w-72 animate-bounce-in`}>
            <div className="flex justify-between items-center mb-2 pb-1 border-b border-sp-divider">
              <span className="text-xs font-bold text-sp-text uppercase tracking-wider">Stickers</span>
              <button type="button" onClick={() => setShowStickers(false)} className="text-sp-muted hover:text-sp-text">
                <FiX size={13} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 max-h-44 overflow-y-auto no-scroll">
              {/* Create Custom Sticker */}
              <button
                type="button"
                onClick={() => stickerFileRef.current?.click()}
                className="hover:scale-110 transition-transform duration-100 p-1 bg-sp-overlay rounded-lg border-2 border-dashed border-sp-blue/40 flex flex-col items-center justify-center gap-0.5 text-sp-blue h-14"
                title="Create custom sticker"
              >
                <FiPlus size={16} />
                <span className="text-[8px] font-bold uppercase">Create</span>
              </button>
              <input
                type="file"
                ref={stickerFileRef}
                accept="image/*"
                className="hidden"
                onChange={handleAddCustomSticker}
              />

              {/* Custom Stickers */}
              {customStickers.map((stk) => (
                <div key={stk.id} className="relative group">
                  <button
                    type="button"
                    onClick={() => handleStickerClick(stk.url)}
                    className="hover:scale-110 transition-transform duration-100 p-1 bg-sp-overlay rounded-lg border border-sp-blue/30 flex items-center justify-center w-full h-14"
                  >
                    <img src={stk.url} alt={stk.label} className="max-w-full max-h-full object-contain rounded" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomSticker(stk.id)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Default Stickers */}
              {STICKERS.map((stk) => (
                <button
                  key={stk.id}
                  type="button"
                  onClick={() => handleStickerClick(stk.url)}
                  className="hover:scale-110 transition-transform duration-100 p-1 bg-sp-overlay rounded-lg border border-sp-border flex items-center justify-center h-14"
                >
                  <img src={stk.url} alt={stk.label} className="max-w-full max-h-full object-contain" />
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmitForm} className="relative flex-1 flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full bg-sp-overlay border border-sp-border rounded-full px-4 py-2 pr-20 text-sm text-sp-text placeholder-sp-muted focus:outline-none focus:border-sp-blue focus:ring-1 focus:ring-sp-blue/30 transition-all"
          />
          <div className="absolute right-9 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => { setShowEmojis(!showEmojis); setShowStickers(false); }}
              className={`transition-colors ${showEmojis ? 'text-sp-blue' : 'text-sp-muted hover:text-sp-text'}`}
              title="Add Emoji"
            >
              <FiSmile size={16} />
            </button>
            <button
              type="button"
              onClick={() => { setShowStickers(!showStickers); setShowEmojis(false); }}
              className={`transition-colors ${showStickers ? 'text-sp-blue' : 'text-sp-muted hover:text-sp-text'}`}
              title="Add Sticker"
            >
              <FiStar size={15} />
            </button>
          </div>
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sp-blue hover:text-blue-400 transition-colors disabled:opacity-30 flex items-center justify-center"
          >
            <FiSend size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
