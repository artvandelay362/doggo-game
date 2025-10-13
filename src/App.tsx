import { useState } from "react";
import PreloadAssets from "./components/PreloadAssets";
import MainMenu from "./components/MainMenu";
import GamePlay from "./components/GamePlay";

type GameState = "menu" | "playing";

export default function App() {
  const [gameState, setGameState] = useState<GameState>("menu");

  const handleStart = () => {
    setGameState("playing");
  };

  const handleMainMenu = () => {
    setGameState("menu");
  };

  return (
    <PreloadAssets>
      <div className="size-full">
        {gameState === "menu" && <MainMenu onStart={handleStart} />}
        {gameState === "playing" && <GamePlay onQuit={handleMainMenu} />}
      </div>
    </PreloadAssets>
  );
}
