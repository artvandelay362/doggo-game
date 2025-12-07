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
  "https://i.imgur.com/tCTXnVr.png",
  "https://i.imgur.com/UM8AITa.png",
  "https://i.imgur.com/WRrXXNd.png",
  "https://i.imgur.com/Lp3A9A5.png",
  "https://i.imgur.com/q62t07o.png",
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
    body: "https://i.imgur.com/CQyVn5a.png",
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
  const scoreRef = useRef(0); // Use ref to avoid re-renders during gameplay
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
  const lastSupporterImageRef = useRef<string | null>(null); // Track last shown supporter image to avoid repeats
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

  // Helper function to get a random supporter image that's different from the last one
  const getRandomSupporterImage = (): string => {
    if (supporterImages.length === 1) {
      return supporterImages[0];
    }
    
    // Filter out the last shown image if we have more than one option
    const availableImages = lastSupporterImageRef.current
      ? supporterImages.filter(img => img !== lastSupporterImageRef.current)
      : supporterImages;
    
    // Pick a random image from available options
    const randomImage = availableImages[Math.floor(Math.random() * availableImages.length)];
    lastSupporterImageRef.current = randomImage;
    return randomImage;
  };

  // Sync isPaused, isGameOver, and supporterDisplay state with refs
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    isGameOverRef.current = isGameOver;
  }, [isGameOver]);

  useEffect(() => {
    supporterDisplayRef.current = supporterDisplay;
  }, [supporterDisplay]);



  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Initialize audio pools (3 instances of each sound for instant playback)
    const initAudioPool = (src: string, poolSize: number = 3): HTMLAudioElement[] => {
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

    hitSound1PoolRef.current = initAudioPool("https://files.catbox.moe/9q9cj2.mp3");
    hitSound2PoolRef.current = initAudioPool("https://files.catbox.moe/k070y2.mp3");
    hitSound3PoolRef.current = initAudioPool("https://files.catbox.moe/xeapud.mp3");
    shootSound1PoolRef.current = initAudioPool("https://files.catbox.moe/qm4nuo.mp3");
    shootSound2PoolRef.current = initAudioPool("https://files.catbox.moe/cp0rjm.mp3");
    candymanHitSoundPoolRef.current = initAudioPool("https://files.catbox.moe/udwke3.mp3");

    // Setup background music with aggressive autoplay strategy
    if (audioRef.current) {
      audioRef.current.volume = 0.3 * 0.8; // Set initial volume to 30% (with 20% max reduction)
      audioRef.current.load(); // Preload the audio
      
      // Function to attempt starting music
      const tryStartMusic = () => {
        if (!musicStartedRef.current && audioRef.current) {
          audioRef.current.play().then(() => {
            musicStartedRef.current = true;
          }).catch(() => {
            // Silent fail - will retry on next interaction
          });
        }
      };
      
      // Try immediately (might work if user just clicked Start button)
      tryStartMusic();
      
      // If that didn't work, try on any user interaction
      const interactions = ['click', 'keydown', 'mousedown', 'touchstart'];
      const startMusicOnInteraction = () => {
        if (!musicStartedRef.current) {
          tryStartMusic();
        }
        // Remove listeners once music starts
        if (musicStartedRef.current) {
          interactions.forEach(event => {
            window.removeEventListener(event, startMusicOnInteraction);
          });
        }
      };
      
      // Add listeners for all interaction types
      interactions.forEach(event => {
        window.addEventListener(event, startMusicOnInteraction, { once: false });
      });
      
      // Cleanup function to remove listeners if component unmounts
      const cleanupMusicListeners = () => {
        interactions.forEach(event => {
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

    // Percentage-based scaling: elements scale proportionally to viewport height
    // Reference height: 900px (baseline where scale = 1.0)
    // This ensures consistent visual proportions across all screen sizes
    const referenceHeight = 900;
    const scale = canvas.height / referenceHeight;
    
    // Apply scaling to both player and enemies
    const playerScale = scale;
    const enemyScale = scale;

    const enemyTargetHeight = 180 * enemyScale; // Base enemy height: 180px, scaled

    gameState.player.width = 156 * playerScale;
    gameState.player.height = 234 * playerScale;
    gameState.playerScale = playerScale; // Store for face scaling

    // Time-based player speed for consistent difficulty across all screen sizes
    // Player should take exactly 3.08 seconds to move from top to bottom (30% faster than original 4s)
    const playerMoveDuration = 185; // 3.08 seconds at 60fps (30% faster)
    gameState.player.speed = canvas.height / playerMoveDuration;

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
        setIsPaused((prev) => !prev);
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
        playPromise.catch((_error) => {
          // If audio isn't ready yet, try to load it first
          if (audio.readyState < 2) {
            audio.load();
            audio.addEventListener('canplaythrough', () => {
              audio.play().catch(() => {});
            }, { once: true });
          }
        });
      }
    };

    // Shoot function
    const shoot = () => {
      // Can't shoot when immobilized
      if (gameState.isImmobilized) return;

      const now = Date.now();
      if (now - gameState.lastShot > 380) {
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
        gameState.recoilMaxOffsetX = -15; // Move back 15 pixels (40% less than 25 pixels)
        gameState.recoilMaxOffsetY = 0; // No vertical recoil

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
      if (now - gameState.lastEnemySpawn > 540) {
        // Spawn every 0.54 seconds
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
          // Scale vertical speed based on canvas height for consistent visual speed
          const verticalSpeedScale = canvas.height / 900; // Reference height: 900px
          const movementType = Math.random();
          let maxUp, maxDown, vSpeed, initialDirection, changeChance;

          if (movementType < 0.05) {
            // Only moves down - slow drift (5% chance)
            maxUp = 0;
            maxDown = (40 + Math.random() * 60) * verticalSpeedScale; // 40-100 pixels down (scaled)
            vSpeed = (0.1 + Math.random() * 0.2) * verticalSpeedScale;
            initialDirection = -1;
            changeChance = 0.001; // Very rarely changes (stays going down)
          } else if (movementType < 0.1) {
            // Only moves up - slow rise (5% chance)
            maxUp = (40 + Math.random() * 60) * verticalSpeedScale; // 40-100 pixels up (scaled)
            maxDown = 0;
            vSpeed = (0.1 + Math.random() * 0.2) * verticalSpeedScale;
            initialDirection = 1;
            changeChance = 0.001;
          } else if (movementType < 0.25) {
            // Big up, small down (like 50% up, 10% down) (15% chance)
            maxUp = (60 + Math.random() * 80) * verticalSpeedScale; // 60-140 pixels up (scaled)
            maxDown = (5 + Math.random() * 15) * verticalSpeedScale; // 5-20 pixels down (scaled)
            vSpeed = (0.15 + Math.random() * 0.25) * verticalSpeedScale;
            initialDirection = Math.random() > 0.5 ? 1 : -1;
            changeChance = 0.008 + Math.random() * 0.008; // 0.8-1.6% chance per frame (once per ~60-125 frames)
          } else if (movementType < 0.4) {
            // Small up, big down (15% chance)
            maxUp = (5 + Math.random() * 15) * verticalSpeedScale; // 5-20 pixels up (scaled)
            maxDown = (60 + Math.random() * 80) * verticalSpeedScale; // 60-140 pixels down (scaled)
            vSpeed = (0.15 + Math.random() * 0.25) * verticalSpeedScale;
            initialDirection = Math.random() > 0.5 ? 1 : -1;
            changeChance = 0.008 + Math.random() * 0.008;
          } else if (movementType < 0.75) {
            // Erratic movement - changes direction but not too frequently (35% chance)
            maxUp = (20 + Math.random() * 50) * verticalSpeedScale; // scaled
            maxDown = (20 + Math.random() * 50) * verticalSpeedScale; // scaled
            vSpeed = (0.2 + Math.random() * 0.3) * verticalSpeedScale;
            initialDirection = Math.random() > 0.5 ? 1 : -1;
            changeChance = 0.012 + Math.random() * 0.004; // 1.2-1.6% chance - max once per second
          } else {
            // Balanced bobbing (25% chance)
            const range = (30 + Math.random() * 40) * verticalSpeedScale; // scaled
            maxUp = range;
            maxDown = range;
            vSpeed = (0.12 + Math.random() * 0.2) * verticalSpeedScale;
            initialDirection = Math.random() > 0.5 ? 1 : -1;
            changeChance = 0.008 + Math.random() * 0.008; // 0.8-1.6% chance
          }

          // Time-based speed: enemies take 3.7 seconds with variation
          // 3.7 seconds = 222 frames at 60fps
          // Variation: 0.1-1 second (6-60 frames)
          // 70% faster (2.7-3.6s), 30% slower (3.8-4.7s)
          const baseCrossTime = 222; // 3.7 seconds
          const variation = 6 + Math.random() * 54; // 6-60 frames
          const crossTime = baseCrossTime + (Math.random() < 0.3 ? variation : -variation);
          const enemySpeed = canvas.width / crossTime;

          gameState.enemies.push({
            x: canvas.width,
            y: yPos,
            width: enemyHeight * (enemyBodyAspectRatios[randomImageIndex] || 1), // Calculate with current aspect ratio
            height: enemyHeight,
            speed: enemySpeed,
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

    // Spawn Candyman enemy (first one after 10 seconds, then every 12-15 seconds)
    const spawnCandyman = () => {
      const now = Date.now();
      
      // First Candyman: wait 10 seconds (gives audio time to load and player to get ready)
      // Subsequent Candyman: random interval between 12-15 seconds (12000-15000 ms)
      const isFirstCandyman = !gameState.firstCandymanSpawned;
      const spawnInterval = isFirstCandyman ? 10000 : 12000 + Math.random() * 3000;

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

        // FIXED speed: always takes exactly 1.84 seconds to cross screen for consistency (15% slower than before)
        // At 60fps: 1.84 seconds = 110 frames
        const crossTime = 110; // Fixed duration
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

          // Death animation logic
          if (enemy.isDying && enemy.deathFrame !== undefined) {
            const deathDuration = 99; // Death animation lasts 99 frames (~1650ms)

            // Flash skeleton three times (150ms each ≈ 9 frames), then show normal sprite fading out
            // Frames 0-8: skeleton (first flash - 150ms)
            // Frames 9-17: dog
            // Frames 18-26: skeleton (second flash - 150ms)
            // Frames 27-35: dog
            // Frames 36-44: skeleton (third flash - 150ms)
            // Frames 45-98: dog (fading out over 900ms)
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

              // Show supporter with positive message (batch update to avoid re-render during gameplay)
              const randomImage = getRandomSupporterImage();
              const randomText =
                positiveMessages[
                  Math.floor(Math.random() * positiveMessages.length)
                ];
              const newSupporterData = {
                visible: true,
                fadeState: "in" as const,
                image: randomImage,
                text: randomText,
              };
              supporterDisplayRef.current = newSupporterData;
              // Defer state update to avoid re-render during game loop
              requestAnimationFrame(() => setSupporterDisplay(newSupporterData));
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

            scoreRef.current += 1; // Count each enemy hit (use ref to avoid re-renders)
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
            gameState.immobilizedTimer = 168; // 2.8 seconds at 60fps (30% less than 4 seconds)
            gameState.immobilizedFlashFrame = 0;

            // Play Candyman hit sound
            playSoundFromPool(candymanHitSoundPoolRef.current, "candymanHit");

            // Show negative supporter when hit by Candyman (with cooldown)
            const framesSinceLastNegative =
              gameState.animationFrame - lastNegativeSupporterFrame.current;
            if (framesSinceLastNegative >= 300) {
              // Show supporter with negative message
              const randomImage = getRandomSupporterImage();
              const randomText =
                negativeMessages[
                  Math.floor(Math.random() * negativeMessages.length)
                ];
              const newSupporterData = {
                visible: true,
                fadeState: "in" as const,
                image: randomImage,
                text: randomText,
              };
              supporterDisplayRef.current = newSupporterData;
              // Defer state update to avoid re-render during game loop
              requestAnimationFrame(() => setSupporterDisplay(newSupporterData));
              supporterTimerRef.current = 0; // Reset timer
              lastNegativeSupporterFrame.current = gameState.animationFrame; // Record when this negative supporter was shown
            }

            // Remove the Candyman that hit the player
            enemy.active = false;
          }
        });
      }
    };

    // Update game state
    const update = (deltaMultiplier: number = 1.0) => {
      const p = gameState.player;

      // Update immobilization timer
      if (gameState.isImmobilized) {
        gameState.immobilizedTimer -= deltaMultiplier;
        gameState.immobilizedFlashFrame += deltaMultiplier;

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
          gameState.velocityY - 0.7 * deltaMultiplier,
          -p.speed * 1.5
        );
        gameState.isPlayerMoving = true;
      } else if (isMovingDown) {
        // Accelerate downward (with inertia)
        gameState.velocityY = Math.min(
          gameState.velocityY + 0.7 * deltaMultiplier,
          p.speed * 1.5
        );
        gameState.isPlayerMoving = true;
      } else {
        // Apply friction/deceleration when no keys pressed
        if (Math.abs(gameState.velocityY) > 0.1) {
          gameState.velocityY *= Math.pow(0.8, deltaMultiplier); // Gradual slowdown with more coasting
          gameState.isPlayerMoving = true;
        } else {
          gameState.velocityY = 0;
          gameState.isPlayerMoving = false;
        }
      }

      // Apply velocity to position
      if (gameState.isPlayerMoving) {
        p.y += gameState.velocityY * deltaMultiplier;
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

      // Handle recoil animation with asymmetric timing (fast recoil, slower return)
      if (gameState.recoilProgress < 1) {
        // Advance animation progress (36 frames = 600ms at 60fps)
        gameState.recoilProgress += (1 / 36) * deltaMultiplier; // Increment by 1/36 each frame for 600ms duration

        if (gameState.recoilProgress >= 1) {
          gameState.recoilProgress = 1; // Clamp to 1 when done
        }

        const t = gameState.recoilProgress;
        let offsetMultiplier;

        // Asymmetric timing: fast recoil (0-0.33 = 200ms), slower return (0.33-1.0 = 400ms)
        if (t < 0.33) {
          // RECOIL PHASE (200ms): Fast snap back using ease-out cubic
          // Maps t from [0, 0.33] to [0, 1] for the recoil curve
          const recoilT = t / 0.33;
          // Ease-out cubic: fast start, slow end (perfect for recoil snap)
          const eased = 1 - Math.pow(1 - recoilT, 3);
          offsetMultiplier = eased; // Goes from 0 to 1
        } else {
          // RETURN PHASE (400ms): Smooth return using ease-in-out
          // Maps t from [0.33, 1.0] to [0, 1] for the return curve
          const returnT = (t - 0.33) / 0.67;
          // Ease-in-out sine: smooth, controlled return
          const eased = -(Math.cos(Math.PI * returnT) - 1) / 2;
          offsetMultiplier = 1 - eased; // Goes from 1 to 0
        }

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
          bullet.lifetime += deltaMultiplier;
        }
      });

      // Update enemies - iterate in reverse to safely remove while looping
      for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        const enemy = gameState.enemies[i];
        
        // Update death animation
        if (enemy.isDying) {
          if (enemy.deathFrame !== undefined) {
            enemy.deathFrame += deltaMultiplier;

            // Make the enemy fall downward while dying
            const fallSpeed = 2.5; // Pixels per frame falling speed
            enemy.y += fallSpeed * deltaMultiplier;

            // Optionally slow down horizontal movement while dying
            enemy.x -= enemy.speed * 0.3 * deltaMultiplier; // 30% of normal speed

            // Remove enemy after death animation completes (99 frames) OR if it falls off screen
            if (
              enemy.deathFrame >= 99 ||
              enemy.y > canvas.height + enemy.height
            ) {
              gameState.enemies.splice(i, 1); // Remove this enemy
            }
          }
          continue; // Skip to next enemy
        }

        // Remove inactive enemies
        if (!enemy.active) {
          gameState.enemies.splice(i, 1);
          continue;
        }
        
        // Move active enemies
        enemy.x -= enemy.speed * deltaMultiplier;

        // Remove enemies that have escaped off screen (no penalty)
        if (enemy.x + enemy.width <= 0) {
          gameState.enemies.splice(i, 1);
          continue;
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
              enemy.y -= followSpeed * deltaMultiplier;
            } else {
              // Enemy is above player, move down
              enemy.y += followSpeed * deltaMultiplier;
            }
          }

          // Continue to next enemy
          continue;
        }

        // Check if enemy should avoid the player (regular enemies)
        const playerCenterY = p.y + p.height / 2;
        const enemyCenterY = enemy.y + enemy.height / 2;
        const verticalDistance = Math.abs(enemyCenterY - playerCenterY);
        
        // Scale avoidance zone to viewport height for consistency
        const verticalSpeedScale = canvas.height / 900; // Same scale as movement patterns
        const avoidanceZone = 150 * verticalSpeedScale; // Scaled to screen size
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
          // Increased speed values and scaled to screen size for aggressive avoidance
          const proximityRatio = 1 - verticalDistance / avoidanceZone;
          const baseSpeed = 4.0 * verticalSpeedScale; // Increased from 2.5
          const maxSpeed = 8.0 * verticalSpeedScale; // Increased from 5.0
          currentVerticalSpeed = baseSpeed + proximityRatio * (maxSpeed - baseSpeed); // 4-8 pixels per frame (scaled)

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
        enemy.currentOffset += enemy.verticalDirection * currentVerticalSpeed * deltaMultiplier;

        // Apply the offset to Y position
        enemy.y = enemy.baseY + enemy.currentOffset;
      }

      // Check collisions BEFORE removing expired bullets
      checkCollisions();

      // Remove expired bullets - iterate in reverse to safely remove while looping
      for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        const bullet = gameState.bullets[i];
        
        if (!bullet.active) {
          gameState.bullets.splice(i, 1);
          continue;
        }
        
        // Remove bullet after its lifetime expires
        if (bullet.lifetime >= bullet.maxLifetime) {
          // If bullet expired without hitting anything
          if (!bullet.hasHit) {
            gameState.consecutiveHits = 0; // Always reset consecutive hits on miss
            gameState.missTimer = 60; // Always show angry face for 60 frames (~1 second)
          }
          gameState.bullets.splice(i, 1);
        }
      }

      // Decrement miss timer
      if (gameState.missTimer > 0) {
        gameState.missTimer -= deltaMultiplier;
      }

      // Decrement celebration timer
      if (gameState.celebrationTimer > 0) {
        gameState.celebrationTimer -= deltaMultiplier;
      }

      spawnEnemy();
      spawnCandyman();
      gameState.animationFrame += deltaMultiplier;
      
      // Sync score from ref to state every 30 frames (~500ms) to update UI without constant re-renders
      if (Math.floor(gameState.animationFrame) % 30 === 0) {
        requestAnimationFrame(() => setScore(scoreRef.current));
      }

      // Update supporter animation
      if (supporterDisplayRef.current && supporterDisplayRef.current.visible) {
        supporterTimerRef.current += deltaMultiplier;

        // Fade in: 0-18 frames (300ms)
        // Visible: 18-138 frames (2000ms at full opacity)
        // Fade out: 138-210 frames (1200ms) - 4x longer than fade in
        const prevTimer = supporterTimerRef.current - deltaMultiplier;
        if (prevTimer < 18 && supporterTimerRef.current >= 18) {
          const newData = supporterDisplayRef.current ? { ...supporterDisplayRef.current, fadeState: "visible" as const } : null;
          supporterDisplayRef.current = newData;
          requestAnimationFrame(() => setSupporterDisplay(newData));
        } else if (prevTimer < 138 && supporterTimerRef.current >= 138) {
          const newData = supporterDisplayRef.current ? { ...supporterDisplayRef.current, fadeState: "out" as const } : null;
          supporterDisplayRef.current = newData;
          requestAnimationFrame(() => setSupporterDisplay(newData));
        } else if (supporterTimerRef.current >= 210) {
          supporterDisplayRef.current = null;
          requestAnimationFrame(() => setSupporterDisplay(null));
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

    // Game loop with delta time for consistent speed across all refresh rates
    let gameLoop: number;
    let lastFrameTime = performance.now();
    const targetFPS = 60;
    const targetFrameTime = 1000 / targetFPS; // ~16.67ms per frame at 60fps
    
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastFrameTime;
      const deltaMultiplier = deltaTime / targetFrameTime; // 1.0 at 60fps, 2.0 at 30fps, 0.5 at 120fps
      
      if (!isPausedRef.current && !isGameOverRef.current) {
        update(deltaMultiplier);
        draw();
      } else if (isPausedRef.current) {
        // Only redraw when paused (don't update)
        draw();
      }
      
      lastFrameTime = currentTime;
      gameLoop = requestAnimationFrame(animate);
    };

    gameLoop = requestAnimationFrame(animate);

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
        audioRef.current.play().catch(() => {});
      }
    }
  }, [isPaused, isGameOver]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      // Time's up - sync score from ref to state and show victory screen
      setScore(scoreRef.current);
      setIsGameOver(true);
      return;
    }

    const timer = setInterval(() => {
      // Check pause/game over state inside the interval
      if (isPausedRef.current || isGameOverRef.current) {
        return; // Skip this tick, but keep interval running
      }

      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => {
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
    // Reset all game state
    scoreRef.current = 0;
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

