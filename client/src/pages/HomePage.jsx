import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import Stories from '../components/feed/Stories';
import CreatePostBox from '../components/feed/CreatePostBox';
import Post from '../components/feed/Post';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { FiUsers } from 'react-icons/fi';
import Button from '../components/ui/Button';

export default function HomePage() {
  const { posts } = useApp();
  const { t } = useLanguage();

  return (
    <MainLayout>
      <div className="max-w-[640px] mx-auto w-full">
        <Stories />
        <CreatePostBox />
        
        {posts.length === 0 ? (
          <div className="card p-12 text-center text-sp-muted animate-fade-up">
            <div className="w-16 h-16 bg-sp-blue/10 text-sp-blue rounded-full flex items-center justify-center mx-auto mb-4">
              <FiUsers size={28} />
            </div>
            <h3 className="font-bold text-lg text-sp-text">{t('feed.noPosts')}</h3>
            <p className="text-sm text-sp-sub mt-2 mb-6 max-w-sm mx-auto leading-relaxed">
              {t('feed.noPostsSubtext')}
            </p>
            <Link to="/friends">
              <Button variant="primary" size="md">
                {t('friends.addFriend')}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col">
            {posts.map((post) => (
              <Post key={post.id || post._id} post={post} />
            ))}
            {posts.length > 0 && (
              <div className="flex justify-center py-8">
                <Button variant="ghost" size="md">
                  {t('common.more')}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
