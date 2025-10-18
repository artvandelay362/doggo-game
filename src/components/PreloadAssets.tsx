import { useEffect, useState } from "react";

interface PreloadAssetsProps {
  children: React.ReactNode;
}

// All asset URLs used in the game
const ASSET_URLS = [
  // Background
  "https://i.imgur.com/FBGihp5.jpeg", // background image

  // Logo
  "https://i.imgur.com/6BF7IES.png", // logo

  // Main menu images
  "https://i.imgur.com/sZYiMBR.png", // character left
  "https://i.imgur.com/feD8w02.png", // enemies right

  // Character assets
  "https://i.imgur.com/lxKF9yl.png", // player body
  "https://i.imgur.com/fgGOeWQ.png", // face normal
  "https://i.imgur.com/qN9QWLP.png", // face angry
  "https://i.imgur.com/jFHPAPI.png", // face celebration
  "https://i.imgur.com/pdMRPT4.png", // face sad

  // Flame assets
  "https://i.imgur.com/Zi2RUky.png", // flame 1
  "https://i.imgur.com/z4eVz5y.png", // flame 2

  // Enemy assets - bodies and skeletons
  "https://i.imgur.com/3pDVzgY.png", // dog 1 body
  "https://i.imgur.com/w79dL4z.png", // dog 1 skeleton
  "https://i.imgur.com/KMI8jai.png", // dog 2 body
  "https://i.imgur.com/sEOeaJW.png", // dog 2 skeleton
  "https://i.imgur.com/y7nQKAa.png", // dog 3 body
  "https://i.imgur.com/PgrzdHV.png", // dog 3 skeleton
  "https://i.imgur.com/RdrhxiZ.png", // dog 4 body
  "https://i.imgur.com/dmaqSfS.png", // dog 4 skeleton
  "https://i.imgur.com/AqwVE6g.png", // dog 5 body
  "https://i.imgur.com/UeJuVh8.png", // dog 5 skeleton
  "https://i.imgur.com/pMiHO68.png", // dog 6 body
  "https://i.imgur.com/YfsvMnf.png", // dog 6 skeleton

  // Candyman enemy
  "https://i.imgur.com/pGNfvXC.png", // candyman

  // Supporter images
  "https://i.imgur.com/mLQbZOy.png", // supporter 1
  "https://i.imgur.com/Fyaps4u.png", // supporter 2
  "https://i.imgur.com/fEUMoMB.png", // supporter 3
  "https://i.imgur.com/VIhn9nj.png", // supporter 4
  "https://i.imgur.com/tCTXnVr.png", // supporter 5
  "https://i.imgur.com/UM8AITa.png", // supporter 6
  "https://i.imgur.com/WRrXXNd.png", // supporter 7
  "https://i.imgur.com/Lp3A9A5.png", // supporter 8
  "https://i.imgur.com/txad79x.png", // supporter 9
];

export default function PreloadAssets({ children }: PreloadAssetsProps) {
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    console.log("🔄 Starting asset preload...");
    let loadedCount = 0;
    const totalAssets = ASSET_URLS.length;

    const imagePromises = ASSET_URLS.map((url) => {
      return new Promise<void>((resolve) => {
        const img = new Image();

        img.onload = () => {
          loadedCount++;
          setProgress(Math.round((loadedCount / totalAssets) * 100));
          console.log(`✅ Loaded ${loadedCount}/${totalAssets}: ${url}`);
          resolve();
        };

        img.onerror = () => {
          console.error(`❌ Failed to load image: ${url}`);
          loadedCount++;
          setProgress(Math.round((loadedCount / totalAssets) * 100));
          resolve(); // Resolve anyway to continue loading
        };

        img.src = url;
      });
    });

    Promise.all(imagePromises)
      .then(() => {
        console.log("✅ All assets loaded! Showing game in 100ms...");
        // Small delay to ensure everything is ready
        setTimeout(() => {
          console.log("✅ Setting loaded=true, rendering children");
          setLoaded(true);
        }, 100);
      })
      .catch((error) => {
        console.error("❌ Error during asset loading:", error);
      });
  }, []);

  if (!loaded) {
    return (
      <div className="size-full flex flex-col items-center justify-center bg-[#10121c]">
        <div className="max-w-md w-full px-8 scale-[0.6]">
          <h1
            className="font-['Pixelify_Sans'] text-[#f9c600] text-center mb-8"
            style={{ fontSize: "48px", textShadow: "4px 4px 0px #000" }}
          >
            LOADING...
          </h1>

          {/* Progress bar */}
          <div className="w-full h-8 bg-[#0f111c] border-4 border-[#f9c600] rounded-lg overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-[#f9c600] to-[#ffd700] transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="font-['Pixelify_Sans'] text-[#f9c600] text-center text-[24px]">
            {progress}%
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
