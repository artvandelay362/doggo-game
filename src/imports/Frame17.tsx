// Use compressed logo from catbox
const imgImage4 = "https://files.catbox.moe/kqkmuj.png";

interface Frame21Props {
  onClick?: () => void;
}

function Frame21({ onClick }: Frame21Props) {
  return (
    <div
      onClick={onClick}
      className="bg-[#fbc600] box-border content-stretch flex gap-[10px] items-center justify-center overflow-clip pb-[20px] pt-[16px] px-[40px] rounded-[8px] cursor-pointer hover:bg-[#e5b300] hover:-translate-y-[10px] transition-all duration-200 relative"
    >
      <p className="font-['Pixelify_Sans:Regular',_sans-serif] font-normal leading-[normal] relative shrink-0 text-[#0f111c] text-[40px] text-center text-nowrap whitespace-pre">
        Start Game
      </p>
      <div className="absolute inset-0 pointer-events-none shadow-[0px_-8px_0px_0px_inset_rgba(0,0,0,0.1)]" />
    </div>
  );
}

interface Frame20Props {
  onStart?: () => void;
}

function Frame20({ onStart }: Frame20Props) {
  return (
    <div className="h-full w-[1236px] mx-auto bg-gradient-to-b from-[rgba(16,18,28,0.4)] to-[#10121c] overflow-clip flex flex-col items-center">
      {/* Studio text and logo grouped together */}
      <div className="mt-[20px] min-[1400px]:mt-[45px] mb-0 min-[1024px]:mb-[-16px] flex flex-col items-center gap-[8px]">
        {/* Studio text above logo */}
        <p className="mb-[-24px] font-['Pixelify_Sans:Regular',_sans-serif] font-normal leading-[normal] text-[20px] min-[1400px]:text-[24px] text-[rgba(255,255,255,0.7)] text-center whitespace-pre">
          DOT ORG STUDIOS PRESENTS
        </p>

        {/* Logo - smaller on screens below 1400px */}
        <div
          className="size-[420px] min-[1400px]:size-[589px]"
          data-name="image 4"
        >
          <img
            alt=""
            className="w-full h-full object-cover pointer-events-none"
            src={imgImage4}
          />
        </div>
      </div>

      {/* Hey, Comrade! heading */}
      <h1
        className="mt-[50px] min-[1400px]:mt-[78px] font-['Pixelify_Sans:Regular',_sans-serif] text-yellow-400 text-center"
        style={{ fontSize: "76.8px", textShadow: "4px 4px 0px #000" }}
      >
        Hey, Comrade!
      </h1>

      {/* Body text - smaller on screens below 1400px */}
      <div className="mt-[24px] font-['Pixelify_Sans:Regular',_sans-serif] font-normal leading-[normal] text-[34px] min-[1400px]:text-[40px] text-[rgba(255,255,255,0.7)] text-center w-[1136px]">
        <p className="mb-[18px] min-[1400px]:mb-[24px]">
          Sorry to get you away from streaming, but we need your help!
        </p>
        <p className="mb-[18px] min-[1400px]:mb-[24px]">
          100 Doggos have escaped from prison. They are there for some serious
          crimes, like: misgendering, not being pro-immigration, and not liking
          Taylor Swift.
        </p>
        <p className="mb-[18px] min-[1400px]:mb-[24px]">{`If they are not stopped, these Doggos will roam free and spread facism all over the world. Your mission is to use your zap gun to non-lethally neutralize them. `}</p>
        <p>
          The right comrade at the right time can make all the difference in the
          world. Are you ready?
        </p>
      </div>

      {/* Start Game Button */}
      <div className="mt-[56px] min-[1400px]:mt-[86px]">
        <Frame21 onClick={onStart} />
      </div>

      {/* Disclaimer text */}
      <p className="mt-[40px] min-[1400px]:mt-[60px] font-['Pixelify_Sans:Regular',_sans-serif] font-normal leading-[normal] text-[20px] min-[1400px]:text-[24px] text-[rgba(255,255,255,0.7)] text-center w-[1146px] whitespace-pre-wrap">
        {`THIS GAME IS A PARODY. ALL CHARACTERS AND EVENTS REPRESENTED ARE PURELY FICTIONAL.  IF YOU SEE ANY RESEMBLANCE TO REAL LIFE PEOPLE... SEEK PROFESSIONAL HELP!`}
      </p>
    </div>
  );
}

interface Frame17Props {
  onStart?: () => void;
}

export default function Frame17({ onStart }: Frame17Props) {
  return (
    <div className="relative size-full">
      {/* Background frames and character removed - using tiled background from parent instead */}
      <Frame20 onStart={onStart} />
    </div>
  );
}
