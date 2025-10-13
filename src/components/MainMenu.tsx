import Frame17 from "../imports/Frame17";

// Background asset
const backgroundImage = "https://files.catbox.moe/xnu9u9.jpg";

// Main menu images
const characterImage = "https://files.catbox.moe/sznke8.png";
const enemiesImage = "https://files.catbox.moe/mpcvwc.png";

interface MainMenuProps {
  onStart: () => void;
}

export default function MainMenu({ onStart }: MainMenuProps) {
  return (
    <div className="size-full overflow-hidden relative bg-[#10121c]">
      {/* Tiling background - fills entire screen */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundRepeat: 'repeat-x',
          backgroundPosition: 'bottom',
          backgroundSize: 'auto 100%', // Maintain aspect ratio, cover full height
        }}
      />
      
      {/* Character image at very left - 70% viewport height - UNDER content */}
      <div className="absolute left-0 bottom-0 z-[5]">
        <img 
          src={characterImage} 
          alt="Character"
          style={{ height: '70vh', width: 'auto' }}
          className="object-contain"
        />
      </div>
      
      {/* Enemy dogs image at very right - 50% viewport height - UNDER content */}
      <div className="absolute right-0 bottom-0 z-[5]">
        <img 
          src={enemiesImage} 
          alt="Enemies"
          style={{ height: '50vh', width: 'auto' }}
          className="object-contain"
        />
      </div>
      
      {/* Content overlay - centered and scaled - ABOVE images */}
      <div className="absolute inset-0 flex items-start justify-center z-10">
        <div 
          className="origin-top scale-[0.42] min-[1400px]:scale-50"
          style={{
            width: '3320px',
            height: '2400px',
          }}
        >
          <Frame17 onStart={onStart} />
        </div>
      </div>
      
      {/* Mobile warning - only visible below 1000px */}
      <div className="hidden max-[999px]:flex absolute inset-0 bg-[#0f111c] items-center justify-center z-50 px-8">
        <p className="font-['Pixelify_Sans:Regular',_sans-serif] font-normal leading-[normal] text-[28px] text-[rgba(255,255,255,0.7)] text-center max-w-[600px]">
          Sorry, this game only works on laptop or desktop devices.
        </p>
      </div>
    </div>
  );
}
