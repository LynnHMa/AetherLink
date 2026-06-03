import React, { useState, useEffect, useRef } from 'react';
import { Settings, Send, Bot, User, Trash2, PlusCircle, Image as ImageIcon, MessageSquare, Menu, X, Globe, Download, Copy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isImage?: boolean;
  imageUrl?: string;
  images?: string[];
  model?: string;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  messages: Message[];
}

const i18n = {
  zh: {
    newChat: '新建对话',
    history: '历史记录',
    currentChat: '当前对话',
    settings: '设置',
    exportLog: '导出记录',
    shareThread: '分享对话',
    hello: '您好! 我是AI助手。',
    helloSub: '在左侧设置您的 API Key 及 Base URL。之后可以直接与我对话或者生成图片。',
    userRequest: '用户请求',
    assistantResponse: '助手回复',
    sendPlaceholderText: '发送消息 (Shift+Enter 换行)...',
    sendPlaceholderImage: '输入图片描述...',
    chat: '对话',
    image: '图片',
    send: '发送',
    dropImage: '拖入或粘贴本地图片',
    saveClose: '保存关闭',
    baseUrl: 'Base URL (API 地址)',
    apiKey: 'API Key (密钥)',
    textModel: '文本对话模型 (Text Model)',
    imageModel: '图片生成模型 (Image Model)',
    atLeastOneModel: '至少保留一个模型！',
    removeModelConfirm: '确定删除模型',
    enterNewChatModel: '请输入新的文本模型名称',
    enterNewImageModel: '请输入新的图片模型名称',
    clearChatConfirm: '是否清除当前对话并开启新对话？',
    noHistory: '无对话记录...',
    msgCount: '消息',
    addModel: '添加模型',
    deleteModel: '删除当前模型',
    apiKeyMissing: '请输入您的 API Key (设置面板)。',
    generatingImage: '*正在生成图片...*',
    langSwitch: 'Switch to English',
    cancel: '取消',
    confirm: '确认',
    add: '添加',
  },
  en: {
    newChat: 'New Chat',
    history: 'History',
    currentChat: 'Current Chat',
    settings: 'Settings',
    exportLog: 'Export Log',
    shareThread: 'Share Thread',
    hello: 'Hello! I am your AI assistant.',
    helloSub: 'Configure your API Key and Base URL on the left. Then you can chat with me or generate images.',
    userRequest: 'User Request',
    assistantResponse: 'Assistant Response',
    sendPlaceholderText: 'Send a message (Shift+Enter for new line)...',
    sendPlaceholderImage: 'Enter image prompt...',
    chat: 'Chat',
    image: 'Image',
    send: 'Send',
    dropImage: 'Drop or paste local images here',
    saveClose: 'Save & Close',
    baseUrl: 'Base URL',
    apiKey: 'API Key',
    textModel: 'Text Model',
    imageModel: 'Image Model',
    atLeastOneModel: 'At least one model is required!',
    removeModelConfirm: 'Are you sure you want to remove model',
    enterNewChatModel: 'Enter new chat model name:',
    enterNewImageModel: 'Enter new image model name:',
    clearChatConfirm: 'Are you sure you want to clear the current chat and start a new one?',
    noHistory: 'No history...',
    msgCount: 'msgs',
    addModel: 'Add model',
    deleteModel: 'Delete current model',
    apiKeyMissing: 'Please enter your API Key in settings.',
    generatingImage: '*Generating image...*',
    langSwitch: '切换为中文',
    cancel: 'Cancel',
    confirm: 'Confirm',
    add: 'Add',
  }
};

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('llm_sessions');
    if (saved) return JSON.parse(saved);
    return [];
  });
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    const saved = localStorage.getItem('llm_current_session_id');
    return saved || '';
  });

  const [input, setInput] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Settings via localStorage
  const [baseUrl, setBaseUrl] = useState(() => localStorage.getItem('llm_base_url') || '');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('llm_api_key') || '');
  const [chatModel, setChatModel] = useState(() => localStorage.getItem('llm_chat_model') || 'claude-opus-4.7');
  const [imageModel, setImageModel] = useState(() => localStorage.getItem('llm_image_model') || 'gpt2');
  const [mode, setMode] = useState<'text' | 'image'>(() => (localStorage.getItem('llm_mode') as 'text' | 'image') || 'text');
  const [lang, setLang] = useState<'zh' | 'en'>(() => (localStorage.getItem('llm_lang') as 'zh' | 'en') || 'zh');

  const t = i18n[lang];

  useEffect(() => {
    if (sessions.length === 0) {
      const id = Date.now().toString();
      setSessions([{ id, title: t.newChat, createdAt: Date.now(), messages: [] }]);
      setCurrentSessionId(id);
    } else if (!currentSessionId || !sessions.find(s => s.id === currentSessionId)) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [sessions, currentSessionId, t.newChat]);

  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('llm_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  useEffect(() => {
    if (currentSessionId) localStorage.setItem('llm_current_session_id', currentSessionId);
  }, [currentSessionId]);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  const setMessages = (updater: Message[] | ((prev: Message[]) => Message[])) => {
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        const newMessages = typeof updater === 'function' ? updater(s.messages) : updater;
        let newTitle = s.title;
        if ((s.title === t.newChat || s.title === 'New Chat' || s.title === '新建对话') && newMessages.length > 0) {
          const firstUser = newMessages.find(m => m.role === 'user');
          if (firstUser && firstUser.content) {
            newTitle = firstUser.content.slice(0, 20) + (firstUser.content.length > 20 ? '...' : '');
          }
        }
        return { ...s, messages: newMessages, title: newTitle };
      }
      return s;
    }));
  };

  const createNewSession = () => {
    const id = Date.now().toString();
    setSessions(prev => [{ id, title: t.newChat, createdAt: Date.now(), messages: [] }, ...prev]);
    setCurrentSessionId(id);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const [isClearingChat, setIsClearingChat] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [addingModelType, setAddingModelType] = useState<'text' | 'image' | null>(null);
  const [newModelName, setNewModelName] = useState('');

  const [chatModels, setChatModels] = useState<string[]>(() => {
    const saved = localStorage.getItem('llm_chat_models');
    return saved ? JSON.parse(saved) : ['claude-opus-4.7', 'gpt-4o-latest', 'gpt-3.5-turbo'];
  });
  const [imageModels, setImageModels] = useState<string[]>(() => {
    const saved = localStorage.getItem('llm_image_models');
    return saved ? JSON.parse(saved) : ['gpt2', 'dall-e-3', 'stable-diffusion-xl'];
  });

  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    localStorage.setItem('llm_base_url', baseUrl);
    localStorage.setItem('llm_api_key', apiKey);
    localStorage.setItem('llm_chat_model', chatModel);
    localStorage.setItem('llm_image_model', imageModel);
    localStorage.setItem('llm_mode', mode);
    localStorage.setItem('llm_chat_models', JSON.stringify(chatModels));
    localStorage.setItem('llm_image_models', JSON.stringify(imageModels));
    localStorage.setItem('llm_lang', lang);
  }, [baseUrl, apiKey, chatModel, imageModel, mode, chatModels, imageModels, lang]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Adjust textarea height automatically
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && referenceImages.length === 0) || isLoading) return;

    if (!apiKey.trim()) {
      setSettingsError(t.apiKeyMissing);
      setIsSettingsOpen(true);
      return;
    }

    const userMessage: Message = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: input,
      images: referenceImages.length > 0 ? [...referenceImages] : undefined
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setReferenceImages([]);
    setIsLoading(true);

    if (mode === 'text') {
      await handleChatCompletion(userMessage);
    } else {
      await handleImageGeneration(userMessage);
    }
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleChatCompletion = async (userMsg: Message) => {
    const newChatHistory = [...messages, userMsg].map(m => {
      if (m.images && m.images.length > 0) {
        const visionContent: any[] = [];
        if (m.content && m.content.trim() !== '') {
          visionContent.push({ type: 'text', text: m.content });
        } else {
          visionContent.push({ type: 'text', text: 'Please see the attached image.' });
        }
        m.images.forEach(img => {
          visionContent.push({ type: 'image_url', image_url: { url: img } });
        });
        return {
          role: m.role,
          content: visionContent
        };
      }
      return { role: m.role, content: m.content };
    });
    const assistantId = Date.now().toString() + '-assistant';
    
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', model: chatModel }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newChatHistory,
          model: chatModel,
          baseUrl,
          apiKey,
          stream: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // keep incomplete line
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.substring(6);
            if (dataStr === '[DONE]') continue;
            
            try {
              const data = JSON.parse(dataStr);
              const contentDelta = data.choices?.[0]?.delta?.content;
              if (contentDelta) {
                setMessages(prev => prev.map(m => 
                  m.id === assistantId ? { ...m, content: m.content + contentDelta } : m
                ));
              }
            } catch (err) {
              // Ignore incomplete JSON chunks parse errors
            }
          }
        }
      }
    } catch (error: any) {
      setMessages(prev => prev.map(m => 
        m.id === assistantId ? { ...m, content: m.content + `\n\n**Error:** ${error.message}` } : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageGeneration = async (userMsg: Message) => {
    const assistantId = Date.now().toString() + '-assistant';
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: t.generatingImage, model: imageModel }]);
    
    try {
      const payload: any = {
          prompt: userMsg.content,
          model: imageModel,
          baseUrl,
          apiKey
      };

      if (userMsg.images && userMsg.images.length > 0) {
        payload.image = userMsg.images[0];
        payload.image_base64 = userMsg.images[0];
        payload.image_url = userMsg.images[0];
        payload.images = userMsg.images;
      }

      const response = await fetch('/api/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const imageUrl = data.data?.[0]?.url;

      if (imageUrl) {
        setMessages(prev => prev.map(m => 
          m.id === assistantId ? { ...m, content: `![Generated Image](${imageUrl})`, isImage: true, imageUrl: imageUrl } : m
        ));
      } else {
        throw new Error('No image URL returned from API');
      }

    } catch (error: any) {
      setMessages(prev => prev.map(m => 
        m.id === assistantId ? { ...m, content: `**Error Generating Image:** ${error.message}` } : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const clearChat = () => {
    if (messages.length === 0) return;
    setIsClearingChat(true);
  };

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setReferenceImages(prev => [...prev, dataUrl]);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files) {
      Array.from(files).forEach(file => {
        processImageFile(file);
      });
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processImageFile(file);
          }
        }
      }
    }
  };

  const removeReferenceImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleCopyImage = async (url: string) => {
    try {
      let fetchUrl = url;
      if (!url.startsWith('data:')) {
         fetchUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
      }
      const response = await fetch(fetchUrl);
      const blob = await response.blob();
      
      let copyBlob = blob;
      if (blob.type !== 'image/png') {
        const imageBitmap = await createImageBitmap(blob);
        const canvas = document.createElement('canvas');
        canvas.width = imageBitmap.width;
        canvas.height = imageBitmap.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(imageBitmap, 0, 0);
          copyBlob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((b) => {
              if (b) resolve(b);
              else reject(new Error('Canvas toBlob failed'));
            }, 'image/png');
          });
        }
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': copyBlob
        })
      ]);
      alert(lang === 'zh' ? '图片已复制！' : 'Image copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy image: ', err);
      alert(lang === 'zh' ? '复制失败，请尝试点击上方下载按钮' : 'Copy failed, please try downloading.');
    }
  };

  const exportLog = () => {
    if (messages.length === 0) return;
    const log = messages.map(m => `[${m.role === 'user' ? 'USER' : 'AI'}]\n${m.content}`).join('\n\n');
    const blob = new Blob([log], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_log_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const shareThread = async () => {
    if (messages.length === 0) return;
    try {
      const log = messages.map(m => `[${m.role === 'user' ? 'USER' : 'AI'}]\n${m.content}`).join('\n\n');
      await navigator.clipboard.writeText(log);
      alert(lang === 'zh' ? '聊天记录已复制到剪贴板，可去粘贴分享' : 'Chat log copied to clipboard for sharing!');
    } catch (e) {
      exportLog();
    }
  };

  return (
    <div className="flex h-screen bg-[#0d0d0d] text-gray-100 overflow-hidden font-sans">
      
      {/* Global Confirm Modal for Clearing Chat */}
      {isClearingChat && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 shadow-2xl max-w-sm w-full">
            <h3 className="text-lg font-bold text-white mb-2">{t.clearChatConfirm}</h3>
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setIsClearingChat(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                {t.cancel}
              </button>
              <button 
                onClick={() => {
                  setMessages([]);
                  setIsClearingChat(false);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors"
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed md:static inset-y-0 left-0 z-30 w-64 bg-[#141414] text-gray-100 flex flex-col transition-transform duration-300 ease-in-out h-full border-r border-white/5",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 flex items-center justify-between font-medium text-lg mb-2">
          <span className="flex items-center gap-3">
             <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white shadow-lg shadow-blue-900/20">A</div>
             <span className="text-lg font-semibold tracking-tight">AetherLink</span>
          </span>
          <button 
            className="md:hidden p-1 hover:bg-white/5 rounded"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
          <button 
            onClick={createNewSession}
            className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg py-2.5 transition-all text-sm font-medium"
          >
            <PlusCircle className="w-4 h-4 text-gray-400" />
            {t.newChat}
          </button>
          
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3 px-2">{t.history}</div>
            {sessions.length === 0 ? (
              <div className="px-2 py-3 text-sm text-gray-500">
                {t.noHistory}
              </div>
            ) : (
              sessions.map(s => (
                <button 
                  key={s.id}
                  onClick={() => {
                    setCurrentSessionId(s.id);
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full group flex items-center justify-between p-2 rounded-lg text-left transition-colors",
                    s.id === currentSessionId ? "bg-blue-600/10 text-blue-400" : "hover:bg-white/5 text-gray-400"
                  )}
                >
                  <span className="text-sm truncate flex items-center gap-2 flex-1 min-w-0 pr-2">
                    <MessageSquare className="w-4 h-4 shrink-0" /> 
                    <span className="truncate">{s.title || t.newChat}</span>
                  </span>
                  {s.id === currentSessionId && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>}
                  {s.id !== currentSessionId && (
                    <div 
                       onClick={(e) => {
                         e.stopPropagation();
                         setSessions(prev => prev.filter(sess => sess.id !== s.id));
                       }}
                       className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3 cursor-pointer" />
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="mt-auto p-4 border-t border-white/5 space-y-2">
          <button 
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-sm transition-colors text-gray-400 hover:text-white text-left"
          >
            <Globe className="w-4 h-4" />
            {t.langSwitch}
          </button>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-sm transition-colors text-gray-400 hover:text-white text-left"
          >
            <Settings className="w-4 h-4" />
            {t.settings}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full right-panel w-full max-w-full">
        {/* Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-[#0d0d0d]/80 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold text-blue-500 bg-blue-500/10 px-2 py-1 rounded tracking-widest uppercase">
              {mode === 'text' ? chatModel : imageModel}
            </span>
            <span className="text-xs text-gray-500 hidden sm:inline-block">
              {mode === 'text' ? 'Text Mode' : 'Image Mode'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={exportLog} className="text-xs font-medium text-gray-400 hover:text-white">{t.exportLog}</button>
            <button onClick={shareThread} className="text-xs font-medium bg-white text-black px-4 py-1.5 rounded-full hover:bg-gray-200 shadow-sm transition-colors">{t.shareThread}</button>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto flex flex-col p-4 md:p-8 pb-[200px]">
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 bg-blue-600/10 flex items-center justify-center rounded-2xl mb-4 border border-blue-500/20">
                <Bot className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-2xl font-semibold mb-2 text-gray-100">{t.hello}</h2>
              <p className="text-gray-400 max-w-md text-sm leading-relaxed text-balance">
                {t.helloSub}
              </p>
            </div>
          )}
          
          <div className="space-y-8 w-full pb-4">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={cn(
                  "flex gap-4 max-w-3xl mx-auto",
                  msg.role === 'assistant' && "bg-white/[0.02] p-6 rounded-2xl border border-white/5 w-full"
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  msg.role === 'user' ? "bg-indigo-900 text-white" : "bg-blue-600 text-white"
                )}>
                  {msg.role === 'user' ? 'ME' : 'AI'}
                </div>

                {/* Bubble Content */}
                <div className="space-y-2 flex-1 w-full overflow-hidden">
                  <div className={cn(
                    "text-xs font-bold uppercase tracking-tighter",
                    msg.role === 'user' ? "text-gray-500" : "text-blue-400"
                  )}>
                    {msg.role === 'user' ? t.userRequest : (msg.model || t.assistantResponse)}
                  </div>
                  
                  {msg.role === 'user' ? (
                    <div className="text-gray-300 leading-relaxed whitespace-pre-wrap break-words text-sm sm:text-base">
                      {msg.content}
                      {msg.images && msg.images.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {msg.images.map((imgUrl, idx) => (
                            <div key={idx} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-white/10 shrink-0 shadow-sm">
                              <img src={imgUrl} className="w-full h-full object-cover" alt="attachment" />
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleCopyImage(imgUrl);
                                }}
                                className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black text-white rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center outline-none focus:opacity-100"
                                title="Copy image"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="markdown-body prose prose-invert prose-sm md:prose-base max-w-none text-gray-300 break-words w-full leading-relaxed">
                      {msg.isImage && msg.imageUrl ? (
                        <div className="relative group inline-block rounded-xl overflow-hidden shadow-lg border border-white/10 max-w-full">
                          <img src={msg.imageUrl} alt="Generated" className="block max-w-[512px] w-full h-auto" />
                          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                handleCopyImage(msg.imageUrl!);
                              }}
                              className="p-2 bg-black/60 hover:bg-black text-white rounded-lg flex items-center justify-center outline-none focus:opacity-100"
                              title="Copy image"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                fetch(msg.imageUrl!)
                                  .then(res => res.blob())
                                  .then(blob => {
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.style.display = 'none';
                                    a.href = url;
                                    a.download = `image-${Date.now()}.png`;
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                  })
                                  .catch(err => {
                                    window.open(msg.imageUrl, '_blank');
                                  });
                              }}
                              className="p-2 bg-black/60 hover:bg-black text-white rounded-lg flex items-center justify-center outline-none focus:opacity-100"
                              title="Download image"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input Area */}
        <div 
          className="p-8 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d] to-transparent absolute bottom-0 left-0 right-0 md:left-64 z-10"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onPaste={handlePaste}
        >
          <div className="max-w-3xl mx-auto relative">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-2 shadow-2xl focus-within:border-blue-500/50 transition-colors">
              {referenceImages.length > 0 && (
                <div className="px-4 pt-4 pb-2 flex flex-wrap gap-3">
                  {referenceImages.map((refImg, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-white/10 w-16 h-16 shadow-lg shrink-0">
                      <img src={refImg} alt="Reference" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => removeReferenceImage(idx)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <X className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {referenceImages.length === 0 && (
                <div className="px-4 pt-2 text-[10px] text-gray-500 uppercase flex items-center gap-2">
                  <span>{t.dropImage}</span>
                </div>
              )}
              <textarea
                ref={inputRef}
                rows={1}
                className="w-full max-h-48 bg-transparent border-none outline-none resize-none hide-scrollbar text-sm text-white placeholder-gray-500 px-4 pt-2"
                placeholder={mode === 'text' ? t.sendPlaceholderText : t.sendPlaceholderImage}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              
              <div className="flex items-center justify-between p-2 mt-2">
                <div className="flex gap-2">
                  {/* Mode Toggles */}
                  <div className="flex bg-black/50 p-1 rounded-lg">
                    <button
                      onClick={() => setMode('text')}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                        mode === 'text' ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
                      )}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {t.chat}
                    </button>
                    <button
                      onClick={() => setMode('image')}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                        mode === 'image' ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
                      )}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      {t.image}
                    </button>
                  </div>
                </div>

                <button
                  disabled={isLoading || (!input.trim() && referenceImages.length === 0)}
                  onClick={handleSubmit}
                  className="bg-white text-black text-xs font-bold px-4 py-2 flex items-center justify-center gap-2 rounded-xl transition-colors shadow-lg hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-white"
                >
                  <span className="hidden md:inline">{t.send}</span>
                  <Send className="w-3 h-3 md:hidden" />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-center text-gray-600 mt-3 uppercase tracking-widest">
              AI can make mistakes. Please verify important information.
            </p>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-gray-200">
            <div className="p-5 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">{t.settings}</h3>
              <button 
                onClick={() => {
                  setIsSettingsOpen(false);
                  setSettingsError('');
                }}
                className="text-gray-500 hover:text-white p-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto w-full overflow-x-hidden">
              {settingsError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg">
                  {settingsError}
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  {t.baseUrl}
                </label>
                <input 
                  type="text" 
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full px-3 py-2.5 bg-black border border-white/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 rounded-lg outline-none transition-all text-sm font-mono text-white placeholder-gray-600"
                  placeholder=""
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  {t.apiKey}
                </label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3 py-2.5 bg-black border border-white/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 rounded-lg outline-none transition-all text-sm font-mono text-white placeholder-gray-600"
                  placeholder="sk-..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  {t.textModel}
                </label>
                {addingModelType === 'text' ? (
                  <div className="flex gap-2">
                    <input 
                      autoFocus
                      type="text" 
                      value={newModelName}
                      onChange={e => setNewModelName(e.target.value)}
                      placeholder={t.enterNewChatModel}
                      className="flex-1 px-3 py-2 bg-black border border-blue-500/50 rounded-lg outline-none text-sm font-mono text-white placeholder-gray-600"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newModelName.trim()) {
                          if (!chatModels.includes(newModelName.trim())) {
                            setChatModels([...chatModels, newModelName.trim()]);
                            setChatModel(newModelName.trim());
                          }
                          setAddingModelType(null);
                          setNewModelName('');
                        } else if (e.key === 'Escape') {
                          setAddingModelType(null);
                          setNewModelName('');
                        }
                      }}
                    />
                    <button 
                      onClick={() => {
                        if (newModelName.trim() && !chatModels.includes(newModelName.trim())) {
                          setChatModels([...chatModels, newModelName.trim()]);
                          setChatModel(newModelName.trim());
                        }
                        setAddingModelType(null);
                        setNewModelName('');
                      }}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      {t.add}
                    </button>
                    <button 
                      onClick={() => {
                        setAddingModelType(null);
                        setNewModelName('');
                      }}
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-xs font-medium transition-colors"
                    >
                      {t.cancel}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select 
                      value={chatModel}
                      onChange={(e) => setChatModel(e.target.value)}
                      className="flex-1 px-3 py-2.5 bg-black border border-white/10 focus:border-blue-500/50 hover:border-white/20 rounded-lg outline-none transition-all text-sm font-mono text-white min-w-0"
                    >
                      {chatModels.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                    <button 
                      onClick={() => {
                        setAddingModelType('text');
                        setNewModelName('');
                      }}
                      className="px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors flex items-center justify-center shrink-0"
                      title={t.addModel}
                    >
                      <PlusCircle className="w-4 h-4 text-gray-400" />
                    </button>
                    <button 
                      onClick={() => {
                        if (chatModels.length <= 1) {
                           setSettingsError(t.atLeastOneModel);
                           return;
                        }
                        const newList = chatModels.filter(m => m !== chatModel);
                        setChatModels(newList);
                        setChatModel(newList[0]);
                      }}
                      className="px-3 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-500 transition-colors flex items-center justify-center shrink-0"
                      title={t.deleteModel}
                    >
                      <Trash2 className="w-4 h-4 text-red-500/60" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  {t.imageModel}
                </label>
                {addingModelType === 'image' ? (
                  <div className="flex gap-2">
                    <input 
                      autoFocus
                      type="text" 
                      value={newModelName}
                      onChange={e => setNewModelName(e.target.value)}
                      placeholder={t.enterNewImageModel}
                      className="flex-1 px-3 py-2 bg-black border border-blue-500/50 rounded-lg outline-none text-sm font-mono text-white placeholder-gray-600"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newModelName.trim()) {
                          if (!imageModels.includes(newModelName.trim())) {
                            setImageModels([...imageModels, newModelName.trim()]);
                            setImageModel(newModelName.trim());
                          }
                          setAddingModelType(null);
                          setNewModelName('');
                        } else if (e.key === 'Escape') {
                          setAddingModelType(null);
                          setNewModelName('');
                        }
                      }}
                    />
                    <button 
                      onClick={() => {
                        if (newModelName.trim() && !imageModels.includes(newModelName.trim())) {
                          setImageModels([...imageModels, newModelName.trim()]);
                          setImageModel(newModelName.trim());
                        }
                        setAddingModelType(null);
                        setNewModelName('');
                      }}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      {t.add}
                    </button>
                    <button 
                      onClick={() => {
                        setAddingModelType(null);
                        setNewModelName('');
                      }}
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-xs font-medium transition-colors"
                    >
                      {t.cancel}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select 
                      value={imageModel}
                      onChange={(e) => setImageModel(e.target.value)}
                      className="flex-1 px-3 py-2.5 bg-black border border-white/10 focus:border-blue-500/50 hover:border-white/20 rounded-lg outline-none transition-all text-sm font-mono text-white min-w-0"
                    >
                      {imageModels.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                    <button 
                      onClick={() => {
                        setAddingModelType('image');
                        setNewModelName('');
                      }}
                      className="px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors flex items-center justify-center shrink-0"
                      title={t.addModel}
                    >
                      <PlusCircle className="w-4 h-4 text-gray-400" />
                    </button>
                    <button 
                      onClick={() => {
                        if (imageModels.length <= 1) {
                           setSettingsError(t.atLeastOneModel);
                           return;
                        }
                        const newList = imageModels.filter(m => m !== imageModel);
                        setImageModels(newList);
                        setImageModel(newList[0]);
                      }}
                      className="px-3 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-500 transition-colors flex items-center justify-center shrink-0"
                      title={t.deleteModel}
                    >
                      <Trash2 className="w-4 h-4 text-red-500/60" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 bg-black/40 border-t border-white/5 flex justify-end">
              <button 
                onClick={() => {
                  setIsSettingsOpen(false);
                  setSettingsError('');
                }}
                className="bg-white hover:bg-gray-200 text-black px-5 py-2 rounded-xl text-xs font-bold transition-colors shadow-lg"
              >
                {t.saveClose}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
