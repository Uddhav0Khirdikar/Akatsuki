import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Send, 
  MessageSquare, 
  Radio, 
  Sparkles, 
  ArrowLeft, 
  Briefcase, 
  CheckCheck, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { conversationsApi } from '../api/conversations';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import AkatsukiCloud from '../assets/AkatsukiCloud';
import { getDefaultAvatar } from '../constants/avatars';
import { AKATSUKI_BACKGROUNDS } from '../constants/backgrounds';

export const MessagesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeConvIdFromQuery = searchParams.get('id');

  const { user } = useAuth();
  const { isConnected, subscribe, sendTyping } = useWebSocket();

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(activeConvIdFromQuery || null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  const messagesEndRef = useRef(null);

  // Scroll to bottom of message thread
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Fetch all conversations user participates in
  const fetchConversations = useCallback(async () => {
    try {
      setLoadingList(true);
      const data = await conversationsApi.getUserConversations();
      setConversations(data);
      if (!activeConvId && data.length > 0) {
        setActiveConvId(data[0].id);
        setSearchParams({ id: data[0].id });
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingList(false);
    }
  }, [activeConvId, setSearchParams]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Update activeConvId when URL query changes
  useEffect(() => {
    if (activeConvIdFromQuery && activeConvIdFromQuery !== activeConvId) {
      setActiveConvId(activeConvIdFromQuery);
    }
  }, [activeConvIdFromQuery, activeConvId]);

  // 2. Fetch messages for the active conversation
  const fetchMessages = useCallback(async (convId) => {
    if (!convId) return;
    try {
      setLoadingMessages(true);
      const msgs = await conversationsApi.getConversationMessages(convId);
      setMessages(msgs);
      setTimeout(scrollToBottom, 100);
      // Mark read in local list count
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c))
      );
    } catch (err) {
      console.error('Failed to load conversation messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId);
    }
  }, [activeConvId, fetchMessages]);

  // 3. Listen for Real-Time WebSocket broadcast events
  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      // New message received
      if (event.type === 'NEW_MESSAGE' && event.message) {
        const incoming = event.message;
        // If it belongs to our active conversation, append it
        if (incoming.conversation_id === activeConvId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
          setTimeout(scrollToBottom, 100);
        }

        // Update last message in the left conversation list
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === incoming.conversation_id) {
              return {
                ...c,
                last_message: incoming.content,
                last_message_time: incoming.created_at,
                unread_count:
                  incoming.conversation_id === activeConvId
                    ? 0
                    : incoming.sender_id !== user?.id
                    ? c.unread_count + 1
                    : c.unread_count,
              };
            }
            return c;
          })
        );
      }

      // Typing event
      if (event.event === 'user_typing') {
        if (event.conversation_id === activeConvId && event.user_id !== user?.id) {
          setPartnerTyping(event.is_typing);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          if (event.is_typing) {
            typingTimeoutRef.current = setTimeout(() => {
              setPartnerTyping(false);
            }, 3000);
          }
        }
      }
    });

    return () => {
      unsubscribe();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [subscribe, activeConvId, user?.id]);

  // Handle typing inside message input
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    if (activeConvId) {
      sendTyping(activeConvId, true);
    }
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConvId) return;

    const content = newMessage.trim();
    setNewMessage('');
    if (activeConvId) sendTyping(activeConvId, false);

    try {
      const createdMsg = await conversationsApi.sendMessage(activeConvId, content);
      setMessages((prev) => {
        if (prev.some((m) => m.id === createdMsg.id)) return prev;
        return [...prev, createdMsg];
      });
      setTimeout(scrollToBottom, 100);

      // Update sidebar
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId
            ? {
                ...c,
                last_message: content,
                last_message_time: createdMsg.created_at,
              }
            : c
        )
      );
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send message');
    }
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);

  // Determine other participant's details
  const getPartnerInfo = (conv) => {
    if (!conv || !user) return { name: 'Student', roll: '', isOwner: false };
    const isCurrentUserStudent = conv.student_id === user.id;
    return {
      name: isCurrentUserStudent ? conv.owner_name : conv.student_name,
      roleText: isCurrentUserStudent ? 'Opportunity Creator' : 'Student Applicant',
      id: isCurrentUserStudent ? conv.owner_id : conv.student_id,
    };
  };

  const partner = getPartnerInfo(activeConv);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-black text-white flex flex-col">
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <AkatsukiCloud size={28} />
            <div>
              <h1 className="text-lg font-black tracking-wide text-white uppercase font-mono">
                Job Inquiries & DMs
              </h1>
              <p className="text-[11px] text-zinc-400">
                Job-centric messaging threads powered by sub-millisecond WebSockets
              </p>
            </div>
          </div>

          <div
            className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
              isConnected
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40'
                : 'bg-yellow-950/30 text-yellow-500 border-yellow-500/30'
            }`}
          >
            <Radio className={`w-3 h-3 ${isConnected ? 'animate-pulse text-emerald-400' : 'text-yellow-500'}`} />
            <span>{isConnected ? 'LIVE WEBSOCKET' : 'RECONNECTING'}</span>
          </div>
        </div>

        {/* Split Screen Chat Hub */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 rounded-2xl bg-zinc-950/85 border border-red-950/60 overflow-hidden shadow-2xl backdrop-blur-md min-h-[580px]">
          {/* Left Panel: Conversation List (4 cols) */}
          <div className="md:col-span-4 border-r border-zinc-900 flex flex-col bg-black/40">
            <div className="p-3.5 border-b border-zinc-900 bg-zinc-950/60">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Conversations ({conversations.length})
              </span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/60">
              {loadingList ? (
                <div className="p-6 text-center text-xs text-zinc-500 animate-pulse">
                  Loading inquiry threads...
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500">
                  <MessageSquare className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <p>No active inquiries yet.</p>
                  <p className="text-[10px] text-zinc-600 mt-1">
                    Click "Message Owner" on any job to initiate a thread.
                  </p>
                </div>
              ) : (
                conversations.map((c) => {
                  const isSelected = c.id === activeConvId;
                  const other = getPartnerInfo(c);
                  const avatar = getDefaultAvatar(other.name);

                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setActiveConvId(c.id);
                        setSearchParams({ id: c.id });
                      }}
                      className={`w-full text-left p-3.5 transition-all flex items-start gap-3 border-l-2 ${
                        isSelected
                          ? 'bg-red-950/40 border-red-500 text-white'
                          : 'border-transparent text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-zinc-800 shrink-0 mt-0.5">
                        <img
                          src={avatar.image}
                          alt={other.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = avatar.avatarUrl;
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-xs font-bold text-white truncate">
                            {other.name}
                          </span>
                          {c.unread_count > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-bold">
                              {c.unread_count}
                            </span>
                          )}
                        </div>

                        {/* Job Title Tag */}
                        <div className="flex items-center gap-1 text-[10px] text-red-400 font-medium truncate mb-1">
                          <Briefcase className="w-3 h-3 shrink-0" />
                          <span className="truncate">{c.job_title}</span>
                        </div>

                        <p className="text-[11px] text-zinc-500 truncate">
                          {c.last_message || 'Inquiry thread created'}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Active Chat Thread (8 cols) */}
          <div className="md:col-span-8 flex flex-col bg-zinc-950/40">
            {activeConv ? (
              <>
                {/* Active Chat Header */}
                <div className="p-4 border-b border-zinc-900 bg-zinc-950/70 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-red-500/40 shadow-sm shrink-0">
                      <img
                        src={getDefaultAvatar(partner.name).image}
                        alt={partner.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = getDefaultAvatar(partner.name).avatarUrl;
                        }}
                      />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white">{partner.name}</h2>
                      <p className="text-[10px] text-zinc-400">{partner.roleText}</p>
                    </div>
                  </div>

                  {/* Job Listing Link Pill */}
                  <Link
                    to={`/jobs/${activeConv.job_id}`}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-red-500/40 text-[11px] text-zinc-300 hover:text-white transition-all flex items-center gap-1.5"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-red-500" />
                    <span className="font-semibold line-clamp-1 max-w-[160px]">
                      {activeConv.job_title}
                    </span>
                    <span className="text-red-400">→</span>
                  </Link>
                </div>

                {/* Messages Stream */}
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3 min-h-[380px] max-h-[500px]">
                  {loadingMessages ? (
                    <div className="py-12 text-center text-xs text-zinc-500 animate-pulse">
                      Syncing message thread...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-16 text-center text-zinc-500 text-xs">
                      <Sparkles className="w-6 h-6 text-red-500 mx-auto mb-2" />
                      <p>Start the conversation about this role.</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">
                        Inquiries, interview schedules, and project questions stay organized here.
                      </p>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMe = m.sender_id === user?.id;

                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[80%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-md ${
                              isMe
                                ? 'bg-gradient-to-r from-red-700 to-red-600 text-white rounded-tr-none'
                                : 'bg-zinc-900/90 text-zinc-200 border border-zinc-800 rounded-tl-none'
                            }`}
                          >
                            {!isMe && (
                              <span className="block text-[10px] font-bold text-red-400 mb-1">
                                {m.sender_name} ({m.sender_roll_number})
                              </span>
                            )}
                            <p className="whitespace-pre-wrap">{m.content}</p>
                          </div>

                          <span className="text-[9px] text-zinc-500 mt-1 px-1">
                            {new Date(m.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      );
                    })
                  )}

                  {/* Partner Typing Indicator */}
                  {partnerTyping && (
                    <div className="flex items-center gap-1.5 text-[11px] text-red-400 italic">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span>{partner.name} is typing...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Box */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 sm:p-4 border-t border-zinc-900 bg-zinc-950/80 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={newMessage}
                    onChange={handleInputChange}
                    placeholder={`Message ${partner.name} about this role...`}
                    className="flex-1 px-4 py-2.5 bg-black/70 border border-zinc-800 focus:border-red-500 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                  />

                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="p-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white shadow-[0_0_15px_rgba(229,9,20,0.3)] transition-all flex items-center justify-center shrink-0"
                    title="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-zinc-500">
                <MessageSquare className="w-12 h-12 text-zinc-800 mb-3" />
                <h3 className="text-sm font-bold text-zinc-400">Select an Inquiry Thread</h3>
                <p className="text-xs text-zinc-600 max-w-xs mt-1">
                  Choose a conversation from the left to view messages and reply in real time.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
