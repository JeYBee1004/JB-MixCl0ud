import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://hrjacqaonlgtgbwaifzh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyamFjcWFvbmxndGdid2FpZnpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2ODA3MzUsImV4cCI6MjA3MTI1NjczNX0.jgDhHJmaG4qm9sZc-2qqDjcgR2ZGehaArNl75oJAPhU'; // Replace with your actual anon key
const supabase = createClient(supabaseUrl, supabaseKey);

// Mix data management with Supabase
class MixManager {
  constructor() {
    this.mixes = []
    this.currentlyPlaying = null
    this.tableName = 'mixes'
    this.likesTableName = 'mix_likes'
    this.isLoading = false
  }

  async loadMixes() {
    if (this.isLoading) return this.mixes;
    
    try {
      this.isLoading = true;
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading mixes:', error);
        return this.getDefaultMixes();
      }

      this.mixes = data || [];
      this.isLoading = false;
      return this.mixes;
    } catch (error) {
      console.error('Error in loadMixes:', error);
      this.isLoading = false;
      return this.getDefaultMixes();
    }
  }

  getDefaultMixes() {
    // Fallback data when Supabase is not available
    return [
      {
        id: "sample1",
        title: "Sample Mix 1",
        artist: "DJ Sample",
        genre: "House",
        duration: "3:45",
        audio_url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
        created_at: new Date().toISOString(),
      },
      {
        id: "sample2", 
        title: "Sample Mix 2",
        artist: "DJ Example",
        genre: "Techno",
        duration: "4:12",
        audio_url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
        created_at: new Date().toISOString(),
      },
    ];
  }

  getAllMixes() {
    return this.mixes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }

  async addMix(mixData) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .insert([{
          title: mixData.title,
          artist: mixData.artist,
          genre: mixData.genre,
          duration: mixData.duration,
          audio_url: mixData.audioUrl,
          created_at: new Date().toISOString()
        }])
        .select();

      if (error) {
        console.error('Error adding mix:', error);
        throw error;
      }

      const newMix = data[0];
      this.mixes.unshift(newMix);
      return newMix;
    } catch (error) {
      console.error('Error in addMix:', error);
      throw error;
    }
  }

  async deleteMix(id) {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting mix:', error);
        throw error;
      }

      this.mixes = this.mixes.filter((mix) => mix.id !== id);
      return true;
    } catch (error) {
      console.error('Error in deleteMix:', error);
      throw error;
    }
  }

  async toggleLike(mixId, userId = 'anonymous') {
    try {
      // Check if like exists
      const { data: existingLike, error: checkError } = await supabase
        .from(this.likesTableName)
        .select('*')
        .eq('mix_id', mixId)
        .eq('user_id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking like:', checkError);
        return false;
      }

      if (existingLike) {
        // Remove like
        const { error: deleteError } = await supabase
          .from(this.likesTableName)
          .delete()
          .eq('mix_id', mixId)
          .eq('user_id', userId);

        if (deleteError) {
          console.error('Error removing like:', deleteError);
          return false;
        }
        return false; // Not liked anymore
      } else {
        // Add like
        const { error: insertError } = await supabase
          .from(this.likesTableName)
          .insert([{
            mix_id: mixId,
            user_id: userId,
            created_at: new Date().toISOString()
          }]);

        if (insertError) {
          console.error('Error adding like:', insertError);
          return false;
        }
        return true; // Now liked
      }
    } catch (error) {
      console.error('Error in toggleLike:', error);
      return false;
    }
  }

  async getLikeStatus(mixId, userId = 'anonymous') {
    try {
      const { data, error } = await supabase
        .from(this.likesTableName)
        .select('*')
        .eq('mix_id', mixId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error getting like status:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error in getLikeStatus:', error);
      return false;
    }
  }

  async getLikesForMixes(mixIds, userId = 'anonymous') {
    try {
      const { data, error } = await supabase
        .from(this.likesTableName)
        .select('mix_id')
        .in('mix_id', mixIds)
        .eq('user_id', userId);

      if (error) {
        console.error('Error getting likes for mixes:', error);
        return {};
      }

      const likesMap = {};
      data.forEach(like => {
        likesMap[like.mix_id] = true;
      });
      return likesMap;
    } catch (error) {
      console.error('Error in getLikesForMixes:', error);
      return {};
    }
  }
}

// Audio player functionality (updated for Supabase)
class AudioPlayer {
  constructor(audioElement, mixCard) {
    this.audio = audioElement
    this.mixCard = mixCard
    this.isPlaying = false
    this.isLoading = false
    this.hasError = false

    this.playBtn = mixCard.querySelector(".play-btn")
    this.downloadBtn = mixCard.querySelector(".download-btn")
    this.shareBtn = mixCard.querySelector(".share-btn")
    this.likeBtn = mixCard.querySelector(".like-btn")
    this.progressFill = mixCard.querySelector(".progress-fill")
    this.currentTimeEl = mixCard.querySelector(".current-time")
    this.totalTimeEl = mixCard.querySelector(".total-time")
    this.errorMessage = mixCard.querySelector(".error-message")

    this.setupEventListeners()
  }

  setupEventListeners() {
    // Audio events
    this.audio.addEventListener("loadstart", () => this.handleLoadStart())
    this.audio.addEventListener("canplay", () => this.handleCanPlay())
    this.audio.addEventListener("loadedmetadata", () => this.handleLoadedMetadata())
    this.audio.addEventListener("timeupdate", () => this.handleTimeUpdate())
    this.audio.addEventListener("ended", () => this.handleEnded())
    this.audio.addEventListener("error", () => this.handleError())

    // Control events
    this.playBtn.addEventListener("click", () => this.togglePlayPause())
    this.downloadBtn.addEventListener("click", () => this.handleDownload())
    this.shareBtn.addEventListener("click", () => this.handleShare())
    this.likeBtn.addEventListener("click", () => this.toggleLike())
  }

  handleLoadStart() {
    this.isLoading = true
    this.hasError = false
    this.updatePlayButton()
    if (this.errorMessage) {
      this.errorMessage.style.display = "none"
    }
  }
 
  handleCanPlay() {
    this.isLoading = false
    this.hasError = false
    this.updatePlayButton()
  }

  handleLoadedMetadata() {
    if (this.totalTimeEl) {
      this.totalTimeEl.textContent = this.formatTime(this.audio.duration)
    }
  }

  handleTimeUpdate() {
    if (this.audio.duration) {
      const progress = (this.audio.currentTime / this.audio.duration) * 100
      if (this.progressFill) {
        this.progressFill.style.width = `${progress}%`
      }
      if (this.currentTimeEl) {
        this.currentTimeEl.textContent = this.formatTime(this.audio.currentTime)
      }
    }
  }

  handleEnded() {
    this.isPlaying = false
    this.updatePlayButton()
    if (mixManager.currentlyPlaying === this) {
      mixManager.currentlyPlaying = null
    }
  }

  handleError() {
    this.hasError = true
    this.isPlaying = false
    this.isLoading = false
    this.updatePlayButton()
    if (this.errorMessage) {
      this.errorMessage.style.display = "block"
    }
    console.error("Audio loading error:", this.audio.src)
  }

  async togglePlayPause() {
    if (this.hasError || this.isLoading) return

    try {
      if (this.isPlaying) {
        this.audio.pause()
        this.isPlaying = false
        if (mixManager.currentlyPlaying === this) {
          mixManager.currentlyPlaying = null
        }
      } else {
        // Pause any currently playing audio
        if (mixManager.currentlyPlaying && mixManager.currentlyPlaying !== this) {
          mixManager.currentlyPlaying.audio.pause()
          mixManager.currentlyPlaying.isPlaying = false
          mixManager.currentlyPlaying.updatePlayButton()
        }

        this.isLoading = true
        this.updatePlayButton()

        await this.audio.play()
        this.isPlaying = true
        this.isLoading = false
        mixManager.currentlyPlaying = this
      }
      this.updatePlayButton()
    } catch (error) {
      console.error("Playback error:", error)
      this.handleError()
    }
  }

  updatePlayButton() {
    const icon = this.playBtn.querySelector("i")

    if (this.isLoading) {
      this.playBtn.classList.add("loading")
      icon.className = "fas fa-spinner fa-spin"
    } else if (this.hasError) {
      this.playBtn.classList.remove("loading")
      icon.className = "fas fa-exclamation-circle"
    } else if (this.isPlaying) {
      this.playBtn.classList.remove("loading")
      icon.className = "fas fa-pause"
    } else {
      this.playBtn.classList.remove("loading")
      icon.className = "fas fa-play"
    }

    this.playBtn.disabled = this.hasError
    if (this.downloadBtn) {
      this.downloadBtn.disabled = this.hasError
    }
  }

  handleDownload() {
    if (this.hasError || !this.audio.src) {
      alert("Audio file is not available for download")
      return
    }

    try {
      const link = document.createElement("a")
      link.href = this.audio.src
      link.download = `${this.mixCard.dataset.artist} - ${this.mixCard.dataset.title}.mp3`
      link.target = "_blank"
      link.rel = "noopener noreferrer"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Download error:", error)
      alert("Download failed. Please try again.")
    }
  }

  async handleShare() {
    const shareData = {
      title: `${this.mixCard.dataset.artist} - ${this.mixCard.dataset.title}`,
      text: `Check out this ${this.mixCard.dataset.genre} mix by ${this.mixCard.dataset.artist}!`,
      url: window.location.href,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (error) {
        if (error.name !== 'AbortError') { // User cancelled sharing
          console.error("Error sharing:", error)
          this.fallbackShare(shareData)
        }
      }
    } else {
      this.fallbackShare(shareData)
    }
  }

  fallbackShare(shareData) {
    const url = encodeURIComponent(shareData.url)
    const text = encodeURIComponent(shareData.text)

    const shareOptions = [
      {
        name: "Twitter",
        url: `https://twitter.com/intent/tweet?text=${text}&url=${url}`
      },
      {
        name: "Facebook",
        url: `https://www.facebook.com/sharer/sharer.php?u=${url}`
      },
      {
        name: "WhatsApp",
        url: `https://wa.me/?text=${text}%20${url}`
      },
      {
        name: "Instagram",
        url: "https://www.instagram.com/j.e.y.b.e.e" 
      },
      {
        name: "Snapchat",
        url: "https://www.snapchat.com/add/jeybee20234690"
      },
      {
        name: "GitHub",
        url: "https://github.com/JeYBee1004"
      }
    ];

    const choice = prompt(
      `Share via:\n${shareOptions.map((opt, i) => `${i + 1}. ${opt.name}`).join("\n")}\n\nEnter number (1-${shareOptions.length}):`,
    )

    const selectedOption = shareOptions[Number.parseInt(choice) - 1]
    if (selectedOption) {
      window.open(selectedOption.url, "_blank", "noopener,noreferrer")
    }
  }

  async toggleLike() {
    const icon = this.likeBtn.querySelector("i")
    const mixId = this.mixCard.dataset.mixId
    const isCurrentlyLiked = this.likeBtn.classList.contains("liked")

    try {
      // Optimistic update
      if (isCurrentlyLiked) {
        this.likeBtn.classList.remove("liked")
        icon.className = "far fa-heart"
      } else {
        this.likeBtn.classList.add("liked")
        icon.className = "fas fa-heart"
      }

      // Update in Supabase
      const newLikeStatus = await mixManager.toggleLike(mixId)
      
      // Sync with actual result (in case of conflicts)
      if (newLikeStatus !== !isCurrentlyLiked) {
        if (newLikeStatus) {
          this.likeBtn.classList.add("liked")
          icon.className = "fas fa-heart"
        } else {
          this.likeBtn.classList.remove("liked")
          icon.className = "far fa-heart"
        }
      }

    } catch (error) {
      console.error('Error toggling like:', error)
      // Revert optimistic update on error
      if (isCurrentlyLiked) {
        this.likeBtn.classList.add("liked")
        icon.className = "fas fa-heart"
      } else {
        this.likeBtn.classList.remove("liked")
        icon.className = "far fa-heart"
      }
      
      // Show user-friendly error
      alert('Unable to update like status. Please try again.')
    }
  }

  formatTime(time) {
    if (isNaN(time) || !isFinite(time)) return "0:00"
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }
}

// Main application
const mixManager = new MixManager()

async function createMixCard(mix) {
  const template = document.getElementById("mix-card-template")
  if (!template) {
    console.error('Mix card template not found')
    return null
  }

  const card = template.content.cloneNode(true)
  const mixCard = card.querySelector(".mix-card")

  // Set data attributes
  mixCard.dataset.mixId = mix.id
  mixCard.dataset.title = mix.title
  mixCard.dataset.artist = mix.artist
  mixCard.dataset.genre = mix.genre

  // Populate content
  const titleEl = card.querySelector(".mix-title")
  const artistEl = card.querySelector(".mix-artist")
  const genreEl = card.querySelector(".mix-genre")
  const totalTimeEl = card.querySelector(".total-time")

  if (titleEl) titleEl.textContent = mix.title
  if (artistEl) artistEl.textContent = mix.artist
  if (genreEl) genreEl.textContent = mix.genre
  if (totalTimeEl) totalTimeEl.textContent = mix.duration

  // Set audio source - handle both old and new field names
  const audio = card.querySelector("audio")
  if (audio) {
    audio.src = mix.audio_url || mix.audioUrl
  }

  // Check if mix is liked
  try {
    const isLiked = await mixManager.getLikeStatus(mix.id)
    if (isLiked) {
      const likeBtn = card.querySelector(".like-btn")
      const icon = likeBtn?.querySelector("i")
      if (likeBtn && icon) {
        likeBtn.classList.add("liked")
        icon.className = "fas fa-heart"
      }
    }
  } catch (error) {
    console.error('Error checking like status:', error)
  }

  return { card, mixCard, audio }
}

async function renderMixes() {
  const container = document.getElementById("mixes-container")
  const noMixes = document.getElementById("no-mixes")
  const loadingIndicator = document.getElementById("loading-mixes")
  
  if (!container) {
    console.error('Mixes container not found')
    return
  }

  const pageGenre = document.body.dataset.genre?.toLowerCase() || ""

  try {
    // Show loading indicator
    if (loadingIndicator) {
      loadingIndicator.style.display = "block"
    }
    if (noMixes) {
      noMixes.style.display = "none"
    }

    // Load mixes from Supabase
    const allMixes = await mixManager.loadMixes()
    
    // Filter by genre if specified
    const genreMixes = pageGenre ? 
      allMixes.filter(mix => mix.genre.toLowerCase() === pageGenre) : 
      allMixes

    // Hide loading indicator
    if (loadingIndicator) {
      loadingIndicator.style.display = "none"
    }

    // Clear container
    container.innerHTML = ""

    if (genreMixes.length === 0) {
      if (noMixes) {
        noMixes.style.display = "block"
      }
      return
    }

    if (noMixes) {
      noMixes.style.display = "none"
    }

    // Create mix cards
    for (const mix of genreMixes) {
      try {
        const cardData = await createMixCard(mix)
        if (cardData) {
          const { card, mixCard, audio } = cardData
          container.appendChild(card)
          new AudioPlayer(audio, mixCard)
        }
      } catch (error) {
        console.error('Error creating mix card:', error)
      }
    }

  } catch (error) {
    console.error('Error rendering mixes:', error)
    
    // Hide loading indicator
    if (loadingIndicator) {
      loadingIndicator.style.display = "none"
    }
    
    // Show error message
    if (container) {
      container.innerHTML = '<div class="error-message">Failed to load mixes. Please refresh the page.</div>'
    }
  }
}

// Initialize the application
document.addEventListener("DOMContentLoaded", async () => {
  await renderMixes()
})

// Auto-refresh mixes every 30 seconds (optional)
setInterval(async () => {
  try {
    const currentMixCount = mixManager.mixes.length
    await mixManager.loadMixes()
    
    // Only re-render if mix count changed
    if (mixManager.mixes.length !== currentMixCount) {
      await renderMixes()
    }
  } catch (error) {
    console.error('Error in auto-refresh:', error)
  }
}, 30000)

// Listen for Supabase real-time updates (optional)
try {
  supabase
    .channel('mix-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'mixes'
    }, (payload) => {
      console.log('Mix table change detected:', payload)
      // Reload mixes when changes occur
      setTimeout(() => renderMixes(), 1000)
    })
    .subscribe()
} catch (error) {
  console.error('Error setting up real-time subscription:', error)
}

// Export for global access if needed
window.mixManager = mixManager;
