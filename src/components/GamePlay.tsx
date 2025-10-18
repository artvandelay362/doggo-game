import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Slider } from "./ui/slider";

// Background asset
const backgroundImage = "https://i.imgur.com/FBGihp5.jpeg";

// Supporter images
const supporterImages = [
  "https://i.imgur.com/mLQbZOy.png",
  "https://i.imgur.com/Fyaps4u.png",
  "https://i.imgur.com/fEUMoMB.png",
  "https://i.imgur.com/VIhn9nj.png",
  "https://i.imgur.com/tCTXnVr.png",
  "https://i.imgur.com/UM8AITa.png",
  "https://i.imgur.com/WRrXXNd.png",
  "https://i.imgur.com/Lp3A9A5.png",
  "https://i.imgur.com/txad79x.png",
];

// Text messages for supporters
const positiveMessages = [
  "Get those evil doggos, Comrade!",
  "You are on the right side of history!",
  "Keep up the good work!",
  "Don't let the fascist doggos win!",
  "I am so proud of you!",
];

const negativeMessages = ["Don't give up!", "Focus..."];

// Character assets
const playerBody1 = "https://i.imgur.com/lxKF9yl.png";
const faceNormalAsset = "https://i.imgur.com/fgGOeWQ.png";
const faceAngryAsset = "https://i.imgur.com/qN9QWLP.png";
const faceCelebrationAsset = "https://i.imgur.com/jFHPAPI.png";
const faceSadAsset = "https://i.imgur.com/pdMRPT4.png";

// Enemy assets - each dog has its own body and skeleton
const enemyTypes = [
  {
    body: "https://i.imgur.com/3pDVzgY.png",
    skeleton: "https://i.imgur.com/w79dL4z.png",
  },
  {
    body: "https://i.imgur.com/KMI8jai.png",
    skeleton: "https://i.imgur.com/sEOeaJW.png",
  },
  {
    body: "https://i.imgur.com/y7nQKAa.png",
    skeleton: "https://i.imgur.com/PgrzdHV.png",
  },
  {
    body: "https://i.imgur.com/RdrhxiZ.png",
    skeleton: "https://i.imgur.com/dmaqSfS.png",
  },
  {
    body: "https://i.imgur.com/AqwVE6g.png",
    skeleton: "https://i.imgur.com/UeJuVh8.png",
  },
  {
    body: "https://i.imgur.com/pMiHO68.png",
    skeleton: "https://i.imgur.com/YfsvMnf.png",
  },
];

// Candyman enemy asset
const candymanAsset = "https://i.imgur.com/pGNfvXC.png";

// Flame assets
const flame1 = "https://i.imgur.com/Zi2RUky.png";
const flame2 = "https://i.imgur.com/z4eVz5y.png";

interface GamePlayProps {
  onQuit: () => void;
}

interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  speed?: number;
}

interface Bullet extends GameObject {
  active: boolean;
  lifetime: number;
  maxLifetime: number;
  hasHit: boolean;
}

interface Enemy extends GameObject {
  active: boolean;
  speed: number;
  imageIndex: number; // 0-5 for the six dog images
  isDying?: boolean; // Track if enemy is in death animation
  deathFrame?: number; // Frame counter for death animation
  baseY: number; // Base Y position for vertical oscillation
  verticalSpeed: number; // How fast it moves vertically
  verticalDirection: number; // Current direction: 1 (up) or -1 (down)
  maxUpOffset: number; // Maximum distance can move up from base
  maxDownOffset: number; // Maximum distance can move down from base
  currentOffset: number; // Current offset from base Y
  changeDirectionChance: number; // Probability of changing direction each frame
  isCandyman?: boolean; // Special Candyman enemy that cannot be shot
}

export default function GamePlay({ onQuit }: GamePlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hitSound1Ref = useRef<HTMLAudioElement>(null); // 30% chance
  const hitSound2Ref = useRef<HTMLAudioElement>(null); // 60% chance
  const hitSound3Ref = useRef<HTMLAudioElement>(null); // 10% chance
  const shootSound1Ref = useRef<HTMLAudioElement>(null); // 80% chance
  const shootSound2Ref = useRef<HTMLAudioElement>(null); // 20% chance
  const candymanHitSoundRef = useRef<HTMLAudioElement>(null); // Candyman hit sound

  // Audio pools for instant playback without delay
  const hitSound1PoolRef = useRef<HTMLAudioElement[]>([]);
  const hitSound2PoolRef = useRef<HTMLAudioElement[]>([]);
  const hitSound3PoolRef = useRef<HTMLAudioElement[]>([]);
  const shootSound1PoolRef = useRef<HTMLAudioElement[]>([]);
  const shootSound2PoolRef = useRef<HTMLAudioElement[]>([]);
  const candymanHitSoundPoolRef = useRef<HTMLAudioElement[]>([]);
  const audioPoolIndexRef = useRef({
    hitSound1: 0,
    hitSound2: 0,
    hitSound3: 0,
    shootSound1: 0,
    shootSound2: 0,
    candymanHit: 0,
  });

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120); // 120 seconds (2 minutes)
  const [volume, setVolume] = useState(30); // Volume from 0-100
  const [previousVolume, setPreviousVolume] = useState(30); // Store volume before muting
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [supporterDisplay, setSupporterDisplay] = useState<{
    visible: boolean;
    fadeState: "in" | "visible" | "out";
    image: string;
    text: string;
  } | null>(null);
  const supporterDisplayRef = useRef<{
    visible: boolean;
    fadeState: "in" | "visible" | "out";
    image: string;
    text: string;
  } | null>(null); // Ref to track supporter display for game loop
  const isPausedRef = useRef(false); // Ref for pause state to avoid restarting game loop
  const isGameOverRef = useRef(false); // Ref for game over state
  const cheatCodeRef = useRef(""); // Track cheat code input
  const supporterTimerRef = useRef(0); // Track supporter animation timer
  const lastNegativeSupporterFrame = useRef(-999); // Track when last negative supporter was shown (initialize to allow first trigger)
  const musicStartedRef = useRef(false); // Track if background music has started
  const gameStateRef = useRef({
    player: { x: 50, y: 0, width: 156, height: 234, speed: 2.0 },
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    keys: {} as Record<string, boolean>,
    lastEnemySpawn: Date.now(), // Initialize to current time to prevent immediate spawn
    lastCandymanSpawn: Date.now(), // Initialize to current time to enforce 10 second delay
    firstCandymanSpawned: false, // Track if first Candyman has been spawned
    lastShot: 0,
    animationFrame: 0,
    enemiesSpawned: 0,
    maxEnemies: 999999, // Effectively infinite
    consecutiveHits: 0,
    basePlayerY: 0, // Base Y position for floating animation
    isPlayerMoving: false,
    velocityY: 0, // Vertical velocity for inertia
    recoilProgress: 0, // Recoil animation progress (0 to 1, then back to 0)
    recoilMaxOffsetX: 0, // Maximum horizontal recoil distance
    recoilMaxOffsetY: 0, // Maximum vertical recoil distance
    basePlayerX: 50, // Base X position for recoil animation
    missTimer: 0, // Frames remaining to show angry face after missing (60 frames = 1 second)
    celebrationTimer: 0, // Frames remaining to show celebration face after hitting 4 in a row (60 frames = 1 second)
    lastSpawnedDogIndex: -1, // Track last spawned dog to avoid consecutive duplicates
    playerScale: 1.0, // Track player scale for face proportions
    isImmobilized: false, // Track if player is immobilized by Candyman
    immobilizedTimer: 0, // Frames remaining for immobilization (240 frames = 4 seconds)
    immobilizedFlashFrame: 0, // Frame counter for flashing effect
  });

  // Sync isPaused, isGameOver, and supporterDisplay state with refs
  useEffect(() => {
    console.log(`⏸️ isPaused state changed: ${isPaused}`);
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    console.log(`🏁 isGameOver state changed: ${isGameOver}`);
    isGameOverRef.current = isGameOver;
  }, [isGameOver]);

  useEffect(() => {
    supporterDisplayRef.current = supporterDisplay;
  }, [supporterDisplay]);

  // Log timeLeft changes
  useEffect(() => {
    console.log(`⏱️ timeLeft state changed to: ${timeLeft}`);
  }, [timeLeft]);

  useEffect(() => {
    console.log("🎮 GamePlay component mounted, initializing game...");
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    console.log("🎮 Canvas initialized, starting game setup");

    // Initialize audio pools (3 instances of each sound for instant playback)
    const initAudioPool = (
      src: string,
      poolSize: number = 3
    ): HTMLAudioElement[] => {
      const pool: HTMLAudioElement[] = [];
      for (let i = 0; i < poolSize; i++) {
        const audio = new Audio(src);
        audio.preload = "auto";
        audio.volume = (volume / 100) * 0.8;
        // Force load the audio immediately
        audio.load();
        pool.push(audio);
      }
      return pool;
    };

    hitSound1PoolRef.current = initAudioPool(
      "https://files.catbox.moe/9q9cj2.mp3"
    );
    hitSound2PoolRef.current = initAudioPool(
      "https://files.catbox.moe/k070y2.mp3"
    );
    hitSound3PoolRef.current = initAudioPool(
      "https://files.catbox.moe/xeapud.mp3"
    );
    shootSound1PoolRef.current = initAudioPool(
      "https://files.catbox.moe/qm4nuo.mp3"
    );
    shootSound2PoolRef.current = initAudioPool(
      "https://files.catbox.moe/cp0rjm.mp3"
    );
    candymanHitSoundPoolRef.current = initAudioPool(
      "https://files.catbox.moe/udwke3.mp3"
    );

    // Setup background music with aggressive autoplay strategy
    if (audioRef.current) {
      audioRef.current.volume = 0.3 * 0.8; // Set initial volume to 30% (with 20% max reduction)
      audioRef.current.load(); // Preload the audio

      // Function to attempt starting music
      const tryStartMusic = () => {
        if (!musicStartedRef.current && audioRef.current) {
          audioRef.current
            .play()
            .then(() => {
              console.log("✅ Background music started!");
              musicStartedRef.current = true;
            })
            .catch(() => {
              // Silent fail - will retry on next interaction
            });
        }
      };

      // Try immediately (might work if user just clicked Start button)
      tryStartMusic();

      // If that didn't work, try on any user interaction
      const interactions = ["click", "keydown", "mousedown", "touchstart"];
      const startMusicOnInteraction = () => {
        if (!musicStartedRef.current) {
          tryStartMusic();
        }
        // Remove listeners once music starts
        if (musicStartedRef.current) {
          interactions.forEach((event) => {
            window.removeEventListener(event, startMusicOnInteraction);
          });
        }
      };

      // Add listeners for all interaction types
      interactions.forEach((event) => {
        window.addEventListener(event, startMusicOnInteraction, {
          once: false,
        });
      });

      // Cleanup function to remove listeners if component unmounts
      const cleanupMusicListeners = () => {
        interactions.forEach((event) => {
          window.removeEventListener(event, startMusicOnInteraction);
        });
      };

      // Store cleanup function for later
      (window as any).__cleanupMusicListeners = cleanupMusicListeners;
    }

    // Set canvas size to 100% of viewport width and 100% of viewport height
    canvas.width = Math.floor(window.innerWidth);
    canvas.height = Math.floor(window.innerHeight);

    const gameState = gameStateRef.current;

    // Scale both player AND enemies based on viewport height for visual consistency
    let playerScale = 1.3; // Baseline for medium screens: 156×234px → 203×304px
    let enemyScale = 1.3; // Enemies scale proportionally with player

    if (canvas.height < 700) {
      // Small screens (below 700px)
      playerScale = 1.0; // 156×234px (original size)
      enemyScale = 1.0; // 180px (original size)
    } else if (canvas.height >= 1000) {
      // Large screens (1000px+)
      playerScale = 1.5; // 234×351px (50% bigger)
      enemyScale = 1.5; // 270px (50% bigger)
    }
    // Medium screens (700-999px) use 1.3 scale (30% bigger)

    const enemyTargetHeight = 180 * enemyScale; // Base enemy height: 180px, scaled

    console.log(`🎮 Canvas dimensions: ${canvas.width}x${canvas.height}`);
    console.log(`🎮 Player scale: ${playerScale}x`);
    console.log(
      `🎮 Player size will be: ${156 * playerScale}x${234 * playerScale}px`
    );
    console.log(`🎮 Enemy scale: ${enemyScale}x`);
    console.log(`🎮 Enemy size will be: ~${enemyTargetHeight}px tall`);

    gameState.player.width = 156 * playerScale;
    gameState.player.height = 234 * playerScale;
    gameState.playerScale = playerScale; // Store for face scaling

    // Scale player speed based on viewport height for consistent difficulty
    // Small screens boosted by 10%: minimum 0.88x instead of 0.8x
    const baseSpeed = 2.0;
    const referenceHeight = 900; // Balanced at this height
    const speedMultiplier = Math.max(
      0.88,
      Math.min(1.1, canvas.height / referenceHeight)
    );
    gameState.player.speed = baseSpeed * speedMultiplier;

    console.log(
      `🎮 Player speed multiplier: ${speedMultiplier.toFixed(
        2
      )}x (${gameState.player.speed.toFixed(2)} px/frame)`
    );

    // Set initial player Y position to center of canvas
    gameState.player.y = canvas.height / 2 - gameState.player.height / 2;
    gameState.basePlayerY = gameState.player.y;

    // Load background image
    const bgImage = new Image();
    bgImage.src = backgroundImage;
    let bgImageLoaded = false;
    let bgScale = 1;
    let bgWidth = 0;

    bgImage.onload = () => {
      if (bgImage.naturalWidth > 0 && bgImage.naturalHeight > 0) {
        bgImageLoaded = true;
        // Scale to cover full canvas height while maintaining aspect ratio
        bgScale = canvas.height / bgImage.height;
        bgWidth = bgImage.width * bgScale;
      }
    };

    bgImage.onerror = () => {
      console.error("Failed to load background image");
      bgImageLoaded = false;
    };

    // Load player images
    const playerImg = new Image();
    playerImg.src = playerBody1;
    let playerImageLoaded = false;

    playerImg.onload = () => {
      if (playerImg.naturalWidth > 0 && playerImg.naturalHeight > 0) {
        playerImageLoaded = true;
      }
    };

    playerImg.onerror = () => {
      console.error("Failed to load player image");
      playerImageLoaded = false;
    };

    // Load face images
    const faceNormalImg = new Image();
    faceNormalImg.src = faceNormalAsset;
    let faceNormalLoaded = false;
    let faceNormalWidth = 0;
    let faceNormalHeight = 0;

    faceNormalImg.onload = () => {
      if (faceNormalImg.naturalWidth > 0 && faceNormalImg.naturalHeight > 0) {
        faceNormalLoaded = true;
        faceNormalWidth = faceNormalImg.naturalWidth;
        faceNormalHeight = faceNormalImg.naturalHeight;
      }
    };

    faceNormalImg.onerror = () => {
      console.error("Failed to load normal face image");
      faceNormalLoaded = false;
    };

    const faceAngryImg = new Image(); // Angry face for missing shots
    faceAngryImg.src = faceAngryAsset;
    let faceAngryLoaded = false;
    let faceAngryWidth = 0;
    let faceAngryHeight = 0;

    faceAngryImg.onload = () => {
      if (faceAngryImg.naturalWidth > 0 && faceAngryImg.naturalHeight > 0) {
        faceAngryLoaded = true;
        faceAngryWidth = faceAngryImg.naturalWidth;
        faceAngryHeight = faceAngryImg.naturalHeight;
      }
    };

    faceAngryImg.onerror = () => {
      console.error("Failed to load angry face image");
      faceAngryLoaded = false;
    };

    const faceCelebrationImg = new Image(); // Celebration face for hitting 4 in a row
    faceCelebrationImg.src = faceCelebrationAsset;
    let faceCelebrationLoaded = false;
    let faceCelebrationWidth = 0;
    let faceCelebrationHeight = 0;

    faceCelebrationImg.onload = () => {
      if (
        faceCelebrationImg.naturalWidth > 0 &&
        faceCelebrationImg.naturalHeight > 0
      ) {
        faceCelebrationLoaded = true;
        faceCelebrationWidth = faceCelebrationImg.naturalWidth;
        faceCelebrationHeight = faceCelebrationImg.naturalHeight;
      }
    };

    faceCelebrationImg.onerror = () => {
      console.error("Failed to load celebration face image");
      faceCelebrationLoaded = false;
    };

    const faceSadImg = new Image(); // Sad face - for later use
    faceSadImg.src = faceSadAsset;
    let faceSadLoaded = false;
    let faceSadWidth = 0;
    let faceSadHeight = 0;

    faceSadImg.onload = () => {
      if (faceSadImg.naturalWidth > 0 && faceSadImg.naturalHeight > 0) {
        faceSadLoaded = true;
        faceSadWidth = faceSadImg.naturalWidth;
        faceSadHeight = faceSadImg.naturalHeight;
      }
    };

    faceSadImg.onerror = () => {
      console.error("Failed to load sad face image");
      faceSadLoaded = false;
    };

    // Load enemy images (body and skeleton for each type)
    const enemyBodyImages: HTMLImageElement[] = [];
    const enemyBodyImagesLoaded: boolean[] = [];
    const enemyBodyAspectRatios: number[] = [];
    const enemySkeletonImages: HTMLImageElement[] = [];
    const enemySkeletonImagesLoaded: boolean[] = [];
    const enemySkeletonAspectRatios: number[] = [];

    // Load each enemy type (body + skeleton)
    enemyTypes.forEach((enemyType, index) => {
      // Load body
      const bodyImg = new Image();
      bodyImg.src = enemyType.body;
      bodyImg.onload = () => {
        if (bodyImg.naturalWidth > 0 && bodyImg.naturalHeight > 0) {
          enemyBodyImagesLoaded[index] = true;
          enemyBodyAspectRatios[index] =
            bodyImg.naturalWidth / bodyImg.naturalHeight;
        }
      };
      bodyImg.onerror = () => {
        console.error(`Failed to load enemy body ${index}`);
        enemyBodyImagesLoaded[index] = false;
      };
      enemyBodyImages.push(bodyImg);

      // Load skeleton
      const skeletonImg = new Image();
      skeletonImg.src = enemyType.skeleton;
      skeletonImg.onload = () => {
        if (skeletonImg.naturalWidth > 0 && skeletonImg.naturalHeight > 0) {
          enemySkeletonImagesLoaded[index] = true;
          enemySkeletonAspectRatios[index] =
            skeletonImg.naturalWidth / skeletonImg.naturalHeight;
        }
      };
      skeletonImg.onerror = () => {
        console.error(`Failed to load enemy skeleton ${index}`);
        enemySkeletonImagesLoaded[index] = false;
      };
      enemySkeletonImages.push(skeletonImg);

      // Initialize loaded states
      enemyBodyImagesLoaded[index] = false;
      enemyBodyAspectRatios[index] = 1;
      enemySkeletonImagesLoaded[index] = false;
      enemySkeletonAspectRatios[index] = 1;
    });

    // Load flame images for jetpack
    const flame1Img = new Image();
    flame1Img.src = flame1;
    let flame1Loaded = false;
    let flame1AspectRatio = 1;

    flame1Img.onload = () => {
      if (flame1Img.naturalWidth > 0 && flame1Img.naturalHeight > 0) {
        flame1Loaded = true;
        flame1AspectRatio = flame1Img.naturalWidth / flame1Img.naturalHeight;
      }
    };

    flame1Img.onerror = () => {
      console.error("Failed to load flame1 image");
      flame1Loaded = false;
    };

    const flame2Img = new Image();
    flame2Img.src = flame2;
    let flame2Loaded = false;
    let flame2AspectRatio = 1;

    flame2Img.onload = () => {
      if (flame2Img.naturalWidth > 0 && flame2Img.naturalHeight > 0) {
        flame2Loaded = true;
        flame2AspectRatio = flame2Img.naturalWidth / flame2Img.naturalHeight;
      }
    };

    flame2Img.onerror = () => {
      console.error("Failed to load flame2 image");
      flame2Loaded = false;
    };

    // Load Candyman image
    const candymanImg = new Image();
    candymanImg.src = candymanAsset;
    let candymanLoaded = false;
    let candymanAspectRatio = 1;

    candymanImg.onload = () => {
      if (candymanImg.naturalWidth > 0 && candymanImg.naturalHeight > 0) {
        candymanLoaded = true;
        candymanAspectRatio =
          candymanImg.naturalWidth / candymanImg.naturalHeight;
      }
    };

    candymanImg.onerror = () => {
      console.error("Failed to load Candyman image");
      candymanLoaded = false;
    };

    // Cheat code function - skip to end of game
    const activateCheat = () => {
      // End the game immediately by setting time to 0
      setTimeLeft(0);
    };

    // Keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle ESC key for pause
      if (e.key === "Escape") {
        e.preventDefault();
        setIsPaused((prev) => {
          console.log(`⏸️ PAUSE toggled: ${prev} -> ${!prev}`);
          return !prev;
        });
        return;
      }

      // Track cheat code sequence: "orgg"
      if (!isPausedRef.current && !isGameOverRef.current) {
        const key = e.key.toLowerCase();
        // Only track letter keys for cheat code
        if (key.length === 1 && /[a-z]/.test(key)) {
          cheatCodeRef.current += key;
          // Keep only last 4 characters
          if (cheatCodeRef.current.length > 4) {
            cheatCodeRef.current = cheatCodeRef.current.slice(-4);
          }
          // Check if cheat code matches
          if (cheatCodeRef.current === "orgg") {
            activateCheat();
            cheatCodeRef.current = ""; // Reset after activation
            return;
          }
        }
      }

      // Don't process game controls when paused
      if (isPausedRef.current) return;

      gameState.keys[e.key.toLowerCase()] = true;
      if (e.key === " ") {
        e.preventDefault();
        shoot();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      gameState.keys[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Helper function to play sound from pool (instant, no delay)
    const playSoundFromPool = (
      pool: HTMLAudioElement[],
      poolKey: keyof typeof audioPoolIndexRef.current
    ) => {
      if (pool.length === 0) return;

      // Get next audio element from pool (round-robin)
      const index = audioPoolIndexRef.current[poolKey];
      const audio = pool[index];

      // Update index for next time
      audioPoolIndexRef.current[poolKey] = (index + 1) % pool.length;

      // Update volume to match current game volume
      audio.volume = (volume / 100) * 0.8;

      // Reset to start and play
      audio.currentTime = 0;

      // Play with error handling
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          // If audio isn't ready yet, try to load it first
          if (audio.readyState < 2) {
            audio.load();
            audio.addEventListener(
              "canplaythrough",
              () => {
                audio
                  .play()
                  .catch((e) =>
                    console.log("Delayed sound playback failed:", e)
                  );
              },
              { once: true }
            );
          } else {
            console.log("Sound playback failed:", error);
          }
        });
      }
    };

    // Shoot function
    const shoot = () => {
      // Can't shoot when immobilized
      if (gameState.isImmobilized) return;

      const now = Date.now();
      if (now - gameState.lastShot > 300) {
        // Fire rate limit
        const startX = gameState.player.x + gameState.player.width - 20;
        const startY = gameState.player.y + gameState.player.height * 0.28 - 5;
        gameState.bullets.push({
          x: startX,
          y: startY,
          width: canvas.width - startX, // Extends to right edge
          height: 6,
          speed: 0, // Lightning doesn't move
          active: true,
          lifetime: 0,
          maxLifetime: 36, // Visible for 36 frames (~600ms) - 50% longer
          hasHit: false,
        });
        gameState.lastShot = now;

        // Trigger recoil animation
        gameState.recoilProgress = 0; // Start animation from beginning
        gameState.recoilMaxOffsetX = -20; // Move back 20 pixels
        gameState.recoilMaxOffsetY = -8; // Move up 8 pixels

        // Play random shoot sound based on probability
        // 80% chance for sound 1, 20% chance for sound 2
        const randomValue = Math.random() * 100;

        if (randomValue < 80) {
          // 0-80: Sound 1 (80%)
          playSoundFromPool(shootSound1PoolRef.current, "shootSound1");
        } else {
          // 80-100: Sound 2 (20%)
          playSoundFromPool(shootSound2PoolRef.current, "shootSound2");
        }
      }
    };

    // Spawn enemies (infinite spawning over 120 seconds = 1 every 0.5 seconds)
    const spawnEnemy = () => {
      if (gameState.enemiesSpawned >= gameState.maxEnemies) return;

      const now = Date.now();
      if (now - gameState.lastEnemySpawn > 500) {
        // Spawn every 0.5 seconds
        // Find a Y position that doesn't conflict with existing enemies
        let yPos = 0;
        let attempts = 0;
        let validPosition = false;
        const enemyHeight = 35;
        const minVerticalGap = 50; // Minimum vertical distance between enemies

        while (!validPosition && attempts < 50) {
          // Add margins to keep enemies away from top and bottom edges
          const topMargin = 40; // Don't spawn in top 40 pixels
          const bottomMargin = 130; // Don't spawn in bottom 130 pixels (keep away from bottom)
          const spawnableHeight =
            canvas.height - topMargin - bottomMargin - enemyHeight;

          yPos = topMargin + Math.random() * spawnableHeight;
          validPosition = true;

          // Check if this Y position conflicts with any active enemy
          for (const enemy of gameState.enemies) {
            if (enemy.active) {
              const verticalDistance = Math.abs(yPos - enemy.y);
              // If too close vertically, this position is invalid
              if (verticalDistance < minVerticalGap) {
                validPosition = false;
                break;
              }
            }
          }

          attempts++;
        }

        // Only spawn if we found a valid position
        if (validPosition) {
          // Randomly select one of the available dog types, but avoid the last spawned dog
          let randomImageIndex = Math.floor(Math.random() * enemyTypes.length);

          // Try to avoid spawning the same dog consecutively (reroll up to 3 times)
          let rerollAttempts = 0;
          while (
            randomImageIndex === gameState.lastSpawnedDogIndex &&
            rerollAttempts < 3 &&
            enemyTypes.length > 1
          ) {
            randomImageIndex = Math.floor(Math.random() * enemyTypes.length);
            rerollAttempts++;
          }

          // Update last spawned dog
          gameState.lastSpawnedDogIndex = randomImageIndex;

          // Store only height at spawn - width will be calculated at draw time using actual aspect ratio
          const enemyHeight = enemyTargetHeight;

          // Create chaotic, random vertical movement patterns
          const movementType = Math.random();
          let maxUp, maxDown, vSpeed, initialDirection, changeChance;

          if (movementType < 0.05) {
            // Only moves down - slow drift (5% chance)
            maxUp = 0;
            maxDown = 40 + Math.random() * 60; // 40-100 pixels down
            vSpeed = 0.1 + Math.random() * 0.2; // 0.1-0.3 pixels per frame (slow)
            initialDirection = -1;
            changeChance = 0.001; // Very rarely changes (stays going down)
          } else if (movementType < 0.1) {
            // Only moves up - slow rise (5% chance)
            maxUp = 40 + Math.random() * 60; // 40-100 pixels up
            maxDown = 0;
            vSpeed = 0.1 + Math.random() * 0.2;
            initialDirection = 1;
            changeChance = 0.001;
          } else if (movementType < 0.3) {
            // Big up, small down (like 50% up, 10% down) (20% chance)
            maxUp = 60 + Math.random() * 80; // 60-140 pixels up
            maxDown = 5 + Math.random() * 15; // 5-20 pixels down
            vSpeed = 0.15 + Math.random() * 0.25; // 0.15-0.4 pixels per frame
            initialDirection = Math.random() > 0.5 ? 1 : -1;
            changeChance = 0.008 + Math.random() * 0.008; // 0.8-1.6% chance per frame (once per ~60-125 frames)
          } else if (movementType < 0.5) {
            // Small up, big down (20% chance)
            maxUp = 5 + Math.random() * 15; // 5-20 pixels up
            maxDown = 60 + Math.random() * 80; // 60-140 pixels down
            vSpeed = 0.15 + Math.random() * 0.25;
            initialDirection = Math.random() > 0.5 ? 1 : -1;
            changeChance = 0.008 + Math.random() * 0.008;
          } else if (movementType < 0.75) {
            // Erratic movement - changes direction but not too frequently (25% chance)
            maxUp = 20 + Math.random() * 50;
            maxDown = 20 + Math.random() * 50;
            vSpeed = 0.2 + Math.random() * 0.3; // 0.2-0.5 pixels per frame
            initialDirection = Math.random() > 0.5 ? 1 : -1;
            changeChance = 0.012 + Math.random() * 0.004; // 1.2-1.6% chance - max once per second
          } else {
            // Balanced bobbing (25% chance)
            const range = 30 + Math.random() * 40;
            maxUp = range;
            maxDown = range;
            vSpeed = 0.12 + Math.random() * 0.2; // 0.12-0.32 pixels per frame
            initialDirection = Math.random() > 0.5 ? 1 : -1;
            changeChance = 0.008 + Math.random() * 0.008; // 0.8-1.6% chance
          }

          gameState.enemies.push({
            x: canvas.width,
            y: yPos,
            width: enemyHeight * (enemyBodyAspectRatios[randomImageIndex] || 1), // Calculate with current aspect ratio
            height: enemyHeight,
            speed: 2.1 + Math.random() * 2.9,
            active: true,
            imageIndex: randomImageIndex,
            baseY: yPos,
            verticalSpeed: vSpeed,
            verticalDirection: initialDirection,
            maxUpOffset: maxUp,
            maxDownOffset: maxDown,
            currentOffset: 0,
            changeDirectionChance: changeChance,
          });
          gameState.lastEnemySpawn = now;
          gameState.enemiesSpawned++;
        } else {
          // If we couldn't find a valid position, try again sooner
          gameState.lastEnemySpawn = now - 600; // Retry in half the normal time
        }
      }
    };

    // Spawn Candyman enemy (first one after 10 seconds, then every 15-20 seconds)
    const spawnCandyman = () => {
      const now = Date.now();

      // First Candyman: wait 10 seconds (gives audio time to load and player to get ready)
      // Subsequent Candyman: random interval between 15-20 seconds (15000-20000 ms)
      const isFirstCandyman = !gameState.firstCandymanSpawned;
      const spawnInterval = isFirstCandyman
        ? 10000
        : 15000 + Math.random() * 5000;

      if (now - gameState.lastCandymanSpawn > spawnInterval) {
        // Mark that first Candyman has been spawned
        gameState.firstCandymanSpawned = true;
        // Spawn Candyman at a consistent position relative to player
        const topMargin = 50;
        const bottomMargin = 150;
        // Candyman height is 2/3 of player height, scaled proportionally
        const candymanHeight = 234 * (gameState.playerScale || 1.0) * (2 / 3);
        // Width will be calculated at draw time, but use current aspect ratio for spawn positioning
        const candymanWidth = candymanHeight * (candymanAspectRatio || 1);
        const spawnableHeight =
          canvas.height - topMargin - bottomMargin - candymanHeight;

        // Always spawn Candyman in the vertical center of the playable area
        // This ensures consistent difficulty - player always has equal room to dodge up or down
        const yPos = topMargin + spawnableHeight / 2;

        // FIXED speed: always takes exactly 4.5 seconds to cross screen for consistency
        // At 60fps: 4.5 seconds = 270 frames
        const crossTime = 270; // Fixed duration
        const speed = canvas.width / crossTime;

        gameState.enemies.push({
          x: canvas.width,
          y: yPos,
          width: candymanWidth, // Width for collision detection (with proper aspect ratio)
          height: candymanHeight, // Height for collision detection
          speed: speed,
          active: true,
          imageIndex: 0, // Not used for Candyman
          baseY: yPos,
          verticalSpeed: 0, // Will be calculated dynamically to follow player
          verticalDirection: 1,
          maxUpOffset: 9999, // No limits - can follow player anywhere
          maxDownOffset: 9999,
          currentOffset: 0,
          changeDirectionChance: 0,
          isCandyman: true, // Mark as Candyman
        });

        gameState.lastCandymanSpawn = now;
      }
    };

    // Draw player (8-bit style flying character)
    const drawPlayer = () => {
      const p = gameState.player;

      // Draw jetpack flames behind the player
      // Alternate between flame1 and flame2 every 16 frames for flickering effect
      const useFlame1 = Math.floor(gameState.animationFrame / 16) % 2 === 0;
      const flameImg = useFlame1 ? flame1Img : flame2Img;
      const flameLoaded = useFlame1 ? flame1Loaded : flame2Loaded;
      const flameAspectRatio = useFlame1
        ? flame1AspectRatio
        : flame2AspectRatio;

      if (flameLoaded && flameImg.complete && flameImg.naturalWidth > 0) {
        // Position flames behind the jetpack
        // Scale flame proportionally with player size
        const baseFlameHeight = 65;
        const playerScale = gameState.playerScale || 1.0;
        const flameHeight = baseFlameHeight * playerScale;
        const flameWidth = flameHeight * flameAspectRatio;

        // Position flame behind the character's back/jetpack area (scale offsets too)
        const flameX = p.x + flameWidth * 0.05; // Behind the player (even more to the right)
        const flameY = p.y + p.height * 0.35; // Centered on jetpack area

        // Set opacity: 90% for big flame (flame1), 70% for small flame (flame2)
        ctx.globalAlpha = useFlame1 ? 0.9 : 0.7;

        ctx.drawImage(flameImg, flameX, flameY, flameWidth, flameHeight);

        // Reset opacity
        ctx.globalAlpha = 1;
      }

      if (
        playerImageLoaded &&
        playerImg.complete &&
        playerImg.naturalWidth > 0
      ) {
        // Apply flashing effect when immobilized
        // Flash four times over 4 seconds (240 frames)
        // Each cycle: 30 frames at 100%, 30 frames at 50%
        if (gameState.isImmobilized) {
          const flashCycle = gameState.immobilizedFlashFrame % 30;
          ctx.globalAlpha = flashCycle < 15 ? 1.0 : 0.5;
        }

        // Draw body (50% bigger: 120x180)
        ctx.drawImage(playerImg, p.x, p.y, p.width, p.height);

        // Draw face on top of body
        // Choose face based on timers (immobilized, celebration, angry), otherwise normal
        let faceImg = faceNormalImg;
        let faceLoaded = faceNormalLoaded;
        let faceOriginalWidth = faceNormalWidth;
        let faceOriginalHeight = faceNormalHeight;

        // Priority: immobilized (sad), celebration face (4 hits), angry face (miss), normal (default)
        if (gameState.isImmobilized && faceSadLoaded) {
          faceImg = faceSadImg; // Sad face when immobilized
          faceLoaded = faceSadLoaded;
          faceOriginalWidth = faceSadWidth;
          faceOriginalHeight = faceSadHeight;
        } else if (gameState.celebrationTimer > 0 && faceCelebrationLoaded) {
          faceImg = faceCelebrationImg; // Celebration face for hitting 4 in a row
          faceLoaded = faceCelebrationLoaded;
          faceOriginalWidth = faceCelebrationWidth;
          faceOriginalHeight = faceCelebrationHeight;
        } else if (gameState.missTimer > 0 && faceAngryLoaded) {
          faceImg = faceAngryImg; // Angry face when missing
          faceLoaded = faceAngryLoaded;
          faceOriginalWidth = faceAngryWidth;
          faceOriginalHeight = faceAngryHeight;
        }

        if (
          faceLoaded &&
          faceOriginalWidth > 0 &&
          faceOriginalHeight > 0 &&
          faceImg.complete &&
          faceImg.naturalWidth > 0
        ) {
          // Scale face proportionally with body size
          const baseTargetHeight = 62.4;
          const playerScale = gameState.playerScale || 1.0;
          const targetHeight = baseTargetHeight * playerScale; // Scale with body
          const aspectRatio = faceOriginalWidth / faceOriginalHeight;
          const faceHeight = targetHeight;
          const faceWidth = faceHeight * aspectRatio;

          const faceX = p.x + (p.width - faceWidth) / 2 - 8 * playerScale; // Scale offset too
          const faceY = p.y - faceHeight * 0.5 - 2 * playerScale; // Scale vertical offset
          ctx.drawImage(faceImg, faceX, faceY, faceWidth, faceHeight);
        }

        // Reset opacity after drawing player
        ctx.globalAlpha = 1;
      } else {
        // Fallback: Draw simple rectangle if image not loaded
        ctx.fillStyle = "#3B82F6";
        ctx.fillRect(p.x, p.y, p.width, p.height);
      }
    };

    // Draw bullets as lightning bolts
    const drawBullets = () => {
      gameState.bullets.forEach((bullet) => {
        if (bullet.active) {
          // Fade out effect based on lifetime
          const fadeRatio = 1 - bullet.lifetime / bullet.maxLifetime;
          const opacity = fadeRatio * 0.9 + 0.1; // 0.1 to 1.0

          const segments = Math.floor(bullet.width / 40) + 3; // More segments for longer bolts
          const segmentLength = bullet.width / segments;
          const taperDistancePx = 100; // Last 100 pixels taper to a point

          // Draw outer glow layer with tapering and independent randomness
          ctx.shadowBlur = 20 * fadeRatio;
          ctx.shadowColor = "#3B82F6";

          let currentX = bullet.x;
          let prevX = bullet.x;
          let prevY = bullet.y;

          for (let i = 0; i < segments; i++) {
            currentX += segmentLength;
            const offsetY =
              (Math.random() - 0.5) * 12 +
              Math.sin((bullet.lifetime + i) * 0.5) * 6;
            const currentY = bullet.y + offsetY;

            // Calculate taper based on pixels from end
            const pixelsFromStart = i * segmentLength;
            const pixelsFromEnd = bullet.width - pixelsFromStart;
            const taperFactor =
              pixelsFromEnd < taperDistancePx
                ? pixelsFromEnd / taperDistancePx // 0 at end, 1 at start of taper
                : 1;

            // Apply opacity taper only in the tapered section
            const opacityTaper =
              pixelsFromEnd < taperDistancePx
                ? pixelsFromEnd / taperDistancePx
                : 1;

            ctx.strokeStyle = `rgba(96, 165, 250, ${opacity * opacityTaper})`;
            ctx.lineWidth = 4 * taperFactor;
            ctx.beginPath();
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(currentX, currentY);
            ctx.stroke();

            prevX = currentX;
            prevY = currentY;
          }

          // Draw bright core layer with tapering and independent randomness
          ctx.shadowBlur = 15 * fadeRatio;
          ctx.shadowColor = "#60A5FA";

          currentX = bullet.x;
          prevX = bullet.x;
          prevY = bullet.y;

          for (let i = 0; i < segments; i++) {
            currentX += segmentLength;
            const offsetY =
              (Math.random() - 0.5) * 8 +
              Math.sin((bullet.lifetime + i) * 0.5) * 4;
            const currentY = bullet.y + offsetY;

            const pixelsFromStart = i * segmentLength;
            const pixelsFromEnd = bullet.width - pixelsFromStart;
            const taperFactor =
              pixelsFromEnd < taperDistancePx
                ? pixelsFromEnd / taperDistancePx
                : 1;

            const opacityTaper =
              pixelsFromEnd < taperDistancePx
                ? pixelsFromEnd / taperDistancePx
                : 1;

            ctx.strokeStyle = `rgba(191, 219, 254, ${opacity * opacityTaper})`;
            ctx.lineWidth = 2 * taperFactor;
            ctx.beginPath();
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(currentX, currentY);
            ctx.stroke();

            prevX = currentX;
            prevY = currentY;
          }

          // Add occasional bright flashes with tapering and independent randomness
          if (bullet.lifetime < 3 && Math.random() > 0.5) {
            ctx.shadowBlur = 25 * fadeRatio;

            currentX = bullet.x;
            prevX = bullet.x;
            prevY = bullet.y;

            for (let i = 0; i < segments; i++) {
              currentX += segmentLength;
              const offsetY = (Math.random() - 0.5) * 6;
              const currentY = bullet.y + offsetY;

              const pixelsFromStart = i * segmentLength;
              const pixelsFromEnd = bullet.width - pixelsFromStart;
              const taperFactor =
                pixelsFromEnd < taperDistancePx
                  ? pixelsFromEnd / taperDistancePx
                  : 1;

              const opacityTaper =
                pixelsFromEnd < taperDistancePx
                  ? pixelsFromEnd / taperDistancePx
                  : 1;

              ctx.strokeStyle = `rgba(255, 255, 255, ${
                opacity * 0.6 * opacityTaper
              })`;
              ctx.lineWidth = 1 * taperFactor;
              ctx.beginPath();
              ctx.moveTo(prevX, prevY);
              ctx.lineTo(currentX, currentY);
              ctx.stroke();

              prevX = currentX;
              prevY = currentY;
            }
          }

          // Reset shadow
          ctx.shadowBlur = 0;
        }
      });
    };

    // Draw enemies (flying dog sprites)
    const drawEnemies = () => {
      gameState.enemies.forEach((enemy) => {
        if (enemy.active || enemy.isDying) {
          const enemyBodyImg = enemyBodyImages[enemy.imageIndex];
          const bodyIsLoaded = enemyBodyImagesLoaded[enemy.imageIndex];
          const enemySkeletonImg = enemySkeletonImages[enemy.imageIndex];
          const skeletonIsLoaded = enemySkeletonImagesLoaded[enemy.imageIndex];

          // Recalculate width using actual loaded aspect ratio (fixes distortion on first spawns)
          if (!enemy.isCandyman) {
            const actualAspectRatio = enemyBodyAspectRatios[enemy.imageIndex];
            if (actualAspectRatio && actualAspectRatio !== 1) {
              enemy.width = enemy.height * actualAspectRatio;
            }
          } else {
            // Candyman: recalculate width using actual aspect ratio
            if (candymanAspectRatio && candymanAspectRatio !== 1) {
              enemy.width = enemy.height * candymanAspectRatio;
            }
          }

          // Death animation logic
          if (enemy.isDying && enemy.deathFrame !== undefined) {
            const deathDuration = 135; // Death animation lasts 135 frames (~2250ms) - 50% slower

            // Flash skeleton three times (150ms each ≈ 9 frames), then show normal sprite fading out slowly
            // Frames 0-8: skeleton (first flash - 150ms)
            // Frames 9-17: dog
            // Frames 18-26: skeleton (second flash - 150ms)
            // Frames 27-35: dog
            // Frames 36-44: skeleton (third flash - 150ms)
            // Frames 45-134: dog (fading out slowly over ~1500ms)
            const frame = enemy.deathFrame;
            const showSkeleton =
              (frame >= 0 && frame <= 8) ||
              (frame >= 18 && frame <= 26) ||
              (frame >= 36 && frame <= 44);

            // Only apply fade after the skeleton flashes (frame 45+)
            let opacity = 1;
            if (frame >= 45) {
              const fadeStart = 45;
              const fadeDuration = deathDuration - fadeStart;
              const fadeProgress = (frame - fadeStart) / fadeDuration;
              opacity = 1 - fadeProgress; // Fade from 1 to 0
            }

            ctx.save();
            ctx.globalAlpha = opacity;

            if (
              showSkeleton &&
              skeletonIsLoaded &&
              enemySkeletonImg.complete &&
              enemySkeletonImg.naturalWidth > 0
            ) {
              // Draw skeleton sprite specific to this enemy type
              ctx.drawImage(
                enemySkeletonImg,
                enemy.x,
                enemy.y,
                enemy.width,
                enemy.height
              );
            } else if (
              bodyIsLoaded &&
              enemyBodyImg &&
              enemyBodyImg.complete &&
              enemyBodyImg.naturalWidth > 0
            ) {
              // Draw original dog sprite
              ctx.drawImage(
                enemyBodyImg,
                enemy.x,
                enemy.y,
                enemy.width,
                enemy.height
              );
            }

            ctx.restore();
          } else if (enemy.active) {
            // Normal enemy rendering
            if (enemy.isCandyman) {
              // Draw Candyman's flame first (behind the sprite)
              if (
                flame1Loaded &&
                flame1Img.complete &&
                flame1Img.naturalWidth > 0
              ) {
                // Use big flame (flame1) - non-flickering, rotated 90 degrees, 50% bigger
                const playerScale = gameState.playerScale || 1.0;
                const baseFlameHeight = 65 * playerScale * 1.5; // 50% bigger
                const flameHeight = baseFlameHeight;
                const flameWidth = flameHeight * flame1AspectRatio;

                // Position flame at 65% of sprite width
                // Place at 10% from top of Candyman
                const flameX = enemy.x + enemy.width * 0.65 - flameWidth * 0.3; // At 65% width
                const flameY = enemy.y + enemy.height * 0.1; // 10% from the top

                // Save context for rotation
                ctx.save();

                // Move to the flame's center point for rotation
                ctx.translate(
                  flameX + flameWidth / 2,
                  flameY + flameHeight / 2
                );

                // Rotate 90 degrees clockwise (Math.PI / 2 radians)
                ctx.rotate(Math.PI / 2);

                // Flip vertically
                ctx.scale(1, -1);

                // Set opacity: 90% like the big player flame
                ctx.globalAlpha = 0.9;

                // Draw flame (centered at origin after translation)
                ctx.drawImage(
                  flame1Img,
                  -flameWidth / 2,
                  -flameHeight / 2,
                  flameWidth,
                  flameHeight
                );

                // Restore context
                ctx.restore();
              }

              // Draw Candyman sprite
              if (
                candymanLoaded &&
                candymanImg.complete &&
                candymanImg.naturalWidth > 0
              ) {
                ctx.drawImage(
                  candymanImg,
                  enemy.x,
                  enemy.y,
                  enemy.width,
                  enemy.height
                );
              } else {
                // Fallback: orange ellipse if image not loaded
                const candymanSize = (234 * (gameState.playerScale || 1.0)) / 3;
                const centerX = enemy.x + enemy.width / 2;
                const centerY = enemy.y + enemy.height / 2;
                ctx.fillStyle = "#FF8C00";
                ctx.beginPath();
                ctx.ellipse(
                  centerX,
                  centerY,
                  candymanSize / 2,
                  candymanSize / 2,
                  0,
                  0,
                  Math.PI * 2
                );
                ctx.fill();
              }
            } else if (
              bodyIsLoaded &&
              enemyBodyImg &&
              enemyBodyImg.complete &&
              enemyBodyImg.naturalWidth > 0
            ) {
              // Draw the dog sprite
              ctx.drawImage(
                enemyBodyImg,
                enemy.x,
                enemy.y,
                enemy.width,
                enemy.height
              );
            } else {
              // Fallback: Draw simple rectangle if image not loaded
              ctx.fillStyle = "#EF4444";
              ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            }
          }
        }
      });
    };

    // Collision detection
    const checkCollisions = () => {
      gameState.bullets.forEach((bullet) => {
        if (!bullet.active || bullet.hasHit) return;

        gameState.enemies.forEach((enemy) => {
          if (!enemy.active || enemy.isDying) return;

          // Skip Candyman - cannot be shot
          if (enemy.isCandyman) return;

          // Only allow hits on enemies that are fully visible (not still spawning at right edge)
          const enemyIsVisible = enemy.x + enemy.width < canvas.width;

          if (
            enemyIsVisible &&
            bullet.x < enemy.x + enemy.width &&
            bullet.x + bullet.width > enemy.x &&
            bullet.y < enemy.y + enemy.height &&
            bullet.y + bullet.height > enemy.y
          ) {
            // Start death animation instead of immediately deactivating
            enemy.active = false;
            enemy.isDying = true;
            enemy.deathFrame = 0;
            bullet.hasHit = true; // Mark that this bullet hit something

            // Truncate bullet width to stop at this enemy (so it can't hit enemies behind it)
            const hitDistance = enemy.x - bullet.x;
            // Extend to middle of sprite to account for transparent padding, minimum 150px for visibility
            bullet.width = Math.max(hitDistance + enemy.width * 0.5, 150);

            gameState.consecutiveHits++; // Increment hit streak

            // Trigger celebration face and supporter if player hits 10 in a row
            if (gameState.consecutiveHits === 10) {
              gameState.celebrationTimer = 120; // Show celebration face for 120 frames (~2 seconds)
              gameState.consecutiveHits = 0; // Reset counter so player can get another 10-hit streak

              // Show supporter with positive message
              const randomImage =
                supporterImages[
                  Math.floor(Math.random() * supporterImages.length)
                ];
              const randomText =
                positiveMessages[
                  Math.floor(Math.random() * positiveMessages.length)
                ];
              setSupporterDisplay({
                visible: true,
                fadeState: "in",
                image: randomImage,
                text: randomText,
              });
              supporterTimerRef.current = 0; // Reset timer
            }

            // Play random hit sound based on probability
            // 30% chance for sound 1, 60% chance for sound 2, 10% chance for sound 3
            const randomValue = Math.random() * 100;

            if (randomValue < 30) {
              // 0-30: Sound 1 (30%)
              playSoundFromPool(hitSound1PoolRef.current, "hitSound1");
            } else if (randomValue < 90) {
              // 30-90: Sound 2 (60%)
              playSoundFromPool(hitSound2PoolRef.current, "hitSound2");
            } else {
              // 90-100: Sound 3 (10%)
              playSoundFromPool(hitSound3PoolRef.current, "hitSound3");
            }

            setScore((prev) => prev + 1); // Count each enemy hit
          }
        });
      });

      // Check Candyman collision with player
      if (!gameState.isImmobilized) {
        const p = gameState.player;
        gameState.enemies.forEach((enemy) => {
          if (!enemy.active || !enemy.isCandyman) return;

          // Create hitbox for Candyman's fists (left side of image, 40% down from top)
          const fistHitboxWidth = enemy.width * 0.25; // 25% of image width for fist area
          const fistHitboxHeight = enemy.height * 0.3; // 30% of image height for fist area
          const fistHitboxX = enemy.x; // Left edge of image
          const fistHitboxY =
            enemy.y + enemy.height * 0.4 - fistHitboxHeight / 2; // Centered at 40% down

          // Create player hitbox for only top 60% (torso and head, excluding legs)
          const playerHitboxHeight = p.height * 0.6; // Only top 60% of player

          // Check if Candyman's fist hitbox collides with player's top 60%
          if (
            p.x < fistHitboxX + fistHitboxWidth &&
            p.x + p.width > fistHitboxX &&
            p.y < fistHitboxY + fistHitboxHeight &&
            p.y + playerHitboxHeight > fistHitboxY
          ) {
            // Immobilize player
            gameState.isImmobilized = true;
            gameState.immobilizedTimer = 240; // 4 seconds at 60fps
            gameState.immobilizedFlashFrame = 0;

            // Play Candyman hit sound
            playSoundFromPool(candymanHitSoundPoolRef.current, "candymanHit");

            // Remove the Candyman that hit the player
            enemy.active = false;
          }
        });
      }
    };

    // Update game state
    const update = () => {
      const p = gameState.player;

      // Update immobilization timer
      if (gameState.isImmobilized) {
        gameState.immobilizedTimer--;
        gameState.immobilizedFlashFrame++;

        if (gameState.immobilizedTimer <= 0) {
          gameState.isImmobilized = false;
          gameState.immobilizedTimer = 0;
          gameState.immobilizedFlashFrame = 0;
        }
      }

      // Track if player is actively moving (but not when immobilized)
      const isMovingUp =
        !gameState.isImmobilized &&
        (gameState.keys["w"] || gameState.keys["arrowup"]);
      const isMovingDown =
        !gameState.isImmobilized &&
        (gameState.keys["s"] || gameState.keys["arrowdown"]);

      // Player movement with inertia for both directions
      if (isMovingUp) {
        // Accelerate upward
        gameState.velocityY = Math.max(
          gameState.velocityY - 0.7,
          -p.speed * 1.5
        );
        gameState.isPlayerMoving = true;
      } else if (isMovingDown) {
        // Accelerate downward (with inertia)
        gameState.velocityY = Math.min(
          gameState.velocityY + 0.7,
          p.speed * 1.5
        );
        gameState.isPlayerMoving = true;
      } else {
        // Apply friction/deceleration when no keys pressed
        if (Math.abs(gameState.velocityY) > 0.1) {
          gameState.velocityY *= 0.8; // Gradual slowdown with more coasting
          gameState.isPlayerMoving = true;
        } else {
          gameState.velocityY = 0;
          gameState.isPlayerMoving = false;
        }
      }

      // Apply velocity to position
      if (gameState.isPlayerMoving) {
        p.y += gameState.velocityY;
        // Clamp position - allow moving slightly outside screen vertically
        p.y = Math.max(
          -p.height * 0.3,
          Math.min(canvas.height - p.height * 0.4, p.y)
        );
        gameState.basePlayerY = p.y; // Update base position when moving
      }

      // Gentle floating animation when stationary
      if (!gameState.isPlayerMoving) {
        const floatOffset = Math.sin(gameState.animationFrame * 0.03) * 3; // 3 pixels amplitude, slow speed
        p.y = gameState.basePlayerY + floatOffset;
      }

      // Handle recoil animation with smooth easing (no overshoot)
      if (gameState.recoilProgress < 1) {
        // Advance animation progress (54 frames = 900ms at 60fps)
        gameState.recoilProgress += 1 / 54; // Increment by 1/54 each frame for 900ms duration

        if (gameState.recoilProgress >= 1) {
          gameState.recoilProgress = 1; // Clamp to 1 when done
        }

        // Easing function: smooth out and back with no overshoot
        // Using ease-out-cubic for the return: fast start, slow end
        const t = gameState.recoilProgress;
        const easeProgress =
          t < 0.5
            ? 2 * t * t // Ease out in first half (going back)
            : 1 - Math.pow(-2 * t + 2, 2) / 2; // Ease in during second half (returning)

        // Calculate current offsets based on eased progress
        // Progress goes 0 -> 1 -> 0 (out and back)
        const offsetMultiplier = t < 0.5 ? easeProgress : 1 - easeProgress;

        const recoilOffsetX = gameState.recoilMaxOffsetX * offsetMultiplier;
        const recoilOffsetY = gameState.recoilMaxOffsetY * offsetMultiplier;

        // Apply recoil to player position
        p.x = gameState.basePlayerX + recoilOffsetX;
        p.y += recoilOffsetY; // Add to Y (applied after floating/movement)
      } else {
        // Animation complete - reset to base position
        p.x = gameState.basePlayerX;
      }

      // Increment bullet lifetime
      gameState.bullets.forEach((bullet) => {
        if (bullet.active) {
          bullet.lifetime++;
        }
      });

      // Update enemies
      gameState.enemies = gameState.enemies.filter((enemy) => {
        // Update death animation
        if (enemy.isDying) {
          if (enemy.deathFrame !== undefined) {
            enemy.deathFrame++;

            // Make the enemy fall downward while dying
            const fallSpeed = 2.5; // Pixels per frame falling speed
            enemy.y += fallSpeed;

            // Optionally slow down horizontal movement while dying
            enemy.x -= enemy.speed * 0.3; // 30% of normal speed

            // Remove enemy after death animation completes (135 frames) OR if it falls off screen
            if (
              enemy.deathFrame >= 135 ||
              enemy.y > canvas.height + enemy.height
            ) {
              return false;
            }
          }
          return true;
        }

        // Move active enemies
        if (!enemy.active) return false;
        enemy.x -= enemy.speed;

        // Remove enemies that have escaped off screen (no penalty)
        if (enemy.x + enemy.width <= 0) {
          return false; // Remove the enemy
        }

        // Special movement for Candyman: follow the player
        if (enemy.isCandyman) {
          // Track the center of the player's vulnerable area (top 60% = torso + head)
          // Center of top 60% is at 30% from top
          const playerCenterY = p.y + p.height * 0.3;
          const enemyCenterY = enemy.y + enemy.height / 2;
          const verticalDistance = enemyCenterY - playerCenterY;

          // Move towards player aggressively (73% harder than original)
          const followSpeed = 1.50336; // 20% faster than previous (1.2528 * 1.2)
          const deadZone = 6; // Extremely tight dead zone for precise tracking

          if (Math.abs(verticalDistance) > deadZone) {
            // Move towards player quickly and aggressively
            if (verticalDistance > 0) {
              // Enemy is below player, move up
              enemy.y -= followSpeed;
            } else {
              // Enemy is above player, move down
              enemy.y += followSpeed;
            }
          }

          // Continue to next enemy
          return enemy.x + enemy.width > 0;
        }

        // Check if enemy should avoid the player (regular enemies)
        const playerCenterY = p.y + p.height / 2;
        const enemyCenterY = enemy.y + enemy.height / 2;
        const verticalDistance = Math.abs(enemyCenterY - playerCenterY);
        const avoidanceZone = 150; // If within 150 pixels vertically, try to avoid
        const isAvoiding = verticalDistance < avoidanceZone;

        let currentVerticalSpeed = enemy.verticalSpeed;

        // First, handle normal movement patterns (boundaries and random changes)
        if (!isAvoiding) {
          // Check if we've hit the limits and need to reverse direction
          if (
            enemy.verticalDirection > 0 &&
            enemy.currentOffset >= enemy.maxUpOffset
          ) {
            enemy.verticalDirection = -1;
            enemy.currentOffset = enemy.maxUpOffset; // Clamp to max
          } else if (
            enemy.verticalDirection < 0 &&
            enemy.currentOffset <= -enemy.maxDownOffset
          ) {
            enemy.verticalDirection = 1;
            enemy.currentOffset = -enemy.maxDownOffset; // Clamp to max
          }

          // Random chance to change direction (creates erratic movement)
          if (Math.random() < enemy.changeDirectionChance) {
            enemy.verticalDirection *= -1;
          }
        } else {
          // AVOIDANCE MODE - override normal behavior
          // Force direction to move AWAY from the player
          if (enemyCenterY > playerCenterY) {
            // Enemy is below player (higher Y), move DOWN (increase Y, direction = 1)
            enemy.verticalDirection = 1;
          } else {
            // Enemy is above player (lower Y), move UP (decrease Y, direction = -1)
            enemy.verticalDirection = -1;
          }

          // MUCH FASTER vertical speed when avoiding!
          // The closer they are, the faster they move
          const proximityRatio = 1 - verticalDistance / avoidanceZone;
          currentVerticalSpeed = 2.5 + proximityRatio * 2.5; // 2.5-5 pixels per frame (10-20x faster!)

          // Still respect boundaries, but with avoidance priority
          // If we hit a boundary while trying to avoid, clamp but keep trying to avoid
          if (
            enemy.verticalDirection > 0 &&
            enemy.currentOffset >= enemy.maxUpOffset
          ) {
            enemy.currentOffset = enemy.maxUpOffset; // Clamp but don't reverse
          } else if (
            enemy.verticalDirection < 0 &&
            enemy.currentOffset <= -enemy.maxDownOffset
          ) {
            enemy.currentOffset = -enemy.maxDownOffset; // Clamp but don't reverse
          }
        }

        // Apply vertical movement (use boosted speed when avoiding)
        enemy.currentOffset += enemy.verticalDirection * currentVerticalSpeed;

        // Apply the offset to Y position
        enemy.y = enemy.baseY + enemy.currentOffset;

        return enemy.x + enemy.width > 0;
      });

      // Check collisions BEFORE removing expired bullets
      checkCollisions();

      // Remove expired bullets AFTER collision check
      gameState.bullets = gameState.bullets.filter((bullet) => {
        if (!bullet.active) return false;
        // Remove bullet after its lifetime expires
        if (bullet.lifetime >= bullet.maxLifetime) {
          // If bullet expired without hitting anything
          if (!bullet.hasHit) {
            gameState.consecutiveHits = 0; // Always reset consecutive hits on miss
            gameState.missTimer = 60; // Always show angry face for 60 frames (~1 second)

            // Only show supporter if cooldown has passed (5 seconds = 300 frames)
            const framesSinceLastNegative =
              gameState.animationFrame - lastNegativeSupporterFrame.current;
            if (framesSinceLastNegative >= 300) {
              // Show supporter with negative message
              const randomImage =
                supporterImages[
                  Math.floor(Math.random() * supporterImages.length)
                ];
              const randomText =
                negativeMessages[
                  Math.floor(Math.random() * negativeMessages.length)
                ];
              setSupporterDisplay({
                visible: true,
                fadeState: "in",
                image: randomImage,
                text: randomText,
              });
              supporterTimerRef.current = 0; // Reset timer
              lastNegativeSupporterFrame.current = gameState.animationFrame; // Record when this negative supporter was shown
            }
          }
          return false;
        }
        return true;
      });

      // Decrement miss timer
      if (gameState.missTimer > 0) {
        gameState.missTimer--;
      }

      // Decrement celebration timer
      if (gameState.celebrationTimer > 0) {
        gameState.celebrationTimer--;
      }

      spawnEnemy();
      spawnCandyman();
      gameState.animationFrame++;

      // Update supporter animation
      if (supporterDisplayRef.current && supporterDisplayRef.current.visible) {
        supporterTimerRef.current++;

        // Fade in: 0-18 frames (300ms)
        // Visible: 18-138 frames (2000ms at full opacity)
        // Fade out: 138-210 frames (1200ms) - 4x longer than fade in
        if (supporterTimerRef.current === 18) {
          setSupporterDisplay((prev) =>
            prev ? { ...prev, fadeState: "visible" } : null
          );
        } else if (supporterTimerRef.current === 138) {
          setSupporterDisplay((prev) =>
            prev ? { ...prev, fadeState: "out" } : null
          );
        } else if (supporterTimerRef.current >= 210) {
          setSupporterDisplay(null);
          supporterTimerRef.current = 0;
        }
      }
    };

    // Draw everything
    const draw = () => {
      // Clear canvas
      ctx.fillStyle = "#0F172A";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw tiled background image
      if (
        bgImageLoaded &&
        bgWidth > 0 &&
        bgImage.complete &&
        bgImage.naturalWidth > 0
      ) {
        const numTiles = Math.ceil(canvas.width / bgWidth) + 1;
        for (let i = 0; i < numTiles; i++) {
          ctx.drawImage(bgImage, i * bgWidth, 0, bgWidth, canvas.height);
        }
      } else {
        // Fallback: Draw stars if image not loaded yet
        ctx.fillStyle = "#FFFFFF";
        for (let i = 0; i < 50; i++) {
          const x = (i * 37 + gameState.animationFrame) % canvas.width;
          const y = (i * 73) % canvas.height;
          ctx.fillRect(x, y, 2, 2);
        }
      }

      drawPlayer();
      drawBullets();
      drawEnemies();
    };

    // Game loop
    let gameLoop: number;
    const animate = () => {
      if (!isPausedRef.current && !isGameOverRef.current) {
        update();
      }
      draw();
      gameLoop = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      cancelAnimationFrame(gameLoop);

      // Stop music when component unmounts
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      // Remove music start listeners if they exist
      if ((window as any).__cleanupMusicListeners) {
        (window as any).__cleanupMusicListeners();
        delete (window as any).__cleanupMusicListeners;
      }
    };
  }, []); // Empty dependency - game loop only initializes once!

  // Pause/unpause audio when game is paused or game over
  useEffect(() => {
    if (audioRef.current) {
      if (isPaused || isGameOver) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch((error) => {
          console.log("Audio playback failed:", error);
        });
      }
    }
  }, [isPaused, isGameOver]);

  // Timer countdown
  useEffect(() => {
    console.log(
      `⏱️ Timer effect triggered - timeLeft: ${timeLeft}, isPaused: ${isPausedRef.current}, isGameOver: ${isGameOverRef.current}`
    );

    if (timeLeft <= 0) {
      // Time's up - always show victory screen
      console.log("⏱️ Time reached 0, setting game over");
      setIsGameOver(true);
      return;
    }

    const timer = setInterval(() => {
      // Check pause/game over state inside the interval
      if (isPausedRef.current || isGameOverRef.current) {
        console.log("⏱️ Timer interval skipped (paused or game over)");
        return; // Skip this tick, but keep interval running
      }

      console.log("⏱️ Timer tick - decrementing from", timeLeft);
      setTimeLeft((prev) => {
        const newTime = prev - 1;
        console.log(`⏱️ Time updated: ${prev} -> ${newTime}`);
        return newTime;
      });
    }, 1000);

    console.log(`⏱️ Timer interval created (ID: ${timer})`);

    return () => {
      console.log(`⏱️ Cleaning up timer interval (ID: ${timer})`);
      clearInterval(timer);
    };
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (newVolume > 0) {
      setPreviousVolume(newVolume);
    }
    if (audioRef.current) {
      audioRef.current.volume = (newVolume / 100) * 0.8; // 20% quieter at max
    }
  };

  const toggleMute = () => {
    if (volume === 0) {
      // Unmute: restore previous volume
      setVolume(previousVolume);
      if (audioRef.current) {
        audioRef.current.volume = (previousVolume / 100) * 0.8; // 20% quieter at max
      }
    } else {
      // Mute: set to 0 and save current volume
      setPreviousVolume(volume);
      setVolume(0);
      if (audioRef.current) {
        audioRef.current.volume = 0;
      }
    }
  };

  const handleRestart = () => {
    console.log("🔄 RESTART: Resetting all game state");
    // Reset all game state
    setScore(0);
    setTimeLeft(120);
    setIsGameOver(false);
    setSupporterDisplay(null);
    supporterTimerRef.current = 0;
    lastNegativeSupporterFrame.current = -999; // Reset negative supporter cooldown
    musicStartedRef.current = false; // Reset music flag so it can restart on first interaction
    gameStateRef.current.enemiesSpawned = 0;
    gameStateRef.current.enemies = [];
    gameStateRef.current.bullets = [];
    gameStateRef.current.consecutiveHits = 0;
    gameStateRef.current.missTimer = 0;
    gameStateRef.current.celebrationTimer = 0;
    gameStateRef.current.animationFrame = 0; // Reset animation frame counter
    gameStateRef.current.lastSpawnedDogIndex = -1; // Reset last spawned dog
    gameStateRef.current.lastEnemySpawn = Date.now(); // Reset spawn timers
    gameStateRef.current.lastCandymanSpawn = Date.now(); // Reset Candyman spawn timer
    gameStateRef.current.firstCandymanSpawned = false; // Reset first Candyman flag
    console.log("🔄 RESTART: Complete - timeLeft reset to 120");
  };

  return (
    <div className="size-full relative bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Background music */}
      <audio ref={audioRef} loop preload="auto">
        <source src="https://files.catbox.moe/dl702b.mp3" type="audio/mpeg" />
      </audio>

      {/* Hit sound effects */}
      <audio ref={hitSound1Ref} preload="auto">
        <source src="https://files.catbox.moe/9q9cj2.mp3" type="audio/mpeg" />
      </audio>
      <audio ref={hitSound2Ref} preload="auto">
        <source src="https://files.catbox.moe/k070y2.mp3" type="audio/mpeg" />
      </audio>
      <audio ref={hitSound3Ref} preload="auto">
        <source src="https://files.catbox.moe/xeapud.mp3" type="audio/mpeg" />
      </audio>

      {/* Shoot sound effects */}
      <audio ref={shootSound1Ref} preload="auto">
        <source src="https://files.catbox.moe/qm4nuo.mp3" type="audio/mpeg" />
      </audio>
      <audio ref={shootSound2Ref} preload="auto">
        <source src="https://files.catbox.moe/cp0rjm.mp3" type="audio/mpeg" />
      </audio>

      {/* Candyman hit sound */}
      <audio ref={candymanHitSoundRef} preload="auto">
        <source src="https://files.catbox.moe/udwke3.mp3" type="audio/mpeg" />
      </audio>

      {/* Canvas - Full screen */}
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />

      {/* Supporter Display - Above background, below game elements */}
      {supporterDisplay && supporterDisplay.visible && (
        <div className="absolute inset-0 z-[1] flex items-start justify-center pt-5 pointer-events-none">
          <div className="relative">
            {/* Image at 45% opacity with gradient fade at bottom - fixed height for consistency */}
            <img
              src={supporterDisplay.image}
              alt="Supporter"
              className="h-[70vh] w-auto transition-opacity duration-300"
              style={{
                opacity:
                  supporterDisplay.fadeState === "in"
                    ? (supporterTimerRef.current / 18) * 0.45
                    : supporterDisplay.fadeState === "out"
                    ? ((210 - supporterTimerRef.current) / 72) * 0.45
                    : 0.45,
                maskImage: "linear-gradient(to top, transparent 0%, black 50%)",
                WebkitMaskImage:
                  "linear-gradient(to top, transparent 0%, black 50%)",
              }}
            />
            {/* Text overlay at bottom - 90% opacity */}
            <div
              className="absolute bottom-[12%] left-1/2 -translate-x-1/2 w-full px-8 transition-opacity duration-300"
              style={{
                opacity:
                  supporterDisplay.fadeState === "in"
                    ? (supporterTimerRef.current / 18) * 0.9
                    : supporterDisplay.fadeState === "out"
                    ? ((210 - supporterTimerRef.current) / 72) * 0.9
                    : 0.9,
              }}
            >
              <p className="font-['Pixelify_Sans'] text-white text-center text-[32px] drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
                {supporterDisplay.text}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Volume Control - Top Left */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-[#0f111c]/80 px-4 py-3 rounded-lg border-2 border-[#f9c600] flex items-center gap-3 min-w-[200px]">
          <button
            onClick={toggleMute}
            className="flex-shrink-0 hover:opacity-80 transition-opacity cursor-pointer"
            aria-label={volume === 0 ? "Unmute" : "Mute"}
          >
            {volume === 0 ? (
              <VolumeX className="w-5 h-5 text-[#f9c600]" />
            ) : (
              <Volume2 className="w-5 h-5 text-[#f9c600]" />
            )}
          </button>
          <Slider
            value={[volume]}
            onValueChange={handleVolumeChange}
            max={100}
            step={1}
            className="flex-1 [&_[data-slot=slider-track]]:bg-gray-600 [&_[data-slot=slider-range]]:bg-gray-400 [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:border-white"
          />
          <span className="text-[#f9c600] text-sm min-w-[2.5rem] text-right font-['Pixelify_Sans']">
            {volume}%
          </span>
        </div>
      </div>

      {/* Score - Top Center */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-[#0f111c]/80 px-6 py-3 rounded-lg border-2 border-[#f9c600]">
          <span className="text-[#f9c600] mr-3 font-['Pixelify_Sans']">
            SCORE:
          </span>
          <span className="text-[#f9c600] font-['Pixelify_Sans']">{score}</span>
        </div>
      </div>

      {/* Timer - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-[#0f111c]/80 px-6 py-3 rounded-lg border-2 border-[#f9c600]">
          <span className="text-[#f9c600] mr-3 font-['Pixelify_Sans']">
            TIME:
          </span>
          <span
            className={`${
              timeLeft <= 10 ? "text-red-400" : "text-[#f9c600]"
            } font-['Pixelify_Sans']`}
          >
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      {/* Controls Text - Bottom Center */}
      <div className="absolute bottom-4 min-[1024px]:bottom-8 left-1/2 -translate-x-1/2 text-white/70 z-10 font-['Pixelify_Sans']">
        <div className="flex items-center justify-center gap-0">
          <span className="px-4">W / ↑ = UP</span>
          <span className="text-white/40">|</span>
          <span className="px-4">S / ↓ = DOWN</span>
          <span className="text-white/40">|</span>
          <span className="px-4">SPACE = SHOOT</span>
          <span className="text-white/40">|</span>
          <span className="px-4">ESC = PAUSE</span>
        </div>
      </div>

      {/* Pause Overlay */}
      {isPaused && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-gradient-to-b from-[rgba(16,18,28,0.95)] to-[#10121c] rounded-xl p-12 max-w-2xl text-center shadow-2xl">
            <h1
              className="font-['Pixelify_Sans'] text-yellow-400 mb-6"
              style={{ fontSize: "38.4px", textShadow: "4px 4px 0px #000" }}
            >
              Game Paused!
            </h1>
            <p className="font-['Pixelify_Sans'] text-white/80 mb-12 text-[20px] min-[1400px]:text-[24px]">
              You have paused the game.
            </p>
            <div className="flex gap-6 justify-center">
              <button
                onClick={() => setIsPaused(false)}
                className="bg-[#fbc600] box-border flex gap-[10px] items-center justify-center overflow-clip pb-[14px] pt-[11px] px-[28px] rounded-[8px] cursor-pointer hover:bg-[#e5b300] hover:-translate-y-[10px] transition-all duration-200 relative"
              >
                <span className="font-['Pixelify_Sans'] font-normal leading-[normal] text-[#0f111c] text-[28px] text-center text-nowrap whitespace-pre">
                  Continue
                </span>
                <div className="absolute inset-0 pointer-events-none shadow-[0px_-6px_0px_0px_inset_rgba(0,0,0,0.1)]" />
              </button>
              <button
                onClick={onQuit}
                className="bg-[#dc2626] box-border flex gap-[10px] items-center justify-center overflow-clip pb-[14px] pt-[11px] px-[28px] rounded-[8px] cursor-pointer hover:bg-[#b91c1c] hover:-translate-y-[10px] transition-all duration-200 relative"
              >
                <span className="font-['Pixelify_Sans'] font-normal leading-[normal] text-white text-[28px] text-center text-nowrap whitespace-pre">
                  Quit
                </span>
                <div className="absolute inset-0 pointer-events-none shadow-[0px_-6px_0px_0px_inset_rgba(0,0,0,0.1)]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {isGameOver &&
        (() => {
          // Calculate rank based on number of hits
          let rank = "D";
          if (score >= 200) rank = "S";
          else if (score >= 150) rank = "A";
          else if (score >= 100) rank = "B";
          else if (score >= 50) rank = "C";

          return (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-gradient-to-b from-[rgba(16,18,28,0.95)] to-[#10121c] rounded-xl p-12 max-w-2xl text-center shadow-2xl">
                <h1
                  className="font-['Pixelify_Sans'] mb-6"
                  style={{
                    fontSize: "48px",
                    textShadow: "4px 4px 0px #000",
                    color: "#f9c600",
                  }}
                >
                  TIME'S UP!
                </h1>

                {/* Rank Display */}
                <div className="mb-6">
                  <div className="font-['Pixelify_Sans'] text-white text-[20px] mb-2">
                    RANK:
                  </div>
                  <div
                    className="font-['Pixelify_Sans'] inline-block px-8 py-4 rounded-lg"
                    style={{
                      fontSize: "64px",
                      textShadow: "4px 4px 0px #000",
                      color:
                        rank === "S"
                          ? "#ffd700"
                          : rank === "A"
                          ? "#60a5fa"
                          : rank === "B"
                          ? "#34d399"
                          : rank === "C"
                          ? "#9ca3af"
                          : "#f87171",
                      backgroundColor: "rgba(0,0,0,0.3)",
                    }}
                  >
                    {rank}
                  </div>
                </div>

                {/* Score Display */}
                <div className="mb-6">
                  <div className="flex items-center justify-center gap-4">
                    <span className="font-['Pixelify_Sans'] text-white text-[20px]">
                      FINAL SCORE:
                    </span>
                    <div className="font-['Pixelify_Sans'] text-white text-[20px]">
                      {score}
                    </div>
                  </div>
                </div>

                {/* end screen message */}
                <p className="font-['Pixelify_Sans'] text-white/70 mb-8 text-[20px] min-[1400px]:text-[24px] max-w-[1146px] mx-auto">
                  These Doggos have been neutralized and are on their way back
                  to prison where their dangerous beliefs can't hurt anyone.
                  Thank you for serving your country, comrade!
                </p>

                <div className="flex gap-6 justify-center">
                  <button
                    onClick={handleRestart}
                    className="bg-[#fbc600] box-border flex gap-[10px] items-center justify-center overflow-clip pb-[14px] pt-[11px] px-[28px] rounded-[8px] cursor-pointer hover:bg-[#e5b300] hover:-translate-y-[10px] transition-all duration-200 relative"
                  >
                    <span className="font-['Pixelify_Sans'] font-normal leading-[normal] text-[#0f111c] text-[28px] text-center text-nowrap whitespace-pre">
                      Play Again
                    </span>
                    <div className="absolute inset-0 pointer-events-none shadow-[0px_-6px_0px_0px_inset_rgba(0,0,0,0.1)]" />
                  </button>
                  <button
                    onClick={onQuit}
                    className="bg-[#dc2626] box-border flex gap-[10px] items-center justify-center overflow-clip pb-[14px] pt-[11px] px-[28px] rounded-[8px] cursor-pointer hover:bg-[#b91c1c] hover:-translate-y-[10px] transition-all duration-200 relative"
                  >
                    <span className="font-['Pixelify_Sans'] font-normal leading-[normal] text-white text-[28px] text-center text-nowrap whitespace-pre">
                      Quit
                    </span>
                    <div className="absolute inset-0 pointer-events-none shadow-[0px_-6px_0px_0px_inset_rgba(0,0,0,0.1)]" />
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
