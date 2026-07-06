import { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { authAPI } from '../api/auth';
import { postsAPI } from '../api/posts';
import { friendsAPI } from '../api/friends';
import { groupsAPI } from '../api/groups';
import { notificationsAPI } from '../api/notifications';
import { storiesAPI } from '../api/stories';
import { messagesAPI } from '../api/messages';
import { useTheme } from './ThemeContext';
import { useLanguage } from './LanguageContext';

const Actions = {
  SET_LOADING:       'SET_LOADING',
  SET_AUTH:          'SET_AUTH',
  LOGOUT:            'LOGOUT',
  SET_POSTS:         'SET_POSTS',
  ADD_POST:          'ADD_POST',
  TOGGLE_LIKE:       'TOGGLE_LIKE',
  DELETE_POST:       'DELETE_POST',
  SET_FRIENDS_DATA:  'SET_FRIENDS_DATA',
  ACCEPT_FRIEND:     'ACCEPT_FRIEND',
  REJECT_FRIEND:     'REJECT_FRIEND',
  SEND_FRIEND:       'SEND_FRIEND',
  SET_NOTIFS:        'SET_NOTIFS',
  MARK_NOTIF_READ:   'MARK_NOTIF_READ',
  MARK_ALL_READ:     'MARK_ALL_READ',
  SET_GROUPS:        'SET_GROUPS',
  TOGGLE_GROUP_JOIN: 'TOGGLE_GROUP_JOIN',
  SET_STORIES:       'SET_STORIES',
  ADD_STORY:         'ADD_STORY',
  SET_TRENDING:      'SET_TRENDING',
  UPDATE_POST_REACTIONS: 'UPDATE_POST_REACTIONS',
};

const initialState = {
  isAuthenticated: false,
  user: null,
  posts: [],
  friendRequests: [],
  friendSuggestions: [],
  friendsList: [],
  notifications: [],
  groups: [],
  stories: [],
  trending: [],
  loading: true,
};

function reducer(state, action) {
  switch (action.type) {
    case Actions.SET_LOADING:
      return { ...state, loading: action.payload };
    case Actions.SET_AUTH:
      return { ...state, isAuthenticated: true, user: action.payload, loading: false };
    case Actions.LOGOUT:
      return { ...initialState, loading: false };
    case Actions.SET_POSTS:
      return { ...state, posts: action.payload };
    case Actions.ADD_POST:
      return { ...state, posts: [action.payload, ...state.posts] };
    case Actions.TOGGLE_LIKE:
      return {
        ...state,
        posts: state.posts.map((p) =>
          p.id === action.payload.id
            ? { ...p, liked: action.payload.liked, likesCount: action.payload.likesCount }
            : p
        ),
      };
    case Actions.UPDATE_POST_REACTIONS:
      return {
        ...state,
        posts: state.posts.map((p) =>
          (p.id === action.payload.id || p._id === action.payload.id)
            ? {
                ...p,
                reactions: action.payload.reactions,
                likesCount: action.payload.reactions.length,
                liked: action.payload.reactions.some(r => r.user.toString() === state.user?.id?.toString() || r.user.toString() === state.user?._id?.toString()),
                currentReaction: (action.payload.reactions.find(r => r.user.toString() === state.user?.id?.toString() || r.user.toString() === state.user?._id?.toString()) || {}).type || null
              }
            : p
        ),
      };
    case Actions.DELETE_POST:
      return { ...state, posts: state.posts.filter((p) => p.id !== action.payload) };
    case Actions.SET_FRIENDS_DATA:
      return {
        ...state,
        friendRequests: action.payload.requests || state.friendRequests,
        friendSuggestions: action.payload.suggestions || state.friendSuggestions,
        friendsList: action.payload.friends || state.friendsList,
      };
    case Actions.SEND_FRIEND:
      return {
        ...state,
        friendSuggestions: state.friendSuggestions.filter((u) => u.id !== action.payload),
      };
    case Actions.ACCEPT_FRIEND:
      return {
        ...state,
        friendRequests: state.friendRequests.filter((r) => r.id !== action.payload),
      };
    case Actions.REJECT_FRIEND:
      return {
        ...state,
        friendRequests: state.friendRequests.filter((r) => r.id !== action.payload),
      };
    case Actions.SET_NOTIFS:
      return { ...state, notifications: action.payload };
    case Actions.MARK_NOTIF_READ:
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.payload ? { ...n, read: true } : n
        ),
      };
    case Actions.MARK_ALL_READ:
      return {
        ...state,
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
      };
    case Actions.SET_GROUPS:
      return { ...state, groups: action.payload };
    case Actions.TOGGLE_GROUP_JOIN:
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.payload.id
            ? { ...g, isJoined: action.payload.isJoined, memberCount: action.payload.memberCount }
            : g
        ),
      };
    case Actions.SET_STORIES:
      return { ...state, stories: action.payload };
    case Actions.ADD_STORY:
      return { ...state, stories: [action.payload, ...state.stories.filter(s => s.id !== action.payload.id)] };
    case Actions.SET_TRENDING:
      return { ...state, trending: action.payload };
    default:
      return state;
  }
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [toast, setToast] = useState(null);
  
  // Consume Theme Context
  const { theme, toggleTheme, syncWithDatabase } = useTheme();

  // Consume Language Context
  const { lang, setLanguage, syncWithDatabase: syncLangWithDB } = useLanguage();

  // Socket & Calling states
  const [socket, setSocket] = useState(null);
  const [showVerificationCelebration, setShowVerificationCelebration] = useState(false);
  const [callState, setCallState] = useState('idle'); // 'idle', 'ringing', 'calling', 'connected'
  const [callData, setCallData] = useState(null); // { callerId, callerName, ... }
  const [activeLiveStreams, setActiveLiveStreams] = useState([]); // Array of { hostId, hostName, hostAvatar, channelName }
  const [typingFriendId, setTypingFriendId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  // Messenger Overlay State
  const [activeChat, setActiveChat] = useState(null); // friend user object
  const [chatMessages, setChatMessages] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [sharedEmbed, setSharedEmbed] = useState(null);

  // Multi-account sessions states
  const [accounts, setAccounts] = useState(() => {
    try {
      const stored = localStorage.getItem('spheral_accounts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const saveAccountSession = (userObj, tokenVal, persist = true) => {
    if (!userObj || !tokenVal) return;
    const newAcc = {
      id: userObj.id || userObj._id,
      name: userObj.name,
      username: userObj.username,
      avatar: userObj.avatar,
      token: tokenVal,
      persisted: persist
    };
    
    // Always store active token in localStorage so axios header maps correctly
    localStorage.setItem('spheral_active_token', tokenVal);

    setAccounts(prev => {
      const filtered = prev.filter(a => a.id !== newAcc.id);
      const updated = [newAcc, ...filtered];
      // Only write to localStorage.spheral_accounts if persisted is true
      const persistedOnly = updated.filter(a => a.persisted !== false);
      localStorage.setItem('spheral_accounts', JSON.stringify(persistedOnly));
      return updated;
    });

    // Commit authentication state
    dispatch({ type: Actions.SET_AUTH, payload: userObj });
  };

  const switchAccount = (accountId) => {
    try {
      const stored = localStorage.getItem('spheral_accounts');
      const list = stored ? JSON.parse(stored) : [];
      const target = list.find(a => a.id === accountId);
      if (target && target.token) {
        localStorage.setItem('spheral_active_token', target.token);
        showToast('info', `Switching to ${target.name}...`);
        setTimeout(() => {
          window.location.href = '/';
        }, 500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const removeAccountSession = (accountId) => {
    setAccounts(prev => {
      const updated = prev.filter(a => a.id !== accountId);
      localStorage.setItem('spheral_accounts', JSON.stringify(updated));
      showToast('info', 'Account removed from switcher');
      return updated;
    });
  };

  const showToast = (type, message) => {
    const id = Math.random().toString(36).substring(7);
    setToast({ id, type, message });
  };

  const hideToast = () => setToast(null);

  // Check auth on load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await authAPI.me();
        if (res.success) {
          dispatch({ type: Actions.SET_AUTH, payload: res.user });
          
          if (res.user.verified && res.user.verificationCelebrationShown === false) {
            setShowVerificationCelebration(true);
          }
          
          // Ensure they are saved in accounts list
          const activeToken = localStorage.getItem('spheral_active_token');
          if (activeToken) {
            try {
              const stored = localStorage.getItem('spheral_accounts');
              const list = stored ? JSON.parse(stored) : [];
              if (list.length === 0 || !list.some(a => a.id === (res.user.id || res.user._id))) {
                const initialAcc = {
                  id: res.user.id || res.user._id,
                  name: res.user.name,
                  username: res.user.username,
                  avatar: res.user.avatar,
                  token: activeToken
                };
                const updated = [...list.filter(a => a.id !== initialAcc.id), initialAcc];
                localStorage.setItem('spheral_accounts', JSON.stringify(updated));
                setAccounts(updated);
              }
            } catch {}
          }
          
          // Sync ThemeContext with DB preferences
          if (res.user.preferences?.theme) {
            syncWithDatabase(res.user.preferences.theme, res.user.id);
          } else {
            syncWithDatabase(theme, res.user.id);
          }

          // Sync LanguageContext with DB preferences
          if (res.user.preferences?.language) {
            syncLangWithDB(res.user.preferences.language, res.user.id || res.user._id);
          }

          // Fetch initial data
          loadFeed();
          loadFriendsData();
          loadNotifications();
          loadGroups();
          loadStories();
          loadTrending();
          loadConversations();
          loadUnreadMessageCount();
        }
      } catch (err) {
        dispatch({ type: Actions.LOGOUT });
      } finally {
        dispatch({ type: Actions.SET_LOADING, payload: false });
      }
    };
    checkAuth();
  }, [state.isAuthenticated]);

  // Socket.io Real-time Event Subscriptions
  useEffect(() => {
    if (state.isAuthenticated && state.user) {
      // Connect to backend Express server port 5000
      const socketUrl = import.meta.env.VITE_SOCKET_URL || (import.meta.env.MODE === 'production' ? 'https://spheral.onrender.com' : 'http://localhost:5000');
      const socketInstance = io(socketUrl);

      // Join DMs channel room
      socketInstance.emit('join', state.user.id || state.user._id);
      setSocket(socketInstance);

      // Status updates
      socketInstance.on('userStatusChanged', ({ userId, isOnline, lastSeen }) => {
        dispatch({
          type: Actions.SET_FRIENDS_DATA,
          payload: {
            friends: state.friendsList.map(f =>
              (f.id === userId || f._id === userId) ? { ...f, isOnline, lastSeen } : f
            )
          }
        });
        
        // Update status inside conversations list
        setConversations(prev => prev.map(c => {
          if (c.friend && (c.friend.id === userId || c.friend._id === userId)) {
            return {
              ...c,
              friend: { ...c.friend, isOnline, lastSeen }
            };
          }
          return c;
        }));

        // Update status of currently active chat
        setActiveChat(prev => {
          if (prev && (prev.id === userId || prev._id === userId)) {
            return { ...prev, isOnline, lastSeen };
          }
          return prev;
        });
      });

      // Receive DMs
      socketInstance.on('receiveMessage', (message) => {
        const activeChatId = activeChat?.id || activeChat?._id;
        if (activeChat && (activeChatId === message.sender.id || activeChatId === message.sender._id)) {
          setChatMessages((prev) => {
            const exists = prev.some(m => (m._id || m.id).toString() === (message._id || message.id).toString());
            if (exists) return prev;
            return [...prev, message];
          });
          
          // Read receipt synchronization
          socketInstance.emit('markSeen', {
            conversationId: message.conversation,
            senderId: message.sender.id || message.sender._id,
            receiverId: state.user.id || state.user._id
          });
        } else {
          // Increment notifications/alert
          loadConversations();
          loadNotifications();
        }
        loadUnreadMessageCount();
      });

      socketInstance.on('messageSent', (message) => {
        const activeChatId = activeChat?.id || activeChat?._id;
        if (activeChat && (activeChatId === message.receiver.id || activeChatId === message.receiver._id)) {
          setChatMessages((prev) => {
            const exists = prev.some(m => (m._id || m.id).toString() === (message._id || message.id).toString());
            if (exists) return prev;
            return [...prev, message];
          });
          loadConversations();
        }
        loadUnreadMessageCount();
      });

      socketInstance.on('messagesSeen', ({ conversationId }) => {
        setChatMessages((prev) =>
          prev.map((m) => (m.conversation === conversationId ? { ...m, status: 'seen' } : m))
        );
        loadUnreadMessageCount();
      });

      socketInstance.on('messageEdited', (editedMessage) => {
        const activeChatId = activeChat?.id || activeChat?._id;
        const senderId = editedMessage.sender._id || editedMessage.sender.id || editedMessage.sender;
        const receiverId = editedMessage.receiver._id || editedMessage.receiver.id || editedMessage.receiver;
        if (activeChat && (activeChatId === senderId || activeChatId === receiverId)) {
          setChatMessages((prev) =>
            prev.map((m) => (String(m._id || m.id) === String(editedMessage._id || editedMessage.id) ? editedMessage : m))
          );
        }
        loadConversations();
        loadUnreadMessageCount();
      });

      socketInstance.on('messageDeleted', ({ messageId }) => {
        setChatMessages((prev) => prev.filter((m) => String(m._id || m.id) !== String(messageId)));
        loadConversations();
        loadUnreadMessageCount();
      });

      socketInstance.on('messageReactionUpdated', ({ messageId, reactions }) => {
        setChatMessages((prev) =>
          prev.map((m) => ((m._id || m.id).toString() === messageId.toString() ? { ...m, reactions } : m))
        );
      });

      // Typing feedback
      socketInstance.on('userTyping', ({ senderId }) => {
        const activeChatId = activeChat?.id || activeChat?._id;
        if (activeChat && (activeChatId === senderId)) {
          setTypingFriendId(senderId);
        }
      });

      socketInstance.on('userStopTyping', ({ senderId }) => {
        const activeChatId = activeChat?.id || activeChat?._id;
        if (activeChat && (activeChatId === senderId)) {
          setTypingFriendId(null);
        }
      });

      // Calling signals
      socketInstance.on('incomingCall', ({ callerId, channelName, video, callerName, callerAvatar }) => {
        setCallData({
          incoming: true,
          callerId,
          callerName,
          callerAvatar,
          channelName,
          video
        });
        setCallState('ringing');
        // Send ringing status back to the caller
        socketInstance.emit('recipientRinging', { callerId });
      });

      socketInstance.on('peerRinging', () => {
        setCallState('ringing');
      });

      socketInstance.on('callAccepted', () => {
        setCallState('connected');
      });

      socketInstance.on('callDeclined', () => {
        setCallState('idle');
        setCallData(null);
        showToast('info', 'Call declined by friend');
      });

      socketInstance.on('callEnded', () => {
        setCallState('idle');
        setCallData(null);
      });

      socketInstance.on('callFailed', ({ reason }) => {
        setCallState('idle');
        setCallData(null);
        showToast('error', `Call failed: ${reason}`);
      });

      socketInstance.on('friendWentLive', ({ hostId, hostName, hostAvatar, channelName }) => {
        showToast('info', `${hostName} is live now! Click here to join.`);
        loadNotifications();
        setActiveLiveStreams(prev => {
          if (!prev.find(stream => stream.channelName === channelName)) {
            return [{ hostId, hostName, hostAvatar, channelName }, ...prev];
          }
          return prev;
        });
      });

      socketInstance.on('friendEndedLive', ({ channelName }) => {
        setActiveLiveStreams(prev => prev.filter(stream => stream.channelName !== channelName));
      });

      // Reload friends list on accept
      socketInstance.on('friendRequestAcceptedNotify', () => {
        loadFriendsData();
      });

      // Recipient receives real-time request event
      socketInstance.on('newFriendRequestNotify', ({ from }) => {
        loadFriendsData();
        loadNotifications();
        showToast('info', `${from.name} sent you a friend request!`);
      });

      socketInstance.on('newNotificationNotify', ({ message }) => {
        loadNotifications();
        showToast('info', message);
      });

      socketInstance.on('verified_celebration', () => {
        setShowVerificationCelebration(true);
        // Force refresh user verification local state
        dispatch({
          type: Actions.SET_AUTH,
          payload: { ...state.user, verified: true, verificationCelebrationShown: false }
        });
      });

      return () => {
        socketInstance.disconnect();
      };
    }
  }, [state.isAuthenticated, state.user, activeChat]);

  // Load chat messages when activeChat changes
  const closeVerificationCelebration = async () => {
    setShowVerificationCelebration(false);
    try {
      await usersAPI.acknowledgeVerification();
      dispatch({
        type: Actions.SET_AUTH,
        payload: { ...state.user, verificationCelebrationShown: true }
      });
    } catch (err) {
      console.error('Failed to acknowledge verification:', err);
    }
  };
  useEffect(() => {
    if (activeChat) {
      const loadMessages = async () => {
        try {
          const friendId = activeChat._id || activeChat.id;
          const res = await messagesAPI.getMessages(friendId);
          if (res.success) {
            setChatMessages(res.messages);
            if (socket) {
              socket.emit('markSeen', {
                conversationId: res.conversationId,
                senderId: friendId,
                receiverId: state.user.id || state.user._id
              });
            }
            loadUnreadMessageCount();
          }
        } catch (err) {
          console.error('Error loading chat:', err);
        }
      };
      loadMessages();
    } else {
      setChatMessages([]);
    }
  }, [activeChat, socket]);

  // API Call actions
  const login = async (credentials) => {
    try {
      const res = await authAPI.login(credentials);
      if (res.success) {
        // Sync ThemeContext with login preferences
        if (res.user.preferences?.theme) {
          syncWithDatabase(res.user.preferences.theme, res.user.id);
        }
        return { success: true, user: res.user, token: res.token };
      }
    } catch (err) {
      showToast('error', err.message);
      return { success: false, error: err.message };
    }
  };

  const signup = async (userData) => {
    try {
      const res = await authAPI.signup(userData);
      if (res.success) {
        return { success: true, user: res.user, token: res.token };
      }
    } catch (err) {
      showToast('error', err.message);
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    try {
      const activeId = state.user?.id || state.user?._id;
      let list = [];
      try {
        const stored = localStorage.getItem('spheral_accounts');
        list = stored ? JSON.parse(stored) : [];
      } catch {}

      const updated = list.filter(a => a.id !== activeId);
      localStorage.setItem('spheral_accounts', JSON.stringify(updated));
      setAccounts(updated);

      if (updated.length > 0) {
        localStorage.setItem('spheral_active_token', updated[0].token);
        showToast('info', 'Logged out active account, switching session...');
        setTimeout(() => {
          window.location.href = '/';
        }, 500);
      } else {
        try {
          await authAPI.logout();
        } catch {}
        localStorage.removeItem('spheral_accounts');
        localStorage.removeItem('spheral_active_token');
        dispatch({ type: Actions.LOGOUT });
        setConversations([]);
        showToast('info', 'Logged out successfully');
        navigate('/login');
      }
    } catch (err) {
      localStorage.removeItem('spheral_accounts');
      localStorage.removeItem('spheral_active_token');
      dispatch({ type: Actions.LOGOUT });
      navigate('/login');
    }
  };

  const loadFeed = async () => {
    try {
      const res = await postsAPI.getFeed();
      if (res.success) {
        dispatch({ type: Actions.SET_POSTS, payload: res.posts });
      }
    } catch (err) {
      console.error('Error loading feed:', err);
    }
  };

  const addPost = async (formData) => {
    try {
      const res = await postsAPI.createPost(formData);
      if (res.success) {
        dispatch({ type: Actions.ADD_POST, payload: res.post });
        showToast('success', 'Post created successfully!');
        return { success: true };
      }
    } catch (err) {
      showToast('error', err.message);
      return { success: false, error: err.message };
    }
  };

  const toggleLike = async (postId) => {
    try {
      const res = await postsAPI.toggleLike(postId);
      if (res.success) {
        dispatch({
          type: Actions.TOGGLE_LIKE,
          payload: { id: postId, liked: res.liked, likesCount: res.likesCount }
        });
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const reactPost = async (postId, reactionType) => {
    try {
      const res = await postsAPI.reactPost(postId, reactionType);
      if (res.success) {
        dispatch({
          type: Actions.UPDATE_POST_REACTIONS,
          payload: { id: postId, reactions: res.reactions }
        });
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const deletePost = async (postId) => {
    try {
      const res = await postsAPI.deletePost(postId);
      if (res.success) {
        dispatch({ type: Actions.DELETE_POST, payload: postId });
        showToast('success', 'Post deleted');
        return { success: true };
      }
    } catch (err) {
      showToast('error', err.message);
      return { success: false, error: err.message };
    }
  };

  const archivePost = async (postId) => {
    try {
      const res = await postsAPI.archivePost(postId);
      if (res.success) {
        dispatch({ type: Actions.DELETE_POST, payload: postId });
        showToast('success', res.message || 'Post archived');
        return { success: true };
      }
    } catch (err) {
      showToast('error', err.message);
      return { success: false, error: err.message };
    }
  };

  const loadFriendsData = async () => {
    try {
      const [reqs, sugs, friends] = await Promise.all([
        friendsAPI.getRequests(),
        friendsAPI.getSuggestions(),
        friendsAPI.getFriends()
      ]);
      dispatch({
        type: Actions.SET_FRIENDS_DATA,
        payload: {
          requests: reqs.requests,
          suggestions: sugs.suggestions,
          friends: friends.friends
        }
      });
    } catch (err) {
      console.error('Error loading friends data:', err);
    }
  };

  const sendFriendRequest = async (userId) => {
    try {
      const res = await friendsAPI.sendRequest(userId);
      if (res.success) {
        dispatch({ type: Actions.SEND_FRIEND, payload: userId });
        showToast('success', 'Friend request sent!');
        loadFriendsData();
        return { success: true };
      }
    } catch (err) {
      showToast('error', err.message);
      return { success: false, error: err.message };
    }
  };

  const cancelFriendRequest = async (userId) => {
    try {
      const res = await friendsAPI.cancelRequest(userId);
      if (res.success) {
        showToast('info', 'Friend request cancelled');
        loadFriendsData();
        return { success: true };
      }
    } catch (err) {
      showToast('error', err.message);
      return { success: false, error: err.message };
    }
  };

  const acceptFriendRequest = async (requestId) => {
    try {
      const res = await friendsAPI.acceptRequest(requestId);
      if (res.success) {
        dispatch({ type: Actions.ACCEPT_FRIEND, payload: requestId });
        showToast('success', 'Friend request accepted!');
        loadFriendsData();

        // Socket broadcast so sender updates immediately
        if (socket) {
          socket.emit('friendRequestAccepted', { requestId });
        }

        return { success: true };
      }
    } catch (err) {
      showToast('error', err.message);
      return { success: false, error: err.message };
    }
  };

  const rejectFriendRequest = async (requestId) => {
    try {
      const res = await friendsAPI.rejectRequest(requestId);
      if (res.success) {
        dispatch({ type: Actions.REJECT_FRIEND, payload: requestId });
        showToast('info', 'Friend request rejected');
        loadFriendsData();
        return { success: true };
      }
    } catch (err) {
      showToast('error', err.message);
      return { success: false, error: err.message };
    }
  };

  const removeFriend = async (userId) => {
    try {
      const res = await friendsAPI.removeFriend(userId);
      if (res.success) {
        showToast('info', 'Friend removed');
        loadFriendsData();
        return { success: true };
      }
    } catch (err) {
      showToast('error', err.message);
      return { success: false, error: err.message };
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await notificationsAPI.getNotifications();
      if (res.success) {
        dispatch({ type: Actions.SET_NOTIFS, payload: res.notifications });
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  };

  const markNotifRead = async (notifId) => {
    try {
      const res = await notificationsAPI.markRead(notifId);
      if (res.success) {
        dispatch({ type: Actions.MARK_NOTIF_READ, payload: notifId });
      }
    } catch (err) {
      console.error('Error reading notification:', err);
    }
  };

  const markAllRead = async () => {
    try {
      const res = await notificationsAPI.markAllRead();
      if (res.success) {
        dispatch({ type: Actions.MARK_ALL_READ });
      }
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  };

  const loadGroups = async () => {
    try {
      const res = await groupsAPI.list();
      if (res.success) {
        dispatch({ type: Actions.SET_GROUPS, payload: res.groups });
      }
    } catch (err) {
      console.error('Error loading groups:', err);
    }
  };

  const toggleGroupJoin = async (groupId) => {
    try {
      const res = await groupsAPI.toggleJoin(groupId);
      if (res.success) {
        dispatch({
          type: Actions.TOGGLE_GROUP_JOIN,
          payload: { id: groupId, isJoined: res.isJoined, memberCount: res.memberCount }
        });
        showToast('success', res.isJoined ? 'Joined group!' : 'Left group');
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const sendCode = async (data) => {
    try {
      const res = await authAPI.sendCode(data);
      if (res.success) {
        showToast('success', res.message);
        return { success: true, debugCode: res.debugCode };
      }
    } catch (err) {
      showToast('error', err.message);
      return { success: false, error: err.message };
    }
  };

  const verifyCode = async (data) => {
    try {
      const res = await authAPI.verifyCode(data);
      if (res.success) {
        showToast('success', res.message);
        return { success: true };
      }
    } catch (err) {
      showToast('error', err.message);
      return { success: false, error: err.message };
    }
  };

  const loadStories = async () => {
    try {
      const res = await storiesAPI.getStories();
      if (res.success) {
        dispatch({ type: Actions.SET_STORIES, payload: res.stories });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const uploadStory = async (formData) => {
    try {
      const res = await storiesAPI.createStory(formData);
      if (res.success) {
        dispatch({ type: Actions.ADD_STORY, payload: res.story });
        showToast('success', 'Story added successfully!');
        return { success: true };
      }
    } catch (err) {
      showToast('error', err.message);
      return { success: false, error: err.message };
    }
  };

  const shareToStory = (embed) => {
    setSharedEmbed(embed);
  };

  const closeShareToStory = () => {
    setSharedEmbed(null);
  };

  const handleShareToStoryComplete = async ({ overlays, audioUrl, audioName, customAudioFile }) => {
    if (!sharedEmbed) return { success: false };
    try {
      const formData = new FormData();
      // Preset gradient background
      formData.append('image', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&q=80');
      formData.append('caption', 'Shared content');
      formData.append('embed', JSON.stringify(sharedEmbed));
      if (audioUrl) formData.append('audioUrl', audioUrl);
      if (customAudioFile) formData.append('customAudio', customAudioFile);
      if (overlays && overlays.length > 0) {
        formData.append('overlays', JSON.stringify(overlays));
      }

      const res = await storiesAPI.createStory(formData);
      if (res.success) {
        dispatch({ type: Actions.ADD_STORY, payload: res.story });
        showToast('success', 'Post shared to your story!');
        setSharedEmbed(null);
        return { success: true };
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to share to story');
      return { success: false };
    }
  };

  const loadTrending = async () => {
    try {
      const res = await postsAPI.getTrending();
      if (res.success) {
        dispatch({ type: Actions.SET_TRENDING, payload: res.trending });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadConversations = async () => {
    try {
      const res = await messagesAPI.getConversations();
      if (res.success) {
        setConversations(res.conversations);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadUnreadMessageCount = async () => {
    try {
      const res = await messagesAPI.getUnreadCount();
      if (res.success) {
        setUnreadMessageCount(res.count);
      }
    } catch (err) {
      console.error('Error loading unread count:', err);
    }
  };

  const updateCurrentUser = (updatedUser) => {
    dispatch({ type: Actions.SET_AUTH, payload: updatedUser });
  };

  // Messenger functions (handles file attachments, edits, deletes and replies)
  const sendMessage = async (content, file = null, parentMessageId = null, type = 'text', fileUrl = null) => {
    if (!activeChat) return;
    try {
      let res;
      if (file) {
        const formData = new FormData();
        formData.append('receiverId', activeChat._id || activeChat.id);
        formData.append('file', file);
        if (content) formData.append('content', content);
        if (parentMessageId) formData.append('parentMessageId', parentMessageId);
        res = await messagesAPI.sendMediaMessage(formData);
      } else {
        res = await messagesAPI.sendMessage(activeChat._id || activeChat.id, content, parentMessageId, type, fileUrl);
      }

      if (res.success) {
        setChatMessages((m) => [...m, res.message]);
        loadConversations();
        loadUnreadMessageCount();
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const editMessage = async (messageId, newContent) => {
    try {
      const res = await messagesAPI.editMessage(messageId, newContent);
      if (res.success) {
        setChatMessages((prev) =>
          prev.map((msg) => (String(msg._id || msg.id) === String(messageId) ? res.message : msg))
        );
        loadConversations();
        loadUnreadMessageCount();
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const deleteMessage = async (messageId, type = 'everyone') => {
    try {
      const res = await messagesAPI.deleteMessage(messageId, type);
      if (res.success) {
        setChatMessages((prev) =>
          prev.filter((msg) => String(msg._id || msg.id) !== String(messageId))
        );
        loadConversations();
        loadUnreadMessageCount();
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  // calling signal wrappers
  const startCall = (targetUser, video) => {
    const channelName = `call_${state.user.id || state.user._id}_${targetUser._id || targetUser.id}`;
    setCallData({
      incoming: false,
      recipientId: targetUser._id || targetUser.id,
      recipientName: targetUser.name,
      recipientAvatar: targetUser.avatar,
      channelName,
      video
    });
    setCallState('calling');
    if (socket) {
      socket.emit('makeCall', {
        targetId: targetUser._id || targetUser.id,
        channelName,
        video,
        callerName: state.user.name,
        callerAvatar: state.user.avatar
      });
    }
  };

  const acceptCall = () => {
    setCallState('connected');
    if (socket && callData) {
      socket.emit('acceptCall', { callerId: callData.callerId });
    }
  };

  const declineCall = () => {
    setCallState('idle');
    if (socket && callData) {
      const callerId = callData.callerId;
      const isVideo = callData.video;
      const callerName = callData.callerName;
      socket.emit('declineCall', { callerId });
      
      const text = `📞 Missed ${isVideo ? 'video' : 'audio'} call from ${callerName}`;
      messagesAPI.sendMessage(callerId, text).then((res) => {
        if (res.success) {
          const curActiveId = activeChat?._id || activeChat?.id;
          if (curActiveId === callerId) {
            setChatMessages((prev) => [...prev, res.message]);
          }
          loadConversations();
        }
      }).catch(err => console.error("Error logging decline call:", err));
    }
    setCallData(null);
  };

  const endCall = () => {
    const isMissed = (callState === 'calling' || callState === 'ringing');
    const targetId = callData?.incoming ? callData?.callerId : callData?.recipientId;
    const isVideo = callData?.video;
    const callerName = callData?.callerName;
    const isOutgoing = !callData?.incoming;

    if (isMissed && targetId) {
      const text = isOutgoing 
        ? `📞 Missed ${isVideo ? 'video' : 'audio'} call` 
        : `📞 Missed ${isVideo ? 'video' : 'audio'} call from ${callerName}`;
      
      messagesAPI.sendMessage(targetId, text).then((res) => {
        if (res.success) {
          const curActiveId = activeChat?._id || activeChat?.id;
          if (curActiveId === targetId) {
            setChatMessages((prev) => [...prev, res.message]);
          }
          loadConversations();
        }
      }).catch(err => console.error("Error logging missed call:", err));
    }

    setCallState('idle');
    setCallData(null);
    
    if (socket && targetId) {
      socket.emit('endCall', { targetId });
    }
  };

  const openConversation = (friendUser) => {
    setActiveChat(friendUser);
    setChatOpen(false); // Close quick chat popup
    navigate('/messages');
  };

  const openQuickChat = (friendUser) => {
    setActiveChat(friendUser);
    setChatOpen(true);
  };

  const closeConversation = () => {
    setActiveChat(null);
    setChatOpen(false);
  };

  const unreadNotifCount = state.notifications.filter((n) => !n.read).length;
  const pendingFriendRequests = state.friendRequests.length;

  return (
    <AppContext.Provider value={{
      ...state,
      login, signup, logout,
      sendCode, verifyCode,
      loadFeed, addPost, toggleLike, reactPost, deletePost, archivePost,
      loadFriendsData, sendFriendRequest, cancelFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend,
      loadNotifications, markNotifRead, markAllRead,
      loadGroups, toggleGroupJoin,
      loadStories, uploadStory,
      sharedEmbed, shareToStory, closeShareToStory, handleShareToStoryComplete,
      loadTrending,
      theme,
      toggleTheme: () => toggleTheme(state.user?.id),
      updateCurrentUser,
      
      // Multi-account sessions
      accounts,
      switchAccount,
      saveAccountSession,
      removeAccountSession,
      showToast,
      
      // Socket, calling & DMs
      socket,
      conversations,
      loadConversations,
      loadUnreadMessageCount,
      typingFriendId,
      callState,
      callData,
      activeLiveStreams,
      startCall,
      acceptCall,
      declineCall,
      endCall,

      activeChat, chatMessages, chatOpen, sendMessage, editMessage, deleteMessage, openConversation, openQuickChat, closeConversation,
      unreadNotifCount, pendingFriendRequests, unreadMessageCount,
      toast, showToast, hideToast,
      showVerificationCelebration, closeVerificationCelebration,

      // Language / i18n
      lang,
      setLanguage: (code) => setLanguage(code, { userId: state.user?.id || state.user?._id }),
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
