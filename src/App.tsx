import React, { useState, useEffect, useRef } from 'react';
import { Settings, Send, Bot, User, Trash2, PlusCircle, Image as ImageIcon, MessageSquare, Menu, X, Globe } from 'lucide-react';
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
  images?: string[];
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
    langSwitch: 'Switch to English'
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
    langSwitch: '切换为中文'
  }
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
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
      alert(t.apiKeyMissing);
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
        return {
          role: m.role,
          content: [
            { type: 'text', text: m.content },
            ...m.images.map(img => ({ type: 'image_url', image_url: { url: img } }))
          ]
        };
      }
      return { role: m.role, content: m.content };
    });
    const assistantId = Date.now().toString() + '-assistant';
    
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

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
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: t.generatingImage }]);
    
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
          m.id === assistantId ? { ...m, content: `![Generated Image](${imageUrl})`, isImage: true } : m
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
    if (window.confirm(t.clearChatConfirm)) {
      setMessages([]);
    }
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
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setReferenceImages(prev => [...prev, event.target?.result as string]);
          };
          reader.readAsDataURL(file);
        }
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
            const reader = new FileReader();
            reader.onload = (event) => {
              setReferenceImages(prev => [...prev, event.target?.result as string]);
            };
            reader.readAsDataURL(file);
          }
        }
      }
    }
  };

  const removeReferenceImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex h-screen bg-[#0d0d0d] text-gray-100 overflow-hidden font-sans">
      
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
            onClick={clearChat}
            className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg py-2.5 transition-all text-sm font-medium"
          >
            <PlusCircle className="w-4 h-4 text-gray-400" />
            {t.newChat}
          </button>
          
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3 px-2">{t.history}</div>
            {messages.length === 0 ? (
              <div className="px-2 py-3 text-sm text-gray-500">
                {t.noHistory}
              </div>
            ) : (
              <div className="group flex items-center justify-between p-2 rounded-lg bg-blue-600/10 text-blue-400">
                <span className="text-sm truncate flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> {t.currentChat} ({messages.length} {t.msgCount})
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
              </div>
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
            <button className="text-xs font-medium text-gray-400 hover:text-white">{t.exportLog}</button>
            <button className="text-xs font-medium bg-white text-black px-4 py-1.5 rounded-full hover:bg-gray-200 shadow-sm transition-colors">{t.shareThread}</button>
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
                    {msg.role === 'user' ? t.userRequest : t.assistantResponse}
                  </div>
                  
                  {msg.role === 'user' ? (
                    <div className="text-gray-300 leading-relaxed whitespace-pre-wrap break-words text-sm sm:text-base">
                      {msg.content}
                      {msg.images && msg.images.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {msg.images.map((imgUrl, idx) => (
                            <div key={idx} className="w-20 h-20 rounded-lg overflow-hidden border border-white/10 shrink-0 shadow-sm">
                              <img src={imgUrl} className="w-full h-full object-cover" alt="attachment" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="markdown-body prose prose-invert prose-sm md:prose-base max-w-none text-gray-300 break-words w-full leading-relaxed">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
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
                onClick={() => setIsSettingsOpen(false)}
                className="text-gray-500 hover:text-white p-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  {t.baseUrl}
                </label>
                <input 
                  type="text" 
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full px-3 py-2.5 bg-black border border-white/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 rounded-lg outline-none transition-all text-sm font-mono text-white placeholder-gray-600"
                  placeholder="https://api.openai.com/v1"
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
                <div className="flex gap-2">
                  <select 
                    value={chatModel}
                    onChange={(e) => setChatModel(e.target.value)}
                    className="flex-1 px-3 py-2.5 bg-black border border-white/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 rounded-lg outline-none transition-all text-sm font-mono text-white"
                  >
                    {chatModels.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => {
                      const newModel = window.prompt(t.enterNewChatModel);
                      if (newModel && newModel.trim() && !chatModels.includes(newModel.trim())) {
                        setChatModels([...chatModels, newModel.trim()]);
                        setChatModel(newModel.trim());
                      }
                    }}
                    className="px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors flex items-center justify-center group"
                    title={t.addModel}
                  >
                    <PlusCircle className="w-4 h-4 text-gray-400 group-hover:text-white" />
                  </button>
                  <button 
                    onClick={() => {
                      if (chatModels.length <= 1) {
                         alert(t.atLeastOneModel);
                         return;
                      }
                      if (window.confirm(`${t.removeModelConfirm}: ${chatModel}?`)) {
                         const newList = chatModels.filter(m => m !== chatModel);
                         setChatModels(newList);
                         setChatModel(newList[0]);
                      }
                    }}
                    className="px-3 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-500 transition-colors flex items-center justify-center group"
                    title={t.deleteModel}
                  >
                    <Trash2 className="w-4 h-4 text-red-500/60 group-hover:text-red-500" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                  {t.imageModel}
                </label>
                <div className="flex gap-2">
                  <select 
                    value={imageModel}
                    onChange={(e) => setImageModel(e.target.value)}
                    className="flex-1 px-3 py-2.5 bg-black border border-white/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 rounded-lg outline-none transition-all text-sm font-mono text-white"
                  >
                    {imageModels.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => {
                      const newModel = window.prompt(t.enterNewImageModel);
                      if (newModel && newModel.trim() && !imageModels.includes(newModel.trim())) {
                        setImageModels([...imageModels, newModel.trim()]);
                        setImageModel(newModel.trim());
                      }
                    }}
                    className="px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors flex items-center justify-center group"
                    title={t.addModel}
                  >
                    <PlusCircle className="w-4 h-4 text-gray-400 group-hover:text-white" />
                  </button>
                  <button 
                    onClick={() => {
                      if (imageModels.length <= 1) {
                         alert(t.atLeastOneModel);
                         return;
                      }
                      if (window.confirm(`${t.removeModelConfirm}: ${imageModel}?`)) {
                         const newList = imageModels.filter(m => m !== imageModel);
                         setImageModels(newList);
                         setImageModel(newList[0]);
                      }
                    }}
                    className="px-3 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-500 transition-colors flex items-center justify-center group"
                    title={t.deleteModel}
                  >
                    <Trash2 className="w-4 h-4 text-red-500/60 group-hover:text-red-500" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-5 bg-black/40 border-t border-white/5 flex justify-end">
              <button 
                onClick={() => setIsSettingsOpen(false)}
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
