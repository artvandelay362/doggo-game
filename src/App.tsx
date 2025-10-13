import { useState, useEffect } from "react";
import PreloadAssets from "./components/PreloadAssets";
import MainMenu from "./components/MainMenu";
import GamePlay from "./components/GamePlay";

// Add global error handler for debugging
if (typeof window !== "undefined") {
  window.addEventListener("error", (e) => {
    console.error("❌ Global error caught:", e.error);
    console.error("Error message:", e.message);
    console.error("Error stack:", e.error?.stack);
  });

  window.addEventListener("unhandledrejection", (e) => {
    console.error("❌ Unhandled promise rejection:", e.reason);
  });
}

type GameState = "menu" | "playing";

export default function App() {
  const [gameState, setGameState] = useState<GameState>("menu");
  useEffect(() => {
    console.log("✅ App component mounted successfully");
    console.log("Current game state:", gameState);
  }, [gameState]);

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
