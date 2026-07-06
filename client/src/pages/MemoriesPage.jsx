import { FiClock, FiHeart, FiMessageCircle } from 'react-icons/fi';
import MainLayout from '../components/layout/MainLayout';
import { useApp } from '../context/AppContext';
import { timeAgo } from '../utils/helpers';
import Post from '../components/feed/Post';

export default function MemoriesPage() {
  const { posts, user } = useApp();
  // Get own posts as memories
  const ownPosts = posts.filter(p => p.author?._id === user?.id || p.author?.id === user?.id);

  return (
    <MainLayout hideRight>
      <div className="max-w-[640px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-sp-text flex items-center gap-2">
            <FiClock className="text-sp-blue" />
            Your Memories
          </h1>
          <p className="text-sm text-sp-sub mt-1">Re-live your special moments on Spheral</p>
        </div>

        {ownPosts.length === 0 ? (
          <div className="card p-16 text-center text-sp-muted">
            <p className="text-4xl mb-3">✨</p>
            <p className="font-semibold text-sp-text">No memories to show today</p>
            <p className="text-sm mt-1">Create posts on Spheral to look back at them here in the future.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-sp-blue/10 border border-sp-blue/20 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">✨</span>
              <p className="text-sm text-sp-text leading-relaxed">
                You have <strong className="text-sp-blue">{ownPosts.length} memories</strong> to look back on!
              </p>
            </div>
            <div className="flex flex-col">
              {ownPosts.map((post) => (
                <Post key={post.id || post._id} post={post} />
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
