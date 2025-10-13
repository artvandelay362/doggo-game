import { useEffect, useState } from "react";

interface PreloadAssetsProps {
  children: React.ReactNode;
}

// All asset URLs used in the game
const ASSET_URLS = [
  // Background
  "https://files.catbox.moe/xnu9u9.jpg", // background image
  
  // Main menu images
  "https://files.catbox.moe/sznke8.png", // character left
  "https://files.catbox.moe/mpcvwc.png", // enemies right
  
  // Character assets
  "https://files.catbox.moe/bvvqko.png", // player body
  "https://files.catbox.moe/i2sb95.png", // face normal
  "https://files.catbox.moe/nqcsuf.png", // face angry
  "https://files.catbox.moe/so7gd2.png", // face laugh
  "https://files.catbox.moe/m869pf.png", // face sad
  
  // Flame assets
  "https://files.catbox.moe/e5ab92.png", // big flame
  "https://files.catbox.moe/jushle.png", // small flame
  
  // Enemy assets - bodies and skeletons
  "https://files.catbox.moe/00s5pt.png", // dog 1 body
  "https://files.catbox.moe/f67c94.png", // dog 1 skeleton
  "https://files.catbox.moe/k0q1ft.png", // dog 2 body
  "https://files.catbox.moe/f67c94.png", // dog 2 skeleton
  "https://files.catbox.moe/ai63gz.png", // dog 3 body
  "https://files.catbox.moe/g7l128.png", // dog 3 skeleton
  "https://files.catbox.moe/c1d65d.png", // dog 4 body
  "https://files.catbox.moe/61cgwu.png", // dog 4 skeleton
  "https://files.catbox.moe/6p7mgx.png", // dog 5 body
  "https://files.catbox.moe/u3dh32.png", // dog 5 skeleton
  "https://files.catbox.moe/v4btq9.png", // dog 6 body
  "https://files.catbox.moe/dv36tf.png", // dog 6 skeleton
  
  // Supporter images
  "https://files.catbox.moe/or7bjw.png", // supporter 1
  "https://files.catbox.moe/bf5fqm.png", // supporter 2
  "https://files.catbox.moe/vs4zar.png", // supporter 3
  "https://files.catbox.moe/b6q79p.png", // supporter 4
  "https://files.catbox.moe/32zdjd.png", // supporter 5
  "https://files.catbox.moe/12yovi.png", // supporter 6
  "https://files.catbox.moe/ez40p6.png", // supporter 7
  "https://files.catbox.moe/ep5odv.png", // supporter 8
  "https://files.catbox.moe/ktij84.png", // supporter 9
];

export default function PreloadAssets({ children }: PreloadAssetsProps) {
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let loadedCount = 0;
    const totalAssets = ASSET_URLS.length;

    const imagePromises = ASSET_URLS.map((url) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        
        img.onload = () => {
          loadedCount++;
          setProgress(Math.round((loadedCount / totalAssets) * 100));
          resolve();
        };
        
        img.onerror = () => {
          console.error(`Failed to load image: ${url}`);
          loadedCount++;
          setProgress(Math.round((loadedCount / totalAssets) * 100));
          resolve(); // Resolve anyway to continue loading
        };
        
        img.src = url;
      });
    });

    Promise.all(imagePromises).then(() => {
      // Small delay to ensure everything is ready
      setTimeout(() => {
        setLoaded(true);
      }, 100);
    });
  }, []);

  if (!loaded) {
    return (
      <div className="size-full flex flex-col items-center justify-center bg-[#10121c]">
        <div className="max-w-md w-full px-8 scale-[0.6]">
          <h1 
            className="font-['Pixelify_Sans:Regular',_sans-serif] text-[#f9c600] text-center mb-8"
            style={{ fontSize: '48px', textShadow: '4px 4px 0px #000' }}
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
          
          <p className="font-['Pixelify_Sans:Regular',_sans-serif] text-[#f9c600] text-center text-[24px]">
            {progress}%
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
