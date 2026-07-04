import React, { useState, useEffect, useRef } from 'react';
import { Settings, Send, Bot, User, Trash2, PlusCircle, Image as ImageIcon, MessageSquare, Menu, X, Globe, Download, Copy, RefreshCcw, StopCircle, CopyPlus, Pencil, Search } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import localforage from 'localforage';
import { auth } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { saveSettingsToFirebase, loadSettingsFromFirebase, saveSessionToFirebase, loadSessionsFromFirebase, deleteSessionFromFirebase } from './lib/sync';

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
  isError?: boolean;
  isRetrying?: boolean;
  debugData?: {
    requestUrl: string;
    requestMethod: string;
    requestHeaders: Record<string, string>;
    requestPayload: any;
    errorName?: string;
    errorMessage?: string;
    errorStack?: string;
    browserOnline?: boolean;
    userAgent?: string;
    currentTime?: string;
  };
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
    storageQuotaError: '本地存储已满！通常是因为图片体积过多过大。请在历史记录中删除旧对话，或者连接云端同步。',
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
    autoRetryError: '自动重试出错请求',
    autoRetryDesc: '如遇到错误则继续自动重试',
    sendShortcutLabel: '发送快捷键 (组合键)',
    newlineShortcutLabel: '换行快捷键 (组合键)',
    themeStyle: '主题配色',
    customPrimaryColor: '自定义主色',
    customGradientColor: '自定义渐变色',
    customBgMain: '自定义应用背景',
    customBgSidebar: '自定义边栏/卡片背景',
    customTextMain: '自定义主要文本颜色',
    appNameSetting: '应用名称',
    appIconSetting: '应用图标',
    importData: '导入聊天记录 (单/多条)',
    exportData: '导出所有聊天',
    exportSingleChat: '导出当前聊天',
    importSuccess: '导入完成',
    importError: '导入失败，请检查文件格式',
    searchHistory: '搜索聊天记录...',
    renameSession: '重命名对话',
    themeModeLabel: '主题模式',
    themeLight: '白天',
    themeDark: '黑夜',
    themeGradient: '启用渐变背景',
    tabApi: '模型配置',
    tabGeneral: '通用设置',
    tabAppearance: '外观设置',
    tabData: '数据管理',
    exportSettings: '导出设置配置',
    importSettings: '导入设置配置',
    modifierNone: '无 (仅 Enter)',
    modifierCtrl: 'Ctrl / Cmd',
    modifierShift: 'Shift',
    modifierAlt: 'Alt',
    langLabel: '界面语言'
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
    storageQuotaError: 'Local storage is full! Usually due to large images. Please delete old chats or enable cloud sync.',
    userRequest: 'User Request',
    assistantResponse: 'Assistant Response',
    sendPlaceholderText: 'Send a message...',
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
    autoRetryError: 'Auto-retry on Error',
    autoRetryDesc: 'Keep retrying automatically if error occurs',
    sendShortcutLabel: 'Send Shortcut (Modifier + Enter)',
    newlineShortcutLabel: 'Newline Shortcut (Modifier + Enter)',
    themeStyle: 'Theme Color',
    customPrimaryColor: 'Custom Primary Color',
    customGradientColor: 'Custom Gradient Color',
    customBgMain: 'Custom App Background Color',
    customBgSidebar: 'Custom Sidebar/Card Background',
    customTextMain: 'Custom Main Text Color',
    appNameSetting: 'App Name',
    appIconSetting: 'App Icon',
    importData: 'Import chat(s)',
    exportData: 'Export all chats',
    exportSingleChat: 'Export current chat',
    importSuccess: 'Import successful',
    importError: 'Failed to import, please check file format',
    searchHistory: 'Search chat history...',
    renameSession: 'Rename Chat',
    themeModeLabel: 'Theme Mode',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeGradient: 'Enable Gradient Background',
    tabApi: 'Models & API',
    tabGeneral: 'General',
    tabAppearance: 'Appearance',
    tabData: 'Data',
    exportSettings: 'Export Settings',
    importSettings: 'Import Settings',
    modifierNone: 'None (Enter only)',
    modifierCtrl: 'Ctrl / Cmd',
    modifierShift: 'Shift',
    modifierAlt: 'Alt',
    langLabel: 'Language'
  }
};

const THEME_COLORS: Record<string, { bg: string, text: string, border: string, bgOp: string, shadow: string, focus: string }> = {
  blue: { bg: 'bg-blue-600', text: 'text-blue-500', border: 'border-blue-500', bgOp: 'bg-blue-600/10', shadow: 'shadow-blue-900/20', focus: 'focus:border-blue-500/50 focus:ring-blue-500/50' },
  purple: { bg: 'bg-purple-600', text: 'text-purple-500', border: 'border-purple-500', bgOp: 'bg-purple-600/10', shadow: 'shadow-purple-900/20', focus: 'focus:border-purple-500/50 focus:ring-purple-500/50' },
  emerald: { bg: 'bg-emerald-600', text: 'text-emerald-500', border: 'border-emerald-500', bgOp: 'bg-emerald-600/10', shadow: 'shadow-emerald-900/20', focus: 'focus:border-emerald-500/50 focus:ring-emerald-500/50' },
  rose: { bg: 'bg-rose-600', text: 'text-rose-500', border: 'border-rose-500', bgOp: 'bg-rose-600/10', shadow: 'shadow-rose-900/20', focus: 'focus:border-rose-500/50 focus:ring-rose-500/50' },
  slate: { bg: 'bg-slate-600', text: 'text-slate-400', border: 'border-slate-500', bgOp: 'bg-slate-600/10', shadow: 'shadow-slate-900/20', focus: 'focus:border-slate-500/50 focus:ring-slate-500/50' },
  custom: { bg: 'theme-custom-bg', text: 'theme-custom-text', border: 'theme-custom-border', bgOp: 'theme-custom-bg-op', shadow: 'theme-custom-shadow', focus: 'theme-custom-focus' }
};

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [isSessionsLoaded, setIsSessionsLoaded] = useState(false);

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
  const [autoRetry, setAutoRetry] = useState<boolean>(() => localStorage.getItem('llm_auto_retry') === 'true');
  const [sendModifier, setSendModifier] = useState<'None' | 'Ctrl' | 'Shift' | 'Alt'>(() => (localStorage.getItem('llm_send_modifier') as any) || 'None');
  const [newlineModifier, setNewlineModifier] = useState<'None' | 'Ctrl' | 'Shift' | 'Alt'>(() => (localStorage.getItem('llm_newline_modifier') as any) || 'Shift');
  const [appName, setAppName] = useState(() => localStorage.getItem('llm_app_name') || 'AetherLink');
  const [appIcon, setAppIcon] = useState(() => localStorage.getItem('llm_app_icon') || 'A');
  const [themeColor, setThemeColor] = useState(() => localStorage.getItem('llm_theme_color') || 'blue');
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => (localStorage.getItem('llm_theme_mode') as 'dark' | 'light') || 'dark');
  const [themeGradient, setThemeGradient] = useState<boolean>(() => localStorage.getItem('llm_theme_gradient') === 'true');
  const [customPrimaryColor, setCustomPrimaryColor] = useState(() => localStorage.getItem('llm_custom_primary') || '#3b82f6');
  const [customGradientColorDark, setCustomGradientColorDark] = useState(() => localStorage.getItem('llm_custom_gradient_dark') || localStorage.getItem('llm_custom_gradient') || '#1e3a8a');
  const [customGradientColorLight, setCustomGradientColorLight] = useState(() => localStorage.getItem('llm_custom_gradient_light') || '#dbeafe');
  const [customBgMainDark, setCustomBgMainDark] = useState(() => localStorage.getItem('llm_custom_bg_main_dark') || localStorage.getItem('llm_custom_bg_main') || '#0d0d0d');
  const [customBgMainLight, setCustomBgMainLight] = useState(() => localStorage.getItem('llm_custom_bg_main_light') || '#f9fafb');
  const [customBgSidebarDark, setCustomBgSidebarDark] = useState(() => localStorage.getItem('llm_custom_bg_sidebar_dark') || localStorage.getItem('llm_custom_bg_sidebar') || '#141414');
  const [customBgSidebarLight, setCustomBgSidebarLight] = useState(() => localStorage.getItem('llm_custom_bg_sidebar_light') || '#ffffff');
  const [customTextMainDark, setCustomTextMainDark] = useState(() => localStorage.getItem('llm_custom_text_main_dark') || localStorage.getItem('llm_custom_text_main') || '#f3f4f6');
  const [customTextMainLight, setCustomTextMainLight] = useState(() => localStorage.getItem('llm_custom_text_main_light') || '#111827');

  const activeCustomGradientColor = themeMode === 'light' ? customGradientColorLight : customGradientColorDark;
  const activeCustomBgMain = themeMode === 'light' ? customBgMainLight : customBgMainDark;
  const activeCustomBgSidebar = themeMode === 'light' ? customBgSidebarLight : customBgSidebarDark;
  const activeCustomTextMain = themeMode === 'light' ? customTextMainLight : customTextMainDark;

  const setCustomGradientColor = (v: string) => themeMode === 'light' ? setCustomGradientColorLight(v) : setCustomGradientColorDark(v);
  const setCustomBgMain = (v: string) => themeMode === 'light' ? setCustomBgMainLight(v) : setCustomBgMainDark(v);
  const setCustomBgSidebar = (v: string) => themeMode === 'light' ? setCustomBgSidebarLight(v) : setCustomBgSidebarDark(v);
  const setCustomTextMain = (v: string) => themeMode === 'light' ? setCustomTextMainLight(v) : setCustomTextMainDark(v);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [activeSettingsTab, setActiveSettingsTab] = useState<'api' | 'general' | 'appearance' | 'data'>('api');

  const [syncMode, setSyncMode] = useState<'local' | 'cloud'>(() => (localStorage.getItem('llm_sync_mode') as 'local' | 'cloud') || 'local');
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isCloudLoading, setIsCloudLoading] = useState(false);

  const autoRetryRef = useRef(autoRetry);
  useEffect(() => {
    autoRetryRef.current = autoRetry;
  }, [autoRetry]);

  const t = i18n[lang];

  const filteredSessions = sessions.filter(s => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    if ((s.title || t.newChat).toLowerCase().includes(query)) return true;
    if (s.messages && s.messages.some(m => String(m.content || '').toLowerCase().includes(query))) return true;
    return false;
  });

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const saved = await localforage.getItem<string>('llm_sessions');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSessions(parsed);
              const curId = await localforage.getItem<string>('llm_current_session_id');
              if (curId && parsed.find(s => s.id === curId)) {
                setCurrentSessionId(curId);
              } else {
                setCurrentSessionId(parsed[0].id);
              }
              setIsSessionsLoaded(true);
              return;
            }
          } catch (e) {}
        }
        
        const legacySaved = localStorage.getItem('llm_sessions');
        if (legacySaved) {
          try {
            const parsed = JSON.parse(legacySaved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSessions(parsed);
              const curId = localStorage.getItem('llm_current_session_id');
              if (curId && parsed.find(s => s.id === curId)) {
                setCurrentSessionId(curId);
              } else {
                setCurrentSessionId(parsed[0].id);
              }
              await localforage.setItem('llm_sessions', legacySaved);
              localStorage.removeItem('llm_sessions');
              setIsSessionsLoaded(true);
              return;
            }
          } catch (e) {}
        }

        const id = Date.now().toString();
        const initialSess = { id, title: t.newChat, createdAt: Date.now(), messages: [] };
        setSessions([initialSess]);
        setCurrentSessionId(id);
        setIsSessionsLoaded(true);
      } catch (e) {
        console.error("Localforage load error", e);
        setIsSessionsLoaded(true);
      }
    };
    loadSessions();
  }, [t.newChat]);

  useEffect(() => {
    if (isSessionsLoaded && sessions.length > 0) {
      localforage.setItem('llm_sessions', JSON.stringify(sessions)).catch(e => {
        console.error("localforage save error", e);
        alert(t.storageQuotaError);
      });
    }
  }, [sessions, isSessionsLoaded, t.storageQuotaError]);

  useEffect(() => {
    if (isSessionsLoaded && currentSessionId) {
      localforage.setItem('llm_current_session_id', currentSessionId).catch(console.error);
    }
  }, [currentSessionId, isSessionsLoaded]);

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
        const newSess = { ...s, messages: newMessages, title: newTitle, updatedAt: Date.now() };
        if (syncMode === 'cloud' && currentUser) saveSessionToFirebase(currentUser.uid, newSess).catch(console.error);
        return newSess;
      }
      return s;
    }));
  };

  const createNewSession = () => {
    const id = Date.now().toString();
    const sess = { id, title: t.newChat, createdAt: Date.now(), messages: [] };
    setSessions(prev => [sess, ...prev]);
    if (syncMode === 'cloud' && currentUser) saveSessionToFirebase(currentUser.uid, sess).catch(console.error);
    setCurrentSessionId(id);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const updateSessionTitle = (sessionId: string, newTitle: string) => {
    setSessions(prev => prev.map(sess => {
      if (sess.id === sessionId) {
        const newSess = { ...sess, title: newTitle || t.newChat, updatedAt: Date.now() };
        if (syncMode === 'cloud' && currentUser) saveSessionToFirebase(currentUser.uid, newSess).catch(console.error);
        return newSess;
      }
      return sess;
    }));
    setEditingSessionId(null);
  };

  const removeSession = (sessionId: string) => {
    setSessions(prev => prev.filter(sess => sess.id !== sessionId));
    if (syncMode === 'cloud' && currentUser) deleteSessionFromFirebase(currentUser.uid, sessionId).catch(console.error);
  };

  const [isClearingChat, setIsClearingChat] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [addingModelType, setAddingModelType] = useState<'text' | 'image' | null>(null);
  const [newModelName, setNewModelName] = useState('');

  const [chatModels, setChatModels] = useState<string[]>(() => {
    const saved = localStorage.getItem('llm_chat_models');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error("Failed to parse llm_chat_models from localStorage", e);
      }
    }
    return ['claude-opus-4.7', 'gpt-4o-latest', 'gpt-3.5-turbo'];
  });
  const [imageModels, setImageModels] = useState<string[]>(() => {
    const saved = localStorage.getItem('llm_image_models');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error("Failed to parse llm_image_models from localStorage", e);
      }
    }
    return ['gpt2', 'dall-e-3', 'stable-diffusion-xl'];
  });

  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const cancelRetryIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    localStorage.setItem('llm_base_url', baseUrl);
    localStorage.setItem('llm_api_key', apiKey);
    localStorage.setItem('llm_chat_model', chatModel);
    localStorage.setItem('llm_image_model', imageModel);
    localStorage.setItem('llm_mode', mode);
    localStorage.setItem('llm_chat_models', JSON.stringify(chatModels));
    localStorage.setItem('llm_image_models', JSON.stringify(imageModels));
    localStorage.setItem('llm_lang', lang);
    localStorage.setItem('llm_auto_retry', autoRetry.toString());
    localStorage.setItem('llm_send_modifier', sendModifier);
    localStorage.setItem('llm_newline_modifier', newlineModifier);
    localStorage.setItem('llm_app_name', appName);
    localStorage.setItem('llm_app_icon', appIcon);
    localStorage.setItem('llm_theme_color', themeColor);
    localStorage.setItem('llm_theme_mode', themeMode);
    localStorage.setItem('llm_theme_gradient', themeGradient.toString());
    localStorage.setItem('llm_custom_primary', customPrimaryColor);
    localStorage.setItem('llm_custom_gradient_dark', customGradientColorDark);
    localStorage.setItem('llm_custom_gradient_light', customGradientColorLight);
    localStorage.setItem('llm_custom_bg_main_dark', customBgMainDark);
    localStorage.setItem('llm_custom_bg_main_light', customBgMainLight);
    localStorage.setItem('llm_custom_bg_sidebar_dark', customBgSidebarDark);
    localStorage.setItem('llm_custom_bg_sidebar_light', customBgSidebarLight);
    localStorage.setItem('llm_custom_text_main_dark', customTextMainDark);
    localStorage.setItem('llm_custom_text_main_light', customTextMainLight);
    localStorage.setItem('llm_sync_mode', syncMode);
  }, [baseUrl, apiKey, chatModel, imageModel, mode, chatModels, imageModels, lang, autoRetry, sendModifier, newlineModifier, appName, appIcon, themeColor, themeMode, themeGradient, customPrimaryColor, customGradientColorDark, customGradientColorLight, customBgMainDark, customBgMainLight, customBgSidebarDark, customBgSidebarLight, customTextMainDark, customTextMainLight, syncMode]);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setCurrentUser(u);
      if (u && syncMode === 'cloud') {
        loadDataFromCloud(u);
      }
    });
    return unsubscribe;
  }, [syncMode]);

  useEffect(() => {
    if (syncMode === 'cloud' && currentUser && !isCloudLoading) {
      const settingsToSync = {
        syncMode, chatModel, imageModel, mode, lang, autoRetry, sendModifier, newlineModifier, 
        appName, appIcon, themeColor, themeMode, themeGradient, 
        customPrimaryColor, customGradientColorDark, customGradientColorLight, 
        customBgMainDark, customBgMainLight, customBgSidebarDark, customBgSidebarLight, 
        customTextMainDark, customTextMainLight, chatModels, imageModels
      };
      saveSettingsToFirebase(currentUser.uid, settingsToSync).catch(console.error);
    }
  }, [chatModel, imageModel, mode, lang, autoRetry, sendModifier, newlineModifier, appName, appIcon, themeColor, themeMode, themeGradient, customPrimaryColor, customGradientColorDark, customGradientColorLight, customBgMainDark, customBgMainLight, customBgSidebarDark, customBgSidebarLight, customTextMainDark, customTextMainLight, chatModels, imageModels, syncMode, currentUser, isCloudLoading]);

  const loadDataFromCloud = async (u: FirebaseUser) => {
    setIsCloudLoading(true);
    try {
      const settings = await loadSettingsFromFirebase(u.uid);
      if (settings) {
        if (settings.chatModel) setChatModel(settings.chatModel);
        if (settings.imageModel) setImageModel(settings.imageModel);
        if (settings.mode) setMode(settings.mode);
        if (settings.lang) setLang(settings.lang);
        if (typeof settings.autoRetry === 'boolean') setAutoRetry(settings.autoRetry);
        if (settings.sendModifier) setSendModifier(settings.sendModifier);
        if (settings.newlineModifier) setNewlineModifier(settings.newlineModifier);
        if (settings.appName) setAppName(settings.appName);
        if (settings.appIcon) setAppIcon(settings.appIcon);
        if (settings.themeColor) setThemeColor(settings.themeColor);
        if (settings.themeMode) setThemeMode(settings.themeMode);
        if (typeof settings.themeGradient === 'boolean') setThemeGradient(settings.themeGradient);
        if (settings.customPrimaryColor) setCustomPrimaryColor(settings.customPrimaryColor);
        if (settings.customGradientColorDark) setCustomGradientColorDark(settings.customGradientColorDark);
        if (settings.customGradientColorLight) setCustomGradientColorLight(settings.customGradientColorLight);
        if (settings.customBgMainDark) setCustomBgMainDark(settings.customBgMainDark);
        if (settings.customBgMainLight) setCustomBgMainLight(settings.customBgMainLight);
        if (settings.customBgSidebarDark) setCustomBgSidebarDark(settings.customBgSidebarDark);
        if (settings.customBgSidebarLight) setCustomBgSidebarLight(settings.customBgSidebarLight);
        if (settings.customTextMainDark) setCustomTextMainDark(settings.customTextMainDark);
        if (settings.customTextMainLight) setCustomTextMainLight(settings.customTextMainLight);
        if (settings.chatModels) setChatModels(settings.chatModels);
        if (settings.imageModels) setImageModels(settings.imageModels);
      }
      
      const userSessions = await loadSessionsFromFirebase(u.uid);
      if (userSessions && userSessions.length > 0) {
        // Sort by updatedAt descending
        userSessions.sort((a, b) => b.updatedAt - a.updatedAt);
        setSessions(userSessions as any);
        if (!currentSessionId || !userSessions.find(s => s.id === currentSessionId)) {
          setCurrentSessionId(userSessions[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCloudLoading(false);
    }
  };

  const uploadLocalToCloud = async () => {
    if (!currentUser) return;
    setIsCloudLoading(true);
    try {
      const settingsToSync = {
        syncMode: 'cloud', chatModel, imageModel, mode, lang, autoRetry, sendModifier, newlineModifier, 
        appName, appIcon, themeColor, themeMode, themeGradient, 
        customPrimaryColor, customGradientColorDark, customGradientColorLight, 
        customBgMainDark, customBgMainLight, customBgSidebarDark, customBgSidebarLight, 
        customTextMainDark, customTextMainLight, chatModels, imageModels
      };
      await saveSettingsToFirebase(currentUser.uid, settingsToSync);
      for (const session of sessions) {
        await saveSessionToFirebase(currentUser.uid, session);
      }
      alert(lang === 'zh' ? '同步成功' : 'Sync Successful');
    } catch (e) {
      console.error(e);
      alert(lang === 'zh' ? '同步失败' : 'Sync Failed');
    } finally {
      setIsCloudLoading(false);
    }
  };

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
    const syncProps = syncMode === 'cloud' && currentUser ? {
        userId: currentUser.uid,
        uid: currentUser.uid,
        sessionId: currentSessionId,
        idToken: await currentUser.getIdToken()
    } : null;

    const newChatHistory = [...messages, userMsg].map(m => {
      let textContent = m.content;
      if (m.isImage && m.imageUrl) {
        textContent = `[Assistant generated an image]`;
      }
      
      if (m.images && m.images.length > 0) {
        const visionContent: any[] = [];
        if (textContent && textContent.trim() !== '') {
          visionContent.push({ type: 'text', text: textContent });
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
      return { role: m.role, content: textContent };
    });
    const assistantId = Date.now().toString() + '-assistant';
    
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', model: chatModel }]);

    let isSuccess = false;
    let attempt = 0;
    while (!isSuccess) {
      attempt++;
      try {
        const response = await fetch('/api/v1/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: newChatHistory,
            model: chatModel,
            baseUrl,
            apiKey,
            stream: true,
            syncProps,
            assistantId
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const err: any = new Error(errorData.error || `HTTP error! status: ${response.status}`);
          err.status = response.status;
          throw err;
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
                    m.id === assistantId ? { ...m, content: m.content + contentDelta, isError: false } : m
                  ));
                }
              } catch (err) {
                // Ignore incomplete JSON chunks parse errors
              }
            }
          }
        }
        isSuccess = true;
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, isRetrying: false } : m));
      } catch (error: any) {
        const isClientError = error && error.status >= 400 && error.status < 500;
        const maxAttemptsExceeded = attempt >= 3;

        let displayError = error?.message || String(error || 'Unknown error');
        if (error?.message === 'Failed to fetch' || error?.message?.includes('fetch')) {
          displayError = 'Failed to fetch / 无法建立网络连接。\n\n⚠️ **排查提示 (Troubleshooting Hints):**\n1. **浏览器拦截 (Ad Blockers):** 发现您遇到了浏览器底层网络连接错误。请检查是否启用了广告拦截插件 (如 **uBlock Origin**, **AdBlock Plus**, **Brave Shield**, **Privacy Badger** 或某些反跟踪插件)，它们可能会因为 URL 关键词拦截请求。请尝试禁用相关插件或在其它浏览器中重试。\n2. **服务端地址错误 (Base URL typo):** 请检查“系统设置 -> API配置”中的 **Base URL (API地址)** 是否正确、无拼写错误且服务可用。\n3. **本地网络代理 (VPN/Proxy):** 如果您使用了科学上网代理, 请确认代理没有拦截本地回环/本地测试域名请求。';
        }

        if (isClientError) {
          displayError += ' (Client error: auto-retry disabled / 客户端错误，已自动停止重试)';
        } else if (maxAttemptsExceeded) {
          displayError += ' (Max retries reached / 已达到最大重试次数上限)';
        }

        const debugInfo = {
          requestUrl: '/api/v1/completions',
          requestMethod: 'POST',
          requestHeaders: {
            'Content-Type': 'application/json'
          },
          requestPayload: {
            model: chatModel,
            baseUrl: baseUrl || '(Not provided / 未设置)',
            apiKeyMasked: apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)} (${apiKey.length} chars)` : '(Not provided / 未设置)',
            messagesCount: newChatHistory.length,
            stream: true,
            assistantId
          },
          errorName: error?.name || 'Error',
          errorMessage: error?.message || String(error || 'Failed to fetch'),
          errorStack: error?.stack || 'No manual stack trace available.',
          browserOnline: window.navigator.onLine,
          userAgent: window.navigator.userAgent,
          currentTime: new Date().toISOString()
        };
        if (!autoRetryRef.current || cancelRetryIdsRef.current.has(assistantId) || isClientError || maxAttemptsExceeded) {
          setMessages(prev => prev.map(m => 
            m.id === assistantId ? { 
              ...m, 
              content: m.content.replace(/\n\n\*Retrying automatically.*/, '') + `\n\n**Error:** ${displayError}`, 
              isError: true, 
              isRetrying: false,
              debugData: debugInfo
            } : m
          ));
          cancelRetryIdsRef.current.delete(assistantId);
          break;
        } else {
          setMessages(prev => prev.map(m => 
            m.id === assistantId ? { 
              ...m, 
              content: `**Error:** ${displayError}\n\n*Retrying automatically (Attempt ${attempt})...*`, 
              isError: false, 
              isRetrying: true,
              debugData: debugInfo
            } : m
          ));
          
          let waited = 0;
          while (waited < 2000) {
            if (cancelRetryIdsRef.current.has(assistantId)) break;
            await new Promise(r => setTimeout(r, 100));
            waited += 100;
          }
        }
      }
    }
    setIsLoading(false);
  };

  const handleImageGeneration = async (userMsg: Message) => {
    const syncProps = syncMode === 'cloud' && currentUser ? {
        userId: currentUser.uid,
        uid: currentUser.uid,
        sessionId: currentSessionId,
        idToken: await currentUser.getIdToken()
    } : null;

    const assistantId = Date.now().toString() + '-assistant';
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: t.generatingImage, model: imageModel }]);
    
    let isSuccess = false;
    let attempt = 0;
    let payload: any = null;
    while (!isSuccess) {
      attempt++;
      try {
        const allMsgs = [...messages, userMsg];
        
        let targetImages: string[] = userMsg.images && userMsg.images.length > 0 ? [...userMsg.images] : [];

        let finalPrompt = userMsg.content;
        const userPrompts = allMsgs.filter(m => m.role === 'user' && m.content).map(m => m.content);
        if (userPrompts.length > 1) {
          finalPrompt = `Base context: ${userPrompts.slice(0, -1).join(' -> ')}. Apply modification: ${userMsg.content}`;
        }

        let sizeStr = "1024x1024";
        const pLower = finalPrompt.toLowerCase();
        if (pLower.includes("16:9") || pLower.includes("16比9") || pLower.includes("landscape") || pLower.includes("宽屏") || pLower.includes("横图") || pLower.includes("横向") || pLower.includes("横版") || pLower.includes("横屏") || pLower.includes("4:3") || pLower.includes("3:2") || pLower.includes("电影感比例")) {
          sizeStr = "1792x1024";
        } else if (pLower.includes("9:16") || pLower.includes("9比16") || pLower.includes("portrait") || pLower.includes("竖屏") || pLower.includes("竖向") || pLower.includes("竖图") || pLower.includes("竖版") || pLower.includes("3:4") || pLower.includes("2:3") || pLower.includes("手机壁纸")) {
          sizeStr = "1024x1792";
        } else if (pLower.includes("1:1") || pLower.includes("square") || pLower.includes("方形") || pLower.includes("正方形") || pLower.includes("头像")) {
          sizeStr = "1024x1024";
        }

        payload = {
            prompt: finalPrompt,
            model: imageModel,
            size: sizeStr,
            n: 1,
            baseUrl,
            apiKey
        };

        if (targetImages.length > 0) {
          const processedImages = await Promise.all(targetImages.map(async (img) => {
            if (!img.startsWith('data:')) {
              try {
                const fetchUrl = `/api/v1/loader?url=${encodeURIComponent(img)}`;
                const res = await fetch(fetchUrl);
                const blob = await res.blob();
                return await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });
              } catch (e) {
                console.error('Failed to parse targetImage', e);
                return img;
              }
            }
            return img;
          }));
          payload.image = processedImages[0];
          payload.images = processedImages;
        }

        const response = await fetch('/api/v1/paintings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...payload, syncProps, assistantId })
        });

        if (!response.ok) {
           let errMsg = await response.text();
           let errStatus = response.status;
           try {
             const errObj = JSON.parse(errMsg);
             errMsg = errObj.error?.message || errObj.error || errMsg;
           } catch(e) {}
           const err: any = new Error(`API Proxy Error (${response.status}): ${errMsg}`);
           err.status = errStatus;
           throw err;
        }

        let data;
        let rawResponseText = await response.text();
        rawResponseText = rawResponseText.trim();
        try {
          data = JSON.parse(rawResponseText);
        } catch (err) {
          throw new Error(`JSON parse error. Server returned: ${rawResponseText.slice(0, 200).replace(/\n/g, ' ')}`);
        }

        if (data._statusError) {
          const err: any = new Error(`API Proxy Error (${data._statusError}): ${data.error || 'Unknown error'}`);
          err.status = data._statusError;
          throw err;
        }

        let finalImageUrl = data.data?.[0]?.url || (data.data?.[0]?.b64_json ? `data:image/png;base64,${data.data[0].b64_json}` : null);

        if (finalImageUrl) {
          if (!finalImageUrl.startsWith('data:')) {
             try {
                const res = await fetch(`/api/v1/loader?url=${encodeURIComponent(finalImageUrl)}`);
                if (res.ok) {
                   const blob = await res.blob();
                   finalImageUrl = await new Promise((resolve) => {
                      const reader = new FileReader();
                      reader.onloadend = () => resolve(reader.result as string);
                      reader.readAsDataURL(blob);
                   });
                }
             } catch(e) {
                console.error("Failed to convert image to data URL", e);
             }
          }
          
          setMessages(prev => prev.map(m => 
            m.id === assistantId ? { ...m, content: `![Generated Image](${finalImageUrl})`, isImage: true, imageUrl: finalImageUrl, isError: false } : m
          ));
        } else {
          throw new Error(`Proxy Success (200), but missing image URL. Proxy response: ${JSON.stringify(data).slice(0, 500)}`);
        }
        isSuccess = true;
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, isRetrying: false } : m));
      } catch (error: any) {
        const isClientError = error && error.status >= 400 && error.status < 500;
        const maxAttemptsExceeded = attempt >= 3;

        let displayError = error?.message || String(error || 'Unknown error');
        if (error?.message === 'Failed to fetch' || error?.message?.includes('fetch')) {
          displayError = 'Failed to fetch / 无法建立网络连接。\n\n⚠️ **排查提示 (Troubleshooting Hints):**\n1. **浏览器拦截 (Ad Blockers):** 发现您遇到了浏览器底层网络连接错误。请检查是否启用了广告拦截插件 (如 **uBlock Origin**, **AdBlock Plus**, **Brave Shield**, **Privacy Badger**)，它们可能会因为 URL 关键词拦截请求。请尝试禁用相关插件或在其它浏览器中重试。\n2. **服务端地址错误 (Base URL typo):** 请检查“系统设置 -> API配置”中的 **Base URL (API地址)** 是否正确、无拼写错误且服务可用。\n3. **科学上网配置 (VPN/Proxy):** 如果您使用了科学上网代理, 请确认代理没有拦截本地回环/本地测试域名请求。';
        }

        if (isClientError) {
          displayError += ' (Client error: auto-retry disabled / 客户端错误，已自动停止重试)';
        } else if (maxAttemptsExceeded) {
          displayError += ' (Max retries reached / 已达到最大重试次数上限)';
        }

        const debugInfo = {
          requestUrl: '/api/v1/paintings',
          requestMethod: 'POST',
          requestHeaders: {
            'Content-Type': 'application/json'
          },
          requestPayload: {
            model: imageModel,
            baseUrl: baseUrl || '(Not provided / 未设置)',
            apiKeyMasked: apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)} (${apiKey.length} chars)` : '(Not provided / 未设置)',
            prompt: payload?.prompt || '(Prompt undefined)',
            size: payload?.size || '(Default size)',
            n: payload?.n || 1,
            assistantId
          },
          errorName: error?.name || 'Error',
          errorMessage: error?.message || String(error || 'Failed to fetch'),
          errorStack: error?.stack || 'No manual stack trace available.',
          browserOnline: window.navigator.onLine,
          userAgent: window.navigator.userAgent,
          currentTime: new Date().toISOString()
        };
        if (!autoRetryRef.current || cancelRetryIdsRef.current.has(assistantId) || isClientError || maxAttemptsExceeded) {
          setMessages(prev => prev.map(m => 
            m.id === assistantId ? { 
              ...m, 
              content: m.content.replace(/\n\n\*Retrying automatically.*/, '') + `\n\n**Error Generating Image:** ${displayError}`, 
              isError: true, 
              isRetrying: false,
              debugData: debugInfo
            } : m
          ));
          cancelRetryIdsRef.current.delete(assistantId);
          break;
        } else {
          setMessages(prev => prev.map(m => 
            m.id === assistantId ? { 
              ...m, 
              content: `**Error Generating Image:** ${displayError}\n\n*Retrying automatically (Attempt ${attempt})...*`, 
              isError: false, 
              isRetrying: true,
              debugData: debugInfo
            } : m
          ));
          
          let waited = 0;
          while (waited < 2000) {
            if (cancelRetryIdsRef.current.has(assistantId)) break;
            await new Promise(r => setTimeout(r, 100));
            waited += 100;
          }
        }
      }
    }
    setIsLoading(false);
  };

  const handleStopRetry = (msgId: string) => {
    cancelRetryIdsRef.current.add(msgId);
  };

  const reusePrompt = (msg: Message, includeImages: boolean) => {
    setInput(msg.content);
    if (includeImages && msg.images && msg.images.length > 0) {
      setReferenceImages(msg.images);
    } else {
      setReferenceImages([]);
    }
    setTimeout(() => {
      inputRef.current?.focus();
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
        inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
      }
    }, 50);
  };

  const handleRetry = async (msgId: string) => {
    const errorIndex = messages.findIndex(m => m.id === msgId);
    if (errorIndex <= 0) return;
    
    const errorMsg = messages[errorIndex];
    let prevMsg = messages.slice(0, errorIndex).reverse().find(m => m.role === 'user');
    if (!prevMsg) return;

    setMessages(prev => prev.filter(m => m.id !== msgId));
    setIsLoading(true);

    if (errorMsg.content.includes('Error Generating Image:')) {
      await handleImageGeneration(prevMsg);
    } else {
      await handleChatCompletion(prevMsg);
    }
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const isModifierPressed = (mod: string, e: React.KeyboardEvent) => {
    if (mod === 'None') return !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey;
    if (mod === 'Ctrl') return e.ctrlKey || e.metaKey;
    if (mod === 'Shift') return e.shiftKey;
    if (mod === 'Alt') return e.altKey;
    return false;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const isSend = isModifierPressed(sendModifier, e);
      const isNewline = isModifierPressed(newlineModifier, e);
      
      if (isSend) {
        e.preventDefault();
        handleSubmit();
      } else if (!isNewline) {
        // If it's neither send nor exact newline combo, default behaviour is usually new line, but standard behavior dictates avoiding sending.
        // We do not prevent default unless it matches Send.
      }
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
        const MAX_WIDTH = 512;
        const MAX_HEIGHT = 512;
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
         fetchUrl = `/api/v1/loader?url=${encodeURIComponent(url)}`;
      }

      const makePngBlob = async () => {
        const response = await fetch(fetchUrl);
        const blob = await response.blob();
        const imageBitmap = await createImageBitmap(blob);
        const canvas = document.createElement('canvas');
        canvas.width = imageBitmap.width;
        canvas.height = imageBitmap.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context not available');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imageBitmap, 0, 0);
        return new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error('Canvas toBlob failed'));
          }, 'image/png');
        });
      };

      if (window.ClipboardItem && navigator.clipboard?.write) {
        try {
          // Safari requires Promise inside ClipboardItem
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': makePngBlob()
            })
          ]);
        } catch (e: any) {
          if (e.name === 'NotAllowedError') throw e; 
          // Fallback for Chrome
          const blob = await makePngBlob();
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob
            })
          ]);
        }
      } else {
        throw new Error('Clipboard API not supported');
      }
      alert(lang === 'zh' ? '图片已复制到剪贴板' : 'Image copied to clipboard!');
    } catch (err: any) {
      console.error('Failed to copy image: ', err);
      alert((lang === 'zh' ? '复制失败: ' : 'Failed to copy: ') + (err?.message || err));
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

  const hexToRgba = (hex: string, alpha: number) => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex.substring(1, 3), 16);
      g = parseInt(hex.substring(3, 5), 16);
      b = parseInt(hex.substring(5, 7), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const customThemeStyles = themeColor === 'custom' ? {
    '--color-primary': customPrimaryColor,
    '--color-primary-text': customPrimaryColor,
    '--color-primary-bg': hexToRgba(customPrimaryColor, 0.1),
    '--color-primary-border': hexToRgba(customPrimaryColor, 0.5),
    '--color-primary-hover': customPrimaryColor, // can do better, but custom is custom
    '--color-primary-shadow': hexToRgba(customPrimaryColor, 0.2),
    '--theme-gradient-start': activeCustomGradientColor,
    '--theme-bg-main': activeCustomBgMain,
    '--theme-bg-sidebar': activeCustomBgSidebar,
    '--theme-text-main': activeCustomTextMain,
    '--theme-gradient-end': activeCustomBgMain,
  } as React.CSSProperties : {};

  return (
    <div 
      className="flex h-screen bg-[#0d0d0d] text-gray-100 overflow-hidden font-sans relative z-0" 
      data-theme={themeMode}
      data-custom-theme={themeColor === 'custom'}
      style={customThemeStyles}
    >
      {/* Background Gradient Layer */}
      <div 
        className={cn(
          "absolute inset-0 z-[-1] transition-opacity duration-500",
          themeGradient ? "opacity-100" : "opacity-0"
        )}
        data-gradient="true"
      />
      
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
             <div className={cn("w-8 h-8 rounded flex items-center justify-center font-bold shadow-lg", THEME_COLORS[themeColor]?.shadow, THEME_COLORS[themeColor]?.bg)}>
              <span style={{ color: '#ffffff' }}>{appIcon}</span>
            </div>
             <span className="text-lg font-semibold tracking-tight">{appName}</span>
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
            <div className="flex items-center gap-2 mb-3 px-2">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{t.history}</span>
            </div>
            
            <div className="px-2 mb-3 relative">
              <input
                type="text"
                placeholder={t.searchHistory}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-xs text-white placeholder-gray-500 outline-none focus:border-white/20 transition-all"
              />
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-4 top-2" />
            </div>

            {filteredSessions.length === 0 ? (
              <div className="px-2 py-3 text-sm text-gray-500">
                {t.noHistory}
              </div>
            ) : (
              filteredSessions.map(s => (
                <div 
                  key={s.id}
                  onClick={() => {
                    if (editingSessionId !== s.id) {
                      setCurrentSessionId(s.id);
                      if (window.innerWidth < 768) setIsSidebarOpen(false);
                    }
                  }}
                  className={cn(
                    "w-full group flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer",
                    s.id === currentSessionId ? `${THEME_COLORS[themeColor]?.bgOp} ${THEME_COLORS[themeColor]?.text}` : "hover:bg-white/5 text-gray-400"
                  )}
                >
                  <span className="text-sm flex items-center gap-2 flex-1 min-w-0 pr-2">
                    <MessageSquare className="w-4 h-4 shrink-0" /> 
                    {editingSessionId === s.id ? (
                      <input 
                        autoFocus
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => updateSessionTitle(s.id, editingTitle)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') updateSessionTitle(s.id, editingTitle);
                          if (e.key === 'Escape') setEditingSessionId(null);
                        }}
                        className="flex-1 min-w-0 bg-black/50 border border-white/10 rounded px-1.5 py-0.5 text-sm text-white outline-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="truncate">{s.title || t.newChat}</span>
                    )}
                  </span>
                  
                  {s.id === currentSessionId && editingSessionId !== s.id && <div className={cn("w-1.5 h-1.5 rounded-full shrink-0 group-hover:hidden", THEME_COLORS[themeColor]?.bg)}></div>}
                  
                  {editingSessionId !== s.id && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center transition-opacity shrink-0">
                      <div 
                         onClick={(e) => {
                           e.stopPropagation();
                           const dataStr = JSON.stringify(s, null, 2);
                           const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                           const exportFileDefaultName = `chat_${s.id}_${new Date().toISOString().slice(0,10)}.json`;
                           const linkElement = document.createElement('a');
                           linkElement.setAttribute('href', dataUri);
                           linkElement.setAttribute('download', exportFileDefaultName);
                           linkElement.click();
                         }}
                         className="p-1 hover:text-white transition-opacity"
                         title={t.exportSingleChat}
                      >
                        <Download className="w-3 h-3 cursor-pointer" />
                      </div>
                      <div 
                         onClick={(e) => {
                           e.stopPropagation();
                           setEditingSessionId(s.id);
                           setEditingTitle(s.title || t.newChat);
                         }}
                         className="p-1 hover:text-white transition-opacity"
                      >
                        <Pencil className="w-3 h-3 cursor-pointer" />
                      </div>
                      <div 
                         onClick={(e) => {
                           e.stopPropagation();
                           removeSession(s.id);
                         }}
                         className="p-1 hover:text-red-400 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3 cursor-pointer" />
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-auto p-4 border-t border-white/5 space-y-2 relative">
          <div className="bg-black/20 rounded-lg p-2 border border-white/5 space-y-2 mb-2">
            <div className="flex bg-black/50 p-1 rounded border border-white/5">
              <button
                onClick={() => setSyncMode('local')}
                className={cn(
                  "flex-1 py-1 text-[10px] font-bold rounded uppercase tracking-wider transition-colors",
                  syncMode === 'local' ? "bg-white/20 text-white" : "text-gray-500 hover:text-white"
                )}
              >
                {lang === 'zh' ? '本地' : 'Local'}
              </button>
              <button
                onClick={async () => {
                  if (!auth) {
                    alert(lang === 'zh' ? '云端功能尚未配置，请检查相关环境变量。' : 'Cloud function is not configured, please check environment variables.');
                    return;
                  }
                  if (!currentUser) {
                    try {
                      setIsCloudLoading(true);
                      const provider = new GoogleAuthProvider();
                      await signInWithPopup(auth, provider);
                    } catch (e: any) {
                      console.error(e);
                      alert((lang === 'zh' ? '登录失败: ' : 'Login failed: ') + (e?.message || e));
                      setIsCloudLoading(false);
                      return;
                    }
                  }
                  setSyncMode('cloud');
                }}
                className={cn(
                  "flex-1 py-1 text-[10px] font-bold rounded uppercase tracking-wider transition-colors",
                  syncMode === 'cloud' ? "bg-blue-500/80 text-white" : "text-gray-500 hover:text-white"
                )}
                disabled={isCloudLoading}
              >
                {isCloudLoading ? '...' : (lang === 'zh' ? '云端' : 'Cloud')}
              </button>
            </div>
            {syncMode === 'cloud' && currentUser && (
              <>
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                    {currentUser.photoURL ? (
                      <img src={currentUser.photoURL} alt="Avatar" className="w-5 h-5 rounded-full shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                        {currentUser.displayName?.[0] || currentUser.email?.[0] || 'U'}
                      </div>
                    )}
                    <span className="text-[10px] text-gray-300 truncate font-medium">
                      {currentUser.displayName || currentUser.email}
                    </span>
                  </div>
                  <button onClick={() => signOut(auth)} className="text-[10px] text-gray-500 hover:text-white transition-colors p-1" title={lang === 'zh' ? '登出' : 'Sign Out'}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <button
                  onClick={uploadLocalToCloud}
                  disabled={isCloudLoading}
                  className="w-full bg-white/5 hover:bg-white/10 text-gray-300 px-2 py-1 rounded text-[10px] font-medium border border-white/10 disabled:opacity-50 transition-colors text-center"
                >
                  {lang === 'zh' ? '强制覆盖云端数据' : 'Overwrite Cloud Data'}
                </button>
              </>
            )}
          </div>
          
          <div className="flex gap-2">
            <label 
              title={t.importData}
              className="flex-1 flex justify-center bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white p-2 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <input 
                type="file" 
                accept=".json" 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    try {
                      const data = JSON.parse(e.target?.result as string);
                      if (Array.isArray(data)) {
                        setSessions(data);
                        if (data.length > 0) setCurrentSessionId(data[0].id);
                        alert(t.importSuccess);
                      } else if (data && typeof data === 'object' && data.id && Array.isArray(data.messages)) {
                        // Single chat import
                        setSessions(prev => {
                          const exists = prev.find(s => s.id === data.id);
                          return exists ? prev.map(s => s.id === data.id ? data : s) : [data, ...prev];
                        });
                        setCurrentSessionId(data.id);
                        alert(t.importSuccess);
                      } else {
                        throw new Error('Invalid format');
                      }
                    } catch (err) {
                      alert(t.importError);
                    }
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }} 
              />
              {t.importData}
            </label>
            <button
              onClick={() => {
                const dataStr = JSON.stringify(sessions, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                const exportFileDefaultName = `chat_history_${new Date().toISOString().slice(0,10)}.json`;
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileDefaultName);
                linkElement.click();
              }}
              className="flex-1 flex justify-center bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white p-2 rounded-lg text-xs font-medium transition-colors"
            >
              {t.exportData}
            </button>
          </div>
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
            <span className={cn("text-xs font-bold px-2 py-1 rounded tracking-widest uppercase", THEME_COLORS[themeColor]?.text, THEME_COLORS[themeColor]?.bgOp)}>
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
        <div className="flex-1 overflow-y-auto w-full mx-auto flex flex-col scroll-smooth">
          <div className="max-w-4xl mx-auto w-full p-4 md:p-8">
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <div className={cn("w-16 h-16 flex items-center justify-center rounded-2xl mb-4 border", THEME_COLORS[themeColor]?.bgOp, THEME_COLORS[themeColor]?.border, "border-opacity-20")}>
                <Bot className={cn("w-8 h-8", THEME_COLORS[themeColor]?.text)} />
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
                  "flex gap-4 max-w-3xl mx-auto group relative",
                  msg.role === 'assistant' && "bg-white/[0.02] p-6 rounded-2xl border border-white/5 w-full"
                )}
              >
                {/* Avatar */}
                {msg.role === 'user' && syncMode === 'cloud' && currentUser ? (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10">
                    {currentUser.photoURL ? (
                      <img src={currentUser.photoURL} alt="User" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-indigo-900 flex items-center justify-center text-xs font-bold text-white shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                        {currentUser.displayName?.[0] || currentUser.email?.[0] || 'U'}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    msg.role === 'user' ? "bg-indigo-900" : THEME_COLORS[themeColor]?.bg
                  )}>
                    <span style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>{msg.role === 'user' ? 'ME' : 'AI'}</span>
                  </div>
                )}

                {/* Bubble Content */}
                <div className="space-y-2 flex-1 w-full overflow-hidden">
                  <div className={cn(
                    "text-xs font-bold uppercase tracking-tighter",
                    msg.role === 'user' ? "text-gray-500 max-w-full truncate" : THEME_COLORS[themeColor]?.text
                  )}>
                    {msg.role === 'user' ? (syncMode === 'cloud' && currentUser ? (currentUser.displayName || currentUser.email) : t.userRequest) : (msg.model || t.assistantResponse)}
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
                                let fetchUrl = msg.imageUrl!;
                                if (!fetchUrl.startsWith('data:')) {
                                   fetchUrl = `/api/v1/loader?url=${encodeURIComponent(fetchUrl)}`;
                                }
                                fetch(fetchUrl)
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
                        <div className="flex flex-col gap-3 w-full">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                          {msg.isError && !msg.isRetrying && (
                            <button
                              onClick={() => handleRetry(msg.id)}
                              className="self-start mt-2 px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/30 rounded flex items-center gap-2 text-sm font-medium transition-colors outline-none"
                            >
                              <RefreshCcw className="w-4 h-4" />
                              Retry
                            </button>
                          )}
                          {msg.isRetrying && (
                            <button
                              onClick={() => handleStopRetry(msg.id)}
                              className="self-start mt-2 px-3 py-1.5 bg-yellow-600/10 hover:bg-yellow-600/20 text-yellow-500 border border-yellow-600/30 rounded flex items-center gap-2 text-sm font-medium transition-colors outline-none"
                            >
                              <StopCircle className="w-4 h-4" />
                              Stop Retry
                            </button>
                          )}
                          {msg.debugData && (
                            <div className="mt-4 border border-red-500/20 bg-black/40 rounded-xl p-4 text-xs font-mono text-gray-300 w-full overflow-hidden max-w-full">
                              <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                                <span className="text-red-400 font-bold flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
                                  Connection Diagnostic Console (网络诊断控制台)
                                </span>
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(JSON.stringify(msg.debugData, null, 2));
                                  }}
                                  className="px-2 py-1 bg-white/5 hover:bg-white/10 text-[10px] text-gray-400 hover:text-white rounded border border-white/5 flex items-center gap-1 transition-all"
                                >
                                  复制诊断数据 (Copy JSON)
                                </button>
                              </div>
                              
                              <div className="space-y-4 max-w-full">
                                <div className="grid grid-cols-2 gap-2 text-[11px] bg-white/[0.02] p-2 rounded-lg border border-white/5">
                                  <div>
                                    <span className="text-gray-500 block text-[9px] uppercase">Error Type:</span>
                                    <span className="text-red-400 font-semibold">{msg.debugData.errorName || 'Error'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 block text-[9px] uppercase">Online Status:</span>
                                    <span>{msg.debugData.browserOnline ? '🟢 Connected (在线)' : '🔴 Offline (断网)'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 block text-[9px] uppercase">HTTP Target (API):</span>
                                    <span className="text-blue-400 break-all">{msg.debugData.requestUrl}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 block text-[9px] uppercase">Local Time:</span>
                                    <span className="text-gray-400 text-[10px]">{msg.debugData.currentTime}</span>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <div>
                                    <span className="text-gray-500 text-[10px] uppercase block mb-1">ErrorMessage (详细错误消息):</span>
                                    <pre className="p-2.5 bg-red-950/20 text-red-300 rounded border border-red-900/30 font-mono text-[11px] whitespace-pre-wrap break-all max-h-24 overflow-y-auto">
                                      {msg.debugData.errorMessage || 'No specific message.'}
                                    </pre>
                                  </div>

                                  <div>
                                    <span className="text-gray-500 text-[10px] uppercase block mb-1">Request Payload Masked (发送负载 - 已脱敏):</span>
                                    <pre className="p-2.5 bg-zinc-900 border border-white/5 text-emerald-400 rounded font-mono text-[11px] overflow-x-auto whitespace-pre">
                                      {JSON.stringify(msg.debugData.requestPayload, null, 2)}
                                    </pre>
                                  </div>

                                  {msg.debugData.errorStack && (
                                    <div>
                                      <span className="text-gray-500 text-[10px] uppercase block mb-1">Call Stack (调用栈):</span>
                                      <pre className="p-2.5 bg-black text-gray-400 rounded text-[10px] whitespace-pre-wrap break-all font-mono max-h-32 overflow-y-auto border border-white/5">
                                        {msg.debugData.errorStack}
                                      </pre>
                                    </div>
                                  )}

                                  <div>
                                    <span className="text-gray-500 text-[10px] uppercase block mb-1">UserAgent (浏览器信息):</span>
                                    <div className="p-2 bg-zinc-950 text-gray-500 rounded text-[10px] leading-normal font-mono break-all max-h-16 overflow-y-auto border border-white/5">
                                      {msg.debugData.userAgent}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="mt-2 bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 text-yellow-400/90 text-[11px] leading-relaxed">
                                  <b className="text-yellow-400 block mb-1">💡 针对 "Failed to fetch" (网络连接失败) 的技术分析与调试技巧：</b>
                                  <ul className="list-disc list-inside space-y-1 text-gray-400">
                                    <li><b>广告屏蔽插件干扰：</b> 超过 90% 的 "Failed to fetch" 错误是由类似 <span className="text-yellow-400">uBlock Origin</span>, <span className="text-yellow-400">AdBlock</span> 或 <span className="text-yellow-400">Brave Shield</span> 等安全插件拦截导致的。它们拦截了包含 `/api` 的本地/流式请求。请暂时<b>关闭插件</b>并重新发送。</li>
                                    <li><b>CORS / 跨域限制：</b> 当前客户端通过自定义的本站 API 转发器发送。如果您的 Base URL 设置为了非标准端口，请确保没有被您的企业 VPN/防火墙拦截。</li>
                                    <li><b>建议操作：</b> 按下键盘键盘上的 <kbd className="px-1 py-0.5 bg-zinc-800 rounded border border-zinc-700 text-white">F12</kbd> 打开浏览器开发者工具，点击右上角的 <b>Consoles (控制台)</b> 或 <b>Network (网络)</b> 栏，观察是否有红色拦截条目，并<b>截图</b>给我们看。</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {msg.role === 'user' && (
                    <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => reusePrompt(msg, false)}
                        className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-md transition-colors outline-none flex items-center gap-1.5 text-xs font-medium"
                        title={lang === 'zh' ? '复制提示词' : 'Copy prompt'}
                      >
                        <CopyPlus className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => reusePrompt(msg, true)}
                        className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-md transition-colors outline-none flex items-center gap-1.5 text-xs font-medium"
                        title={lang === 'zh' ? '复制提示词和图片' : 'Copy prompt and images'}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <CopyPlus className="w-3 h-3 -ml-1 opacity-60" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} className="h-6" />
          </div>
        </div>
      </div>

      {/* Input Area */}
        <div 
          className="px-4 py-3 md:px-8 md:pt-5 md:pb-4 bg-[#0d0d0d] z-10 shrink-0 border-t border-white/5"
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
                placeholder={mode === 'text' ? `${t.sendPlaceholderText}` : t.sendPlaceholderImage}
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
            <p className="text-[10px] text-center text-gray-600 mt-2 mb-0 uppercase tracking-widest leading-none">
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
            
            <div className="flex border-b border-white/5 bg-[#141414]">
              {(['api', 'general', 'appearance', 'data'] as const).map(tab => (
                <button
                  key={tab}
                  className={cn(
                    "flex-1 py-3 text-[11px] font-bold uppercase tracking-widest transition-colors",
                    activeSettingsTab === tab ? "text-white border-b-2 border-blue-500" : "text-gray-500 hover:text-gray-300"
                  )}
                  onClick={() => setActiveSettingsTab(tab)}
                >
                  {tab === 'api' ? t.tabApi : tab === 'general' ? t.tabGeneral : tab === 'appearance' ? t.tabAppearance : t.tabData}
                </button>
              ))}
            </div>
            
            <div className="p-5 space-y-4 h-[60vh] overflow-y-auto w-full overflow-x-hidden">
              {settingsError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg mb-4">
                  {settingsError}
                </div>
              )}
              
              {activeSettingsTab === 'api' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                      {t.baseUrl}
                    </label>
                    <input 
                      type="text" 
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      className="w-full px-3 py-2.5 bg-black border border-white/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 rounded-lg outline-none transition-all text-sm font-mono text-white placeholder-gray-600"
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
              )}

              {activeSettingsTab === 'general' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">{t.autoRetryError}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{t.autoRetryDesc}</div>
                    </div>
                    <button
                      onClick={() => setAutoRetry(!autoRetry)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${autoRetry ? 'bg-blue-600' : 'bg-gray-700'}`}
                    >
                      <div className={`absolute top-1 max-w-full bottom-1 w-4 h-4 rounded-full bg-white transition-transform ${autoRetry ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  <div className="flex gap-4 w-full">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 mt-2">
                        {t.sendShortcutLabel}
                      </label>
                      <select
                        value={sendModifier}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setSendModifier(val);
                          if (val === newlineModifier) setNewlineModifier(val === 'None' ? 'Shift' : 'None');
                        }}
                        className="w-full px-3 py-2.5 bg-black border border-white/10 focus:border-blue-500/50 hover:border-white/20 rounded-lg outline-none transition-all text-sm font-mono text-white"
                      >
                        <option value="None">{t.modifierNone}</option>
                        <option value="Ctrl">{t.modifierCtrl}</option>
                        <option value="Shift">{t.modifierShift}</option>
                        <option value="Alt">{t.modifierAlt}</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 mt-2">
                        {t.newlineShortcutLabel}
                      </label>
                      <select
                        value={newlineModifier}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setNewlineModifier(val);
                          if (val === sendModifier) setSendModifier(val === 'None' ? 'Shift' : 'None');
                        }}
                        className="w-full px-3 py-2.5 bg-black border border-white/10 focus:border-blue-500/50 hover:border-white/20 rounded-lg outline-none transition-all text-sm font-mono text-white"
                      >
                        <option value="None">{t.modifierNone}</option>
                        <option value="Ctrl">{t.modifierCtrl}</option>
                        <option value="Shift">{t.modifierShift}</option>
                        <option value="Alt">{t.modifierAlt}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 mt-2">
                      {t.langLabel}
                    </label>
                    <select
                      value={lang}
                      onChange={(e) => setLang(e.target.value as any)}
                      className="w-full px-3 py-2.5 bg-black border border-white/10 focus:border-blue-500/50 hover:border-white/20 rounded-lg outline-none transition-all text-sm font-mono text-white"
                    >
                      <option value="zh">简体中文</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>
              )}

              {activeSettingsTab === 'appearance' && (
                <div className="space-y-4">
                  <div className="flex gap-4 w-full">
                    <div className="w-20">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                        {t.appIconSetting}
                      </label>
                      <input
                        type="text"
                        value={appIcon}
                        onChange={(e) => setAppIcon(e.target.value)}
                        maxLength={2}
                        className="w-full px-3 py-2 bg-black border border-white/10 focus:border-blue-500/50 hover:border-white/20 rounded-lg outline-none transition-all text-sm font-mono text-white text-center"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                        {t.appNameSetting}
                      </label>
                      <input
                        type="text"
                        value={appName}
                        onChange={(e) => setAppName(e.target.value)}
                        className="w-full px-3 py-2 bg-black border border-white/10 focus:border-blue-500/50 hover:border-white/20 rounded-lg outline-none transition-all text-sm font-mono text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-4 w-full">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                        {t.themeModeLabel}
                      </label>
                      <select
                        value={themeMode}
                        onChange={(e) => setThemeMode(e.target.value as any)}
                        className="w-full px-3 py-2.5 bg-black border border-white/10 focus:border-blue-500/50 hover:border-white/20 rounded-lg outline-none transition-all text-sm font-mono text-white"
                      >
                        <option value="dark">{t.themeDark}</option>
                        <option value="light">{t.themeLight}</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                        {t.themeStyle}
                      </label>
                      <select
                        value={themeColor}
                        onChange={(e) => setThemeColor(e.target.value)}
                        className="w-full px-3 py-2.5 bg-black border border-white/10 focus:border-blue-500/50 hover:border-white/20 rounded-lg outline-none transition-all text-sm font-mono text-white"
                      >
                        <option value="blue">Blue</option>
                        <option value="purple">Purple</option>
                        <option value="emerald">Emerald</option>
                        <option value="rose">Rose</option>
                        <option value="slate">Slate</option>
                        <option value="custom">Custom (Highly Configurable)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-sm font-medium text-white">{t.themeGradient}</div>
                    <button
                      onClick={() => setThemeGradient(!themeGradient)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${themeGradient ? 'bg-blue-600' : 'bg-gray-700'}`}
                    >
                      <div className={`absolute top-1 max-w-full bottom-1 w-4 h-4 rounded-full bg-white transition-transform ${themeGradient ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {themeColor === 'custom' && (
                    <div className="space-y-2 pt-2">
                      <div className="flex gap-4 w-full">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 mt-2">
                            {t.customPrimaryColor}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={customPrimaryColor}
                              onChange={(e) => setCustomPrimaryColor(e.target.value)}
                              className="w-8 h-8 p-0 border-0 rounded cursor-pointer shrink-0 outline-none"
                            />
                            <input 
                              type="text" 
                              value={customPrimaryColor}
                              onChange={(e) => setCustomPrimaryColor(e.target.value)}
                              className="w-20 min-w-0 px-2 py-1.5 bg-black border border-white/10 focus:border-blue-500/50 hover:border-white/20 rounded outline-none transition-all text-xs font-mono text-white tracking-widest"
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 mt-2">
                            {t.customGradientColor}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={activeCustomGradientColor}
                              onChange={(e) => setCustomGradientColor(e.target.value)}
                              className="w-8 h-8 p-0 border-0 rounded cursor-pointer shrink-0 outline-none"
                              disabled={!themeGradient}
                            />
                            <input 
                              type="text" 
                              value={activeCustomGradientColor}
                              onChange={(e) => setCustomGradientColor(e.target.value)}
                              disabled={!themeGradient}
                              className="w-20 min-w-0 px-2 py-1.5 bg-black border border-white/10 focus:border-blue-500/50 hover:border-white/20 rounded outline-none transition-all text-xs font-mono text-white tracking-widest disabled:opacity-50"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-4 w-full">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 mt-2">
                            {t.customBgMain}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={activeCustomBgMain}
                              onChange={(e) => setCustomBgMain(e.target.value)}
                              className="w-8 h-8 p-0 border-0 rounded cursor-pointer shrink-0 outline-none"
                            />
                            <input 
                              type="text" 
                              value={activeCustomBgMain}
                              onChange={(e) => setCustomBgMain(e.target.value)}
                              className="w-20 min-w-0 px-2 py-1.5 bg-black border border-white/10 focus:border-blue-500/50 hover:border-white/20 rounded outline-none transition-all text-xs font-mono text-white tracking-widest"
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 mt-2">
                            {t.customBgSidebar}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={activeCustomBgSidebar}
                              onChange={(e) => setCustomBgSidebar(e.target.value)}
                              className="w-8 h-8 p-0 border-0 rounded cursor-pointer shrink-0 outline-none"
                            />
                            <input 
                              type="text" 
                              value={activeCustomBgSidebar}
                              onChange={(e) => setCustomBgSidebar(e.target.value)}
                              className="w-20 min-w-0 px-2 py-1.5 bg-black border border-white/10 focus:border-blue-500/50 hover:border-white/20 rounded outline-none transition-all text-xs font-mono text-white tracking-widest"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-4 w-full">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 mt-2">
                            {t.customTextMain}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={activeCustomTextMain}
                              onChange={(e) => setCustomTextMain(e.target.value)}
                              className="w-8 h-8 p-0 border-0 rounded cursor-pointer shrink-0 outline-none"
                            />
                            <input 
                              type="text" 
                              value={activeCustomTextMain}
                              onChange={(e) => setCustomTextMain(e.target.value)}
                              className="w-20 min-w-0 px-2 py-1.5 bg-black border border-white/10 focus:border-blue-500/50 hover:border-white/20 rounded outline-none transition-all text-xs font-mono text-white tracking-widest"
                            />
                          </div>
                        </div>
                        <div className="flex-1"></div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeSettingsTab === 'data' && (
                <div className="space-y-4">
                  <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-sm text-gray-300">
                    <p className="mb-4 text-xs">
                      {lang === 'zh' ? '您可以在这里导出和导入您的本地设置配置（不包含敏感的 API Key 等）。' : 'You can import and export your local settings here (excluding sensitive info).'}
                    </p>
                    <div className="flex gap-2">
                      <label 
                        className="flex-1 flex justify-center bg-white/10 hover:bg-white/20 text-white px-3 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-white/5"
                      >
                        <input 
                          type="file" 
                          accept=".json" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (e) => {
                              try {
                                const data = JSON.parse(e.target?.result as string);
                                if (data && typeof data === 'object') {
                                  if (data.themeColor) setThemeColor(data.themeColor);
                                  if (data.appName) setAppName(data.appName);
                                  if (data.appIcon) setAppIcon(data.appIcon);
                                  if (typeof data.autoRetry === 'boolean') setAutoRetry(data.autoRetry);
                                  if (data.sendModifier) setSendModifier(data.sendModifier);
                                  if (data.newlineModifier) setNewlineModifier(data.newlineModifier);
                                  if (data.lang) setLang(data.lang);
                                  if (data.themeMode) setThemeMode(data.themeMode);
                                  if (typeof data.themeGradient === 'boolean') setThemeGradient(data.themeGradient);
                                  if (data.customPrimaryColor) setCustomPrimaryColor(data.customPrimaryColor);
                                  
                                  if (data.customGradientColorDark) setCustomGradientColorDark(data.customGradientColorDark);
                                  if (data.customGradientColorLight) setCustomGradientColorLight(data.customGradientColorLight);
                                  if (data.customBgMainDark) setCustomBgMainDark(data.customBgMainDark);
                                  if (data.customBgMainLight) setCustomBgMainLight(data.customBgMainLight);
                                  if (data.customBgSidebarDark) setCustomBgSidebarDark(data.customBgSidebarDark);
                                  if (data.customBgSidebarLight) setCustomBgSidebarLight(data.customBgSidebarLight);
                                  if (data.customTextMainDark) setCustomTextMainDark(data.customTextMainDark);
                                  if (data.customTextMainLight) setCustomTextMainLight(data.customTextMainLight);
                                  
                                  // Fallback for old configs
                                  if (data.customGradientColor) setCustomGradientColor(data.customGradientColor);
                                  if (data.customBgMain) setCustomBgMain(data.customBgMain);
                                  if (data.customBgSidebar) setCustomBgSidebar(data.customBgSidebar);
                                  if (data.customTextMain) setCustomTextMain(data.customTextMain);
                                  alert(t.importSuccess);
                                }
                              } catch (err) {
                                alert(t.importError);
                              }
                            };
                            reader.readAsText(file);
                            e.target.value = '';
                          }} 
                        />
                        {t.importSettings}
                      </label>
                      <button
                        onClick={() => {
                          const config = {
                            themeColor, appName, appIcon, autoRetry, sendModifier, newlineModifier, lang, themeMode, themeGradient, 
                            customPrimaryColor, 
                            customGradientColorDark, customGradientColorLight, 
                            customBgMainDark, customBgMainLight, 
                            customBgSidebarDark, customBgSidebarLight, 
                            customTextMainDark, customTextMainLight
                          };
                          const dataStr = JSON.stringify(config, null, 2);
                          const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                          const exportFileDefaultName = `config_${new Date().toISOString().slice(0,10)}.json`;
                          const linkElement = document.createElement('a');
                          linkElement.setAttribute('href', dataUri);
                          linkElement.setAttribute('download', exportFileDefaultName);
                          linkElement.click();
                        }}
                        className="flex-1 flex justify-center bg-white/10 hover:bg-white/20 text-white px-3 py-2.5 rounded-lg text-xs font-bold transition-colors border border-white/5"
                      >
                        {t.exportSettings}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 bg-black/40 border-t border-white/5 flex gap-2 justify-end items-center">
              <button 
                onClick={() => {
                  setIsSettingsOpen(false);
                  setSettingsError('');
                }}
                className="bg-white hover:bg-gray-200 text-black px-6 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-lg"
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
