import { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import Post from '../components/feed/Post';
import { useApp } from '../context/AppContext';
import { reelsAPI } from '../api/reels';
import { FiBookmark, FiVideo, FiFileText, FiTrash2, FiPlay } from 'react-icons/fi';
import { getAssetUrl } from '../utils/helpers';
import Avatar from '../components/ui/Avatar';
import { useNavigate } from 'react-router-dom';

export default function SavedPage() {
  const { posts, showToast } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'reels'
  const [savedReels, setSavedReels] = useState([]);
  const [reelsLoading, setReelsLoading] = useState(false);

  // Filter saved posts from AppContext
  const savedPosts = posts.filter(p => p.saved);

  // Fetch saved reels on component mount or tab change
  useEffect(() => {
    if (activeTab === 'reels') {
      setReelsLoading(true);
      reelsAPI.getSavedReels()
        .then((res) => {
          setSavedReels(res.reels || []);
        })
        .catch(() => {
          showToast('error', 'Failed to load saved reels');
        })
        .finally(() => {
          setReelsLoading(false);
        });
    }
  }, [activeTab, showToast]);

  const handleUnsaveReel = async (id, e) => {
    e.stopPropagation();
    try {
      await reelsAPI.saveReel(id);
      setSavedReels(prev => prev.filter(r => (r.id || r._id) !== id));
      showToast('success', 'Reel removed from saved list');
    } catch {
      showToast('error', 'Failed to unsave reel');
    }
  };

  return (
    <MainLayout hideRight>
      <div className="max-w-[640px] mx-auto select-none px-4">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-sp-text flex items-center gap-2">
              <FiBookmark className="text-sp-blue" />
              Saved Items
            </h1>
            <p className="text-sm text-sp-sub mt-1">Review posts and videos you saved for later</p>
          </div>
        </div>

        {/* Custom Tabs */}
        <div className="flex border-b border-sp-border mb-6">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-3 text-center font-semibold text-sm transition-colors border-b-2 flex items-center justify-center gap-2
              ${activeTab === 'posts'
                ? 'border-sp-blue text-sp-blue'
                : 'border-transparent text-sp-sub hover:text-sp-text hover:bg-sp-hover/30'}`}
          >
            <FiFileText size={16} />
            Saved Posts ({savedPosts.length})
          </button>
          <button
            onClick={() => setActiveTab('reels')}
            className={`flex-1 py-3 text-center font-semibold text-sm transition-colors border-b-2 flex items-center justify-center gap-2
              ${activeTab === 'reels'
                ? 'border-sp-blue text-sp-blue'
                : 'border-transparent text-sp-sub hover:text-sp-text hover:bg-sp-hover/30'}`}
          >
            <FiVideo size={16} />
            Saved Reels {savedReels.length > 0 && `(${savedReels.length})`}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'posts' ? (
          savedPosts.length === 0 ? (
            <div className="card p-16 text-center text-sp-muted">
              <FiBookmark className="w-12 h-12 mx-auto mb-3 opacity-30 text-sp-blue" />
              <p className="font-semibold text-sp-text">No saved posts yet</p>
              <p className="text-sm mt-1">Click the bookmark icon inside any post menu to save it here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {savedPosts.map((post) => (
                <Post key={post.id || post._id} post={post} />
              ))}
            </div>
          )
        ) : (
          reelsLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sp-blue"></div>
            </div>
          ) : savedReels.length === 0 ? (
            <div className="card p-16 text-center text-sp-muted">
              <FiVideo className="w-12 h-12 mx-auto mb-3 opacity-30 text-sp-blue" />
              <p className="font-semibold text-sp-text">No saved reels yet</p>
              <p className="text-sm mt-1">Open the Reels page and tap "Save" under any video to bookmark it.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {savedReels.map((reel) => (
                <div
                  key={reel.id || reel._id}
                  onClick={() => navigate('/reels')}
                  className="card group overflow-hidden cursor-pointer hover:border-sp-blue/50 transition-colors flex flex-col"
                >
                  {/* Thumbnail / Video Box */}
                  <div className="relative aspect-[9/16] max-h-[300px] bg-black overflow-hidden flex items-center justify-center">
                    <video
                      src={getAssetUrl(reel.videoUrl)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      muted
                      playsInline
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-transform">
                        <FiPlay size={20} className="fill-current" />
                      </div>
                    </div>
                  </div>

                  {/* Info Footer */}
                  <div className="p-3 flex flex-col flex-1 bg-sp-card border-t border-sp-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar src={reel.author?.avatar} alt={reel.author?.name} size="xs" />
                      <span className="text-xs font-semibold text-sp-text truncate">{reel.author?.name}</span>
                    </div>
                    {reel.caption && (
                      <p className="text-xs text-sp-sub line-clamp-2 mb-3 flex-1">{reel.caption}</p>
                    )}
                    <button
                      onClick={(e) => handleUnsaveReel(reel.id || reel._id, e)}
                      className="btn-secondary py-1 text-xs w-full flex items-center justify-center gap-1.5 hover:text-sp-red hover:bg-sp-red/10 border-sp-border hover:border-sp-red/30"
                    >
                      <FiTrash2 size={12} />
                      Unsave Reel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </MainLayout>
  );
}
