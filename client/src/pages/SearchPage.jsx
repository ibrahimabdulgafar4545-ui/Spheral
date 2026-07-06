import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FiSearch, FiUsers, FiFileText, FiGrid, FiCheckCircle } from 'react-icons/fi';
import MainLayout from '../components/layout/MainLayout';
import Post from '../components/feed/Post';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useApp } from '../context/AppContext';
import { usersAPI } from '../api/users';
import { groupsAPI } from '../api/groups';
import UserDisplay from '../components/ui/UserDisplay';
import { useLanguage } from '../context/LanguageContext';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const { posts, showToast } = useApp();
  const { t } = useLanguage();
  const [tab, setTab] = useState('people'); // default to people search results
  const [matchedUsers, setMatchedUsers] = useState([]);
  const [matchedGroups, setMatchedGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchDB = async () => {
    if (!query) return;
    try {
      setLoading(true);
      const res = await usersAPI.search(query);
      if (res.success) {
        setMatchedUsers(res.users.map(u => ({ ...u, id: u._id })));
      }
      const groupRes = await groupsAPI.list(query);
      if (groupRes.success) {
        setMatchedGroups(groupRes.groups);
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchDB();
  }, [query]);

  // Filter client-side posts
  const matchedPosts = posts.filter(
    (p) =>
      p.content.toLowerCase().includes(query.toLowerCase()) ||
      (p.tags && p.tags.some((t) => t.includes(query.toLowerCase())))
  );

  const tabs = [
    { id: 'people', label: t('search.people'), count: matchedUsers.length, icon: <FiUsers size={14} /> },
    { id: 'posts', label: t('search.posts'), count: matchedPosts.length, icon: <FiFileText size={14} /> },
    { id: 'groups', label: t('search.groups'), count: matchedGroups.length, icon: <FiGrid size={14} /> },
  ];

  return (
    <MainLayout hideRight>
      <div className="max-w-[680px] mx-auto">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sp-sub text-sm mb-1">
            <FiSearch size={14} />
            <span>{t('search.title')}</span>
          </div>
          <h1 className="text-2xl font-bold text-sp-text">
            "{query}"
          </h1>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-sp-card rounded-xl p-1 border border-sp-border overflow-x-auto no-scroll">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                ${tab === t.id ? 'bg-sp-blue text-white shadow-md' : 'text-sp-sub hover:text-sp-text'}`}
            >
              {t.icon}
              {t.label}
              {t.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === t.id ? 'bg-white/20' : 'bg-sp-hover'}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="md" />
          </div>
        ) : (
          <div>
            {/* People */}
            {tab === 'people' && (
              <div>
                {matchedUsers.length === 0 ? (
                  <div className="card p-16 text-center text-sp-muted">{t('search.noResultsFor')} {t('search.people').toLowerCase()}</div>
                ) : (
                  <div className="card overflow-hidden divide-y divide-sp-border">
                     {matchedUsers.map((u) => (
                       <div
                         key={u.id}
                         className="flex items-center justify-between p-4 hover:bg-sp-hover transition-colors group"
                       >
                         <UserDisplay
                           user={u}
                           size="lg"
                           showUsername={true}
                           nameClassName="group-hover:text-sp-blue transition-colors"
                           subText={u.bio && <p className="text-xs text-sp-sub truncate mt-0.5">{u.bio}</p>}
                         />
                         <Link to={`/profile/${u.id}`} className="btn-primary text-xs px-3 py-1.5 flex-shrink-0">
                           {t('nav.profile')}
                         </Link>
                       </div>
                     ))}
                  </div>
                )}
              </div>
            )}

            {/* Posts */}
            {tab === 'posts' && (
              <div>
                {matchedPosts.length === 0 ? (
                  <div className="card p-16 text-center text-sp-muted">{t('search.noResultsFor')} {t('search.posts').toLowerCase()}</div>
                ) : (
                  matchedPosts.map((post) => <Post key={post.id} post={post} />)
                )}
              </div>
            )}

            {/* Groups */}
            {tab === 'groups' && (
              <div>
                {matchedGroups.length === 0 ? (
                  <div className="card p-16 text-center text-sp-muted">{t('search.noResultsFor')} {t('search.groups').toLowerCase()}</div>
                ) : (
                  <div className="card overflow-hidden divide-y divide-sp-border">
                    {matchedGroups.map((g) => (
                      <Link
                        key={g.id || g._id}
                        to={`/groups/${g.id || g._id}`}
                        className="flex items-center gap-3 p-4 hover:bg-sp-hover transition-colors group"
                      >
                        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                          <img src={g.cover} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sp-text group-hover:text-sp-blue transition-colors">{g.name}</p>
                          <p className="text-xs text-sp-muted">{g.memberCount} {t('groups.members').toLowerCase()} · {g.category}</p>
                        </div>
                        <button className="btn-primary text-xs px-3 py-1.5">{g.isJoined ? t('groups.joined') : t('groups.joinGroup')}</button>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
