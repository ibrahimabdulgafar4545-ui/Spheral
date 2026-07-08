import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { FiPlus, FiX, FiChevronLeft, FiChevronRight, FiHeart, FiVolume2, FiVolumeX, FiTrash2 } from 'react-icons/fi';
import { useApp } from '../../context/AppContext';
import { timeAgo, getAssetUrl, parseMentions } from '../../utils/helpers';
import { usersAPI } from '../../api/users';
import { storiesAPI } from '../../api/stories';
import Avatar from '../ui/Avatar';
import CreativeEditor from '../ui/CreativeEditor';

export default function Stories() {
  const { user, stories, uploadStory, activeLiveStreams } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewer, setViewer] = useState(null); // { storyIndex, slideIndex }
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (searchParams.get('createStory') === 'true') {
      fileInputRef.current?.click();
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('createStory');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
    }
  };

  const openStory = (index) => {
    setViewer({ storyIndex: index, slideIndex: 0 });
  };

  const handleAddStoryClick = () => {
    fileInputRef.current?.click();
  };

  const [draftStoryFile, setDraftStoryFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setDraftStoryFile(file);
    e.target.value = ''; // reset
  };

  const handleStoryComplete = async ({ overlays, audioUrl, audioName, customAudioFile }) => {
    const formData = new FormData();
    formData.append('image', draftStoryFile);
    formData.append('caption', 'Shared moments');
    if (audioUrl) formData.append('audioUrl', audioUrl);
    if (customAudioFile) formData.append('customAudio', customAudioFile);
    if (overlays.length > 0) formData.append('overlays', JSON.stringify(overlays));
    
    await uploadStory(formData);
    setDraftStoryFile(null);
  };

  return (
    <>
      <div className="relative group">
        <button onClick={() => scroll('left')} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-sp-card border border-sp-border rounded-full shadow-lg hidden md:flex items-center justify-center text-sp-text hover:bg-sp-hover z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <FiChevronLeft size={22} />
        </button>

        <div ref={scrollRef} className="flex gap-2.5 mb-3 overflow-x-auto no-scroll pb-1 pt-0.5 select-none relative z-10 scroll-smooth">
          {/* Current user Add Story card */}
          <div
            onClick={handleAddStoryClick}
            className="relative flex-shrink-0 w-[105px] h-[180px] rounded-2xl overflow-hidden cursor-pointer group/add border border-sp-border bg-sp-card flex flex-col items-center justify-end pb-3 hover:border-sp-blue/40 transition-colors"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,video/*"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Avatar
                src={user?.avatar}
                alt={user?.name}
                className="w-[72px] h-[72px] mb-4"
              />
              <div className="w-8 h-8 rounded-full bg-sp-blue flex items-center justify-center ring-4 ring-sp-card -mt-7 ml-10">
                <FiPlus size={16} className="text-white" />
              </div>
            </div>
            <p className="text-[11px] font-semibold text-sp-text text-center leading-tight px-2 mt-auto z-10">
              Add story
            </p>
          </div>

          {/* Active Live Streams */}
          {activeLiveStreams && activeLiveStreams.map((stream, idx) => (
            <Link
              key={`live_${stream.channelName}_${idx}`}
              to={`/live/${stream.channelName}`}
              className="relative flex-shrink-0 w-[105px] h-[180px] rounded-2xl overflow-hidden cursor-pointer group border-2 border-red-600 bg-zinc-900 flex flex-col items-center justify-center hover:border-red-500 transition-colors"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/80 z-0" />
              <div className="relative z-10 flex flex-col items-center justify-center h-full w-full p-2">
                <Avatar
                  src={stream.hostAvatar}
                  alt={stream.hostName}
                  className="w-[54px] h-[54px] mb-3 border-[3px] border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.6)]"
                />
                <span className="flex items-center justify-center gap-1 px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold shadow-md animate-pulse mb-1">
                  LIVE
                </span>
                <p className="text-[11px] font-bold text-white text-center leading-tight drop-shadow-md w-full truncate">
                  {stream.hostName.split(' ')[0]}
                </p>
              </div>
            </Link>
          ))}

          {/* Dynamic Friend Stories */}
          {stories.map((story, idx) => (
            <StoryCard key={story.id || story._id} story={story} onClick={() => openStory(idx)} />
          ))}
        </div>

        <button onClick={() => scroll('right')} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-sp-card border border-sp-border rounded-full shadow-lg hidden md:flex items-center justify-center text-sp-text hover:bg-sp-hover z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <FiChevronRight size={22} />
        </button>
      </div>

      {viewer !== null && stories[viewer.storyIndex] && (
        <StoryViewer
          stories={stories}
          initialIndex={viewer.storyIndex}
          onClose={() => setViewer(null)}
        />
      )}

      {draftStoryFile && (
        <CreativeEditor 
          file={draftStoryFile} 
          type="story"
          onComplete={handleStoryComplete}
          onCancel={() => setDraftStoryFile(null)} 
        />
      )}
    </>
  );
}

// ─── Story Card ────────────────────────────────────────────────────────────────
function StoryCard({ story, onClick }) {
  const { getLiveChannelForUser } = useApp();
  const liveChannel = getLiveChannelForUser(story.user?.id || story.user?._id);

  return (
    <div
      onClick={liveChannel ? undefined : onClick}
      className="relative flex-shrink-0 w-[105px] h-[180px] rounded-2xl overflow-hidden cursor-pointer group"
    >
      <img
        src={getAssetUrl(story.slides[0]?.image)}
        alt=""
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />

      {/* Avatar ring */}
      <div className="absolute top-2.5 left-2.5 story-ring">
        <Avatar
          src={story.user?.avatar}
          alt={story.user?.name}
          className="w-9 h-9"
          ring={!liveChannel}
          liveChannel={liveChannel}
        />
      </div>

      {/* Name */}
      <p className="absolute bottom-2.5 left-2 right-2 text-[11px] font-semibold text-white leading-tight drop-shadow-lg">
        {story.user?.name.split(' ')[0]}
      </p>
    </div>
  );
}

// ─── Story Viewer Modal ───────────────────────────────────────────────────────
function StoryViewer({ stories, initialIndex, onClose }) {
  const { user: currentUser } = useApp();
  const navigate = useNavigate();
  const [localStories, setLocalStories] = useState(stories);
  const [si, setSi]    = useState(initialIndex);
  const [slide, setSlide] = useState(0);
  const [progress, setProgress] = useState(0);
  
  const [videoDuration, setVideoDuration] = useState(null);
  
  const story = localStories[si];
  const activeSlide = story?.slides[slide];
  const isLiked = activeSlide?.likes?.includes(currentUser?.id || currentUser?._id);
  const [muted, setMuted] = useState(false);

  const mediaUrl = activeSlide?.image;
  const isVideo = mediaUrl && ['mp4', 'mov', 'webm', 'ogg', 'mkv', 'avi'].includes(mediaUrl.split('.').pop().toLowerCase());

  const duration = isVideo
    ? (videoDuration || activeSlide?.duration || 10000)
    : (activeSlide?.duration || 5000);

  const audioRef = useRef(new Audio());

  useEffect(() => {
    setVideoDuration(null);
  }, [si, slide]);

  const handleVideoLoadedMetadata = (e) => {
    if (e.target && e.target.duration) {
      setVideoDuration(e.target.duration * 1000);
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Play audio when slide changes
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    
    if (activeSlide?.audioUrl) {
      audioRef.current.src = getAssetUrl(activeSlide.audioUrl);
      audioRef.current.currentTime = 0;
      audioRef.current.loop = true;
      audioRef.current.muted = muted;
      audioRef.current.play().catch(e => console.log('Audio play blocked or failed:', e));
    }
  }, [si, slide, activeSlide, muted]);

  const nextSlide = useCallback(() => {
    if (!story) return;
    if (slide < story.slides.length - 1) {
      setSlide((s) => s + 1);
      setProgress(0);
    } else if (si < localStories.length - 1) {
      setSi((s) => s + 1);
      setSlide(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [slide, si, story, localStories, onClose]);

  const prevSlide = () => {
    if (slide > 0) { setSlide((s) => s - 1); setProgress(0); }
    else if (si > 0) { setSi((s) => s - 1); setSlide(0); setProgress(0); }
  };

  const handleLikeSlide = async (e) => {
    e.stopPropagation();
    if (!story || !activeSlide) return;
    try {
      const slideId = activeSlide._id || activeSlide.id;
      const res = await storiesAPI.likeSlide(story.id || story._id, slideId);
      if (res.success) {
        setLocalStories(prev => prev.map((s, idx) => {
          if (idx === si) {
            const updatedSlides = s.slides.map(sl => {
              if ((sl._id || sl.id) === slideId) {
                return { ...sl, likes: res.likes };
              }
              return sl;
            });
            return { ...s, slides: updatedSlides };
          }
          return s;
        }));
      }
    } catch (err) {
      console.error('Failed to like status slide:', err);
    }
  };

  const handleDeleteSlide = async (e) => {
    e.stopPropagation();
    if (!story || !activeSlide) return;
    if (!window.confirm("Are you sure you want to delete this story slide?")) return;

    try {
      const slideId = activeSlide._id || activeSlide.id;
      const res = await storiesAPI.deleteSlide(slideId);
      if (res.success) {
        // Update localStories state
        const updatedStories = localStories.map((s, idx) => {
          if (idx === si) {
            const remainingSlides = s.slides.filter(sl => (sl._id || sl.id) !== slideId);
            return { ...s, slides: remainingSlides };
          }
          return s;
        }).filter(s => s.slides.length > 0); // remove story if it has no slides left

        if (updatedStories.length === 0) {
          // If no stories left at all, close viewer
          onClose();
        } else {
          setLocalStories(updatedStories);
          // Adjust indices to prevent out of bounds
          if (si >= updatedStories.length) {
            setSi(updatedStories.length - 1);
            setSlide(0);
          } else {
            const currentDeck = updatedStories[si];
            if (slide >= currentDeck.slides.length) {
              setSlide(Math.max(0, currentDeck.slides.length - 1));
            }
          }
          setProgress(0);
        }
      }
    } catch (err) {
      console.error('Failed to delete story slide:', err);
    }
  };

  // Auto-advance progress timer
  useEffect(() => {
    setProgress(0);
    const step = 50;
    const increment = (step / duration) * 100;
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(timer); return 100; }
        return p + increment;
      });
    }, step);
    return () => clearInterval(timer);
  }, [si, slide, duration]);

  // Handle slide advance when progress hits 100
  useEffect(() => {
    if (progress >= 100) {
      nextSlide();
    }
  }, [progress, nextSlide]);

  // Keyboard
  useEffect(() => {
    const fn = (e) => {
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft')  prevSlide();
      if (e.key === 'Escape')     onClose();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [nextSlide]);

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-[400] bg-black/95 flex items-center justify-center animate-fade-in">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
      >
        <FiX size={20} />
      </button>

      {/* Volume Toggle */}
      {activeSlide?.audioUrl && (
        <button
          onClick={() => setMuted(!muted)}
          className="absolute top-4 right-16 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <FiVolumeX size={20} /> : <FiVolume2 size={20} />}
        </button>
      )}

      {/* Prev story nav */}
      {(slide > 0 || si > 0) && (
        <button
          onClick={prevSlide}
          className="absolute left-4 md:left-16 z-10 w-10 h-10 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center text-white transition-colors cursor-pointer select-none"
        >
          <FiChevronLeft size={22} />
        </button>
      )}

      {/* Story card */}
      <div className="relative w-full max-w-[380px] h-[680px] rounded-3xl overflow-hidden shadow-card-lg mx-auto bg-black">
        {/* Progress bars */}
        <div className="absolute top-3 left-3 right-3 z-20 flex gap-1">
          {story.slides.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{ width: i < slide ? '100%' : i === slide ? `${progress}%` : '0%' }}
              />
            </div>
          ))}
        </div>

        {/* Media (Image or Video) */}
        {(() => {
          const mediaUrl = activeSlide?.image;
          const isVideo = mediaUrl && ['mp4', 'mov', 'webm', 'ogg', 'mkv', 'avi'].includes(mediaUrl.split('.').pop().toLowerCase());
          
          if (isVideo) {
            return (
              <video
                src={getAssetUrl(mediaUrl)}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted={muted}
                key={`${si}-${slide}`}
                onLoadedMetadata={handleVideoLoadedMetadata}
              />
            );
          }
          return (
            <img
              src={getAssetUrl(mediaUrl)}
              alt=""
              className="w-full h-full object-cover"
              key={`${si}-${slide}`}
            />
          );
        })()}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/30" />

        {/* Embedded Post/Reel card */}
        {activeSlide?.embed && activeSlide.embed.contentType && (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
              if (activeSlide.embed.contentType === 'reel') {
                navigate('/reels');
              } else {
                navigate(`/profile/${activeSlide.embed.authorId}`);
              }
            }}
            className="absolute z-20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 text-left cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all select-none"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 overflow-hidden flex-shrink-0">
                <img 
                  src={activeSlide.embed.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80'} 
                  alt={activeSlide.embed.authorName} 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">{activeSlide.embed.authorName}</p>
                <p className="text-[10px] text-white/60">Shared a {activeSlide.embed.contentType}</p>
              </div>
            </div>
            {activeSlide.embed.mediaUrl && (
              <div className="w-full h-32 rounded-xl overflow-hidden bg-black/30 border border-white/5">
                <img src={getAssetUrl(activeSlide.embed.mediaUrl)} alt="shared media" className="w-full h-full object-cover" />
              </div>
            )}
            <p className="text-xs text-white/90 font-medium line-clamp-2 mt-0.5">{activeSlide.embed.content || "Check out this content!"}</p>
            <div className="mt-1 flex items-center justify-center gap-1.5 py-1.5 bg-white/10 rounded-lg text-[10px] font-bold text-white uppercase tracking-wider border border-white/5">
              <span>View Original {activeSlide.embed.contentType}</span>
            </div>
          </div>
        )}

        {/* Render Overlays */}
        {activeSlide?.overlays?.map(overlay => (
          <div
            key={overlay.id || Math.random().toString()}
            className={`absolute -translate-x-1/2 -translate-y-1/2 font-bold drop-shadow-xl z-20 select-none text-white text-center ${overlay.type === 'text' ? 'pointer-events-auto' : 'pointer-events-none'}`}
            style={{ 
              left: `${overlay.x}%`, 
              top: `${overlay.y}%`, 
              transform: `translate(-50%, -50%) scale(${overlay.scale || 1})`,
              color: overlay.color || '#fff',
              fontSize: overlay.type === 'sticker' ? '3rem' : '1.5rem'
            }}
          >
            {overlay.type === 'text' ? (
              parseMentions(overlay.content).map((part, idx) => {
                if (part.isMention) {
                  return (
                    <span
                      key={idx}
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const userId = await usersAPI.getIdByUsername(part.username);
                          if (userId) {
                            onClose();
                            navigate(`/profile/${userId}`);
                          }
                        } catch (err) {
                          console.error('Story mention click failed', err);
                        }
                      }}
                      className="text-sp-blue hover:underline cursor-pointer font-bold inline-block"
                    >
                      {part.text}
                    </span>
                  );
                }
                return part.text;
              })
            ) : overlay.content}
          </div>
        ))}

        {/* User info */}
        <div className="absolute top-8 left-3 right-3 z-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="story-ring">
              <Avatar src={story.user?.avatar} alt={story.user?.name} className="w-10 h-10 ring-2 ring-black rounded-full" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm drop-shadow">{story.user?.name}</p>
              <p className="text-white/60 text-xs">{timeAgo(activeSlide?.createdAt || story.createdAt)}</p>
            </div>
          </div>
          
          {String(story.user?._id || story.user?.id || story.user) === String(currentUser?.id || currentUser?._id) && (
            <button
              onClick={handleDeleteSlide}
              className="w-8 h-8 rounded-full bg-red-600/20 hover:bg-red-600/40 text-red-500 border border-red-500/30 flex items-center justify-center transition-colors pointer-events-auto cursor-pointer"
              title="Delete Slide"
            >
              <FiTrash2 size={14} />
            </button>
          )}
        </div>

        {/* Click zones */}
        <div className="absolute inset-0 flex z-10">
          <div className="flex-1 cursor-pointer" onClick={prevSlide} />
          <div className="flex-1 cursor-pointer" onClick={nextSlide} />
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-black/85 to-transparent z-20 flex flex-col gap-3">
          {activeSlide?.caption && (
            <p className="text-white text-sm font-medium text-center drop-shadow-lg leading-snug">
              {activeSlide.caption}
            </p>
          )}
          <div className="flex items-center justify-end gap-1.5 pointer-events-auto">
            {activeSlide?.likes?.length > 0 && (
              <span className="text-white text-xs font-semibold bg-black/40 backdrop-blur px-2.5 py-1 rounded-full border border-white/10 select-none">
                {activeSlide.likes.length}
              </span>
            )}
            <button
              onClick={handleLikeSlide}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105 border border-white/10 select-none pointer-events-auto
                ${isLiked ? 'bg-red-500/20 text-red-500 border-red-500/30 shadow-glow-sm' : 'bg-white/10 text-white backdrop-blur-sm hover:bg-white/20'}`}
            >
              <FiHeart size={18} className={isLiked ? 'fill-red-500' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Next story nav */}
      {(slide < story.slides.length - 1 || si < localStories.length - 1) && (
        <button
          onClick={nextSlide}
          className="absolute right-4 md:right-16 z-10 w-10 h-10 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center text-white transition-colors cursor-pointer select-none"
        >
          <FiChevronRight size={22} />
        </button>
      )}
    </div>
  );
}
