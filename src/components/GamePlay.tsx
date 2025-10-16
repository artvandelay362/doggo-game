import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Slider } from "./ui/slider";

// Background asset
const backgroundImage = "https://files.catbox.moe/xnu9u9.jpg";

// Supporter images
const supporterImages = [
  "https://files.catbox.moe/or7bjw.png",
  "https://files.catbox.moe/bf5fqm.png",
  "https://files.catbox.moe/vs4zar.png",
  "https://files.catbox.moe/b6q79p.png",
  "https://files.catbox.moe/32zdjd.png",
  "https://files.catbox.moe/12yovi.png",
  "https://files.catbox.moe/ez40p6.png",
  "https://files.catbox.moe/ep5odv.png",
  "https://files.catbox.moe/ktij84.png",
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
const playerBody1 = "https://files.catbox.moe/bvvqko.png";
const faceNormalAsset = "https://files.catbox.moe/i2sb95.png";
const faceAngryAsset = "https://files.catbox.moe/nqcsuf.png";
const faceCelebrationAsset = "https://files.catbox.moe/so7gd2.png";

// Enemy assets - each dog has its own body and skeleton
const enemyTypes = [
  {
    body: "https://files.catbox.moe/00s5pt.png",
    skeleton: "https://files.catbox.moe/f67c94.png",
  },
  {
    body: "https://files.catbox.moe/k0q1ft.png",
    skeleton: "https://files.catbox.moe/f67c94.png",
  },
  {
    body: "https://files.catbox.moe/ai63gz.png",
    skeleton: "https://files.catbox.moe/g7l128.png",
  },
  {
    body: "https://files.catbox.moe/c1d65d.png",
    skeleton: "https://files.catbox.moe/61cgwu.png",
  },
  {
    body: "https://files.catbox.moe/6p7mgx.png",
    skeleton: "https://files.catbox.moe/u3dh32.png",
  },
  {
    body: "https://files.catbox.moe/v4btq9.png",
    skeleton: "https://files.catbox.moe/50jogq.png",
  },
];

// Flame assets
const flame1 = "https://files.catbox.moe/e5ab92.png";
const flame2 = "https://files.catbox.moe/jushle.png";

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
  imageIndex: number; // 0-4 for the five dog images
  isDying?: boolean; // Track if enemy is in death animation
  deathFrame?: number; // Frame counter for death animation
  baseY: number; // Base Y position for vertical oscillation
  verticalSpeed: number; // How fast it moves vertically
  verticalDirection: number; // Current direction: 1 (up) or -1 (down)
  maxUpOffset: number; // Maximum distance can move up from base
  maxDownOffset: number; // Maximum distance can move down from base
  currentOffset: number; // Current offset from base Y
  changeDirectionChance: number; // Probability of changing direction each frame
}

export default function GamePlay({ onQuit }: GamePlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hitSound1Ref = useRef<HTMLAudioElement>(null); // 30% chance
  const hitSound2Ref = useRef<HTMLAudioElement>(null); // 60% chance
  const hitSound3Ref = useRef<HTMLAudioElement>(null); // 10% chance
  const shootSound1Ref = useRef<HTMLAudioElement>(null); // 80% chance
  const shootSound2Ref = useRef<HTMLAudioElement>(null); // 20% chance
  const [score, setScore] = useState(0);
  const [totalEnemies] = useState(100);
  const [timeLeft, setTimeLeft] = useState(80); // 80 seconds
  const [volume, setVolume] = useState(30); // Volume from 0-100
  const [previousVolume, setPreviousVolume] = useState(30); // Store volume before muting
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
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
  const gameStateRef = useRef({
    player: { x: 50, y: 0, width: 156, height: 234, speed: 2.0 },
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    keys: {} as Record<string, boolean>,
    lastEnemySpawn: 0,
    lastShot: 0,
    animationFrame: 0,
    enemiesSpawned: 0,
    maxEnemies: 100,
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
  });

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

    // Start playing background music
    if (audioRef.current) {
      audioRef.current.volume = 0.3 * 0.8; // Set initial volume to 30% (with 20% max reduction)
      audioRef.current.play().catch((error) => {
        console.log("Audio playback failed:", error);
      });
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
    // Clamp to ±20%/±10% range to reduce variance (player size already balances difficulty)
    const baseSpeed = 2.0;
    const referenceHeight = 900; // Balanced at this height
    const speedMultiplier = Math.max(
      0.8,
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

    // Cheat code function - instantly win the game
    const activateCheat = () => {
      // Set score to 100
      setScore(100);
      // Kill all active enemies
      gameState.enemies.forEach((enemy) => {
        if (enemy.active) {
          enemy.active = false;
          enemy.isDying = true;
          enemy.deathFrame = 0;
        }
      });
      // Trigger victory
      setTimeout(() => {
        setIsGameOver(true);
        setGameWon(true);
      }, 100);
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

    // Shoot function
    const shoot = () => {
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
        let selectedShootSound: HTMLAudioElement | null = null;

        if (randomValue < 80) {
          // 0-80: Sound 1 (80%)
          selectedShootSound = shootSound1Ref.current;
        } else {
          // 80-100: Sound 2 (20%)
          selectedShootSound = shootSound2Ref.current;
        }

        // Play the selected sound
        if (selectedShootSound) {
          selectedShootSound.currentTime = 0; // Reset to start
          selectedShootSound.volume = (volume / 100) * 0.8; // Match game volume (with 20% max reduction)
          selectedShootSound.play().catch((error) => {
            console.log("Shoot sound playback failed:", error);
          });
        }
      }
    };

    // Spawn enemies (100 total over 85 seconds = 1 every 0.85 seconds)
    const spawnEnemy = () => {
      if (gameState.enemiesSpawned >= gameState.maxEnemies) return;

      const now = Date.now();
      if (now - gameState.lastEnemySpawn > 850) {
        // Spawn every 0.85 seconds
        // Find a Y position that doesn't conflict with existing enemies
        let yPos = 0;
        let attempts = 0;
        let validPosition = false;
        const enemyHeight = 35;
        const minVerticalGap = 50; // Minimum vertical distance between enemies

        while (!validPosition && attempts < 50) {
          // Add margins to keep enemies away from top and bottom edges
          const topMargin = 50; // Don't spawn in top 50 pixels
          const bottomMargin = 150; // Don't spawn in bottom 150 pixels (keep away from bottom)
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

          // Calculate width and height maintaining aspect ratio
          const aspectRatio = enemyBodyAspectRatios[randomImageIndex];
          const enemyWidth = enemyTargetHeight * aspectRatio;
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
            width: enemyWidth,
            height: enemyHeight,
            speed: 1.5 + Math.random() * 3.2,
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
        // Draw body (50% bigger: 120x180)
        ctx.drawImage(playerImg, p.x, p.y, p.width, p.height);

        // Draw face on top of body
        // Choose face based on timers (celebration or angry), otherwise normal
        let faceImg = faceNormalImg;
        let faceLoaded = faceNormalLoaded;
        let faceOriginalWidth = faceNormalWidth;
        let faceOriginalHeight = faceNormalHeight;

        // Priority: celebration face (4 hits), angry face (miss), normal (default)
        if (gameState.celebrationTimer > 0 && faceCelebrationLoaded) {
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
            if (
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

            // Trigger celebration face and supporter if player hits 5 in a row
            if (gameState.consecutiveHits === 5) {
              gameState.celebrationTimer = 120; // Show celebration face for 120 frames (~2 seconds)
              gameState.consecutiveHits = 0; // Reset counter so player can get another 5-hit streak

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
            let selectedSound: HTMLAudioElement | null = null;

            if (randomValue < 30) {
              // 0-30: Sound 1 (30%)
              selectedSound = hitSound1Ref.current;
            } else if (randomValue < 90) {
              // 30-90: Sound 2 (60%)
              selectedSound = hitSound2Ref.current;
            } else {
              // 90-100: Sound 3 (10%)
              selectedSound = hitSound3Ref.current;
            }

            // Play the selected sound
            if (selectedSound) {
              selectedSound.currentTime = 0; // Reset to start
              selectedSound.volume = (volume / 100) * 0.8; // Match game volume (with 20% max reduction)
              selectedSound.play().catch((error) => {
                console.log("Hit sound playback failed:", error);
              });
            }

            setScore((prev) => prev + 1); // Count each enemy hit
          }
        });
      });
    };

    // Update game state
    const update = () => {
      const p = gameState.player;

      // Track if player is actively moving
      const isMovingUp = gameState.keys["w"] || gameState.keys["arrowup"];
      const isMovingDown = gameState.keys["s"] || gameState.keys["arrowdown"];

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

        // Check if enemy escaped (went off left side while still active) - INSTANT LOSS!
        if (enemy.active && enemy.x + enemy.width <= 0) {
          // Enemy escaped without being killed - game over!
          setIsGameOver(true);
          setGameWon(false);
          return false; // Remove the enemy
        }

        // Check if enemy should avoid the player
        const playerCenterY = p.y + p.height / 2;
        const enemyCenterY = enemy.y + enemy.height / 2;
        const verticalDistance = Math.abs(enemyCenterY - playerCenterY);
        const avoidanceZone = 200; // If within 200 pixels vertically, try to avoid
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

  // Timer countdown and check if all enemies are done
  useEffect(() => {
    // Don't run timer when paused or game over
    if (isPausedRef.current || isGameOverRef.current) return;
    const gameState = gameStateRef.current;

    // Check if all enemies have been spawned and processed
    const allEnemiesSpawned = gameState.enemiesSpawned >= gameState.maxEnemies;
    const allEnemiesProcessed = gameState.enemies.length === 0;

    if (allEnemiesSpawned && allEnemiesProcessed) {
      // All dogs have passed - only win if player got all 100
      const won = score === 100;
      setIsGameOver(true);
      setGameWon(won);
      return;
    }

    if (timeLeft <= 0) {
      // Time ran out - only win if player got all 100
      const won = score === 100;
      setIsGameOver(true);
      setGameWon(won);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, score]);

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
    setScore(0);
    setTimeLeft(80);
    setIsGameOver(false);
    setGameWon(false);
    setSupporterDisplay(null);
    supporterTimerRef.current = 0;
    lastNegativeSupporterFrame.current = -999; // Reset negative supporter cooldown
    gameStateRef.current.enemiesSpawned = 0;
    gameStateRef.current.enemies = [];
    gameStateRef.current.bullets = [];
    gameStateRef.current.consecutiveHits = 0;
    gameStateRef.current.missTimer = 0;
    gameStateRef.current.celebrationTimer = 0;
    gameStateRef.current.animationFrame = 0; // Reset animation frame counter
    gameStateRef.current.lastSpawnedDogIndex = -1; // Reset last spawned dog
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
          <span className="text-[#f9c600] font-['Pixelify_Sans']">
            {score}/{totalEnemies}
          </span>
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
      {isGameOver && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-gradient-to-b from-[rgba(16,18,28,0.95)] to-[#10121c] rounded-xl p-12 max-w-2xl text-center shadow-2xl">
            <h1
              className="font-['Pixelify_Sans'] mb-6"
              style={{
                fontSize: "48px",
                textShadow: "4px 4px 0px #000",
                color: gameWon ? "#f9c600" : "#ef4444",
              }}
            >
              {gameWon ? "VICTORY!" : "MISSION FAILED"}
            </h1>
            {gameWon ? (
              <p className="font-['Pixelify_Sans'] text-white/80 mb-8 text-[20px]">
                All 100 doggos have been neutralized and are on their way back
                to prison where their dangerous beliefs can't hurt anyone. Thank
                you for serving your country, comrade!
              </p>
            ) : (
              <>
                {/* Score Display - only show on loss */}
                <div className="mb-6">
                  <div className="flex items-center justify-center gap-4">
                    <span className="font-['Pixelify_Sans'] text-white text-[20px]">
                      FINAL SCORE:
                    </span>
                    <div className="font-['Pixelify_Sans'] text-white text-[20px]">
                      {score}/{totalEnemies}
                    </div>
                  </div>
                </div>

                <p className="font-['Pixelify_Sans'] text-white/80 mb-8 text-[20px]">
                  One doggo got away and is spreading canine fascism as we
                  speak. This is worse than January 6th. Your failure has caused
                  irreparable damage to our democracy!
                </p>
              </>
            )}

            <div className="flex gap-6 justify-center">
              <button
                onClick={handleRestart}
                className="bg-[#fbc600] box-border flex gap-[10px] items-center justify-center overflow-clip pb-[14px] pt-[11px] px-[28px] rounded-[8px] cursor-pointer hover:bg-[#e5b300] hover:-translate-y-[10px] transition-all duration-200 relative"
              >
                <span className="font-['Pixelify_Sans'] font-normal leading-[normal] text-[#0f111c] text-[28px] text-center text-nowrap whitespace-pre">
                  {gameWon ? "Play Again" : "Try Again"}
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
    </div>
  );
}
