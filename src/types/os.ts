export type AppId =
  | 'thispc'
  | 'recyclebin'
  | 'store'
  | 'spotify'
  | 'edge'
  | 'vscode'
  | 'notepad'
  | 'terminal'
  | 'paint'
  | 'calculator'
  | 'copilot'
  | 'settings'
  | 'taskmanager'
  | 'photos'
  | 'installer'
  | 'pdfreader'
  | 'mediaplayer';

export type FileItemType =
  | 'app'
  | 'folder'
  | 'text'
  | 'html'
  | 'code'
  | 'audio'
  | 'video'
  | 'pdf'
  | 'image'
  | 'exe';

export interface PEBinaryInfo {
  isValidMZ: boolean;
  architecture: string;
  subsystem: string;
  hexPreview: string;
  extractedStrings: string[];
  webLaunchUrl?: string;
}

export interface PdfAnnotationItem {
  id: string;
  page: number;
  text: string;
  color: string;
  createdAt: string;
}

export interface FileVersionSnapshot {
  id: string;
  version: number;
  label: string;
  timestamp: string;
  content: string;
  featureHistory: string[];
}

export interface FileSystemItem {
  id: string;
  name: string;
  type: FileItemType;
  parentId: string;
  originalParentId?: string;
  appId?: AppId;
  content?: string;
  mediaUrl?: string;
  imageUrl?: string;
  audioUrl?: string;
  audioArtist?: string;
  mimeType?: string;
  customIconUrl?: string;
  exePreset?: 'stronghold' | 'custom_game' | 'custom_app' | 'arcade' | 'studio' | 'tool';
  peInfo?: PEBinaryInfo;
  pdfAnnotations?: PdfAnnotationItem[];
  featureHistory?: string[];
  previousContent?: string;
  versionSnapshots?: FileVersionSnapshot[];
  size: number;
  createdAt: string;
  updatedAt?: string;
  gridCol?: number;
  gridRow?: number;
}

export interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  coverUrl: string;
  audioUrl: string;
  isLiked?: boolean;
  isCustom?: boolean;
  addedAt?: string;
  source?: 'local' | 'itunes' | 'builtin' | 'audius' | 'ai';
  playlistId?: string;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  coverGradient: string;
  tracks: SpotifyTrack[];
  createdAt: string;
}

export interface CopilotTaskPlan {
  id: string;
  title: string;
  summary: string;
  steps: Array<{
    id: string;
    label: string;
    details?: string;
  }>;
  targetApp?: string;
  targetFile?: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  createdAt: string;
  proposedActions?: any[];
}

export type SnapPosition =
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'left-half'
  | 'right-half'
  | 'left-wide'
  | 'right-narrow'
  | 'col-left'
  | 'col-center'
  | 'col-right'
  | 'quad-tl'
  | 'quad-tr'
  | 'quad-bl'
  | 'quad-br'
  | 'left-two-thirds'
  | 'right-one-third'
  | 'right-top-third'
  | 'right-bottom-third'
  | 'center-focus';

export interface VirtualDesktop {
  id: string;
  name: string;
  accentColor: string;
  createdAt: string;
}

export interface WindowInstance {
  id: string;
  appId: AppId;
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  snapPosition?: SnapPosition;
  desktopId?: string;
  efficiencyMode?: boolean;
  zIndex: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  fileId?: string;
  folderId?: string;
}

export interface ActiveScreenSnapshot {
  windowId: string;
  appId: AppId;
  title: string;
  desktopId?: string;
  fileId?: string;
  fileName?: string;
  fileType?: FileItemType;
  contentPreview?: string;
  fullContent?: string;
  imageUrl?: string;
  summary: string;
  capturedAt: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: 'Administrator' | 'Standard User';
  password?: string;
  avatarColor: string;
}

export interface OSNotification {
  id: string;
  title: string;
  message: string;
  appName?: string;
  appId?: AppId;
  timestamp: string;
  read?: boolean;
}

export interface CopilotChatCustomization {
  assistantName: string;
  subtitle: string;
  welcomeMessage: string;
  accentColor: string;
  chatBgColor: string;
  userBubbleColor: string;
  aiBubbleColor: string;
  fontScale: 'compact' | 'normal' | 'large';
  customBannerHtml?: string;
  customCss?: string;
  quickPrompts?: Array<{ label: string; prompt: string }>;
  aiMode?: 'default' | 'plan';
  noEmojisInWebsites?: boolean;
  customInstructions?: string;
  outputDirectory?: string;
}

export interface SystemAppMod {
  appId: AppId;
  customTitle?: string;
  accentColor?: string;
  headerBgColor?: string;
  bannerText?: string;
  customCss?: string;
  customWidgetHtml?: string;
  fullOverrideHtml?: string;
  useFullOverride?: boolean;
  featureHistory?: string[];
  versionSnapshots?: FileVersionSnapshot[];
  updatedAt?: string;
}

export interface SystemSettings {
  theme: 'dark' | 'light';
  wallpaperId: string;
  customWallpaperCss?: string;
  customWallpaperUrl?: string;
  taskbarAlignment: 'center' | 'left';
  lockScreenWallpaperUrl?: string;
  lockScreenWallpaperId?: string;
  volume: number;
  isMuted: boolean;
  brightness: number;
  password?: string;
  requirePasswordOnSettings?: boolean;
  systemSounds?: boolean;
  soundEffectsEnabled?: boolean;
  doNotDisturb?: boolean;
  accounts?: UserAccount[];
  activeAccountId?: string;
  currentAccountId?: string;
  customAppIcons?: Partial<Record<AppId, string>>;
  copilotConfig?: CopilotChatCustomization;
  systemAppMods?: Partial<Record<AppId, SystemAppMod>>;
  liveWallpaperId?: 'none' | 'fluent-aurora' | 'mica-waves' | 'cyber-matrix' | 'starfield-3d';
  accentColor?: string;
  taskbarStyle?:
    | 'default'
    | 'mica'
    | 'acrylic'
    | 'floating'
    | 'glass-center'
    | 'compact'
    | 'transparent'
    | 'solid';
  pinnedTaskbarApps?: AppId[];
  cloudSyncEnabled?: boolean;
  lastCloudSyncAt?: string;
  wifiEnabled?: boolean;
  bluetoothEnabled?: boolean;
  nightLight?: boolean;
  airplaneMode?: boolean;
  batterySaver?: boolean;
  desktopIconsVisible?: boolean;
  desktopIconSize?: 'small' | 'medium' | 'large';
  taskbarAutoHide?: boolean;
  virtualDesktops?: VirtualDesktop[];
  activeDesktopId?: string;
}

export interface OSClipboard {
  ids: string[];
  mode: 'copy' | 'cut';
}

export interface AppDefinition {
  id: AppId;
  name: string;
  category: 'System' | 'Productivity' | 'Media' | 'Development' | 'Utilities';
  description: string;
  defaultSize: { width: number; height: number };
  pinnedToTaskbar?: boolean;
  pinnedToStart?: boolean;
}

export interface ChatAttachment {
  id: string;
  name: string;
  mimeType: string;
  kind: 'image' | 'code' | 'text';
  dataUrl?: string;
  textContent?: string;
}

export interface AIMemoryItem {
  id: string;
  category: 'project' | 'preference' | 'fact';
  summary: string;
  targetId?: string;
  targetName?: string;
  updatedAt: string;
}

export interface AIContextualMemory {
  preferredLanguage: 'ar' | 'en';
  voiceTtsEnabled: boolean;
  maxContextChars?: number;
  usedContextChars?: number;
  lastEditedFileId?: string;
  lastEditedFileName?: string;
  lastEditedFolderId?: string;
  lastEditedAppId?: AppId;
  cumulativeContextLog?: string;
  items: AIMemoryItem[];
}
