import { useState, useRef, useEffect } from 'react';
import {
  FiX, FiSend, FiMinimize2, FiPaperclip, FiMic, FiPhone, FiVideo,
  FiSmile, FiTrash2, FiPlay, FiSquare, FiThumbsUp, FiStar, FiHeart, FiPlus, FiCpu
} from 'react-icons/fi';
import { useApp } from '../../context/AppContext';
import { messagesAPI } from '../../api/messages';
import Avatar from './Avatar';
import ReactionPicker from './ReactionPicker';
import { getReactionIcon } from './ReactionIcons';
import { timeAgo, getAssetUrl } from '../../utils/helpers';

const EMOJIS = [
  '👍', '❤️', '😆', '😮', '😢', '😡', '😂', '🔥', '👏', '🎉',
  '🙌', '✨', '💡', '💯', '🙋‍♂️', '👀', '😎', '😍', '🤔', '✈️',
  '🍕', '🍺', '🎈', '💻'
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

export default function ChatBox() {
  const {
    activeChat,
    chatMessages,
    chatOpen,
    sendMessage,
    closeConversation,
    user,
    socket,
    typingFriendId,
    startCall
  } = useApp();

  const [text, setText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [actionsExpanded, setActionsExpanded] = useState(false);

  const [showStickers, setShowStickers] = useState(false);
  const [showGifs, setShowGifs] = useState(false);
  const [gifQuery, setGifQuery] = useState('');
  const [gifResults, setGifResults] = useState([]);
  const [gifLoading, setGifLoading] = useState(false);

  // Custom stickers (shared with MessagesPage via localStorage)
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

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (chatOpen) {
      scrollToBottom();
    }
  }, [chatMessages, chatOpen]);

  // Handle typing state sockets
  const typingTimeoutRef = useRef(null);
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
      }, 2500); // Cooldown
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
        setChatMessages(prev =>
          prev.map(m => ((m._id || m.id) === messageId ? { ...m, reactions: res.reactions } : m))
        );
      }
    } catch (err) {
      console.error('Failed to react to message', err);
      showToast('error', 'Failed to react');
    }
  };

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
        
        // Directly send voice note
        sendMessage('', audioFile);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  };

  const stopRecording = (shouldSend = true) => {
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (!shouldSend) {
        // Discard chunks before stopping
        mediaRecorderRef.current.onstop = () => {
          mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
        };
      }
      mediaRecorderRef.current.stop();
    }
  };

  if (!chatOpen || !activeChat) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() && !stagedFile) return;

    sendMessage(text.trim(), stagedFile);
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

  return (
    <div className="fixed bottom-0 right-4 sm:right-12 w-80 h-[420px] bg-sp-card border border-sp-border rounded-t-2xl shadow-dropdown z-[400] flex flex-col overflow-hidden animate-scale-in">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-sp-blue text-white flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar src={activeChat.avatar} alt={activeChat.name} size="sm" className="border border-white/20" />
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{activeChat.name}</p>
            <div className="flex items-center gap-1 text-[10px] text-white/80">
              {activeChat.isOnline ? (
                <span className="flex items-center gap-0.5 text-green-300 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Active now
                </span>
              ) : activeChat.lastSeen ? (
                <span>Active {timeAgo(activeChat.lastSeen)}</span>
              ) : (
                <span>Offline</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Audio Call Button */}
          <button
            onClick={() => startCall(activeChat, false)}
            title="Audio call"
            className="hover:bg-white/10 p-1.5 rounded-full transition-colors"
          >
            <FiPhone size={14} />
          </button>
          
          {/* Video Call Button */}
          <button
            onClick={() => startCall(activeChat, true)}
            title="Video call"
            className="hover:bg-white/10 p-1.5 rounded-full transition-colors"
          >
            <FiVideo size={14} />
          </button>

          <button onClick={closeConversation} className="hover:bg-white/10 p-1.5 rounded-full transition-colors">
            <FiX size={15} />
          </button>
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-sp-bg/40 no-scroll relative">
        {/* Conversation Start System Message Block */}
        <div className="flex flex-col items-center justify-center text-center p-4 border-b border-sp-divider mb-3 select-none">
          <Avatar src={activeChat.avatar} alt={activeChat.name} size="lg" className="mb-1.5 border border-sp-border shadow" />
          <h4 className="font-bold text-sp-text text-sm">{activeChat.name}</h4>
          <p className="text-[10px] text-sp-muted">@{activeChat.username}</p>
          
          <div className="mt-3 p-2.5 rounded-xl bg-sp-overlay border border-sp-border max-w-[95%] text-center">
            <p className="text-[11px] text-sp-muted font-medium mb-0.5">
              {activeChat.name} started this conversation
            </p>
            <p className="text-[9px] text-sp-sub">
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
              <div key={msg._id || msg.id} className="flex flex-col w-full">
                {showTimeBlock && (
                  <div className="text-center my-3 text-[9px] text-sp-muted font-semibold uppercase tracking-wider select-none">
                    {formatMessageTimeBlock(msgTime)}
                  </div>
                )}
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} relative group/bubble max-w-full`}>
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
                          className="w-20 h-20 object-contain select-none"
                        />
                      </div>
                    ) : msg.type === 'gif' ? (
                      <div className="relative rounded-xl overflow-hidden border border-sp-border bg-black/10 max-w-[70%] shadow-sm my-1">
                        <img
                          src={msg.fileUrl}
                          alt="GIF"
                          className="max-h-36 object-cover rounded-xl"
                        />
                        <span className="absolute bottom-1.5 left-1.5 text-[8px] font-bold text-white bg-black/60 px-1 py-0.5 rounded uppercase tracking-wide">
                          GIF
                        </span>
                      </div>
                    ) : msg.content === '👍' ? (
                      <div className="my-0.5">
                        <img src="https://em-content.zobj.net/source/facebook/355/thumbs-up_1f44d.png" alt="👍" className="w-12 h-12 animate-scale-in drop-shadow-md" />
                      </div>
                    ) : (
                      <div
                        className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                          isMe
                            ? 'bg-sp-blue text-white rounded-tr-none shadow-glow-sm'
                            : 'bg-sp-overlay text-sp-text rounded-tl-none border border-sp-border'
                        }`}
                      >
                        {/* File Rendering */}
                        {msg.fileUrl && (
                          <div className="mb-2 max-w-full rounded-lg overflow-hidden border border-white/15">
                            {msg.type === 'image' && (
                              <img
                                src={msg.fileUrl.startsWith('http') ? msg.fileUrl : `http://localhost:5000${msg.fileUrl}`}
                                alt="Attachment"
                                className="max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setZoomedImage(msg.fileUrl.startsWith('http') ? msg.fileUrl : `http://localhost:5000${msg.fileUrl}`)}
                                title="Click to zoom / download"
                              />
                            )}
                            {msg.type === 'video' && (
                              <video
                                src={msg.fileUrl.startsWith('http') ? msg.fileUrl : `http://localhost:5000${msg.fileUrl}`}
                                controls
                                className="max-h-48"
                              />
                            )}
                            {msg.type === 'audio' && (
                              <audio
                                src={msg.fileUrl.startsWith('http') ? msg.fileUrl : `http://localhost:5000${msg.fileUrl}`}
                                controls
                                className="max-w-full p-1 h-9 rounded bg-sp-overlay"
                              />
                            )}
                          </div>
                        )}

                        {msg.content && <p>{msg.content}</p>}
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
                          {getReactionIcon(reactionType, 11, true)}
                        </button>
                      ))}
                      <span className="text-[9px] font-bold text-sp-muted px-0.5">
                        {msg.reactions.length}
                      </span>
                    </div>
                  )}

                  {/* Seen status delivery receipts & Timestamp */}
                  <div className={`flex items-center gap-1 mt-0.5 text-[9px] text-sp-muted font-semibold tracking-wider ${isMe ? 'justify-end mr-1' : 'ml-1'}`}>
                    <span>
                      {msgTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.isEdited && <span className="text-[8px] text-sp-muted italic font-normal lowercase">(edited)</span>}
                    {isLastMessage && isMe && (
                      <span className="uppercase">
                        · {msg.status === 'seen' ? 'seen ✓✓' : msg.status === 'delivered' ? 'delivered ✓✓' : 'sent ✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          });
        })()}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingFriendId && (
        <div className="px-4 py-1.5 text-[10px] text-sp-sub italic bg-sp-card border-t border-sp-divider flex-shrink-0 animate-pulse">
          {activeChat.name} is typing...
        </div>
      )}

      {/* Staged file attachment preview */}
      {filePreview && (
        <div className="px-4 py-2 bg-sp-overlay border-t border-sp-divider flex items-center justify-between flex-shrink-0 animate-fade-in">
          <div className="flex items-center gap-2 min-w-0">
            {stagedFile?.type.startsWith('image/') ? (
              <img src={filePreview} alt="Staged" className="w-10 h-10 rounded object-cover border border-sp-border" />
            ) : (
              <div className="w-10 h-10 rounded bg-sp-blue/10 flex items-center justify-center text-sp-blue text-xs font-bold uppercase">
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

      {/* Voice Recorder Overlay (while active) */}
      {isRecording && (
        <div className="px-4 py-3 bg-sp-overlay border-t border-sp-divider flex items-center justify-between flex-shrink-0 animate-pulse">
          <div className="flex items-center gap-2 text-red-500 font-bold text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span>Recording Voice Note ({formatDurationSeconds(recordingSeconds)})</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => stopRecording(false)}
              className="p-2 bg-white/10 hover:bg-white/20 text-sp-text rounded-full transition-colors"
              title="Cancel recording"
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

      {/* Emoji Picker Box */}
      {showEmojis && (
        <div className="absolute bottom-14 left-4 z-50 bg-sp-card border border-sp-border rounded-xl p-3 shadow-dropdown w-64 animate-bounce-in grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => appendEmoji(emoji)}
              className="text-xl p-1 hover:scale-125 transition-transform duration-100"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Sticker Selector Panel */}
      {showStickers && (
        <div className="absolute bottom-14 left-4 z-50 bg-sp-card border border-sp-border rounded-2xl p-3.5 shadow-dropdown w-72 animate-bounce-in">
          <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-sp-divider">
            <span className="text-xs font-bold text-sp-text uppercase tracking-wider">Stickers</span>
            <button type="button" onClick={() => setShowStickers(false)} className="text-sp-muted hover:text-sp-text"><FiX size={14} /></button>
          </div>
          <div className="grid grid-cols-4 gap-2.5 max-h-48 overflow-y-auto no-scroll">
            {/* Add custom sticker button */}
            <button
              type="button"
              onClick={() => stickerFileRef.current?.click()}
              className="hover:scale-110 transition-transform duration-100 p-1 bg-sp-overlay rounded-lg border-2 border-dashed border-sp-blue/40 flex flex-col items-center justify-center gap-0.5 text-sp-blue h-12"
              title="Create your own sticker"
            >
              <FiPlus size={16} />
              <span className="text-[7px] font-bold uppercase">Create</span>
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
                  <img src={stk.url} alt={stk.label} className="w-10 h-10 object-contain rounded" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated = customStickers.filter(s => s.id !== stk.id);
                    setCustomStickers(updated);
                    localStorage.setItem('spheral_custom_stickers', JSON.stringify(updated));
                  }}
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full text-[7px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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
                <img src={stk.url} alt={stk.label} className="w-10 h-10 object-contain" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI Assistant Panel */}
      {showAiAssistant && (
        <div className="absolute bottom-14 left-4 right-4 z-50 bg-sp-card border border-sp-border rounded-2xl p-3.5 shadow-dropdown animate-bounce-in flex flex-col gap-2.5">
          <div className="flex justify-between items-center pb-1.5 border-b border-sp-divider">
            <span className="text-[11px] font-bold text-sp-text flex items-center gap-1">
              <FiCpu size={12} className="text-sp-blue" />
              AI Chat Assistant
            </span>
            <button type="button" onClick={() => { setShowAiAssistant(false); setAiChatResponse(''); }} className="text-sp-muted hover:text-sp-text">
              <FiX size={12} />
            </button>
          </div>
          
          {aiChatResponse ? (
            <div className="flex flex-col gap-2 text-left">
              <div className="bg-sp-overlay border border-sp-border rounded-lg p-2 text-[11px] text-sp-text max-h-24 overflow-y-auto leading-relaxed select-text whitespace-pre-wrap">
                {aiChatResponse}
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setText(aiChatResponse);
                    setShowAiAssistant(false);
                    setAiChatResponse('');
                  }}
                  className="flex-1 py-1.5 bg-sp-overlay hover:bg-sp-hover text-sp-text border border-sp-border rounded-lg text-[10px] font-bold transition cursor-pointer"
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
                  className="flex-1 py-1.5 bg-sp-blue hover:bg-blue-600 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                >
                  Send
                </button>
                <button
                  type="button"
                  onClick={() => setAiChatResponse('')}
                  className="px-3 py-1.5 bg-sp-overlay hover:bg-sp-hover text-sp-text border border-sp-border rounded-lg text-[10px] font-bold transition cursor-pointer"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 text-left">
              <p className="text-[10px] text-sp-muted">
                Ask the AI to help write your message. It knows the context of what you've typed.
              </p>
              {text && (
                <div className="bg-sp-overlay p-1.5 rounded-lg text-[9px] text-sp-muted truncate">
                  Context: "{text}"
                </div>
              )}
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="e.g. help me word this better"
                  value={aiChatPrompt}
                  onChange={(e) => setAiChatPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAiChatSubmit();
                    }
                  }}
                  className="flex-1 bg-sp-overlay border border-sp-border rounded-lg px-2.5 py-1 text-[11px] text-sp-text focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAiChatSubmit}
                  disabled={aiChatLoading || !aiChatPrompt.trim()}
                  className="px-3 py-1 bg-sp-blue hover:bg-blue-600 disabled:opacity-40 text-white rounded-lg text-[10px] font-bold transition flex items-center justify-center cursor-pointer shrink-0"
                >
                  {aiChatLoading ? 'Ask...' : 'Ask'}
                </button>
              </div>
              {aiChatError && (
                <p className="text-[9px] text-red-400 font-semibold">{aiChatError}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* GIF Selector Panel */}
      {showGifs && (
        <div className="absolute bottom-14 left-4 z-50 bg-sp-card border border-sp-border rounded-2xl p-3.5 shadow-dropdown w-64 animate-bounce-in flex flex-col">
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
                  className="hover:scale-105 transition-transform overflow-hidden rounded bg-black/10 flex items-center justify-center h-12"
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

      {/* Input Form */}
      {!isRecording && (
        <form onSubmit={handleSubmit} className="p-3 border-t border-sp-divider bg-sp-card flex gap-1.5 items-center flex-shrink-0 relative">
          {/* Left Side Actions Wrapper */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => setActionsExpanded(!actionsExpanded)}
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-sp-overlay text-sp-muted hover:text-sp-text hover:bg-sp-hover transition-colors"
              title="Toggle actions"
            >
              {actionsExpanded ? <FiX size={14} /> : <FiPlus size={14} />}
            </button>

            <div className={`items-center gap-0.5 ${actionsExpanded ? 'flex' : 'hidden'}`}>
              <button
                type="button"
                onClick={startRecording}
                className="w-7 h-7 rounded-lg text-sp-muted hover:text-sp-text hover:bg-sp-hover transition-colors flex items-center justify-center flex-shrink-0"
                title="Voice note"
              >
                <FiMic size={14} />
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-sp-muted hover:text-sp-text hover:bg-sp-hover transition-colors flex-shrink-0"
                title="Attach file"
              >
                <FiPaperclip size={14} />
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
                className={`w-7 h-7 rounded-lg transition-colors flex items-center justify-center flex-shrink-0
                  ${showStickers ? 'bg-sp-blue text-white shadow-glow-sm' : 'text-sp-muted hover:text-sp-text hover:bg-sp-hover'}`}
                title="Sticker"
              >
                <FiStar size={14} />
              </button>

              <button
                type="button"
                onClick={() => { setShowGifs(!showGifs); setShowStickers(false); setShowEmojis(false); }}
                className={`w-7 h-7 rounded-lg transition-colors flex items-center justify-center font-bold text-[9px] border leading-none flex-shrink-0
                  ${showGifs ? 'bg-sp-blue text-white border-sp-blue shadow-glow-sm' : 'text-sp-muted hover:text-sp-text hover:bg-sp-hover border-sp-border'}`}
                title="GIPHY GIF"
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
              placeholder="Message..."
              className="w-full input text-xs py-1.5 pl-3 pr-14 bg-sp-overlay border-sp-border rounded-full focus:outline-none"
            />
            <div className="absolute right-2.5 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => { setShowAiAssistant(!showAiAssistant); setShowEmojis(false); setShowStickers(false); setShowGifs(false); }}
                className={`transition-colors ${showAiAssistant ? 'text-sp-blue' : 'text-sp-muted hover:text-sp-text'}`}
                title="AI Chat Assistant"
              >
                <FiCpu size={13} className={aiChatLoading ? 'animate-spin text-sp-blue' : ''} />
              </button>
              <button
                type="button"
                onClick={() => { setShowEmojis(!showEmojis); setShowAiAssistant(false); setShowStickers(false); setShowGifs(false); }}
                className="text-sp-muted hover:text-sp-text transition-colors"
                title="Add Emoji"
              >
                <FiSmile size={14} />
              </button>
            </div>
          </div>

          {/* Right Side: Thumbs-up or Send */}
          {!text.trim() && !stagedFile ? (
            <button
              type="button"
              onClick={() => sendMessage('👍')}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-sp-hover transition-all active:scale-95 flex-shrink-0"
              title="Send thumbs-up"
            >
              <img src="https://em-content.zobj.net/source/facebook/355/thumbs-up_1f44d.png" alt="👍" className="w-5 h-5 drop-shadow-sm" />
            </button>
          ) : (
            <button
              type="submit"
              className="w-8 h-8 rounded-lg bg-sp-blue text-white flex items-center justify-center hover:bg-blue-600 transition-colors flex-shrink-0"
            >
              <FiSend size={12} />
            </button>
          )}
        </form>
      )}

      {/* Save Sticker Confirmation Modal */}
      {stickerToSave && (
        <div className="fixed inset-0 z-[10000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in text-sp-text">
          <div className="bg-sp-card border border-sp-border rounded-2xl p-5 max-w-[280px] w-full text-center shadow-2xl animate-scale-in">
            <h3 className="text-sm font-bold mb-1.5">Save Sticker</h3>
            <p className="text-[11px] text-sp-muted mb-3.5">Add this sticker to your custom collection?</p>
            
            <div className="flex justify-center mb-4 bg-sp-overlay p-2.5 rounded-xl border border-sp-border w-20 h-20 mx-auto items-center">
              <img src={stickerToSave} alt="Sticker preview" className="w-16 h-16 object-contain" />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStickerToSave(null)}
                className="flex-1 py-1.5 bg-sp-overlay hover:bg-sp-hover text-sp-text border border-sp-border rounded-xl text-[11px] font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  saveCustomSticker(stickerToSave);
                  setStickerToSave(null);
                }}
                className="flex-1 py-1.5 bg-sp-blue hover:bg-blue-600 text-white rounded-xl text-[11px] font-bold transition cursor-pointer"
              >
                Save
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
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors cursor-pointer"
            title="Close"
          >
            <FiX size={20} />
          </button>

          {/* Center Zoomed Image */}
          <div className="max-w-md max-h-[60vh] flex items-center justify-center overflow-hidden rounded-lg shadow-2xl border border-white/10">
            <img
              src={zoomedImage}
              alt="Zoomed attachment"
              className="max-w-full max-h-[60vh] object-contain select-text"
            />
          </div>

          {/* Action buttons under the image */}
          <div className="mt-4 flex items-center gap-3">
            <a
              href={zoomedImage}
              download={`spheral-download-${Date.now()}.jpg`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 bg-sp-blue hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition shadow-glow-sm cursor-pointer"
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
              className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl text-xs font-bold transition cursor-pointer"
              title="Save this image to your custom stickers list"
            >
              <span>Save as Sticker</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Timer helper
function formatDurationSeconds(secs) {
  const mins = Math.floor(secs / 60);
  const remainingSecs = secs % 60;
  return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
}
