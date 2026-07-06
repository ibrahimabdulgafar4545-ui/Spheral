import { useState, useRef, useEffect } from 'react';
import { FiX, FiMusic, FiSmile, FiType, FiCheck, FiPlay, FiPause, FiUpload } from 'react-icons/fi';
import { useApp } from '../../context/AppContext';
import api from '../../api/axios';
import Avatar from './Avatar';

export default function CreativeEditor({ file, type = 'story', embed = null, onComplete, onCancel }) {
  const [activeTab, setActiveTab] = useState(null); // 'music', 'stickers', 'text'
  const [overlays, setOverlays] = useState([]); // { id, type, content, x, y, scale, color, font }
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioName, setAudioName] = useState('Original Audio');
  const [customAudioFile, setCustomAudioFile] = useState(null);
  const customAudioRef = useRef(null);
  
  // Audio state
  const [searchQuery, setSearchQuery] = useState('');
  const [tracks, setTracks] = useState([]);
  const [playingPreview, setPlayingPreview] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const audioRef = useRef(new Audio());

  // AI Suggestion State
  const [aiCaption, setAiCaption] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestedVibe, setSuggestedVibe] = useState('');

  const handleAiSuggest = async () => {
    if (!aiCaption.trim()) return;
    setAiLoading(true);
    setSearchError('');
    setSuggestedVibe('');
    try {
      const res = await api.post('/music/suggest-song', { caption: aiCaption.trim() });
      if (res.results) {
        setTracks(res.results);
        setSuggestedVibe(res.vibe);
      }
    } catch (err) {
      console.error('AI suggestion failed', err);
      const isRateLimit = err.response?.status === 429 || err.message?.includes('429') || err.message?.includes('limit');
      setSearchError(isRateLimit ? 'Try again in a moment (Rate limit reached).' : (err.response?.data?.message || err.message || 'AI suggestion failed.'));
    } finally {
      setTimeout(() => {
        setAiLoading(false);
      }, 3000); // 3 second cooldown
    }
  };
  
  // Drag state
  const [dragItem, setDragItem] = useState(null);
  const containerRef = useRef(null);
  const { friendsList } = useApp();

  // Text overlay mentions states
  const [overlayText, setOverlayText] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);

  const suggestedFriends = (friendsList || []).filter(friend => 
    friend.username?.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    friend.name?.toLowerCase().includes(mentionQuery.toLowerCase())
  ).slice(0, 5);
  
  const isVideo = file ? file.type.startsWith('video/') : false;
  const fileUrl = file ? URL.createObjectURL(file) : null;

  // Search music via Backend (Debounced for autocomplete suggestions)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setTracks([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      setSearchError('');
      try {
        const res = await api.get(`/music/search?q=${encodeURIComponent(searchQuery)}`);
        setTracks(res.results || []);
      } catch (err) {
        console.error('Music search failed', err);
        setSearchError(err.message || 'Search failed.');
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const searchMusic = (e) => {
    if (e) e.preventDefault();
  };

  const togglePreview = (track) => {
    if (playingPreview === track.id) {
      audioRef.current.pause();
      setPlayingPreview(null);
    } else {
      audioRef.current.src = track.audio;
      audioRef.current.play().catch(() => {});
      setPlayingPreview(track.id);
    }
  };

  const selectAudio = (track) => {
    audioRef.current.pause();
    setPlayingPreview(null);
    setAudioUrl(track.audio);
    setAudioName(`${track.name} - ${track.artist_name}`);
    setActiveTab(null);
  };



  const addSticker = (emoji) => {
    setOverlays([...overlays, {
      id: Math.random().toString(),
      type: 'sticker',
      content: emoji,
      x: 50,
      y: 50,
      scale: 1
    }]);
    setActiveTab(null);
  };

  const handlePointerDown = (e, overlay) => {
    setDragItem(overlay.id);
  };

  const handlePointerMove = (e) => {
    if (!dragItem || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setOverlays(prev => prev.map(o => o.id === dragItem ? { ...o, x, y } : o));
  };

  const handlePointerUp = () => {
    setDragItem(null);
  };

  const handleCustomAudioUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Stop any currently playing preview
    audioRef.current.pause();
    setPlayingPreview(null);
    
    const localUrl = URL.createObjectURL(file);
    setCustomAudioFile(file);
    setAudioUrl(localUrl);
    setAudioName(`Custom: ${file.name}`);
    setActiveTab(null);
  };

  const handleComplete = () => {
    audioRef.current.pause();
    onComplete({ overlays, audioUrl, audioName, customAudioFile });
  };

  useEffect(() => {
    return () => {
      audioRef.current.pause();
      audioRef.current.src = '';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[10000] bg-black text-white flex flex-col sm:flex-row select-none">
      <button onClick={onCancel} className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center z-50 hover:bg-black/80">
        <FiX size={24} />
      </button>

      {/* Preview Area */}
      <div className="relative flex-1 bg-zinc-950 flex items-center justify-center overflow-hidden" 
           ref={containerRef}
           onPointerMove={handlePointerMove}
           onPointerUp={handlePointerUp}
           onPointerLeave={handlePointerUp}>
        
        {embed ? (
          <div className="w-full h-full bg-gradient-to-tr from-[#1a73e8] via-[#7c3aed] to-[#ec4899] animate-pulse-slow absolute inset-0" />
        ) : isVideo ? (
          <video src={fileUrl} autoPlay loop muted className="w-full h-full object-contain pointer-events-none" />
        ) : (
          <img src={fileUrl} alt="preview" className="w-full h-full object-contain pointer-events-none" />
        )}

        {/* Embedded Post/Reel card */}
        {embed && (
          <div className="absolute z-20 w-[280px] bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 text-left pointer-events-none select-none">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 overflow-hidden flex-shrink-0">
                <img src={embed.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80'} alt={embed.authorName} className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">{embed.authorName}</p>
                <p className="text-[10px] text-white/60">Shared a {embed.contentType}</p>
              </div>
            </div>
            {embed.mediaUrl && (
              <div className="w-full h-32 rounded-xl overflow-hidden bg-black/30 border border-white/5">
                <img src={embed.mediaUrl} alt="shared media" className="w-full h-full object-cover" />
              </div>
            )}
            <p className="text-xs text-white/90 font-medium line-clamp-2 mt-0.5">{embed.content || "Check out this content!"}</p>
            <div className="mt-1 flex items-center justify-center gap-1.5 py-1.5 bg-white/10 rounded-lg text-[10px] font-bold text-white uppercase tracking-wider border border-white/5">
              <span>View Original {embed.contentType}</span>
            </div>
          </div>
        )}

        {/* Attached Music Badge */}
        {audioUrl && (
          <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10 z-30 max-w-[80%] text-xs font-semibold text-white select-none">
            <FiMusic size={12} className="text-sp-blue animate-pulse" />
            <span className="truncate">{audioName}</span>
          </div>
        )}

        {/* Render Overlays */}
        {overlays.map(overlay => (
          <div
            key={overlay.id}
            onPointerDown={(e) => handlePointerDown(e, overlay)}
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing font-bold drop-shadow-xl"
            style={{ 
              left: `${overlay.x}%`, 
              top: `${overlay.y}%`, 
              transform: `translate(-50%, -50%) scale(${overlay.scale})`,
              color: overlay.color || '#fff',
              fontSize: overlay.type === 'sticker' ? '4rem' : '2rem'
            }}
          >
            {overlay.content}
          </div>
        ))}
      </div>

      {/* Editor Controls Panel */}
      <div className="w-full sm:w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col h-1/2 sm:h-full z-40 relative">
        <div className="flex p-2 border-b border-zinc-800 justify-around">
          <button onClick={() => setActiveTab('music')} className={`p-3 rounded-xl transition ${activeTab==='music'?'bg-zinc-800 text-sp-blue':'text-zinc-400 hover:text-white'}`}>
            <FiMusic size={22} />
          </button>
          <button onClick={() => setActiveTab('stickers')} className={`p-3 rounded-xl transition ${activeTab==='stickers'?'bg-zinc-800 text-sp-blue':'text-zinc-400 hover:text-white'}`}>
            <FiSmile size={22} />
          </button>
          <button onClick={() => setActiveTab('text')} className={`p-3 rounded-xl transition ${activeTab==='text'?'bg-zinc-800 text-sp-blue':'text-zinc-400 hover:text-white'}`}>
            <FiType size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 relative">
          {activeTab === 'music' && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm">Add Sound</h3>
              {audioUrl && (
                <div className="bg-sp-blue/20 text-sp-blue p-3 rounded-xl text-sm flex justify-between items-center">
                  <span className="truncate pr-2">{audioName}</span>
                  <button onClick={() => { setAudioUrl(null); setCustomAudioFile(null); }} className="text-red-400 text-xs font-bold shrink-0">Remove</button>
                </div>
              )}
              
              <div className="pt-2 pb-4 border-b border-zinc-800">
                <input 
                  type="file" 
                  accept="audio/*" 
                  ref={customAudioRef} 
                  className="hidden" 
                  onChange={handleCustomAudioUpload} 
                />
                <button 
                  onClick={() => customAudioRef.current?.click()}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition"
                >
                  <FiUpload size={16} />
                  Upload Custom Audio (MP3/WAV)
                </button>
                <p className="text-xs text-zinc-500 text-center mt-2">Bypass Spotify limits by uploading your own audio file.</p>
              </div>

              <form onSubmit={searchMusic} className="flex gap-2">
                <input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search music..." className="flex-1 bg-zinc-950 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                <button type="submit" className="bg-sp-blue text-white px-3 py-2 rounded-lg text-sm font-bold">Search</button>
              </form>
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex flex-col gap-2 mt-2">
                <p className="text-xs font-bold text-sp-blue flex items-center gap-1">
                  <span>Suggest a song 🎵 (AI)</span>
                </p>
                <textarea
                  rows={2}
                  placeholder="Paste your post caption or vibe here..."
                  value={aiCaption}
                  onChange={(e) => setAiCaption(e.target.value)}
                  className="w-full bg-zinc-900 rounded-lg p-2 text-xs focus:outline-none border border-zinc-800 text-white resize-none"
                />
                <button
                  type="button"
                  onClick={handleAiSuggest}
                  disabled={aiLoading || !aiCaption.trim()}
                  className="w-full bg-sp-blue hover:bg-blue-600 disabled:opacity-40 disabled:hover:bg-sp-blue text-white font-bold py-1.5 px-3 rounded-lg text-xs transition"
                >
                  {aiLoading ? 'Analyzing vibe...' : 'Suggest a Vibe & Search 🎵'}
                </button>
              </div>

              {suggestedVibe && (
                <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg text-xs font-semibold text-center border border-emerald-500/20 mt-2">
                  AI Suggested Vibe: "{suggestedVibe}"
                </div>
              )}

              <div className="space-y-2 mt-4">
                {isSearching && <div className="text-zinc-500 text-sm text-center">Searching...</div>}
                {searchError && <div className="text-red-400 text-sm text-center font-bold">{searchError}</div>}
                {tracks.map(track => (
                  <div key={track.id} className={`flex items-center justify-between p-2 rounded-lg group ${!track.audio ? 'opacity-50' : 'hover:bg-zinc-800'}`}>
                    <button 
                      onClick={() => track.audio && togglePreview(track)} 
                      disabled={!track.audio}
                      className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {playingPreview === track.id ? <FiPause size={12} /> : <FiPlay size={12} className="ml-0.5" />}
                    </button>
                    <div className="flex-1 px-3 min-w-0">
                      <p className="text-sm font-bold truncate">{track.name}</p>
                      <p className="text-xs text-zinc-400 truncate">{track.artist_name}</p>
                    </div>
                    {track.audio ? (
                      <button onClick={() => selectAudio(track)} className="bg-white text-black px-3 py-1 rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition">Add</button>
                    ) : (
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">No Preview</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'stickers' && (
            <div>
              <h3 className="font-bold text-sm mb-4">Stickers & Emojis</h3>
              <div className="grid grid-cols-4 gap-4 text-3xl">
                {['😂','❤️','🔥','✨','🎉','😎','🙌','💯','👀','🤔','🥺','👍'].map(emoji => (
                  <button key={emoji} onClick={() => addSticker(emoji)} className="hover:scale-125 transition-transform duration-200">
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'text' && (
            <div className="flex flex-col space-y-4">
              <h3 className="font-bold text-sm text-white">Add Text Overlay</h3>
              <div className="relative">
                <textarea
                  id="story-text-input"
                  value={overlayText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setOverlayText(val);
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
                  }}
                  placeholder="Type anything, use @ to mention friends..."
                  rows={4}
                  className="w-full bg-zinc-950 rounded-xl px-3.5 py-3 text-sm focus:outline-none border border-zinc-800 text-white placeholder-zinc-500 resize-none leading-relaxed"
                />

                {/* Mentions dropdown list */}
                {showSuggestions && suggestedFriends.length > 0 && (
                  <div className="absolute left-0 right-0 bottom-full mb-1 bg-zinc-900 border border-zinc-800 rounded-xl shadow-dropdown py-1 max-h-40 overflow-y-auto z-[60] animate-scale-in">
                    {suggestedFriends.map(friend => (
                      <button
                        key={friend.id || friend._id}
                        onClick={() => {
                          const textBeforeAt = overlayText.slice(0, overlayText.slice(0, cursorPos).lastIndexOf('@'));
                          const textAfterCursor = overlayText.slice(cursorPos);
                          const inserted = `${textBeforeAt}@${friend.username} ${textAfterCursor}`;
                          setOverlayText(inserted);
                          setShowSuggestions(false);
                          setMentionQuery('');
                          const textarea = document.getElementById('story-text-input');
                          if (textarea) {
                            textarea.focus();
                            setTimeout(() => {
                              const nextPos = textBeforeAt.length + friend.username.length + 2;
                              textarea.setSelectionRange(nextPos, nextPos);
                            }, 0);
                          }
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-800 transition-colors text-left text-white"
                      >
                        <Avatar src={friend.avatar} alt={friend.name} size="xs" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold leading-tight">{friend.name}</p>
                          <p className="text-[10px] text-zinc-400">@{friend.username}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => {
                  if (!overlayText.trim()) return;
                  setOverlays([...overlays, {
                    id: Math.random().toString(),
                    type: 'text',
                    content: overlayText.trim(),
                    x: 50,
                    y: 50,
                    scale: 1,
                    color: '#ffffff'
                  }]);
                  setOverlayText('');
                  setActiveTab(null);
                }}
                className="w-full py-2.5 bg-white text-black rounded-xl font-bold text-sm hover:bg-zinc-200 transition"
              >
                Place Text Overlay
              </button>
            </div>
          )}
          
          {!activeTab && (
            <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500 text-sm">
              Select a tool above to edit your {type}.
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800">
          <button onClick={handleComplete} className="w-full py-3 bg-sp-blue text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition">
            <FiCheck size={18} />
            Continue to Post
          </button>
        </div>
      </div>
    </div>
  );
}
