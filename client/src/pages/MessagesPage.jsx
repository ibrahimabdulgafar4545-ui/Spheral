import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  FiSend, FiPaperclip, FiMic, FiPhone, FiVideo,
  FiSmile, FiTrash2, FiX, FiSquare, FiChevronLeft, FiSearch, FiCheckCircle, FiMessageCircle, FiThumbsUp, FiStar, FiPlus,
  FiMoreVertical, FiSlash, FiAlertTriangle, FiUser, FiBellOff, FiBell, FiCpu
} from 'react-icons/fi';
import MainLayout from '../components/layout/MainLayout';
import { useApp } from '../context/AppContext';
import { usersAPI } from '../api/users';
import { messagesAPI } from '../api/messages';
import { reportsAPI } from '../api/reports';
import { timeAgo, getAssetUrl } from '../utils/helpers';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Avatar from '../components/ui/Avatar';
import VerifiedBadge from '../components/ui/VerifiedBadge';
import ReactionPicker from '../components/ui/ReactionPicker';
import { getReactionIcon } from '../components/ui/ReactionIcons';
import { useLanguage } from '../context/LanguageContext';

const EMOJIS = [
  '👍', '❤️', '😆', '😮', '😢', '😡', '😂', '🔥', '👏', '🎉',
  '🙌', '✨', '💡', '💯', '🙋‍♂️', '👀', '😎', '😍', '🤔', '🍕',
  '🎈', '💻', '⭐', '✔️', `🎁🍟👌`,
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

const formatMessageTimeBlock = (date) => {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ', ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const MessagesLayoutWrapper = ({ isMobileChatActive, children }) => {
  return isMobileChatActive ? (
    <div className="fixed inset-0 z-50 bg-sp-bg flex flex-col h-screen h-[100dvh] pb-0">{children}</div>
  ) : (
    <MainLayout hideRight>{children}</MainLayout>
  );
};

export default function MessagesPage() {
  const { t } = useLanguage();
  const {
    user,
    conversations,
    friendsList,
    activeChat,
    chatMessages,
    openConversation,
    closeConversation,
    sendMessage,
    editMessage,
    deleteMessage,
    socket,
    typingFriendId,
    startCall,
    showToast,
    loadConversations,
    getLiveChannelForUser
  } = useApp();

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const chatParam = searchParams.get('chat');

  const [text, setText] = useState('');
  const [searchVal, setSearchVal] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [actionsExpanded, setActionsExpanded] = useState(false);
  const [deleteMenuId, setDeleteMenuId] = useState(null);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [mutedChats, setMutedChats] = useState(() => {
    try { return JSON.parse(localStorage.getItem('spheral_muted_chats') || '[]'); } catch { return []; }
  });
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDesc, setReportDesc] = useState('');

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [showStickers, setShowStickers] = useState(false);
  const [showGifs, setShowGifs] = useState(false);
  const [gifQuery, setGifQuery] = useState('');
  const [gifResults, setGifResults] = useState([]);
  const [gifLoading, setGifLoading] = useState(false);

  // Custom stickers
  const [customStickers, setCustomStickers] = useState(() => {
    try { return JSON.parse(localStorage.getItem('spheral_custom_stickers') || '[]'); } catch { return []; }
  });
  const stickerFileRef = useRef(null);

  useEffect(() => {
    if (!showGifs) return;
    const fetchGifs = async () => {
      try {
        setGifLoading(true);
        const queryUrl = gifQuery.trim()
          ? `https://g.tenor.com/v1/search?q=${encodeURIComponent(gifQuery.trim())}&key=LIVDSRZULELA&limit=30`
          : `https://g.tenor.com/v1/trending?key=LIVDSRZULELA&limit=30`;
        const res = await fetch(queryUrl);
        const data = await res.json();
        if (data && data.results) {
          setGifResults(data.results.map(g => ({
            id: g.id,
            preview: g.media[0].nanogif.url,
            url: g.media[0].gif.url
          })));
        }
      } catch (err) {
        console.error('Error fetching Tenor gifs:', err);
        setGifResults([]);
      } finally {
        setGifLoading(false);
      }
    };
    const delayDebounce = setTimeout(fetchGifs, 400);
    return () => clearTimeout(delayDebounce);
  }, [gifQuery, showGifs]);
  
  // File Attachment states
  const [stagedFile, setStagedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const fileInputRef = useRef(null);

  // Voice Note states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // AI Assistant States
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiChatPrompt, setAiChatPrompt] = useState('');
  const [aiChatResponse, setAiChatResponse] = useState('');
  const [aiChatLoading, setAiChatLoading] = useState(false);
  const [aiChatError, setAiChatError] = useState('');

  const handleAiChatSubmit = async () => {
    if (!aiChatPrompt.trim()) return;
    setAiChatLoading(true);
    setAiChatError('');
    try {
      const res = await messagesAPI.callAssistant(aiChatPrompt.trim(), text);
      if (res.success) {
        setAiChatResponse(res.text);
        setAiChatPrompt('');
      }
    } catch (err) {
      console.error('AI assistant request failed', err);
      const isRateLimit = err.response?.status === 429 || err.message?.includes('429') || err.message?.includes('limit');
      setAiChatError(isRateLimit ? 'Try again in a moment (Rate limit reached).' : (err.response?.data?.message || err.message || 'AI request failed.'));
    } finally {
      setTimeout(() => {
        setAiChatLoading(false);
      }, 2500); // 2.5 second request cooldown
    }
  };

  // Zoomed Image & Custom Sticker Save states
  const [zoomedImage, setZoomedImage] = useState(null);
  const [stickerToSave, setStickerToSave] = useState(null);

  const saveCustomSticker = (stickerUrl) => {
    try {
      const stored = JSON.parse(localStorage.getItem('spheral_custom_stickers') || '[]');
      if (stored.some(s => s.url === stickerUrl)) {
        showToast('info', 'Sticker is already in your collection!');
        return;
      }
      const newSticker = {
        id: `custom_${Date.now()}`,
        url: stickerUrl,
        label: 'Saved Sticker'
      };
      const updated = [...stored, newSticker];
      localStorage.setItem('spheral_custom_stickers', JSON.stringify(updated));
      setCustomStickers(updated);
      showToast('success', 'Sticker saved to your collection!');
    } catch (err) {
      console.error('Failed to save custom sticker', err);
      showToast('error', 'Failed to save sticker');
    }
  };

  const handleMessageReact = async (messageId, reaction) => {
    try {
      const res = await messagesAPI.reactToMessage(messageId, reaction);
      if (res.success) {
        // UI will be updated via socket event 'messageReactionUpdated'
        // No local state update needed here.
      }
    } catch (err) {
      console.error('Failed to react to message', err);
      showToast('error', 'Failed to react');
    }
  };

  const messagesEndRef = useRef(null);

  // Refresh conversations list on page load + load blocked users
  useEffect(() => {
    loadConversations();
    // Load current user's blocked list
    if (user) {
      usersAPI.getProfile(user.id || user._id).then(res => {
        if (res?.user?.blockedUsers) {
          setBlockedUsers(res.user.blockedUsers.map(id => typeof id === 'object' ? (id._id || id.id) : id));
        }
      }).catch(() => {});
    }
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      if (chatMenuOpen) setChatMenuOpen(false);
      if (deleteMenuId) setDeleteMenuId(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [chatMenuOpen, deleteMenuId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeChat) {
      scrollToBottom();
    }
  }, [chatMessages, activeChat]);

  // Sync URL parameter -> activeChat state & activeChat state -> URL parameter
  useEffect(() => {
    if (chatParam) {
      const activeChatId = activeChat?._id || activeChat?.id;
      if (activeChatId !== chatParam) {
        // Find the conversation
        const foundChat = conversations.find(c => (c.friend?._id || c.friend?.id) === chatParam);
        if (foundChat && foundChat.friend) {
          openConversation(foundChat.friend);
        } else {
          // Find in friendsList
          const foundFriend = friendsList.find(f => (f._id || f.id) === chatParam);
          if (foundFriend) {
            openConversation(foundFriend);
          }
        }
      }
    } else {
      if (activeChat) {
        closeConversation();
      }
    }
  }, [chatParam, conversations, friendsList]);

  useEffect(() => {
    const activeChatId = activeChat?._id || activeChat?.id;
    if (activeChatId) {
      if (chatParam !== activeChatId) {
        setSearchParams({ chat: activeChatId });
      }
    } else {
      if (chatParam) {
        setSearchParams({});
      }
    }
  }, [activeChat]);

  // Handle typing state sockets
  const typingTimeoutRef = useRef(null);
  const handleInputChange = (e) => {
    setText(e.target.value);
    
    if (socket && activeChat) {
      const activeChatId = activeChat._id || activeChat.id;
      socket.emit('typing', { senderId: user.id || user._id, receiverId: activeChatId });
      
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stopTyping', { senderId: user.id || user._id, receiverId: activeChatId });
      }, 1500);
    }
  };

  // Staging media attachments
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setStagedFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveFile = () => {
    setStagedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, {
          type: 'audio/webm',
        });
        
        sendMessage('', audioFile, replyingTo?._id || replyingTo?.id);
        setReplyingTo(null);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      showToast('error', 'Microphone access denied');
    }
  };

  const stopRecording = (shouldSend = true) => {
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (!shouldSend) {
        mediaRecorderRef.current.onstop = () => {
          mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
        };
      }
      mediaRecorderRef.current.stop();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() && !stagedFile) return;

    if (editingMessage) {
      editMessage(editingMessage._id || editingMessage.id, text.trim());
      setEditingMessage(null);
    } else {
      sendMessage(text.trim(), stagedFile, replyingTo?._id || replyingTo?.id);
      setReplyingTo(null);
    }

    setText('');
    handleRemoveFile();

    if (socket && activeChat) {
      const activeChatId = activeChat._id || activeChat.id;
      socket.emit('stopTyping', { senderId: user.id || user._id, receiverId: activeChatId });
    }
  };

  const appendEmoji = (emoji) => {
    setText((prev) => prev + emoji);
    setShowEmojis(false);
  };

  const handleStartReply = (msg) => {
    setReplyingTo(msg);
    setEditingMessage(null);
  };

  const handleStartEdit = (msg) => {
    setEditingMessage(msg);
    setText(msg.content);
    setReplyingTo(null);
  };

  // Merge conversations and friends list who don't have conversations yet
  const mergedChats = [];
  
  // Add actual conversations first
  conversations.forEach((conv) => {
    if (conv.friend) {
      mergedChats.push({
        id: conv.id || conv._id,
        friend: conv.friend,
        lastMessage: conv.lastMessage,
        updatedAt: conv.updatedAt,
      });
    }
  });

  // Find friends who don't have a conversation yet
  friendsList.forEach((friend) => {
    const friendId = friend.id || friend._id;
    const exists = mergedChats.some((chat) => {
      const chatFriendId = chat.friend.id || chat.friend._id;
      return chatFriendId === friendId;
    });

    if (!exists) {
      mergedChats.push({
        id: `new_${friendId}`,
        friend: friend,
        lastMessage: { content: 'Start a conversation', type: 'text', createdAt: friend.createdAt },
        updatedAt: friend.createdAt,
      });
    }
  });

  // Sort by updatedAt descending
  mergedChats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  // Filter based on search query
  const filteredChats = mergedChats.filter((c) =>
    c.friend.name.toLowerCase().includes(searchVal.toLowerCase()) ||
    c.friend.username.toLowerCase().includes(searchVal.toLowerCase())
  );

  const activeChatId = activeChat?._id || activeChat?.id;
  // Determine if the current chat is blocked by the user
  const isBlocked = blockedUsers.includes(activeChatId);


  const isMobileChatActive = isMobile && (activeChat || chatParam);

  return (
    <MessagesLayoutWrapper isMobileChatActive={isMobileChatActive}>
      <div className={isMobileChatActive 
        ? "w-full h-full flex bg-sp-card select-none"
        : "max-w-[1000px] mx-auto w-full h-[calc(100vh-9.5rem)] h-[calc(100dvh-9.5rem)] md:h-[calc(100vh-6rem)] md:h-[calc(100dvh-6rem)] min-h-[400px] md:min-h-[500px] flex rounded-2xl border border-sp-border bg-sp-card overflow-hidden shadow-card-lg select-none mb-[env(safe-area-inset-bottom,0px)]"
      }>
        
        {/* LEFT PANEL: Conversation list */}
        <div className={`w-full md:w-80 border-r border-sp-border flex flex-col flex-shrink-0 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 pb-2 border-b border-sp-border">
            <h1 className="text-xl font-bold text-sp-text mb-3">{t('messages.title')}</h1>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sp-muted" size={14} />
              <input
                type="text"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder={t('messages.searchConversations')}
                className="input pl-9 pr-4 py-1.5 text-xs w-full rounded-xl bg-sp-overlay border-sp-border"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scroll p-2 space-y-1">
            {filteredChats.length === 0 ? (
              <div className="text-center text-xs text-sp-muted py-10 px-4">
                {searchVal ? t('search.noResults') : t('messages.startConversation')}
              </div>
            ) : (
              filteredChats.map((chat) => {
                const cFriendId = chat.friend.id || chat.friend._id;
                const isSelected = activeChatId === cFriendId;
                const hasUnread = chat.lastMessage && chat.lastMessage.sender !== (user.id || user._id) && chat.lastMessage.status !== 'seen' && !chat.id.startsWith('new_');
                
                return (
                  <button
                    key={chat.id}
                    onClick={() => openConversation(chat.friend)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:bg-sp-hover
                      ${isSelected ? 'bg-sp-blue/15 text-sp-text' : 'text-sp-text'}`}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar
                        src={chat.friend.avatar}
                        alt={chat.friend.name}
                        online={chat.friend.isOnline}
                        className="w-11 h-11"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-semibold truncate flex items-center gap-1 ${isSelected ? 'text-sp-blue' : 'text-sp-text'}`}>
                          {chat.friend.name}
                          {chat.friend.verified && <VerifiedBadge size={12} />}
                        </p>
                        <span className="text-[10px] text-sp-muted">
                          {chat.lastMessage?.createdAt && timeAgo(chat.lastMessage.createdAt)}
                        </span>
                      </div>
                      <p className={`text-xs truncate mt-0.5 ${hasUnread ? 'font-bold text-sp-text' : 'text-sp-muted'}`}>
                        {chat.lastMessage?.content || (chat.lastMessage?.fileUrl ? 'Attachment file' : 'Start a conversation')}
                      </p>
                    </div>
                    {hasUnread && (
                      <span className="w-2.5 h-2.5 rounded-full bg-sp-blue flex-shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Open Chat details */}
        <div className={`flex-1 flex flex-col min-w-0 bg-sp-bg/25 ${!activeChat ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
          {activeChat ? 
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-sp-border bg-sp-card flex-shrink-0 sticky top-0 z-20">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={closeConversation}
                    className="p-2 hover:bg-sp-hover rounded-full text-sp-muted hover:text-sp-text transition-colors md:hidden"
                  >
                    <FiChevronLeft size={20} />
                  </button>
                  <Link 
                    to={`/profile/${activeChat._id || activeChat.id}`}
                    className="flex items-center gap-3 min-w-0 hover:opacity-85 transition-opacity cursor-pointer group"
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar
                        src={activeChat.avatar}
                        alt={activeChat.name}
                        online={activeChat.isOnline}
                        className="w-10 h-10 border border-sp-border"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-sp-text truncate flex items-center gap-1 group-hover:text-sp-blue transition-colors">
                        {activeChat.name}
                        {activeChat.verified && <VerifiedBadge size={13} />}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-sp-muted">
                        {isBlocked ? (
                          <span className="text-sp-muted">{t('messages.blockedYou')}</span>
                        ) : (
                          activeChat.isOnline ? (
                            <span className="flex items-center gap-1 text-[11px] text-green-400 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> {t('messages.online')}
                            </span>
                          ) : activeChat.lastSeen ? (
                            <span>{t('messages.lastSeen')} {timeAgo(activeChat.lastSeen)}</span>
                          ) : (
                            <span>{t('common.offline')}</span>
                          )
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startCall(activeChat, false)}
                    title="Audio call"
                    className={`p-2.5 bg-sp-overlay hover:bg-sp-hover text-sp-sub hover:text-sp-text rounded-xl transition-all ${isBlocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                    disabled={isBlocked}
                  >
                    <FiPhone size={16} />
                  </button>
                  <button
                    onClick={() => startCall(activeChat, true)}
                    title="Video call"
                    className={`p-2.5 bg-sp-overlay hover:bg-sp-hover text-sp-sub hover:text-sp-text rounded-xl transition-all ${isBlocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                    disabled={isBlocked}
                  >
                    <FiVideo size={16} />
                  </button>
                  {/* Three-dot menu */}
                  <div className="relative" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setChatMenuOpen(!chatMenuOpen)}
                      className="p-2.5 bg-sp-overlay hover:bg-sp-hover text-sp-sub hover:text-sp-text rounded-xl transition-all"
                      title="More options"
                    >
                      <FiMoreVertical size={16} />
                    </button>
                    {chatMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 z-50 bg-sp-card border border-sp-border rounded-2xl shadow-dropdown py-2 w-56 animate-bounce-in">
                        {/* View Profile */}
                        <button
                          onClick={() => { navigate(`/profile/${activeChat._id || activeChat.id}`); setChatMenuOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-xs text-sp-text hover:bg-sp-hover flex items-center gap-3 transition-colors"
                        >
                          <FiUser size={14} className="text-sp-blue" />
                          View Profile
                        </button>

                        {/* Mute / Unmute */}
                        <button
                          onClick={() => {
                            const chatId = activeChat._id || activeChat.id;
                            let updated;
                            if (mutedChats.includes(chatId)) {
                              updated = mutedChats.filter(id => id !== chatId);
                              showToast('info', `Unmuted ${activeChat.name}`);
                            } else {
                              updated = [...mutedChats, chatId];
                              showToast('info', `Muted ${activeChat.name}`);
                            }
                            setMutedChats(updated);
                            localStorage.setItem('spheral_muted_chats', JSON.stringify(updated));
                            setChatMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs text-sp-text hover:bg-sp-hover flex items-center gap-3 transition-colors"
                        >
                          {mutedChats.includes(activeChat._id || activeChat.id) ? (
                            <><FiBell size={14} className="text-green-400" /> Unmute Notifications</>
                          ) : (
                            <><FiBellOff size={14} className="text-sp-muted" /> Mute Notifications</>
                          )}
                        </button>

                        {/* Clear Chat */}
                        <button
                          onClick={async () => {
                            if (window.confirm(`Clear all messages with ${activeChat.name}? This only removes them from your view.`)) {
                              try {
                                await messagesAPI.deleteConversation(activeChat._id || activeChat.id);
                                showToast('info', 'Chat cleared');
                              } catch (e) {
                                console.error('Clear chat error:', e);
                              }
                              closeConversation();
                              loadConversations();
                            }
                            setChatMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs text-sp-text hover:bg-sp-hover flex items-center gap-3 transition-colors"
                        >
                          <FiTrash2 size={14} className="text-sp-muted" />
                          Clear Chat
                        </button>

                        <div className="border-t border-sp-divider my-1.5" />

                        {/* Block / Unblock */}
                        <button
                          onClick={async () => {
                            const chatId = activeChat._id || activeChat.id;
                            try {
                              const res = await usersAPI.blockUser(chatId);
                              if (res.isBlocked) {
                                setBlockedUsers(prev => [...prev, chatId]);
                                showToast('info', `${activeChat.name} has been blocked`);
                              } else {
                                setBlockedUsers(prev => prev.filter(id => id !== chatId));
                                showToast('info', `${activeChat.name} has been unblocked`);
                              }
                            } catch (err) {
                              showToast('error', 'Failed to update block status');
                            }
                            setChatMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs hover:bg-sp-hover flex items-center gap-3 transition-colors"
                        >
                          <FiSlash size={14} className={blockedUsers.includes(activeChat._id || activeChat.id) ? 'text-green-400' : 'text-red-400'} />
                          <span className={blockedUsers.includes(activeChat._id || activeChat.id) ? 'text-green-400' : 'text-red-400'}>
                            {blockedUsers.includes(activeChat._id || activeChat.id) ? 'Unblock User' : 'Block User'}
                          </span>
                        </button>

                        {/* Report */}
                        <button
                          onClick={() => { setShowReportModal(true); setChatMenuOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-xs text-red-400 hover:bg-sp-hover flex items-center gap-3 transition-colors"
                        >
                          <FiAlertTriangle size={14} />
                          Report User
                        </button>
                      </div>
                    )}
                </div>
              </div>
            </div>

              {/* Floating animated join live prompt for active chat friend */}
              {getLiveChannelForUser && getLiveChannelForUser(activeChatId) && (
                <div className="mx-4 mt-3 mb-1 bg-gradient-to-r from-pink-500 via-purple-600 to-red-500 rounded-2xl p-[1.5px] shadow-lg animate-pulse pointer-events-auto flex-shrink-0 relative z-30">
                  <div className="bg-sp-card rounded-[15px] p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar src={activeChat.avatar} alt={activeChat.name} size="sm" liveChannel={getLiveChannelForUser(activeChatId)} />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-black text-sp-text">{activeChat.name} is LIVE now! 🎥</p>
                        <p className="text-[10px] text-sp-muted">Join the live broadcast to watch or co-host</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate(`/live/${getLiveChannelForUser(activeChatId)}`)}
                      className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-[10px] shadow transition active:scale-95 cursor-pointer"
                    >
                      Join Live
                    </button>
                  </div>
                </div>
              )}

              {/* Report Modal */}
              {showReportModal && (
                <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowReportModal(false)}>
                  <div className="bg-sp-card border border-sp-border rounded-2xl p-5 w-full max-w-sm shadow-xl animate-bounce-in" onClick={e => e.stopPropagation()}>
                    <h3 className="font-bold text-sp-text text-sm mb-1">Report {activeChat.name}</h3>
                    <p className="text-[11px] text-sp-muted mb-4">Help us understand what's happening. Your report is anonymous.</p>
                    
                    <div className="space-y-2 mb-4">
                      {['Harassment or bullying', 'Spam or scam', 'Inappropriate content', 'Impersonation', 'Other'].map(reason => (
                        <button
                          key={reason}
                          onClick={() => setReportReason(reason)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs border transition-all ${
                            reportReason === reason
                              ? 'bg-sp-blue/15 border-sp-blue text-sp-blue font-semibold'
                              : 'bg-sp-overlay border-sp-border text-sp-text hover:bg-sp-hover'
                          }`}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>

                    <textarea
                      value={reportDesc}
                      onChange={e => setReportDesc(e.target.value)}
                      placeholder="Add more details (optional)..."
                      className="w-full input text-xs py-2 px-3 bg-sp-overlay border-sp-border rounded-xl h-16 resize-none focus:outline-none mb-4"
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowReportModal(false); setReportReason(''); setReportDesc(''); }}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold bg-sp-overlay text-sp-text hover:bg-sp-hover transition-colors border border-sp-border"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={!reportReason}
                        onClick={async () => {
                          try {
                            await reportsAPI.createReport({
                              contentId: activeChat._id || activeChat.id,
                              contentType: 'user',
                              reason: reportReason,
                              description: reportDesc
                            });
                            showToast('success', 'Report submitted. Thank you.');
                          } catch {
                            showToast('error', 'Failed to submit report');
                          }
                          setShowReportModal(false);
                          setReportReason('');
                          setReportDesc('');
                        }}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold text-white transition-colors ${
                          reportReason ? 'bg-red-500 hover:bg-red-600' : 'bg-red-500/40 cursor-not-allowed'
                        }`}
                      >
                        Submit Report
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scroll">
                {/* Conversation Start System Message Block */}
                <div className="flex flex-col items-center justify-center text-center p-6 border-b border-sp-divider mb-4 select-none">
                  <Avatar src={activeChat.avatar} alt={activeChat.name} size="2xl" className="mb-2 border border-sp-border shadow" />
                  <h4 className="font-bold text-sp-text text-base">{activeChat.name}</h4>
                  <p className="text-xs text-sp-muted mt-0.5">@{activeChat.username}</p>
                  
                  <div className="mt-4 p-3.5 rounded-2xl bg-sp-overlay border border-sp-border max-w-[90%] text-center">
                    <p className="text-xs text-sp-muted font-medium mb-1">
                      {activeChat.name} started this conversation
                    </p>
                    <p className="text-[10px] text-sp-sub">
                      Messages are private between you and {activeChat.name}
                    </p>
                  </div>
                </div>

                {chatMessages.length > 0 && (() => {
                  let lastTimestamp = null;
                  return chatMessages.map((msg, index) => {
                    const isMe = msg.sender === user?.id || msg.sender?._id === user?.id || msg.sender === user?._id;
                    const isLastMessage = index === chatMessages.length - 1;
                    const msgTime = new Date(msg.createdAt || new Date());
                    let showTimeBlock = false;
                    if (!lastTimestamp || (msgTime - lastTimestamp) > 15 * 60 * 1000) {
                      showTimeBlock = true;
                      lastTimestamp = msgTime;
                    }

                    return (
                      <div key={`${msg._id || msg.id}-${index}`} className="flex flex-col w-full">
                        {showTimeBlock && (
                          <div className="text-center my-4 text-[10px] text-sp-muted font-semibold uppercase tracking-wider select-none">
                            {formatMessageTimeBlock(msgTime)}
                          </div>
                        )}
                        <div className={`flex gap-3 max-w-[85%] group relative ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                          
                          {/* Hover Actions Menu */}
                          <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10
                            ${isMe ? 'right-full mr-2 flex-row-reverse' : 'left-full ml-2'}`}>
                            <button
                              onClick={() => handleStartReply(msg)}
                              className="p-1.5 rounded-lg bg-sp-card hover:bg-sp-hover text-sp-sub hover:text-sp-blue border border-sp-border transition-all"
                              title="Reply"
                            >
                              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="13" width="13" xmlns="http://www.w3.org/2000/svg">
                                <polyline points="9 17 4 12 9 7"></polyline>
                                <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
                              </svg>
                            </button>
                            {isMe && msg.type === 'text' && (
                              <button
                                onClick={() => handleStartEdit(msg)}
                                className="p-1.5 rounded-lg bg-sp-card hover:bg-sp-hover text-sp-sub hover:text-sp-blue border border-sp-border transition-all"
                                title="Edit"
                              >
                                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="13" width="13" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path>
                                </svg>
                              </button>
                            )}
                            {/* Delete button (triggers global confirmation modal) */}
                            <button
                              onClick={() => setMessageToDelete(msg)}
                              className="p-1.5 rounded-lg bg-sp-card hover:bg-sp-hover text-sp-sub hover:text-sp-red border border-sp-border transition-all"
                              title="Delete"
                            >
                              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="13" width="13" xmlns="http://www.w3.org/2000/svg">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                              </svg>
                            </button>
                          </div>

                          {/* Avatar */}
                          {!isMe && (
                            <div className="flex-shrink-0 self-end">
                                <Avatar src={activeChat.avatar} alt={activeChat.name} className="w-8 h-8" />
                            </div>
                          )}
                          <div className="flex flex-col max-w-full relative group/bubble">
                            <ReactionPicker
                              onSelect={(type) => handleMessageReact(msg._id || msg.id, type)}
                              current={msg.reactions?.find(r => (r.user?.id || r.user?._id || r.user) === (user?.id || user?._id))?.type}
                              positionClass={isMe ? 'right-0' : 'left-0'}
                            >
                              {msg.type === 'sticker' ? (
                                <div className="my-1 cursor-pointer transition-transform hover:scale-105 active:scale-95 animate-scale-in" onClick={() => setStickerToSave(msg.fileUrl)} title="Click to save sticker">
                                  <img
                                    src={msg.fileUrl}
                                    alt="Sticker"
                                    className="w-28 h-28 object-contain select-none"
                                  />
                                </div>
                              ) : msg.type === 'gif' ? (
                                <div className="relative rounded-2xl overflow-hidden border border-sp-border bg-black/10 max-w-xs shadow-sm my-1">
                                  <img
                                    src={msg.fileUrl}
                                    alt="GIF"
                                    className="max-h-48 object-cover rounded-2xl"
                                  />
                                  <span className="absolute bottom-2 left-2 text-[9px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded uppercase tracking-wide">
                                    GIF
                                  </span>
                                </div>
                              ) : msg.content === '👍' ? (
                                <div className="my-1">
                                  <img src="https://em-content.zobj.net/source/facebook/355/thumbs-up_1f44d.png" alt="👍" className="w-16 h-16 animate-scale-in drop-shadow-md" />
                                </div>
                              ) : (
                                <div
                                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                    isMe
                                      ? 'bg-sp-blue text-white rounded-tr-none shadow-glow-sm'
                                      : 'bg-sp-card text-sp-text rounded-bl-none border border-sp-border'
                                  }`}
                                >
                                  {/* Replied Message block */}
                                  {msg.parentMessage && (
                                    <div className={`text-[11px] mb-2 px-2.5 py-1.5 rounded-lg border-l-2 bg-black/10 text-white/90 border-sp-blue max-w-xs truncate
                                      ${isMe ? 'text-white/80 border-white/60 bg-white/10' : 'text-sp-muted border-sp-blue bg-sp-overlay'}`}>
                                      <p className={`font-semibold ${isMe ? 'text-white' : 'text-sp-blue'}`}>
                                        {msg.parentMessage.sender?.name || 'User'}
                                      </p>
                                      <p className="truncate mt-0.5">
                                        {msg.parentMessage.content || (msg.parentMessage.fileUrl ? 'Attachment' : '')}
                                      </p>
                                    </div>
                                  )}

                                  {/* Attachment File Rendering */}
                                  {msg.fileUrl && (
                                    <div className="mb-2 max-w-full rounded-lg overflow-hidden border border-white/10">
                                      {msg.type === 'image' && (
                                        <img
                                          src={getAssetUrl(msg.fileUrl)}
                                          alt="Attachment"
                                          className="max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                          onClick={() => setZoomedImage(getAssetUrl(msg.fileUrl))}
                                          title="Click to zoom / download"
                                        />
                                      )}
                                      {msg.type === 'video' && (
                                        <video
                                          src={getAssetUrl(msg.fileUrl)}
                                          controls
                                          className="max-h-64"
                                        />
                                      )}
                                      {msg.type === 'audio' && (
                                        <audio
                                          src={getAssetUrl(msg.fileUrl)}
                                          controls
                                          className="max-w-full p-1 h-9 rounded bg-sp-overlay"
                                        />
                                      )}
                                    </div>
                                  )}

                                  {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                                </div>
                              )}
                            </ReactionPicker>

                            {/* Render Message Reactions badge */}
                            {msg.reactions && msg.reactions.length > 0 && (
                              <div className={`flex items-center gap-0.5 bg-sp-overlay border border-sp-border rounded-full px-1.5 py-0.5 shadow-sm absolute -bottom-2 z-10 scale-90 select-none
                                ${isMe ? 'right-2' : 'left-2'}`}>
                                {Array.from(new Set(msg.reactions.map(r => r.type))).map(reactionType => (
                                  <button
                                    key={reactionType}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const ownReaction = msg.reactions.find(r => (r.user?.id || r.user?._id || r.user) === (user?.id || user?._id));
                                      if (ownReaction && ownReaction.type === reactionType) {
                                        handleMessageReact(msg._id || msg.id, reactionType);
                                      }
                                    }}
                                    className="hover:scale-110 active:scale-95 transition-transform"
                                    title="Click to remove your reaction"
                                  >
                                    {getReactionIcon(reactionType, 13, true)}
                                  </button>
                                ))}
                                <span className="text-[9px] font-bold text-sp-muted px-0.5">
                                  {msg.reactions.length}
                                </span>
                              </div>
                            )}
                            
                            {/* Seen / Delivered receipts & Timestamp */}
                            <div className={`flex items-center gap-1.5 mt-1 text-[9px] text-sp-muted font-bold tracking-wider ${isMe ? 'justify-end mr-1' : 'ml-1'}`}>
                              <span>
                                {msgTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {msg.isEdited && <span className="text-[9px] text-sp-muted italic font-normal lowercase"> (edited)</span>}
                              {isLastMessage && isMe && (
                                <span className="uppercase">
                                  · {msg.status === 'seen' ? 'seen ✓✓' : msg.status === 'delivered' ? 'delivered ✓✓' : 'sent ✓'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
                <div ref={messagesEndRef} />
              </div>
              {/* Typing Feedback */}
              {typingFriendId && (
                <div className="px-4 py-2 text-xs text-sp-sub italic bg-sp-card border-t border-sp-divider flex-shrink-0 animate-pulse">
                  {activeChat.name} is typing...
                </div>
              )}

              {/* Replying banner */}
              {replyingTo && (
                <div className="px-4 py-2 bg-sp-overlay border-t border-sp-border flex items-center justify-between text-xs text-sp-text flex-shrink-0 animate-fade-in">
                  <div className="min-w-0">
                    <span className="font-semibold text-sp-blue">Replying to {replyingTo.sender?.name || 'User'}</span>
                    <p className="truncate text-sp-muted mt-0.5">
                      {replyingTo.content || (replyingTo.fileUrl ? 'Attachment' : '')}
                    </p>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="text-sp-muted hover:text-sp-text p-1">
                    <FiX size={14} />
                  </button>
                </div>
              )}

              {/* Editing banner */}
              {editingMessage && (
                <div className="px-4 py-2 bg-sp-overlay border-t border-sp-border flex items-center justify-between text-xs text-sp-text flex-shrink-0 animate-fade-in">
                  <div className="min-w-0">
                    <span className="font-semibold text-sp-blue">Editing message</span>
                    <p className="truncate text-sp-muted mt-0.5">{editingMessage.content}</p>
                  </div>
                  <button onClick={() => { setEditingMessage(null); setText(''); }} className="text-sp-muted hover:text-sp-text p-1">
                    <FiX size={14} />
                  </button>
                </div>
              )}

              {/* Staged file attachment preview */}
              {filePreview && (
                <div className="px-4 py-2 bg-sp-overlay border-t border-sp-divider flex items-center justify-between flex-shrink-0 animate-fade-in text-sp-text">
                  <div className="flex items-center gap-3 min-w-0">
                    {stagedFile?.type.startsWith('image/') ? (
                      <img src={filePreview} alt="Staged" className="w-11 h-11 rounded-lg object-cover border border-sp-border" />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-sp-blue/15 flex items-center justify-center text-sp-blue text-xs font-bold uppercase">
                        File
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs text-sp-text truncate font-semibold">{stagedFile?.name}</p>
                      <p className="text-[10px] text-sp-muted">{(stagedFile?.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button onClick={handleRemoveFile} className="w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors">
                    <FiX size={12} />
                  </button>
                </div>
              )}

              {/* Voice Recorder Overlay */}
              {isRecording && (
                <div className="px-4 py-3.5 bg-sp-overlay border-t border-sp-divider flex items-center justify-between flex-shrink-0 animate-pulse text-sp-text">
                  <div className="flex items-center gap-2 text-red-500 font-bold text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                    <span>Recording Voice Note ({formatDurationSeconds(recordingSeconds)})</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => stopRecording(false)}
                      className="p-2 bg-white/10 hover:bg-white/20 text-sp-text rounded-full transition-colors"
                      title="Discard"
                    >
                      <FiTrash2 size={13} className="text-sp-muted" />
                    </button>
                    <button
                      onClick={() => stopRecording(true)}
                      className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                      title="Stop and Send"
                    >
                      <FiSquare size={13} />
                    </button>
                  </div>
                </div>
              )}

              {/* AI Assistant Panel */}
              {showAiAssistant && (
                <div className="absolute bottom-16 left-6 right-6 z-50 bg-sp-card border border-sp-border rounded-2xl p-4 shadow-dropdown animate-bounce-in flex flex-col gap-3">
                  <div className="flex justify-between items-center pb-2 border-b border-sp-divider">
                    <span className="text-xs font-bold text-sp-text flex items-center gap-1.5">
                      <FiCpu size={14} className="text-sp-blue" />
                      AI Chat Assistant
                    </span>
                    <button type="button" onClick={() => { setShowAiAssistant(false); setAiChatResponse(''); }} className="text-sp-muted hover:text-sp-text">
                      <FiX size={14} />
                    </button>
                  </div>
                  
                  {aiChatResponse ? (
                    <div className="flex flex-col gap-2.5 text-left">
                      <div className="bg-sp-overlay border border-sp-border rounded-xl p-3 text-xs text-sp-text max-h-36 overflow-y-auto leading-relaxed select-text whitespace-pre-wrap">
                        {aiChatResponse}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setText(aiChatResponse);
                            setShowAiAssistant(false);
                            setAiChatResponse('');
                          }}
                          className="flex-1 py-2 bg-sp-overlay hover:bg-sp-hover text-sp-text border border-sp-border rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          Insert
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            sendMessage(aiChatResponse);
                            setShowAiAssistant(false);
                            setAiChatResponse('');
                          }}
                          className="flex-1 py-2 bg-sp-blue hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          Send
                        </button>
                        <button
                          type="button"
                          onClick={() => setAiChatResponse('')}
                          className="px-4 py-2 bg-sp-overlay hover:bg-sp-hover text-sp-text border border-sp-border rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          Retry
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 text-left">
                      <p className="text-[11px] text-sp-muted">
                        Ask the AI to help write your message. It knows the context of what you've typed.
                      </p>
                      {text && (
                        <div className="bg-sp-overlay p-2 rounded-lg text-[10px] text-sp-muted truncate">
                          Context: "{text}"
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g., help me word this better"
                          value={aiChatPrompt}
                          onChange={(e) => setAiChatPrompt(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAiChatSubmit();
                            }
                          }}
                          className="flex-1 bg-sp-overlay border border-sp-border rounded-xl px-3 py-2 text-xs text-sp-text focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleAiChatSubmit}
                          disabled={aiChatLoading || !aiChatPrompt.trim()}
                          className="px-4 py-2 bg-sp-blue hover:bg-blue-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer shrink-0"
                        >
                          {aiChatLoading ? 'Thinking...' : 'Ask'}
                        </button>
                      </div>
                      {aiChatError && (
                        <p className="text-[10px] text-red-400 font-semibold">{aiChatError}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Emoji Selector Panel */}
              {showEmojis && (
                <div className="absolute bottom-16 left-6 z-50 bg-sp-card border border-sp-border rounded-xl p-3 shadow-dropdown w-72 animate-bounce-in grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setText((prev) => prev + emoji);
                        setShowEmojis(false);
                      }}
                      className="text-2xl p-1 hover:scale-125 transition-transform duration-100"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Sticker Selector Panel */}
              {showStickers && (
                <div className="absolute bottom-16 left-6 z-50 bg-sp-card border border-sp-border rounded-2xl p-3.5 shadow-dropdown w-80 animate-bounce-in">
                  <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-sp-divider">
                    <span className="text-xs font-bold text-sp-text uppercase tracking-wider">Stickers</span>
                    <button type="button" onClick={() => setShowStickers(false)} className="text-sp-muted hover:text-sp-text"><FiX size={14} /></button>
                  </div>
                  <div className="grid grid-cols-4 gap-2.5 max-h-48 overflow-y-auto no-scroll">
                    {/* Add custom sticker button */}
                    <button
                      type="button"
                      onClick={() => stickerFileRef.current?.click()}
                      className="hover:scale-110 transition-transform duration-100 p-1 bg-sp-overlay rounded-lg border-2 border-dashed border-sp-blue/40 flex flex-col items-center justify-center gap-0.5 text-sp-blue h-14"
                      title="Create your own sticker"
                    >
                      <FiPlus size={18} />
                      <span className="text-[8px] font-bold uppercase">Create</span>
                    </button>
                    <input
                      type="file"
                      ref={stickerFileRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const newSticker = { id: `custom_${Date.now()}`, url: reader.result, label: file.name.split('.')[0] };
                          const updated = [...customStickers, newSticker];
                          setCustomStickers(updated);
                          localStorage.setItem('spheral_custom_stickers', JSON.stringify(updated));
                          showToast('success', 'Custom sticker created!');
                        };
                        reader.readAsDataURL(file);
                        e.target.value = '';
                      }}
                    />
                    {/* Custom stickers first */}
                    {customStickers.map((stk) => (
                      <div key={stk.id} className="relative group">
                        <button
                          type="button"
                          onClick={() => {
                            sendMessage('', null, null, 'sticker', stk.url);
                            setShowStickers(false);
                          }}
                          className="hover:scale-110 transition-transform duration-100 p-1 bg-sp-overlay rounded-lg border border-sp-blue/30 flex items-center justify-center w-full"
                        >
                          <img src={stk.url} alt={stk.label} className="w-12 h-12 object-contain rounded" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = customStickers.filter(s => s.id !== stk.id);
                            setCustomStickers(updated);
                            localStorage.setItem('spheral_custom_stickers', JSON.stringify(updated));
                          }}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {/* Default stickers */}
                    {STICKERS.map((stk) => (
                      <button
                        key={stk.id}
                        type="button"
                        onClick={() => {
                          sendMessage('', null, null, 'sticker', stk.url);
                          setShowStickers(false);
                        }}
                        className="hover:scale-110 transition-transform duration-100 p-1 bg-sp-overlay rounded-lg border border-sp-border flex items-center justify-center"
                      >
                        <img src={stk.url} alt={stk.label} className="w-12 h-12 object-contain" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* GIF Selector Panel */}
              {showGifs && (
                <div className="absolute bottom-16 left-6 z-50 bg-sp-card border border-sp-border rounded-2xl p-3.5 shadow-dropdown w-72 animate-bounce-in flex flex-col">
                  <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-sp-divider">
                    <span className="text-xs font-bold text-sp-text uppercase tracking-wider">Tenor GIFs</span>
                    <button type="button" onClick={() => setShowGifs(false)} className="text-sp-muted hover:text-sp-text"><FiX size={14} /></button>
                  </div>
                  <input
                    type="text"
                    placeholder="Search GIFs..."
                    value={gifQuery}
                    onChange={(e) => setGifQuery(e.target.value)}
                    className="input py-1.5 px-3 text-xs w-full mb-3 rounded-lg bg-sp-overlay border border-sp-border focus:outline-none"
                  />
                  {gifLoading ? (
                    <div className="flex justify-center py-6"><LoadingSpinner size="sm" /></div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5 max-h-44 overflow-y-auto no-scroll">
                      {gifResults.map((gif) => (
                        <button
                          key={gif.id}
                          type="button"
                          onClick={() => {
                            sendMessage('', null, null, 'gif', gif.url);
                            setShowGifs(false);
                          }}
                          className="hover:scale-105 transition-transform overflow-hidden rounded bg-black/10 flex items-center justify-center h-14"
                        >
                          <img src={gif.preview} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                      {gifResults.length === 0 && (
                        <div className="col-span-3 text-center py-6 text-xs text-sp-muted">No GIFs found</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Message Input Panel */}
              {!isRecording && !showStickers && !showGifs && !showEmojis && 
                isBlocked ? (
                  <div className="flex items-center justify-center w-full p-3 bg-sp-card border-t border-sp-divider">
                    <div className="flex items-center gap-2 bg-sp-overlay text-sp-text rounded-xl px-4 py-2">
                      <FiSlash size={16} className="text-red-500" />
                      <span>{t('messages.youBlocked')}</span>
                      <button
                        onClick={async () => {
                          const chatId = activeChatId;
                          try {
                            const res = await usersAPI.blockUser(chatId);
                            if (!res.isBlocked) {
                              setBlockedUsers(prev => prev.filter(id => id !== chatId));
                              showToast('info', `${activeChat.name} has been unblocked`);
                            }
                          } catch (e) {
                            showToast('error', 'Failed to unblock user');
                          }
                        }}
                        className="ml-2 px-3 py-1 bg-sp-blue text-white rounded hover:bg-sp-blue/80"
                      >
                        {t('common.unblock')}
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await messagesAPI.deleteConversation(activeChatId);
                          } catch (e) {
                            console.error('Delete conversation error:', e);
                          }
                          closeConversation();
                          loadConversations();
                        }}
                        className="ml-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="p-3 border-t border-sp-divider bg-sp-card flex gap-2 items-center flex-shrink-0 relative">
                  {/* Left Side Actions Wrapper */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setActionsExpanded(!actionsExpanded)}
                      className="w-9 h-9 rounded-xl md:hidden flex items-center justify-center bg-sp-overlay text-sp-sub hover:text-sp-text hover:bg-sp-hover transition-colors"
                      title="Toggle actions"
                    >
                      {actionsExpanded ? <FiX size={16} /> : <FiPlus size={16} />}
                    </button>

                    <div className={`items-center gap-1 ${actionsExpanded ? 'flex' : 'hidden md:flex'}`}>
                      <button
                        type="button"
                        onClick={startRecording}
                        className="w-9 h-9 rounded-xl text-sp-sub hover:text-sp-text hover:bg-sp-hover transition-colors flex items-center justify-center flex-shrink-0"
                        title="Voice note"
                        disabled={!!editingMessage || isBlocked}
                      >
                        <FiMic size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-sp-sub hover:text-sp-text hover:bg-sp-hover transition-colors flex-shrink-0"
                        title="Attach file"
                        disabled={!!editingMessage || isBlocked}
                      >
                        <FiPaperclip size={16} />
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*,video/*,audio/*"
                      />

                      <button
                        type="button"
                        onClick={() => { setShowStickers(!showStickers); setShowGifs(false); setShowEmojis(false); }}
                        className={`w-9 h-9 rounded-xl transition-colors flex items-center justify-center flex-shrink-0
                          ${showStickers ? 'bg-sp-blue text-white shadow-glow-sm' : 'text-sp-sub hover:text-sp-text hover:bg-sp-hover'}`}
                        title="Sticker"
                        disabled={!!editingMessage}
                      >
                        <FiStar size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => { setShowGifs(!showGifs); setShowStickers(false); setShowEmojis(false); }}
                        className={`w-9 h-9 rounded-xl transition-colors flex items-center justify-center font-bold text-[10px] border leading-none flex-shrink-0
                          ${showGifs ? 'bg-sp-blue text-white border-sp-blue shadow-glow-sm' : 'text-sp-sub hover:text-sp-text hover:bg-sp-hover border-sp-border'}`}
                        title="GIPHY GIF"
                        disabled={!!editingMessage}
                      >
                        GIF
                      </button>
                    </div>
                  </div>

                  {/* Middle Area: input field + inline Emoji/AI picker icons */}
                  <div className="flex-1 relative flex items-center">
                    <input
                      type="text"
                      value={text}
                      onChange={handleInputChange}
                      onFocus={() => setActionsExpanded(false)}
                      placeholder={editingMessage ? t('common.edit') : t('messages.typeMessage')}
                      className="w-full input text-sm py-2 pl-4 pr-16 bg-sp-overlay border-sp-border rounded-full focus:outline-none"
                    />
                    <div className="absolute right-3 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => { setShowAiAssistant(!showAiAssistant); setShowEmojis(false); setShowStickers(false); setShowGifs(false); }}
                        className={`transition-colors ${showAiAssistant ? 'text-sp-blue' : 'text-sp-sub hover:text-sp-text'}`}
                        title="AI Chat Assistant"
                      >
                        <FiCpu size={15} className={aiChatLoading ? 'animate-spin text-sp-blue' : ''} />
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowEmojis(!showEmojis); setShowAiAssistant(false); setShowStickers(false); setShowGifs(false); }}
                        className="text-sp-sub hover:text-sp-text transition-colors"
                        title="Add Emoji"
                      >
                        <FiSmile size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Right Side: Thumbs-up or Send */}
                  {!text.trim() && !stagedFile ? (
                    <button
                      type="button"
                      onClick={() => sendMessage('👍')}
                      className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-sp-hover transition-all active:scale-95 flex-shrink-0"
                      title="Send thumbs-up"
                    >
                      <img src="https://em-content.zobj.net/source/facebook/355/thumbs-up_1f44d.png" alt="👍" className="w-6 h-6 drop-shadow-sm" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="w-9 h-9 rounded-xl bg-sp-blue text-white flex items-center justify-center hover:bg-blue-600 transition-colors shadow-glow-sm flex-shrink-0"
                    >
                      <FiSend size={15} />
                    </button>
                  )}
                </form>
              )}
            </>
           : (
            /* Empty Chat State */
            <div className="flex flex-col items-center justify-center p-8 text-center text-sp-muted">
              <div className="w-16 h-16 rounded-3xl bg-sp-overlay border border-sp-border flex items-center justify-center text-sp-blue text-2xl shadow-glow-sm mb-4">
                <FiMessageCircle size={28} />
              </div>
              <h3 className="font-bold text-sp-text text-base">Your Messages</h3>
              <p className="text-xs text-sp-muted mt-1 max-w-[240px] leading-relaxed">
                Select a conversation from the left panel or visit a friend's profile to start a new chat.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Save Sticker Confirmation Modal */}
      {stickerToSave && (
        <div className="fixed inset-0 z-[10000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-sp-card border border-sp-border rounded-2xl p-5 max-w-sm w-full text-center shadow-2xl animate-scale-in">
            <h3 className="text-base font-bold text-sp-text mb-2">Save Sticker</h3>
            <p className="text-xs text-sp-muted mb-4">Would you like to add this sticker to your custom collection?</p>
            
            <div className="flex justify-center mb-5 bg-sp-overlay p-3 rounded-xl border border-sp-border w-24 h-24 mx-auto items-center">
              <img src={stickerToSave} alt="Sticker preview" className="w-20 h-20 object-contain" />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStickerToSave(null)}
                className="flex-1 py-2 bg-sp-overlay hover:bg-sp-hover text-sp-text border border-sp-border rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  saveCustomSticker(stickerToSave);
                  setStickerToSave(null);
                }}
                className="flex-1 py-2 bg-sp-blue hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Save Sticker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Zoomed Image Modal */}
      {zoomedImage && (
        <div className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 select-none animate-fade-in">
          {/* Close button at top-right */}
          <button
            type="button"
            onClick={() => setZoomedImage(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-colors cursor-pointer"
            title="Close"
          >
            <FiX size={24} />
          </button>

          {/* Center Zoomed Image */}
          <div className="max-w-4xl max-h-[70vh] flex items-center justify-center overflow-hidden rounded-lg shadow-2xl border border-white/10">
            <img
              src={zoomedImage}
              alt="Zoomed attachment"
              className="max-w-full max-h-[70vh] object-contain select-text"
            />
          </div>

          {/* Action buttons under the image */}
          <div className="mt-6 flex items-center gap-4">
            <a
              href={zoomedImage}
              download={`spheral-download-${Date.now()}.jpg`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 bg-sp-blue hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition shadow-glow-sm cursor-pointer"
              title="Download image to your device"
            >
              <span>Download</span>
            </a>
            <button
              type="button"
              onClick={() => {
                saveCustomSticker(zoomedImage);
                setZoomedImage(null);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl text-sm font-bold transition cursor-pointer"
              title="Save this image to your custom stickers list"
            >
              <span>Save as Sticker</span>
            </button>
          </div>
        </div>
      )}

      {/* Delete Message Confirmation Modal (WhatsApp Style) */}
      {messageToDelete && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fade-in" onClick={() => setMessageToDelete(null)}>
          <div className="bg-sp-card border border-sp-border rounded-3xl p-5 max-w-sm w-full shadow-2xl animate-scale-in text-center" onClick={e => e.stopPropagation()}>
            <FiTrash2 size={28} className="text-red-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-sp-text mb-1">Delete Message?</h3>
            <p className="text-xs text-sp-muted mb-5">Would you like to delete this message?</p>
            
            <div className="flex flex-col gap-2">
              {(messageToDelete.sender === user?.id || messageToDelete.sender?._id === user?.id || messageToDelete.sender === user?._id) && (
                <button
                  onClick={() => {
                    deleteMessage(messageToDelete._id || messageToDelete.id, 'everyone');
                    setMessageToDelete(null);
                  }}
                  className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
                >
                  Delete for Everyone
                </button>
              )}
              <button
                onClick={() => {
                  deleteMessage(messageToDelete._id || messageToDelete.id, 'me');
                  setMessageToDelete(null);
                }}
                className="w-full py-2.5 bg-sp-overlay hover:bg-sp-hover text-sp-text border border-sp-border rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
              >
                Delete for Me
              </button>
              <button
                onClick={() => setMessageToDelete(null)}
                className="w-full py-2.5 text-xs text-sp-muted hover:text-sp-text transition cursor-pointer mt-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </MessagesLayoutWrapper>
  );
}

function formatDurationSeconds(secs) {
  const mins = Math.floor(secs / 60);
  const remainingSecs = secs % 60;
  return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
}
