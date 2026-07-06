import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiUserCheck, FiUserPlus, FiUserMinus, FiUsers, FiClock, FiSearch, FiMessageCircle } from 'react-icons/fi';
import MainLayout from '../components/layout/MainLayout';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Avatar from '../components/ui/Avatar';
import { useApp } from '../context/AppContext';
import { usersAPI } from '../api/users';
import Button from '../components/ui/Button';
import UserDisplay from '../components/ui/UserDisplay';
import { useLanguage } from '../context/LanguageContext';

export default function FriendsPage() {
  const { t } = useLanguage();
  const {
    friendRequests,
    friendSuggestions,
    friendsList,
    acceptFriendRequest,
    rejectFriendRequest,
    sendFriendRequest,
    cancelFriendRequest,
    removeFriend,
    loadFriendsData,
    openConversation,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState('requests');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dbSearchResults, setDbSearchResults] = useState([]);
  const [searchingDb, setSearchingDb] = useState(false);
  const [dismissedIds, setDismissedIds] = useState([]);

  useEffect(() => {
    const fetchFriends = async () => {
      setLoading(true);
      await loadFriendsData();
      setLoading(false);
    };
    fetchFriends();
  }, []);

  // Trigger search on suggestions query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setDbSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        setSearchingDb(true);
        const res = await usersAPI.search(searchQuery.trim());
        if (res.success) {
          // Filter out users who are already friends or pending requests
          const cleanUsers = res.users.map(u => ({ ...u, id: u._id }));
          setDbSearchResults(cleanUsers);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSearchingDb(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Filter requests
  const filteredRequests = friendRequests.filter((req) =>
    req.from.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.from.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Suggestions source
  const rawSuggestions = searchQuery.trim() ? dbSearchResults : friendSuggestions;
  const displaySuggestions = rawSuggestions.filter(u => !dismissedIds.includes(u._id || u.id));

  // Filter friends list
  const filteredFriends = friendsList.filter((friend) =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout hideRight>
      <div className="max-w-[850px] mx-auto w-full select-none">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-sp-text flex items-center gap-2">
              <FiUsers className="text-sp-blue" />
              {t('friends.title')}
            </h1>
            <p className="text-sm text-sp-sub mt-1">{t('friends.title')} / {t('settings.account')}</p>
          </div>
        </div>

        {/* Filter Input */}
        <div className="relative mb-6">
          <FiSearch className="absolute left-4 top-3.5 text-sp-sub" size={18} />
          <input
            type="text"
            placeholder={t('friends.searchFriends')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-11 py-3 pr-4 w-full shadow-glow-sm"
          />
        </div>

        {/* Tab selector */}
        <div className="flex gap-2 p-1 bg-sp-card border border-sp-border rounded-2xl mb-4 overflow-x-auto no-scroll">
          {[
            { id: 'requests', label: t('friends.requests'), count: filteredRequests.length, icon: <FiClock size={15} /> },
            { id: 'suggestions', label: t('friends.suggestions'), count: displaySuggestions.length, icon: <FiUserPlus size={15} /> },
            { id: 'all', label: t('friends.allFriends'), count: filteredFriends.length, icon: <FiUserCheck size={15} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery(''); // reset query on tab change
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap
                ${activeTab === tab.id
                  ? 'bg-sp-blue text-white shadow-glow-sm'
                  : 'text-sp-sub hover:text-sp-text hover:bg-sp-hover'
                }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold
                  ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-sp-overlay text-sp-sub'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading || searchingDb ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* ─── Requests Tab ──────────────────────────────────── */}
            {activeTab === 'requests' && (
              <div>
                {filteredRequests.length === 0 ? (
                  <div className="card p-16 text-center text-sp-muted">
                    <FiClock className="w-12 h-12 mx-auto mb-3 opacity-30 text-sp-blue" />
                    <p className="font-semibold text-sp-text">{t('friends.noRequests')}</p>
                    <p className="text-sm mt-1">
                      {searchQuery ? t('search.noResults') : t('friends.noRequests')}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-up">
                    {filteredRequests.map((req) => (
                      <div key={req._id || req.id} className="card p-4 flex flex-col justify-between gap-3">
                        <UserDisplay
                          user={req.from}
                          size="lg"
                          showUsername={true}
                          avatarClassName="rounded-xl border border-sp-border"
                          nameClassName="font-bold text-sp-text hover:text-sp-blue transition-colors"
                          subText={
                            req.from.mutualFriends > 0 ? (
                              <p className="text-xs text-sp-blue font-semibold mt-1">{req.from.mutualFriends} {t('friends.mutualFriends')}</p>
                            ) : (
                              <p className="text-xs text-sp-sub mt-1">{t('notifications.friendRequest')}</p>
                            )
                          }
                        />
                        <div className="flex gap-2 w-full mt-1">
                          <Button
                            onClick={() => acceptFriendRequest(req._id || req.id)}
                            variant="primary"
                            size="sm"
                            className="flex-1 font-bold"
                          >
                            {t('friends.accept')}
                          </Button>
                          <Button
                            onClick={() => rejectFriendRequest(req._id || req.id)}
                            variant="secondary"
                            size="sm"
                            className="flex-1 font-bold"
                          >
                            {t('friends.decline')}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── Suggestions Tab ───────────────────────────────── */}
            {activeTab === 'suggestions' && (
              <div>
                {displaySuggestions.length === 0 ? (
                  <div className="card p-16 text-center text-sp-muted">
                    <FiSearch className="w-12 h-12 mx-auto mb-3 opacity-30 text-sp-blue" />
                    <p className="font-semibold text-sp-text">{t('friends.noSuggestions')}</p>
                    <p className="text-sm mt-1">{t('search.tryDifferent')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-up">
                    {displaySuggestions.map((user) => (
                      <div key={user._id || user.id} className="card p-4 flex flex-col justify-between gap-3">
                        <UserDisplay
                          user={user}
                          size="lg"
                          showUsername={true}
                          avatarClassName="rounded-xl border border-sp-border"
                          nameClassName="font-bold text-sp-text hover:text-sp-blue transition-colors"
                          subText={
                            user.mutualFriends > 0 ? (
                              <p className="text-xs text-sp-blue font-semibold mt-1">{user.mutualFriends} {t('friends.mutualFriends')}</p>
                            ) : (
                              <p className="text-xs text-sp-sub mt-1">{t('friends.suggestions')}</p>
                            )
                          }
                        />
                        <div className="flex gap-2 w-full mt-1">
                          {user.requestStatus === 'pending_sent' ? (
                            <Button
                              onClick={() => cancelFriendRequest(user._id || user.id)}
                              variant="secondary"
                              size="sm"
                              icon={<FiClock size={14} />}
                              className="w-full text-sp-muted hover:text-sp-red font-bold justify-center"
                            >
                              {t('common.cancel')}
                            </Button>
                          ) : (
                            <div className="flex gap-2 w-full">
                              <Button
                                onClick={() => sendFriendRequest(user._id || user.id)}
                                variant="primary"
                                size="sm"
                                icon={<FiUserPlus size={14} />}
                                className="flex-1 font-bold justify-center"
                              >
                                {t('friends.addFriend')}
                              </Button>
                              <Button
                                onClick={() => setDismissedIds(prev => [...prev, user._id || user.id])}
                                variant="secondary"
                                size="sm"
                                className="px-3 justify-center"
                                title={t('common.remove')}
                              >
                                <FiUserMinus size={14} />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── All Friends Tab ────────────────────────────────── */}
            {activeTab === 'all' && (
              <div>
                {filteredFriends.length === 0 ? (
                  <div className="card p-16 text-center text-sp-muted">
                    <FiUsers className="w-12 h-12 mx-auto mb-3 opacity-30 text-sp-blue" />
                    <p className="font-semibold text-sp-text">{t('friends.noFriends')}</p>
                    <p className="text-sm mt-1">
                      {searchQuery ? t('search.noResults') : t('friends.noFriends')}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-up">
                    {filteredFriends.map((friend) => (
                      <div key={friend._id || friend.id} className="card p-4 flex flex-col justify-between gap-3">
                        <UserDisplay
                          user={friend}
                          size="lg"
                          showUsername={true}
                          avatarClassName="rounded-xl border border-sp-border"
                          nameClassName="font-bold text-sp-text hover:text-sp-blue transition-colors"
                          subText={<p className="text-xs text-sp-sub mt-1">{friend.location || t('friends.noLocation')}</p>}
                        />
                        <div className="flex gap-2 w-full mt-1">
                          <button
                            onClick={() => openConversation(friend)}
                            className="btn-primary btn-sm flex-1 flex items-center justify-center gap-1 font-bold"
                          >
                            <FiMessageCircle size={13} /> {t('friends.message')}
                          </button>
                          <button
                            onClick={() => removeFriend(friend._id || friend.id)}
                            className="btn-danger btn-sm flex-1 flex items-center justify-center gap-1 font-bold"
                          >
                            <FiUserMinus size={13} /> {t('friends.remove')}
                          </button>
                        </div>
                      </div>
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
