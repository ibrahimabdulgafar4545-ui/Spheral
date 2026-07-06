import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiUserPlus, FiTrendingUp } from 'react-icons/fi';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { timeAgo, getAssetUrl } from '../../utils/helpers';
import UserDisplay from '../ui/UserDisplay';

export default function RightSidebar() {
  const { friendSuggestions, friendsList, sendFriendRequest, trending, openQuickChat } = useApp();
  const { t } = useLanguage();
  const [addedIds, setAddedIds] = useState([]);

  const handleAdd = async (id) => {
    setAddedIds((p) => [...p, id]);
    await sendFriendRequest(id);
  };

  const online = friendsList.filter((f) => f.isOnline);
  const offline = friendsList.filter((f) => !f.isOnline);

  return (
    <aside className="hidden xl:flex flex-col w-[260px] flex-shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto no-scroll py-4 ps-3 select-none">

      {/* People You May Know */}
      {friendSuggestions.length > 0 && (
        <section className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="section-label">{t('friends.suggestions')}</span>
            <Link to="/friends" className="text-[11px] text-sp-blue hover:underline font-semibold">{t('common.seeAll')}</Link>
          </div>
          <div className="flex flex-col gap-3">
            {friendSuggestions.slice(0, 4).map((p) => {
              const added = addedIds.includes(p._id || p.id);
              return (
                <div key={p._id || p.id} className="flex items-center justify-between gap-2.5">
                  <UserDisplay
                    user={p}
                    size="sm"
                    avatarClassName="rounded-xl"
                    nameClassName="text-[13px] font-semibold hover:text-sp-blue transition-colors clamp-1"
                    subText={<p className="text-[11px] text-sp-muted">{p.mutualFriends || 0} {t('friends.mutualFriends')}</p>}
                    className="flex-1"
                  />
                  <button
                    onClick={() => !added && handleAdd(p._id || p.id)}
                    className={`flex-shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all
                      ${added
                        ? 'bg-green-500/10 text-green-400 cursor-default'
                        : 'bg-sp-blue/10 text-sp-blue hover:bg-sp-blue/20'
                      }`}
                  >
                    {added ? '✓' : <><FiUserPlus size={12} /> {t('common.add')}</>}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {friendSuggestions.length > 0 && <div className="divider" />}

      {/* Contacts / Friends chat triggers */}
      <section className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="section-label">{t('friends.allFriends')}</span>
        </div>

        {online.map((f) => (
          <button
            key={f._id || f.id}
            onClick={() => openQuickChat(f)}
            className="w-full text-left"
          >
            <UserDisplay
              user={f}
              size="sm"
              link={false}
              nameClassName="text-[13px] font-semibold group-hover:text-sp-blue transition-colors"
              className="px-2 py-1.5 rounded-xl hover:bg-sp-hover transition-colors group"
              subText={<span className="text-[10px] text-sp-green font-medium block">{t('time.activeNow')}</span>}
            />
          </button>
        ))}

        {offline.map((f) => (
          <button
            key={f._id || f.id}
            onClick={() => openQuickChat(f)}
            className="w-full text-left opacity-60"
          >
            <UserDisplay
              user={f}
              size="sm"
              link={false}
              avatarClassName="grayscale opacity-80"
              nameClassName="text-[13px] font-semibold group-hover:text-sp-blue transition-colors"
              className="px-2 py-1.5 rounded-xl hover:bg-sp-hover transition-colors group"
              subText={
                <p className="text-[10px] text-sp-muted">
                  {f.lastSeen ? `Active ${timeAgo(f.lastSeen)}` : t('common.offline')}
                </p>
              }
            />
          </button>
        ))}

        {friendsList.length === 0 && (
          <p className="text-xs text-sp-muted p-2">{t('friends.noFriends')}</p>
        )}
      </section>

      {/* Calculated Trending Hashtags */}
      {trending.length > 0 && (
        <>
          <div className="divider" />
          <section>
            <div className="flex items-center gap-1.5 mb-3">
              <FiTrendingUp size={13} className="text-sp-muted" />
              <span className="section-label">{t('feed.topReaction')}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              {trending.map((t, i) => (
                <div
                  key={t.tag}
                  className="flex items-center justify-between px-2 py-2 rounded-xl hover:bg-sp-hover transition-all text-left w-full cursor-default"
                >
                  <div>
                    <p className="text-[13px] font-bold text-sp-blue">{t.tag}</p>
                    <p className="text-[11px] text-sp-muted">{t.posts} {t.posts === 1 ? 'post' : 'posts'} · {t.category}</p>
                  </div>
                  <span className="text-[11px] text-sp-faint font-bold">#{i + 1}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </aside>
  );
}
