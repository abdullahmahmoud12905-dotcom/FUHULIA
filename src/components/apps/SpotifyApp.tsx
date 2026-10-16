import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Heart,
  Upload,
  Plus,
  Search,
  Music,
  Globe,
  Trash2,
  Repeat,
  Shuffle,
  Disc,
  Check,
  ListMusic,
  Sliders,
  Clock,
  Home,
  Sparkles,
  Radio,
  Minimize2,
  Maximize2,
  MoreHorizontal,
  Flame,
  Send,
  CheckCircle2,
  ListPlus,
  ArrowUpDown,
  Share2,
  X,
  FolderPlus,
} from 'lucide-react';
import { SpotifyTrack } from '../../types/os';
import {
  CustomPlaylist,
  FULL_LENGTH_CATALOG,
  loadSavedPlaylists,
  savePlaylists,
  globalProceduralEngine,
  MusicGenrePreset,
  searchRealSongs,
} from '../../utils/spotifyAudioEngine';

interface SpotifyAppProps {
  tracks: SpotifyTrack[];
  initialTrackId?: string;
  systemVolume?: number;
  systemMuted?: boolean;
  onSystemVolumeChange?: (volume: number, isMuted: boolean) => void;
  onAddTrack: (track: Omit<SpotifyTrack, 'id' | 'addedAt'>) => SpotifyTrack;
  onToggleLike: (id: string) => void;
  onDeleteTrack: (id: string) => void;
  onSaveTrackToDesktop: (track: SpotifyTrack) => void;
}

interface ItunesSearchResult {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  previewUrl: string;
  artworkUrl100: string;
  trackTimeMillis: number;
}

const FEATURED_MIXES = [
  {
    id: 'mix-1',
    title: 'Global Top Hits 2026',
    subtitle: 'The Weeknd, Dua Lipa, Daft Punk & more',
    query: 'The Weeknd',
    coverUrl:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80',
    genre: 'synthwave' as MusicGenrePreset,
  },
  {
    id: 'mix-2',
    title: 'Arabic Trending & Classics',
    subtitle: 'Amr Diab, Cairokee, Wegz & Instrumental',
    query: 'Amr Diab',
    coverUrl:
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80',
    genre: 'arabic' as MusicGenrePreset,
  },
  {
    id: 'mix-3',
    title: 'Night Drive Synthwave',
    subtitle: 'Electronic beats & late night retro vibes',
    query: 'Synthwave',
    coverUrl:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80',
    genre: 'synthwave' as MusicGenrePreset,
  },
  {
    id: 'mix-4',
    title: 'Coding & Deep Focus Lo-Fi',
    subtitle: 'Instrumental Lo-Fi, Piano & Ambient beats',
    query: 'Lofi Beats',
    coverUrl:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80',
    genre: 'lofi' as MusicGenrePreset,
  },
];

const PRESET_GRADIENTS = [
  { name: 'Emerald Forest', class: 'from-emerald-600 via-teal-800 to-zinc-950' },
  { name: 'Cyber Purple', class: 'from-purple-700 via-indigo-900 to-zinc-950' },
  { name: 'Sunset Crimson', class: 'from-rose-600 via-red-900 to-zinc-950' },
  { name: 'Electric Cyan', class: 'from-sky-500 via-blue-900 to-zinc-950' },
  { name: 'Golden Amber', class: 'from-amber-600 via-orange-900 to-zinc-950' },
];

export const SpotifyApp: React.FC<SpotifyAppProps> = ({
  tracks,
  initialTrackId,
  systemVolume = 80,
  systemMuted = false,
  onSystemVolumeChange,
  onAddTrack,
  onToggleLike,
  onDeleteTrack,
  onSaveTrackToDesktop,
}) => {
  // Navigation & View Modes
  const [activeTab, setActiveTab] = useState<
    'home' | 'library' | 'liked' | 'custom' | 'discover' | 'playlists' | 'queue' | 'dj'
  >('home');
  const [isMiniPlayer, setIsMiniPlayer] = useState<boolean>(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  // Playback State
  const [currentTrackId, setCurrentTrackId] = useState<string>(
    initialTrackId || tracks[0]?.id || 'full-1'
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(240);
  const [localVolume, setLocalVolume] = useState<number>(systemVolume / 100);
  const [localMuted, setLocalMuted] = useState<boolean>(systemMuted);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [eqPreset, setEqPreset] = useState<'Flat' | 'Bass Boost' | 'Vocal' | 'Electronic'>('Flat');
  const [showNowPlayingSidebar, setShowNowPlayingSidebar] = useState<boolean>(true);
  const [filterQuery, setFilterQuery] = useState<string>('');

  // Continuous Full Song Mode (Eliminates the 30s cutoff!)
  const [isContinuousMode, setIsContinuousMode] = useState<boolean>(true);

  // Custom Playlists & Queue State
  const [playlists, setPlaylists] = useState<CustomPlaylist[]>(() => loadSavedPlaylists());
  const [queue, setQueue] = useState<string[]>([]);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState<boolean>(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState<string>('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState<string>('');
  const [newPlaylistGradient, setNewPlaylistGradient] = useState<string>(PRESET_GRADIENTS[0].class);
  const [playlistActionTrackId, setPlaylistActionTrackId] = useState<string | null>(null);

  // Online Real Song Search (Audius, iTunes & Full Streams)
  const [onlineQuery, setOnlineQuery] = useState<string>('Amr Diab');
  const [onlineResults, setOnlineResults] = useState<SpotifyTrack[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState<boolean>(false);
  const [addedOnlineIds, setAddedOnlineIds] = useState<string[]>([]);

  // Spotify Copilot & AI DJ State
  const [aiDjPrompt, setAiDjPrompt] = useState<string>('');
  const [isGeneratingDj, setIsGeneratingDj] = useState<boolean>(false);
  const [djCommentary, setDjCommentary] = useState<string>(
    'مرحباً بك في Spotify AI DJ! اضغط على أحد أمزجة الاستماع أو اطلب ميكساً مخصصاً لتجهيزه فوراً بدون انقطاع.'
  );
  const [djGeneratedMix, setDjGeneratedMix] = useState<{
    title: string;
    description: string;
    themeColor: string;
    suggestedTracks: Array<{
      title: string;
      artist: string;
      genre: string;
      duration: number;
    }>;
  } | null>(null);

  // Add by URL Modal
  const [showUrlModal, setShowUrlModal] = useState<boolean>(false);
  const [urlTitle, setUrlTitle] = useState<string>('');
  const [urlArtist, setUrlArtist] = useState<string>('');
  const [urlAudio, setUrlAudio] = useState<string>('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const proceduralTimerRef = useRef<number | null>(null);

  // Combine built-in full tracks with prop tracks and avoid duplicate IDs
  const combinedTracks = useMemo(() => {
    const map = new Map<string, SpotifyTrack>();
    // First, seed with FULL_LENGTH_CATALOG
    FULL_LENGTH_CATALOG.forEach((t) => map.set(t.id, t));
    // Overlay user tracks
    tracks.forEach((t) => map.set(t.id, t));
    return Array.from(map.values());
  }, [tracks]);

  // Sync with Windows 11 System Taskbar Volume & Mute in real time
  useEffect(() => {
    setLocalVolume(Math.max(0, Math.min(1, systemVolume / 100)));
  }, [systemVolume]);

  useEffect(() => {
    setLocalMuted(systemMuted);
  }, [systemMuted]);

  const effectiveVolume = useMemo(() => {
    if (systemMuted || localMuted) return 0;
    return Math.max(0, Math.min(1, localVolume));
  }, [systemMuted, localMuted, localVolume]);

  const currentTrack = useMemo(() => {
    return combinedTracks.find((t) => t.id === currentTrackId) || combinedTracks[0];
  }, [combinedTracks, currentTrackId]);

  // If initialTrackId changes from external file open, play it
  useEffect(() => {
    if (initialTrackId && combinedTracks.some((t) => t.id === initialTrackId)) {
      setCurrentTrackId(initialTrackId);
      setIsPlaying(true);
    }
  }, [initialTrackId, combinedTracks]);

  // Determine musical genre preset for current track
  const currentGenrePreset = useMemo<MusicGenrePreset>(() => {
    if (!currentTrack) return 'synthwave';
    const text = `${currentTrack.title} ${currentTrack.artist} ${currentTrack.album}`.toLowerCase();
    if (text.includes('synth') || text.includes('wave') || text.includes('cyber') || text.includes('electro'))
      return 'synthwave';
    if (text.includes('lofi') || text.includes('lo-fi') || text.includes('study') || text.includes('focus'))
      return 'lofi';
    if (
      text.includes('cairo') ||
      text.includes('nile') ||
      text.includes('arab') ||
      text.includes('oud') ||
      text.includes('desert') ||
      text.includes('oasis')
    )
      return 'arabic';
    if (text.includes('workout') || text.includes('gym') || text.includes('energy') || text.includes('pulse'))
      return 'workout';
    if (text.includes('piano') || text.includes('classical') || text.includes('harmony'))
      return 'piano';
    return 'ambient';
  }, [currentTrack]);

  // Playback Engine Coordinator (Switches between native Audio Element & Procedural Continuous Audio)
  useEffect(() => {
    const audio = audioRef.current;
    if (!currentTrack) return;

    const hasRealAudioUrl = Boolean(currentTrack.audioUrl && currentTrack.audioUrl.trim());

    if (hasRealAudioUrl && audio) {
      // Real Audio Track (Local file, direct URL, or iTunes preview)
      globalProceduralEngine.stop();
      if (audio.src !== currentTrack.audioUrl) {
        audio.src = currentTrack.audioUrl;
        audio.load();
      }
      audio.volume = effectiveVolume;
      audio.playbackRate = playbackRate;
      if (isPlaying) {
        audio.play().catch(() => {
          // If browser blocked or media failed, seamlessly activate procedural engine
          globalProceduralEngine.start(currentGenrePreset);
        });
      } else {
        audio.pause();
      }
    } else {
      // Full Synthesized / Continuous Procedural Audio Engine
      if (audio) {
        audio.pause();
        audio.src = '';
      }
      globalProceduralEngine.setVolume(effectiveVolume);
      if (isPlaying) {
        globalProceduralEngine.start(currentGenrePreset);
      } else {
        globalProceduralEngine.stop();
      }
    }
  }, [currentTrack, isPlaying, currentGenrePreset]);

  // Sync volume with both engines
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = effectiveVolume;
    }
    globalProceduralEngine.setVolume(effectiveVolume);
  }, [effectiveVolume]);

  // Sync playback rate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Continuous Progress Tracker for Full-Length Procedural Tracks
  useEffect(() => {
    if (!isPlaying) {
      if (proceduralTimerRef.current !== null) {
        window.clearInterval(proceduralTimerRef.current);
        proceduralTimerRef.current = null;
      }
      return;
    }

    const hasRealAudio = Boolean(currentTrack?.audioUrl && currentTrack.audioUrl.trim());

    if (!hasRealAudio) {
      const trackMax = currentTrack?.duration || 240;
      setDuration(trackMax);

      proceduralTimerRef.current = window.setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 1;
          if (next >= trackMax) {
            if (isRepeat) return 0;
            handleNext();
            return 0;
          }
          return next;
        });
      }, 1000);

      return () => {
        if (proceduralTimerRef.current !== null) {
          window.clearInterval(proceduralTimerRef.current);
          proceduralTimerRef.current = null;
        }
      };
    }
  }, [isPlaying, currentTrack, isRepeat]);

  // Seamless Bridge for Online 30-Second Previews:
  // When an online preview ends and isContinuousMode is on, continue into procedural companion music!
  const handleAudioEnded = () => {
    if (isRepeat && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      return;
    }

    if (isContinuousMode && currentTrack?.source === 'itunes') {
      // Transition smoothly into infinite procedural companion music so music never abruptly stops
      globalProceduralEngine.start(currentGenrePreset);
      return;
    }

    handleNext();
  };

  // Next Track Logic (Considers Queue first, then Shuffle, then Sequential)
  const handleNext = () => {
    if (queue.length > 0) {
      const nextId = queue[0];
      setQueue((prev) => prev.slice(1));
      setCurrentTrackId(nextId);
      setCurrentTime(0);
      setIsPlaying(true);
      return;
    }

    if (combinedTracks.length === 0) return;
    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * combinedTracks.length);
      setCurrentTrackId(combinedTracks[randomIndex].id);
      setCurrentTime(0);
      setIsPlaying(true);
      return;
    }

    const idx = combinedTracks.findIndex((t) => t.id === currentTrackId);
    const nextIdx = (idx + 1) % combinedTracks.length;
    setCurrentTrackId(combinedTracks[nextIdx].id);
    setCurrentTime(0);
    setIsPlaying(true);
  };

  // Previous Track Logic
  const handlePrev = () => {
    if (combinedTracks.length === 0) return;
    const idx = combinedTracks.findIndex((t) => t.id === currentTrackId);
    const prevIdx = (idx - 1 + combinedTracks.length) % combinedTracks.length;
    setCurrentTrackId(combinedTracks[prevIdx].id);
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const handlePlayTrack = (trackId: string) => {
    if (currentTrackId === trackId) {
      setIsPlaying((prev) => !prev);
    } else {
      setCurrentTrackId(trackId);
      setCurrentTime(0);
      setIsPlaying(true);
    }
  };

  // Add Track Directly to Queue (Play Next or At End)
  const handleAddToQueue = (trackId: string, playNext = false) => {
    setQueue((prev) => {
      if (playNext) return [trackId, ...prev.filter((id) => id !== trackId)];
      return [...prev.filter((id) => id !== trackId), trackId];
    });
  };

  const handleRemoveFromQueue = (index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearQueue = () => {
    setQueue([]);
  };

  // Playlist Management
  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistTitle.trim()) return;

    const newPl: CustomPlaylist = {
      id: `pl-${Date.now()}`,
      title: newPlaylistTitle.trim(),
      description: newPlaylistDesc.trim() || 'قائمة تشغيل مخصصة في Spotify Windows 11',
      coverGradient: newPlaylistGradient,
      coverEmoji: '🎵',
      trackIds: [],
      createdAt: new Date().toISOString().slice(0, 10),
    };

    const updated = [newPl, ...playlists];
    setPlaylists(updated);
    savePlaylists(updated);
    setNewPlaylistTitle('');
    setNewPlaylistDesc('');
    setShowCreatePlaylistModal(false);
    setSelectedPlaylistId(newPl.id);
    setActiveTab('playlists');
  };

  const handleDeletePlaylist = (playlistId: string) => {
    const updated = playlists.filter((p) => p.id !== playlistId);
    setPlaylists(updated);
    savePlaylists(updated);
    if (selectedPlaylistId === playlistId) {
      setSelectedPlaylistId(null);
      setActiveTab('home');
    }
  };

  const handleToggleTrackInPlaylist = (playlistId: string, trackId: string) => {
    const updated = playlists.map((p) => {
      if (p.id !== playlistId) return p;
      const exists = p.trackIds.includes(trackId);
      const nextTrackIds = exists
        ? p.trackIds.filter((id) => id !== trackId)
        : [...p.trackIds, trackId];
      return { ...p, trackIds: nextTrackIds };
    });
    setPlaylists(updated);
    savePlaylists(updated);
  };

  // Online Real Song Search
  const searchOnlineCatalog = async (query: string) => {
    if (!query.trim()) return;
    setIsSearchingOnline(true);
    try {
      const results = await searchRealSongs(query.trim());
      setOnlineResults(results);
    } catch {
      setOnlineResults([]);
    } finally {
      setIsSearchingOnline(false);
    }
  };

  const handlePlayOnlineItem = (item: SpotifyTrack) => {
    const existing = combinedTracks.find(
      (t) => t.id === item.id || (t.audioUrl && t.audioUrl === item.audioUrl)
    );
    if (existing) {
      setCurrentTrackId(existing.id);
      setIsPlaying(true);
      return;
    }

    const added = onAddTrack({
      title: item.title,
      artist: item.artist,
      album: item.album || 'Online Stream',
      duration: item.duration || 210,
      audioUrl: item.audioUrl,
      coverUrl: item.coverUrl,
      isLiked: true,
      isCustom: true,
      source: item.source || 'audius',
    });

    setAddedOnlineIds((prev) => [...prev, item.id]);
    setCurrentTrackId(added.id);
    setIsPlaying(true);
  };

  // Spotify Copilot & AI DJ Generator
  const handleGenerateAiDjPlaylist = async (customPrompt?: string) => {
    const query = (customPrompt || aiDjPrompt).trim();
    if (!query && !customPrompt) return;

    setIsGeneratingDj(true);
    setDjCommentary('جاري استدعاء Spotify Copilot لتحليل الأجواء وتنسيق ميكس متكامل لأغانٍ حقيقية...');

    try {
      const res = await fetch('/api/spotify/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query, mood: query }),
      });
      const data = await res.json();

      setDjCommentary(data.djCommentary || 'إليك ميكس مخصص لك بعناية فائقة من أغانٍ حقيقية.');
      setDjGeneratedMix(data);
    } catch {
      // Offline fallback with real famous tracks
      setDjCommentary('تم توليد ميكس هادئ ومناسب لأجواء الاستماع من أروع الأغاني الحقيقية.');
      setDjGeneratedMix({
        title: `DJ Mix: ${query}`,
        description: 'قائمة ذكية متكاملة ومولدة بدون انقطاع لأفضل الأغاني الحقيقية.',
        themeColor: 'from-emerald-900 via-teal-900 to-zinc-950',
        suggestedTracks: [
          { title: 'نور العين (Nour El Ain)', artist: 'عمرو دياب (Amr Diab)', genre: 'Arabic', duration: 179 },
          { title: 'كان لك معايا', artist: 'كايروكي (Cairokee)', genre: 'Rock', duration: 225 },
          { title: 'يا ستار', artist: 'محمد حماقي', genre: 'Arabic Pop', duration: 225 },
          { title: 'Save Your Tears', artist: 'The Weeknd', genre: 'Pop', duration: 278 },
          { title: 'Clocks', artist: 'Coldplay', genre: 'Alternative', duration: 322 },
        ],
      });
    } finally {
      setIsGeneratingDj(false);
    }
  };

  const handleApplyAiDjMixToLibrary = async () => {
    if (!djGeneratedMix) return;

    setIsGeneratingDj(true);
    setDjCommentary('جاري استخراج وربط ملفات البث الصوتي الحقيقية لكل مسار...');

    const newTrackIds: string[] = [];

    for (const st of djGeneratedMix.suggestedTracks) {
      const existing = combinedTracks.find(
        (t) =>
          t.title.toLowerCase() === st.title.toLowerCase() &&
          Boolean(t.audioUrl && t.audioUrl.trim())
      );
      if (existing) {
        newTrackIds.push(existing.id);
      } else {
        let streamUrl = '';
        let cover =
          'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80';
        let dur = st.duration || 210;

        try {
          const found = await searchRealSongs(`${st.title} ${st.artist}`);
          if (found[0] && found[0].audioUrl) {
            streamUrl = found[0].audioUrl;
            cover = found[0].coverUrl;
            dur = found[0].duration;
          }
        } catch (_) {}

        if (!streamUrl) {
          const cat = FULL_LENGTH_CATALOG[Math.floor(Math.random() * FULL_LENGTH_CATALOG.length)];
          streamUrl = cat.audioUrl;
          cover = cat.coverUrl;
          dur = cat.duration;
        }

        const added = onAddTrack({
          title: st.title,
          artist: st.artist,
          album: djGeneratedMix.title,
          duration: dur,
          audioUrl: streamUrl,
          coverUrl: cover,
          isLiked: true,
          isCustom: true,
          source: 'audius',
        });
        newTrackIds.push(added.id);
      }
    }

    const newPl: CustomPlaylist = {
      id: `pl-dj-${Date.now()}`,
      title: djGeneratedMix.title,
      description: djGeneratedMix.description,
      coverGradient: djGeneratedMix.themeColor || 'from-emerald-600 via-teal-800 to-zinc-950',
      coverEmoji: '✨',
      trackIds: newTrackIds,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    const updated = [newPl, ...playlists];
    setPlaylists(updated);
    savePlaylists(updated);
    setSelectedPlaylistId(newPl.id);
    setActiveTab('playlists');
    setIsGeneratingDj(false);

    if (newTrackIds.length > 0) {
      setCurrentTrackId(newTrackIds[0]);
      setIsPlaying(true);
    }
  };

  // Broadcast media status to Windows 11 Taskbar Hover Preview
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('win11-media-status', {
        detail: {
          appId: 'spotify',
          isPlaying,
          title: currentTrack?.title || 'Spotify Music',
          artist: currentTrack?.artist || 'Spotify',
          coverUrl: currentTrack?.coverUrl || '',
          currentTime,
          duration: duration || currentTrack?.duration || 240,
        },
      })
    );
  }, [isPlaying, currentTrack, currentTime, duration]);

  // Seeking handler
  const handleSeek = (val: number) => {
    setCurrentTime(val);
    if (audioRef.current && audioRef.current.src) {
      audioRef.current.currentTime = val;
    }
  };

  // Listen for remote transport commands from Windows 11 Taskbar & Notification Center
  useEffect(() => {
    const onMediaCmd = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.appId !== 'spotify') return;
      if (detail.action === 'toggle') {
        setIsPlaying((prev) => !prev);
      } else if (detail.action === 'play') {
        setIsPlaying(true);
      } else if (detail.action === 'pause') {
        setIsPlaying(false);
      } else if (detail.action === 'next') {
        handleNext();
      } else if (detail.action === 'prev') {
        handlePrev();
      } else if (detail.action === 'seek' && typeof detail.time === 'number') {
        handleSeek(detail.time);
      } else if (detail.action === 'volume' && typeof detail.volume === 'number') {
        handleVolumeSliderChange(detail.volume);
      } else if (detail.action === 'toggleLike') {
        if (currentTrack) {
          onToggleLike(currentTrack.id);
        }
      } else if (detail.action === 'playTrack' && detail.trackId) {
        setCurrentTrackId(detail.trackId);
        setIsPlaying(true);
      }
    };
    window.addEventListener('win11-media-command', onMediaCmd);
    return () => window.removeEventListener('win11-media-command', onMediaCmd);
  }, [combinedTracks, currentTrackId, isShuffle, queue, currentTrack, onToggleLike]);

  // Listen for playlist updates from Copilot AI (Mini Chat or Sidebar)
  useEffect(() => {
    const onPlaylistsUpdated = () => {
      setPlaylists(loadSavedPlaylists());
    };
    window.addEventListener('win11-spotify-playlists-updated', onPlaylistsUpdated);
    window.addEventListener('storage', onPlaylistsUpdated);
    return () => {
      window.removeEventListener('win11-spotify-playlists-updated', onPlaylistsUpdated);
      window.removeEventListener('storage', onPlaylistsUpdated);
    };
  }, []);

  // Volume slider handler
  const handleVolumeSliderChange = (newVal: number) => {
    const clamped = Math.max(0, Math.min(1, newVal));
    setLocalVolume(clamped);
    setLocalMuted(clamped === 0);
    if (onSystemVolumeChange) {
      onSystemVolumeChange(Math.round(clamped * 100), clamped === 0);
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !(systemMuted || localMuted);
    setLocalMuted(nextMuted);
    if (onSystemVolumeChange) {
      onSystemVolumeChange(Math.round(localVolume * 100), nextMuted);
    }
  };

  // Upload real local audio files (.mp3, .wav, .ogg, .m4a)
  const handleUploadAudioFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, index) => {
      const objectUrl = URL.createObjectURL(file);
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
      const tempAudio = new Audio(objectUrl);

      tempAudio.addEventListener('loadedmetadata', () => {
        const added = onAddTrack({
          title: cleanTitle,
          artist: 'Local Audio File',
          album: 'Imported from PC',
          duration: Math.round(tempAudio.duration) || 210,
          audioUrl: objectUrl,
          coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80',
          isLiked: true,
          isCustom: true,
          source: 'local',
        });
        if (index === 0) {
          setCurrentTrackId(added.id);
          setIsPlaying(true);
        }
      });
    });

    e.target.value = '';
  };

  // Add via Direct URL
  const handleAddUrlSong = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlTitle.trim() || !urlAudio.trim()) return;

    const added = onAddTrack({
      title: urlTitle.trim(),
      artist: urlArtist.trim() || 'Custom Stream',
      album: 'Direct Full Audio URL',
      duration: 240,
      audioUrl: urlAudio.trim(),
      coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80',
      isLiked: true,
      isCustom: true,
      source: 'local',
    });

    setCurrentTrackId(added.id);
    setIsPlaying(true);
    setUrlTitle('');
    setUrlArtist('');
    setUrlAudio('');
    setShowUrlModal(false);
  };

  const formatTime = (sec: number) => {
    if (!Number.isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const displayedTracks = useMemo(() => {
    let list = combinedTracks;
    if (activeTab === 'liked') {
      list = combinedTracks.filter((t) => t.isLiked);
    } else if (activeTab === 'custom') {
      list = combinedTracks.filter((t) => t.isCustom);
    } else if (activeTab === 'playlists' && selectedPlaylistId) {
      const pl = playlists.find((p) => p.id === selectedPlaylistId);
      list = pl ? combinedTracks.filter((t) => pl.trackIds.includes(t.id)) : [];
    }

    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          t.album.toLowerCase().includes(q)
      );
    }
    return list;
  }, [combinedTracks, activeTab, selectedPlaylistId, playlists, filterQuery]);

  const activePlaylistObj = useMemo(() => {
    return playlists.find((p) => p.id === selectedPlaylistId) || null;
  }, [playlists, selectedPlaylistId]);

  const nextTrackInQueue = useMemo(() => {
    if (queue.length > 0) {
      return combinedTracks.find((t) => t.id === queue[0]) || null;
    }
    const idx = combinedTracks.findIndex((t) => t.id === currentTrackId);
    if (idx >= 0 && idx < combinedTracks.length - 1) {
      return combinedTracks[idx + 1];
    }
    return combinedTracks[0] || null;
  }, [queue, combinedTracks, currentTrackId]);

  /* ==========================================================================
   * 1. COMPACT MINI PLAYER VIEW (المشغل المصغر المدمج للخلفية)
   * ======================================================================== */
  if (isMiniPlayer) {
    return (
      <div className="flex flex-col h-full bg-[#0a0a0a] text-zinc-100 select-none p-3 justify-between font-sans border border-zinc-800/80 rounded-xl shadow-2xl relative overflow-hidden">
        {/* Dynamic Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1ed760] via-teal-400 to-[#1ed760]" />

        {/* Top Header Row with Expand Button */}
        <div className="flex items-center justify-between text-xs pb-1 border-b border-zinc-800/60">
          <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
            <Radio className="w-3.5 h-3.5 text-[#1ed760] animate-pulse" />
            <span>Spotify Mini Player</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMiniPlayer(false)}
              className="p-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white transition-colors"
              title="Expand to Full View (العودة للواجهة الكاملة)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Center Media Card */}
        <div className="flex items-center gap-3 my-2">
          {currentTrack?.coverUrl && currentTrack.coverUrl.startsWith('http') ? (
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className="w-14 h-14 rounded-lg object-cover shadow-lg border border-zinc-800 shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-900 flex items-center justify-center shrink-0 shadow-lg">
              <Music className="w-6 h-6 text-white" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <h4 className="text-xs font-bold text-white truncate" title={currentTrack?.title}>
                {currentTrack?.title || 'No Track Playing'}
              </h4>
              <button
                onClick={() => currentTrack && onToggleLike(currentTrack.id)}
                className={`p-1 shrink-0 ${
                  currentTrack?.isLiked ? 'text-[#1ed760]' : 'text-zinc-500 hover:text-white'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${currentTrack?.isLiked ? 'fill-current' : ''}`} />
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 truncate">{currentTrack?.artist || 'Spotify'}</p>

            {nextTrackInQueue && (
              <p className="text-[9px] text-[#1ed760]/80 truncate mt-0.5">
                Next: {nextTrackInQueue.title}
              </p>
            )}
          </div>
        </div>

        {/* Scrub Progress Bar */}
        <div className="space-y-1">
          <input
            type="range"
            min={0}
            max={duration || currentTrack?.duration || 240}
            step={0.5}
            value={Math.min(currentTime, duration || currentTrack?.duration || 240)}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setCurrentTime(val);
              if (audioRef.current && audioRef.current.src) {
                audioRef.current.currentTime = val;
              }
            }}
            className="w-full accent-[#1ed760] h-1 bg-zinc-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-zinc-400 font-mono tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration || currentTrack?.duration || 240)}</span>
          </div>
        </div>

        {/* Transport Controls & Volume */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsShuffle((s) => !s)}
              className={`p-1 ${isShuffle ? 'text-[#1ed760]' : 'text-zinc-500 hover:text-white'}`}
            >
              <Shuffle className="w-3 h-3" />
            </button>
            <button onClick={handlePrev} className="p-1 text-zinc-300 hover:text-white">
              <SkipBack className="w-3.5 h-3.5 fill-current" />
            </button>
            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="w-7 h-7 rounded-full bg-[#1ed760] hover:bg-[#3be477] text-black flex items-center justify-center transition-transform hover:scale-105"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>
            <button onClick={handleNext} className="p-1 text-zinc-300 hover:text-white">
              <SkipForward className="w-3.5 h-3.5 fill-current" />
            </button>
            <button
              onClick={() => setIsRepeat((r) => !r)}
              className={`p-1 ${isRepeat ? 'text-[#1ed760]' : 'text-zinc-500 hover:text-white'}`}
            >
              <Repeat className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button onClick={handleToggleMute} className="text-zinc-400 hover:text-white">
              {effectiveVolume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={effectiveVolume}
              onChange={(e) => handleVolumeSliderChange(parseFloat(e.target.value))}
              className="w-14 accent-[#1ed760] h-1 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          onTimeUpdate={() => {
            if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
          }}
          onLoadedMetadata={() => {
            if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
              setDuration(audioRef.current.duration);
            }
          }}
          onEnded={handleAudioEnded}
        />
      </div>
    );
  }

  /* ==========================================================================
   * 2. FULL SPOTIFY DESKTOP WINDOW LAYOUT
   * ======================================================================== */
  return (
    <div className="flex flex-col h-full bg-[#000000] text-zinc-100 select-none p-2 gap-2 font-sans relative">
      {/* Hidden Real Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
            setDuration(audioRef.current.duration);
          }
        }}
        onEnded={handleAudioEnded}
      />

      {/* Hidden File Input for Local MP3/WAV Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac"
        multiple
        className="hidden"
        onChange={handleUploadAudioFiles}
      />

      {/* Main 3-Panel Spotify Layout */}
      <div className="flex-1 flex min-h-0 gap-2">
        {/* ====================================================================
         * LEFT SIDEBAR: Library & Navigation & Playlists
         * ================================================================== */}
        <div className="w-64 bg-[#121212] rounded-xl p-3 flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="space-y-4">
            {/* Primary Navigation */}
            <div className="space-y-1 pb-3 border-b border-zinc-800/80">
              <button
                onClick={() => {
                  setActiveTab('home');
                  setSelectedPlaylistId(null);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  activeTab === 'home'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <Home
                  className={`w-4 h-4 ${
                    activeTab === 'home' ? 'text-[#1ed760]' : 'text-zinc-400'
                  }`}
                />
                <span>Home (الرئيسية)</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('discover');
                  setSelectedPlaylistId(null);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  activeTab === 'discover'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <Search
                  className={`w-4 h-4 ${
                    activeTab === 'discover' ? 'text-[#1ed760]' : 'text-zinc-400'
                  }`}
                />
                <span>Search &amp; Stream</span>
              </button>

              {/* Copilot AI DJ Tab */}
              <button
                onClick={() => {
                  setActiveTab('dj');
                  setSelectedPlaylistId(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'dj'
                    ? 'bg-gradient-to-r from-emerald-950 to-teal-900 text-[#1ed760] border border-[#1ed760]/30 shadow-md'
                    : 'text-emerald-400 hover:text-white hover:bg-emerald-950/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#1ed760] animate-pulse" />
                  <span>Copilot AI DJ</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1ed760]/20 text-[#1ed760] font-mono">
                  PRO
                </span>
              </button>
            </div>

            {/* Library Section Header */}
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Disc className="w-4 h-4 text-[#1ed760]" />
                <span className="font-bold text-xs tracking-tight text-zinc-200">
                  Your Library (المكتبة)
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowCreatePlaylistModal(true)}
                  className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  title="Create New Playlist"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Core Library Items */}
            <div className="space-y-1">
              <button
                onClick={() => {
                  setActiveTab('library');
                  setSelectedPlaylistId(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'library'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Music className="w-4 h-4 text-[#1ed760]" />
                  <span>All Full Songs</span>
                </div>
                <span className="text-[11px] font-mono tabular-nums text-zinc-500">
                  {combinedTracks.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('liked');
                  setSelectedPlaylistId(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'liked'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded bg-gradient-to-br from-indigo-600 to-teal-300 flex items-center justify-center">
                    <Heart className="w-2.5 h-2.5 text-white fill-current" />
                  </div>
                  <span>Liked Songs</span>
                </div>
                <span className="text-[11px] font-mono tabular-nums text-zinc-500">
                  {combinedTracks.filter((t) => t.isLiked).length}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('queue');
                  setSelectedPlaylistId(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'queue'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ListMusic className="w-4 h-4 text-sky-400" />
                  <span>Queue (قائمة الانتظار)</span>
                </div>
                <span className="text-[11px] font-mono tabular-nums text-zinc-500">
                  {queue.length}
                </span>
              </button>
            </div>

            {/* Custom User Playlists List */}
            <div className="pt-2 border-t border-zinc-800/80 space-y-1">
              <div className="flex items-center justify-between px-2 pb-1 text-[11px] font-semibold text-zinc-400">
                <span>Playlists ({playlists.length})</span>
                <button
                  onClick={() => setShowCreatePlaylistModal(true)}
                  className="text-[#1ed760] hover:underline text-[10px]"
                >
                  + Create
                </button>
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {playlists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => {
                      setSelectedPlaylistId(pl.id);
                      setActiveTab('playlists');
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                      activeTab === 'playlists' && selectedPlaylistId === pl.id
                        ? 'bg-zinc-800 text-white font-bold'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm shrink-0">{pl.coverEmoji || '🎵'}</span>
                      <span className="truncate">{pl.title}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                      {pl.trackIds.length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Import & Direct Stream Actions */}
            <div className="pt-2 border-t border-zinc-800/80 space-y-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-full text-xs font-bold bg-[#1ed760] hover:bg-[#3be477] text-black transition-transform hover:scale-[1.01] cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Local Audio</span>
              </button>

              <button
                onClick={() => setShowUrlModal(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#1ed760]" />
                <span>Add Stream URL</span>
              </button>
            </div>
          </div>

          {/* Bottom Settings Card (Continuous Mode Toggle & Mini Mode) */}
          <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800/80 space-y-2 mt-4">
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-300">
              <span>Full Audio Mode</span>
              <button
                onClick={() => setIsContinuousMode((c) => !c)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  isContinuousMode ? 'bg-[#1ed760] text-black font-bold' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {isContinuousMode ? 'Continuous ON' : 'Standard'}
              </button>
            </div>

            <button
              onClick={() => setIsMiniPlayer(true)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
            >
              <Minimize2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Switch to Mini Player</span>
            </button>
          </div>
        </div>

        {/* ====================================================================
         * CENTER VIEWPORT (Home, Library, Playlists, Queue, DJ, Discover)
         * ================================================================== */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#121212] rounded-xl overflow-hidden">
          {/* TAB 1: AUTHENTIC SPOTIFY HOME */}
          {activeTab === 'home' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-7 bg-gradient-to-b from-emerald-950/50 via-[#121212] to-[#121212]">
              {/* Top Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('home')}
                    className="px-3.5 py-1.5 rounded-full bg-white text-black text-xs font-bold"
                  >
                    All
                  </button>
                  <button
                    onClick={() => setActiveTab('library')}
                    className="px-3.5 py-1.5 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-white text-xs font-medium transition-colors"
                  >
                    Full Songs ({combinedTracks.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('dj')}
                    className="px-3.5 py-1.5 rounded-full bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-300 text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Copilot AI DJ</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                      placeholder="Filter songs, artists..."
                      className="w-52 pl-8 pr-3 py-1.5 bg-[#242424] border border-zinc-700 rounded-full text-xs text-white focus:outline-none focus:border-white"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Copilot DJ Banner */}
              <div className="relative rounded-2xl overflow-hidden p-6 bg-gradient-to-r from-emerald-900 via-teal-900 to-zinc-900 border border-emerald-500/20 shadow-xl">
                <div className="relative z-10 max-w-xl space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1ed760]/20 text-[#1ed760] text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
                    <span>Spotify Copilot AI DJ</span>
                  </div>
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    استمع لأغانيك ومساراتك الكاملة بدون انقطاع الـ 30 ثانية
                  </h2>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    استمتع بمكتبة مسارات كاملة مدمجة، تحكم بقوائم التشغيل الخاصة، أو اطلب من AI DJ تنسيق قائمة فورية تناسب مزاجك الآن.
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={() => setActiveTab('dj')}
                      className="px-5 py-2 rounded-full bg-[#1ed760] hover:bg-[#3be477] text-black text-xs font-bold transition-transform hover:scale-105"
                    >
                      فتح Copilot DJ
                    </button>
                    <button
                      onClick={() => setShowCreatePlaylistModal(true)}
                      className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
                    >
                      + إنشاء قائمة تشغيل
                    </button>
                  </div>
                </div>
              </div>

              {/* Featured Mixes Grid */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Featured Full Mixes (مجموعات مختارة)
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {FEATURED_MIXES.map((mix) => (
                    <div
                      key={mix.id}
                      onClick={() => {
                        const matched = combinedTracks.find((t) =>
                          t.title.toLowerCase().includes(mix.query.toLowerCase())
                        );
                        if (matched) {
                          handlePlayTrack(matched.id);
                        } else {
                          handlePlayTrack(combinedTracks[0].id);
                        }
                      }}
                      className="group p-3.5 rounded-xl bg-[#181818] hover:bg-[#282828] transition-all duration-200 cursor-pointer flex flex-col justify-between border border-zinc-800/40 hover:border-zinc-700"
                    >
                      <div className="relative aspect-square w-full mb-3 rounded-lg overflow-hidden shadow-lg">
                        <img
                          src={mix.coverUrl}
                          alt={mix.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <button className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#1ed760] text-black flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 shadow-xl">
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </button>
                      </div>
                      <h4 className="text-xs font-bold text-white truncate">{mix.title}</h4>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1">{mix.subtitle}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Full Songs Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Full Tracks Library (أغاني ومسارات كاملة)
                  </h3>
                  <span className="text-xs text-zinc-400 font-mono">
                    {displayedTracks.length} Tracks Available
                  </span>
                </div>

                <div className="space-y-1">
                  {displayedTracks.slice(0, 10).map((t, index) => {
                    const isCur = t.id === currentTrackId;
                    return (
                      <div
                        key={t.id}
                        className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                          isCur ? 'bg-[#282828] text-[#1ed760]' : 'hover:bg-[#1f1f1f] text-zinc-300'
                        }`}
                      >
                        <div
                          onClick={() => handlePlayTrack(t.id)}
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                        >
                          <span className="w-5 text-center font-mono tabular-nums text-zinc-500 text-[11px]">
                            {index + 1}
                          </span>
                          <img
                            src={t.coverUrl}
                            alt={t.title}
                            className="w-10 h-10 rounded object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold truncate text-white">{t.title}</p>
                            <p className="text-[11px] text-zinc-400 truncate">{t.artist}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleAddToQueue(t.id, true)}
                            className="text-zinc-500 hover:text-white text-[11px] p-1 rounded hover:bg-zinc-800"
                            title="Play Next (تشغيل تالياً)"
                          >
                            <ListPlus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setPlaylistActionTrackId(t.id)}
                            className="text-zinc-500 hover:text-[#1ed760] text-[11px] p-1 rounded hover:bg-zinc-800"
                            title="Add to Playlist"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onToggleLike(t.id)}
                            className={`p-1 ${t.isLiked ? 'text-[#1ed760]' : 'text-zinc-500 hover:text-white'}`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${t.isLiked ? 'fill-current' : ''}`} />
                          </button>
                          <span className="font-mono tabular-nums text-zinc-500 text-[11px] w-10 text-right">
                            {formatTime(t.duration)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIBRARY / ALL FULL SONGS */}
          {activeTab === 'library' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#121212]">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div>
                  <h2 className="text-xl font-bold text-white">Full Songs Library</h2>
                  <p className="text-xs text-zinc-400">
                    تشغيل غير محدود لكافة المسارات بدون توقف بعد 30 ثانية
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import Audio</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                {displayedTracks.map((t, i) => (
                  <div
                    key={t.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs group transition-colors ${
                      t.id === currentTrackId ? 'bg-zinc-800/90 text-[#1ed760]' : 'hover:bg-zinc-900 text-zinc-300'
                    }`}
                  >
                    <div
                      onClick={() => handlePlayTrack(t.id)}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    >
                      <span className="w-6 font-mono text-zinc-500 text-center">{i + 1}</span>
                      <img src={t.coverUrl} alt={t.title} className="w-9 h-9 rounded object-cover" />
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">{t.title}</p>
                        <p className="text-[11px] text-zinc-400 truncate">{t.artist} · {t.album}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => handleAddToQueue(t.id, true)}
                        className="text-zinc-500 hover:text-white p-1"
                        title="Play Next"
                      >
                        <ListPlus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setPlaylistActionTrackId(t.id)}
                        className="text-zinc-500 hover:text-[#1ed760] p-1"
                        title="Add to Playlist"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onToggleLike(t.id)}
                        className={`p-1 ${t.isLiked ? 'text-[#1ed760]' : 'text-zinc-500 hover:text-white'}`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${t.isLiked ? 'fill-current' : ''}`} />
                      </button>
                      <span className="font-mono tabular-nums text-zinc-500 text-[11px] w-12 text-right">
                        {formatTime(t.duration)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PLAYLIST VIEW */}
          {activeTab === 'playlists' && activePlaylistObj && (
            <div className="flex-1 overflow-y-auto bg-[#121212]">
              {/* Playlist Header Banner */}
              <div className={`p-6 bg-gradient-to-b ${activePlaylistObj.coverGradient} to-[#121212] space-y-4`}>
                <div className="flex items-end gap-5">
                  <div className="w-36 h-36 rounded-xl bg-zinc-900/60 border border-white/10 flex items-center justify-center text-5xl shadow-2xl shrink-0">
                    {activePlaylistObj.coverEmoji || '🎵'}
                  </div>
                  <div className="space-y-2 min-w-0">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-white/70">
                      Playlist (قائمة تشغيل)
                    </span>
                    <h2 className="text-3xl font-black text-white truncate">
                      {activePlaylistObj.title}
                    </h2>
                    <p className="text-xs text-white/80 line-clamp-2">{activePlaylistObj.description}</p>
                    <div className="flex items-center gap-3 pt-2 text-xs text-white/90">
                      <span>{activePlaylistObj.trackIds.length} Songs</span>
                      <span>·</span>
                      <span>Created {activePlaylistObj.createdAt}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      if (activePlaylistObj.trackIds.length > 0) {
                        handlePlayTrack(activePlaylistObj.trackIds[0]);
                      }
                    }}
                    className="w-12 h-12 rounded-full bg-[#1ed760] hover:bg-[#3be477] text-black flex items-center justify-center transition-transform hover:scale-105 shadow-xl"
                  >
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  </button>
                  <button
                    onClick={() => handleDeletePlaylist(activePlaylistObj.id)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-rose-950/80 text-zinc-400 hover:text-rose-400 text-xs transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Playlist</span>
                  </button>
                </div>
              </div>

              {/* Playlist Track List */}
              <div className="p-6 space-y-1">
                {displayedTracks.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 text-xs space-y-2">
                    <ListMusic className="w-8 h-8 mx-auto text-zinc-600" />
                    <p>القائمة فارغة حالياً. أضف أغانيك المفضلة بالضغط على زر (+) بجانب أي أغنية.</p>
                  </div>
                ) : (
                  displayedTracks.map((t, idx) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg text-xs hover:bg-zinc-900 group text-zinc-300"
                    >
                      <div
                        onClick={() => handlePlayTrack(t.id)}
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        <span className="w-5 text-center font-mono text-zinc-500 text-[11px]">
                          {idx + 1}
                        </span>
                        <img src={t.coverUrl} alt={t.title} className="w-9 h-9 rounded object-cover" />
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate">{t.title}</p>
                          <p className="text-[11px] text-zinc-400 truncate">{t.artist}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleTrackInPlaylist(activePlaylistObj.id, t.id)}
                          className="text-zinc-500 hover:text-rose-400 p-1"
                          title="Remove from playlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono text-zinc-500 text-[11px] w-12 text-right">
                          {formatTime(t.duration)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: QUEUE (قائمة الانتظار / التالي) */}
          {activeTab === 'queue' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#121212]">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div>
                  <h2 className="text-xl font-bold text-white">Playback Queue (قائمة الانتظار)</h2>
                  <p className="text-xs text-zinc-400">
                    التحكم في الأغاني القادمة وإعادة الترتيب التلقائي
                  </p>
                </div>
                {queue.length > 0 && (
                  <button
                    onClick={handleClearQueue}
                    className="px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
                  >
                    Clear Queue (مسح)
                  </button>
                )}
              </div>

              {/* Now Playing Row */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Now Playing (قيد التشغيل حالياً)
                </h3>
                {currentTrack && (
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/60 to-zinc-900 border border-[#1ed760]/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={currentTrack.coverUrl}
                        alt={currentTrack.title}
                        className="w-12 h-12 rounded-lg object-cover shrink-0 shadow"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-white text-sm truncate">{currentTrack.title}</p>
                        <p className="text-xs text-zinc-400 truncate">{currentTrack.artist}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Radio className="w-4 h-4 text-[#1ed760] animate-pulse" />
                      <span className="font-mono text-xs text-[#1ed760] font-bold">
                        {formatTime(currentTime)} / {formatTime(duration || currentTrack.duration)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Next Up in Queue */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Next in Queue (الأغاني المحجوزة في الدور)
                </h3>
                {queue.length === 0 ? (
                  <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center text-xs text-zinc-500">
                    لا توجد أغانٍ إضافية في قائمة الانتظار. استخدم زر (Play Next) لإضافة أغنية تالياً.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {queue.map((qId, qIdx) => {
                      const qTrack = combinedTracks.find((t) => t.id === qId);
                      if (!qTrack) return null;
                      return (
                        <div
                          key={`${qId}-${qIdx}`}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-xs text-zinc-300"
                        >
                          <div
                            onClick={() => handlePlayTrack(qTrack.id)}
                            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                          >
                            <span className="font-mono text-zinc-500 w-5">{qIdx + 1}</span>
                            <img src={qTrack.coverUrl} alt={qTrack.title} className="w-8 h-8 rounded object-cover" />
                            <div className="min-w-0">
                              <p className="font-semibold text-white truncate">{qTrack.title}</p>
                              <p className="text-[11px] text-zinc-400 truncate">{qTrack.artist}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveFromQueue(qIdx)}
                            className="text-zinc-500 hover:text-rose-400 p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: COPILOT AI DJ */}
          {activeTab === 'dj' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-teal-950/40 via-[#121212] to-[#121212]">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#1ed760] text-black flex items-center justify-center font-bold text-lg shadow-lg">
                    DJ
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">Spotify Copilot AI DJ</h2>
                    <p className="text-xs text-zinc-400">
                      مساعدك الموسيقي الذكي لتوليد ميكسات وقوائم متناسقة بدون انقطاع
                    </p>
                  </div>
                </div>
              </div>

              {/* DJ Commentary Live Card */}
              <div className="p-5 rounded-2xl bg-zinc-900/90 border border-[#1ed760]/30 shadow-xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1ed760]">
                  <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />
                  <span>DJ Copilot Host Message</span>
                </div>
                <p className="text-sm font-medium text-zinc-200 leading-relaxed italic">
                  "{djCommentary}"
                </p>
              </div>

              {/* Quick Moods Selector */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-300">Quick Mood Selection (اختر مزاجك الفوري)</h4>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {[
                    { label: 'Deep Focus Lo-Fi', desc: 'موسيقى هادئة للبرمجة والمذاكرة', mood: 'Focus Study Lo-Fi' },
                    { label: 'Arabic Coffee & Chill', desc: 'ألحان عربية كلاسيكية ناعمة', mood: 'Arabic Chill Instrumental' },
                    { label: 'Night Drive Synthwave', desc: 'إيقاعات إلكترونية ليلية حماسية', mood: 'Synthwave Night Drive' },
                    { label: 'Workout Beast Mode', desc: 'طاقة عالية لتمارين الجيم', mood: 'High Energy Gym Beats' },
                    { label: 'Acoustic Sunset', desc: 'أجواء الغروب مع بيانو وجيتار', mood: 'Acoustic Sunset Chill' },
                    { label: 'Ambient Space Voyage', desc: 'هدوء تام وتأمل فضائي', mood: 'Ambient Cosmic Sleep' },
                  ].map((m) => (
                    <button
                      key={m.mood}
                      onClick={() => handleGenerateAiDjPlaylist(m.mood)}
                      disabled={isGeneratingDj}
                      className="p-3 rounded-xl bg-[#181818] hover:bg-[#282828] border border-zinc-800 text-left transition-all hover:border-[#1ed760]/40 group"
                    >
                      <h5 className="text-xs font-bold text-white group-hover:text-[#1ed760] transition-colors">
                        {m.label}
                      </h5>
                      <p className="text-[10px] text-zinc-400 mt-1 line-clamp-1">{m.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Prompt Input */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-300">Custom DJ Mix Request (اطلب ميكسك الخاص)</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiDjPrompt}
                    onChange={(e) => setAiDjPrompt(e.target.value)}
                    placeholder="مثال: عاوز ميكس هادي للبرمجة أو ميكس أغاني عربية حماسي للتمرين..."
                    className="flex-1 px-4 py-2 bg-[#222222] border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#1ed760]"
                  />
                  <button
                    onClick={() => handleGenerateAiDjPlaylist()}
                    disabled={isGeneratingDj}
                    className="px-5 py-2 rounded-xl bg-[#1ed760] hover:bg-[#3be477] text-black text-xs font-bold flex items-center gap-1.5 transition-transform hover:scale-105 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isGeneratingDj ? 'جاري الصنع...' : 'توليد القائمة'}</span>
                  </button>
                </div>
              </div>

              {/* DJ Generated Result Card */}
              {djGeneratedMix && (
                <div className="p-5 rounded-2xl bg-zinc-900 border border-emerald-500/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-[#1ed760] uppercase">Generated DJ Mix</span>
                      <h3 className="text-lg font-black text-white">{djGeneratedMix.title}</h3>
                      <p className="text-xs text-zinc-400">{djGeneratedMix.description}</p>
                    </div>
                    <button
                      onClick={handleApplyAiDjMixToLibrary}
                      className="px-4 py-2 rounded-full bg-[#1ed760] hover:bg-[#3be477] text-black text-xs font-bold transition-transform hover:scale-105 flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>حفظ وتشغيل القائمة الآن</span>
                    </button>
                  </div>

                  <div className="space-y-1">
                    {djGeneratedMix.suggestedTracks.map((st, sIdx) => (
                      <div
                        key={sIdx}
                        className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/60 text-xs text-zinc-300"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-zinc-500 text-[11px]">{sIdx + 1}</span>
                          <div>
                            <p className="font-semibold text-white">{st.title}</p>
                            <p className="text-[10px] text-zinc-400">{st.artist} · {st.genre}</p>
                          </div>
                        </div>
                        <span className="font-mono text-zinc-500 text-[11px]">
                          {formatTime(st.duration || 210)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: DISCOVER / SEARCH & STREAM */}
          {activeTab === 'discover' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#121212]">
              <div className="pb-3 border-b border-zinc-800 space-y-2">
                <h2 className="text-xl font-bold text-white">Search &amp; Stream Online</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    searchOnlineCatalog(onlineQuery);
                  }}
                  className="flex gap-2 max-w-md"
                >
                  <input
                    type="text"
                    value={onlineQuery}
                    onChange={(e) => setOnlineQuery(e.target.value)}
                    placeholder="Search any artist, song, album..."
                    className="flex-1 px-4 py-2 bg-[#222222] border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#1ed760]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#1ed760] text-black text-xs font-bold"
                  >
                    {isSearchingOnline ? 'Searching...' : 'Search'}
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {onlineResults.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 transition-colors border border-zinc-800 flex items-center gap-3 justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.coverUrl}
                        alt={item.title}
                        className="w-12 h-12 rounded-lg object-cover shrink-0 shadow"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-white truncate">{item.title}</p>
                        <p className="text-[11px] text-zinc-400 truncate">{item.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handlePlayOnlineItem(item)}
                        className="px-3 py-1.5 rounded-full bg-[#1ed760] hover:bg-[#3be477] text-black text-xs font-bold shrink-0 transition-transform hover:scale-105"
                      >
                        تشغيل كامل
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: LIKED SONGS */}
          {activeTab === 'liked' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#121212]">
              <div className="flex items-center gap-4 pb-4 border-b border-zinc-800">
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-indigo-600 to-teal-400 flex items-center justify-center shadow-lg">
                  <Heart className="w-10 h-10 text-white fill-current" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Liked Songs</h2>
                  <p className="text-xs text-zinc-400">
                    {displayedTracks.length} مسار محفوظ في المفضلة
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                {displayedTracks.map((t, idx) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-xs hover:bg-zinc-900 group text-zinc-300"
                  >
                    <div
                      onClick={() => handlePlayTrack(t.id)}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    >
                      <span className="w-5 text-center font-mono text-zinc-500 text-[11px]">{idx + 1}</span>
                      <img src={t.coverUrl} alt={t.title} className="w-9 h-9 rounded object-cover" />
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">{t.title}</p>
                        <p className="text-[11px] text-zinc-400 truncate">{t.artist}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => onToggleLike(t.id)} className="text-[#1ed760] p-1">
                        <Heart className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <span className="font-mono text-zinc-500 text-[11px] w-12 text-right">
                        {formatTime(t.duration)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================================
       * BOTTOM PLAYBACK CONTROLS BAR (Full Width Fixed Footer)
       * ==================================================================== */}
      <div className="h-20 bg-[#181818] rounded-xl px-4 flex items-center justify-between border border-zinc-800/80 shrink-0">
        {/* Left: Track Info */}
        <div className="flex items-center gap-3 w-64 min-w-0">
          <img
            src={currentTrack?.coverUrl}
            alt={currentTrack?.title}
            className="w-12 h-12 rounded-lg object-cover shadow border border-zinc-800 shrink-0"
          />
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-white truncate" title={currentTrack?.title}>
              {currentTrack?.title || 'No Track'}
            </h4>
            <p className="text-[11px] text-zinc-400 truncate">{currentTrack?.artist || 'Spotify'}</p>
          </div>
          <button
            onClick={() => currentTrack && onToggleLike(currentTrack.id)}
            className={`p-1.5 transition-colors ${
              currentTrack?.isLiked ? 'text-[#1ed760]' : 'text-zinc-500 hover:text-white'
            }`}
          >
            <Heart className={`w-4 h-4 ${currentTrack?.isLiked ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Center: Controls + Time Scrubber */}
        <div className="flex flex-col items-center gap-1.5 max-w-lg w-full px-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsShuffle((prev) => !prev)}
              className={`p-1 transition-colors ${
                isShuffle ? 'text-[#1ed760]' : 'text-zinc-400 hover:text-white'
              }`}
              title="Shuffle"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handlePrev}
              className="p-1 text-zinc-300 hover:text-white transition-colors"
              title="Previous"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>
            <button
              onClick={() => setIsPlaying((prev) => !prev)}
              className="w-8 h-8 rounded-full bg-[#1ed760] hover:bg-[#3be477] text-black flex items-center justify-center hover:scale-105 transition-transform"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>
            <button
              onClick={handleNext}
              className="p-1 text-zinc-300 hover:text-white transition-colors"
              title="Next"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>
            <button
              onClick={() => setIsRepeat((prev) => !prev)}
              className={`p-1 transition-colors ${
                isRepeat ? 'text-[#1ed760]' : 'text-zinc-400 hover:text-white'
              }`}
              title="Repeat"
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-full flex items-center gap-2 text-[11px] text-zinc-400 font-mono tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || currentTrack?.duration || 240}
              step={0.5}
              value={Math.min(currentTime, duration || currentTrack?.duration || 240)}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setCurrentTime(val);
                if (audioRef.current && audioRef.current.src) {
                  audioRef.current.currentTime = val;
                }
              }}
              className="flex-1 accent-[#1ed760] h-1 bg-zinc-800 rounded-lg cursor-pointer"
            />
            <span>{formatTime(duration || currentTrack?.duration || 240)}</span>
          </div>
        </div>

        {/* Right: Queue, Mini Player & Volume */}
        <div className="flex items-center justify-end gap-2.5 w-64">
          {/* Mini Player Toggle Button */}
          <button
            onClick={() => setIsMiniPlayer(true)}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-[#1ed760] transition-colors"
            title="Switch to Mini Player (تشغيل مصغر في الخلفية)"
          >
            <Minimize2 className="w-4 h-4" />
          </button>

          {/* Queue Button */}
          <button
            onClick={() => setActiveTab('queue')}
            className={`p-1.5 rounded transition-colors ${
              activeTab === 'queue' ? 'text-[#1ed760]' : 'text-zinc-400 hover:text-white'
            }`}
            title="View Playback Queue (قائمة الانتظار)"
          >
            <ListMusic className="w-4 h-4" />
          </button>

          {/* Volume Control */}
          <button onClick={handleToggleMute} className="text-zinc-400 hover:text-white">
            {effectiveVolume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={effectiveVolume}
            onChange={(e) => handleVolumeSliderChange(parseFloat(e.target.value))}
            className="w-20 accent-[#1ed760] h-1 bg-zinc-800 rounded-lg cursor-pointer"
          />
          <span className="text-[10px] font-mono tabular-nums text-zinc-400 w-7 text-right">
            {Math.round(effectiveVolume * 100)}%
          </span>
        </div>
      </div>

      {/* ======================================================================
       * MODAL 1: CREATE PLAYLIST MODAL
       * ==================================================================== */}
      {showCreatePlaylistModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreatePlaylist}
            className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-[#1ed760]" />
                <span>Create New Playlist (إنشاء قائمة تشغيل)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreatePlaylistModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Playlist Title *</label>
                <input
                  type="text"
                  required
                  value={newPlaylistTitle}
                  onChange={(e) => setNewPlaylistTitle(e.target.value)}
                  placeholder="e.g. My Favorites 2026"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#1ed760]"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Description (اختياري)</label>
                <input
                  type="text"
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  placeholder="e.g. أغانٍ مختارة للتركيز والاسترخاء"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#1ed760]"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Cover Gradient Mood</label>
                <div className="grid grid-cols-5 gap-2">
                  {PRESET_GRADIENTS.map((g) => (
                    <button
                      type="button"
                      key={g.name}
                      onClick={() => setNewPlaylistGradient(g.class)}
                      className={`h-8 rounded-lg bg-gradient-to-br ${g.class} border ${
                        newPlaylistGradient === g.class ? 'border-white scale-105' : 'border-transparent'
                      } transition-transform`}
                      title={g.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreatePlaylistModal(false)}
                className="px-3 py-1.5 text-xs bg-zinc-800 text-zinc-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold bg-[#1ed760] text-black rounded-lg hover:bg-[#3be477]"
              >
                Create Playlist
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================================
       * MODAL 2: ADD TO PLAYLIST DROPDOWN/MODAL
       * ==================================================================== */}
      {playlistActionTrackId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white">Add to Playlist (إضافة إلى قائمة)</h3>
              <button
                onClick={() => setPlaylistActionTrackId(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {playlists.map((pl) => {
                const inPl = pl.trackIds.includes(playlistActionTrackId);
                return (
                  <button
                    key={pl.id}
                    onClick={() => {
                      handleToggleTrackInPlaylist(pl.id, playlistActionTrackId);
                      setPlaylistActionTrackId(null);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors ${
                      inPl ? 'bg-emerald-950/60 text-[#1ed760]' : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    <span className="font-medium truncate">{pl.title}</span>
                    {inPl ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4 text-zinc-400" />}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                setPlaylistActionTrackId(null);
                setShowCreatePlaylistModal(true);
              }}
              className="w-full py-2 rounded-xl bg-zinc-800 text-xs font-semibold text-white hover:bg-zinc-700"
            >
              + Create New Playlist
            </button>
          </div>
        </div>
      )}

      {/* ======================================================================
       * MODAL 3: ADD SONG VIA DIRECT URL
       * ==================================================================== */}
      {showUrlModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form
            onSubmit={handleAddUrlSong}
            className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-xl p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Add Song via Direct Full Audio URL</h3>
              <button
                type="button"
                onClick={() => setShowUrlModal(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Song Title *</label>
                <input
                  type="text"
                  required
                  value={urlTitle}
                  onChange={(e) => setUrlTitle(e.target.value)}
                  placeholder="e.g. Blinding Lights"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Artist Name</label>
                <input
                  type="text"
                  value={urlArtist}
                  onChange={(e) => setUrlArtist(e.target.value)}
                  placeholder="e.g. The Weeknd"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Direct Audio URL (MP3/WAV/Stream) *</label>
                <input
                  type="url"
                  required
                  value={urlAudio}
                  onChange={(e) => setUrlAudio(e.target.value)}
                  placeholder="https://example.com/song.mp3"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowUrlModal(false)}
                className="px-3 py-1.5 text-xs bg-zinc-800 text-zinc-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold bg-[#1ed760] text-black rounded-lg hover:bg-[#3be477]"
              >
                Add &amp; Play Full Song
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
