// Mix data management
class MixManager {
  constructor() {
    this.mixes = this.loadMixes()
    this.currentlyPlaying = null
  }


  loadMixes() {
    const stored = localStorage.getItem("djMixes")
    if (stored) {
      return JSON.parse(stored)
    }
    // Default sample data
    return [
      {
        id: "",
        title: "",
        artist: "",
        genre: "",
        duration: "",
        audioUrl: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
        createdAt: new Date().toISOString(),
      },
      {
        id: "",
        title: "",
        artist: "",
        genre: "",
        duration: "",
        audioUrl: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
        createdAt: new Date().toISOString(),
      },
    ]

  }

  saveMixes() {
    localStorage.setItem("djMixes", JSON.stringify(this.mixes))
  }

  getAllMixes() {
    return this.mixes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  addMix(mixData) {
    const newMix = {
      id: Date.now().toString(),
      ...mixData,
      createdAt: new Date().toISOString(),
    }
    this.mixes.push(newMix)
    this.saveMixes()
    return newMix
  }

  deleteMix(id) {
    this.mixes = this.mixes.filter((mix) => mix.id !== id)
    this.saveMixes()
  }
}

// Audio player functionality
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
    this.errorMessage.style.display = "none"
  }

  handleCanPlay() {
    this.isLoading = false
    this.hasError = false
    this.updatePlayButton()
  }

  handleLoadedMetadata() {
    this.totalTimeEl.textContent = this.formatTime(this.audio.duration)
  }

  handleTimeUpdate() {
    const progress = (this.audio.currentTime / this.audio.duration) * 100
    this.progressFill.style.width = `${progress}%`
    this.currentTimeEl.textContent = this.formatTime(this.audio.currentTime)
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
    this.errorMessage.style.display = "block"
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
      icon.className = "fas fa-spinner"
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
    this.downloadBtn.disabled = this.hasError
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
        console.error("Error sharing:", error)
        this.fallbackShare(shareData)
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
      `Share via:\n${shareOptions.map((opt, i) => `${i + 1}. ${opt.name}`).join("\n")}\n\nEnter number (1-3):`,
    )

    const selectedOption = shareOptions[Number.parseInt(choice) - 1]
    if (selectedOption) {
      window.open(selectedOption.url, "_blank")
    }
  }

  toggleLike() {
    const icon = this.likeBtn.querySelector("i")
    const isLiked = this.likeBtn.classList.contains("liked")

    if (isLiked) {
      this.likeBtn.classList.remove("liked")
      icon.className = "far fa-heart"
    } else {
      this.likeBtn.classList.add("liked")
      icon.className = "fas fa-heart"
    }

    // Save like state to localStorage
    const mixId = this.mixCard.dataset.mixId
    const likes = JSON.parse(localStorage.getItem("mixLikes") || "{}")
    likes[mixId] = !isLiked
    localStorage.setItem("mixLikes", JSON.stringify(likes))
  }

  formatTime(time) {
    if (isNaN(time)) return "0:00"
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }
}

// Main application
const mixManager = new MixManager()

function createMixCard(mix) {
  const template = document.getElementById("mix-card-template")
  const card = template.content.cloneNode(true)
  const mixCard = card.querySelector(".mix-card")

  // Set data attributes
  mixCard.dataset.mixId = mix.id
  mixCard.dataset.title = mix.title
  mixCard.dataset.artist = mix.artist
  mixCard.dataset.genre = mix.genre

  // Populate content
  card.querySelector(".mix-title").textContent = mix.title
  card.querySelector(".mix-artist").textContent = mix.artist
  card.querySelector(".mix-genre").textContent = mix.genre
  card.querySelector(".total-time").textContent = mix.duration

  // Set audio source
  const audio = card.querySelector("audio")
  audio.src = mix.audioUrl

  // Check if mix is liked
  const likes = JSON.parse(localStorage.getItem("mixLikes") || "{}")
  if (likes[mix.id]) {
    const likeBtn = card.querySelector(".like-btn")
    const icon = likeBtn.querySelector("i")
    likeBtn.classList.add("liked")
    icon.className = "fas fa-heart"
  }

  return { card, mixCard, audio }
}

function renderMixes() {
  const container = document.getElementById("mixes-container")
  const noMixes = document.getElementById("no-mixes")
  const pageGenre = document.body.dataset.genre?.toLowerCase() || ""

  const allMixes = mixManager.getAllMixes()
  const genreMixes = allMixes.filter(
    (mix) => mix.genre.toLowerCase() === pageGenre
  )

  container.innerHTML = ""

  if (genreMixes.length === 0) {
    noMixes.style.display = "block"
    return
  }

  noMixes.style.display = "none"

  genreMixes.forEach((mix) => {
    const { card, mixCard, audio } = createMixCard(mix)
    container.appendChild(card)
    new AudioPlayer(audio, mixCard)
  })
}



// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  renderMixes()
})

// Listen for storage changes (when new mixes are added from admin panel)
window.addEventListener("storage", (e) => {
  if (e.key === "djMixes") {
    mixManager.mixes = mixManager.loadMixes()
    renderMixes()
  }
})
