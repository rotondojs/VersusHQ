import "./Game.css";
import { Box, Button } from "@chakra-ui/react";
import { useNavigate, useParams } from "react-router-dom";
import { getGameById } from "../services/gameService.ts";
import { useEffect, useState } from "react";
import type { GameInfo } from "@gamenite/shared";
import ChatPanel from "../components/ChatPanel.tsx";
import GamePanel from "../components/GamePanel.tsx";

/**
 * Game-room page that shows the active game panel alongside its live chat.
 */
export default function Game() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState<GameInfo | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      // non-nullish assertion is ok here given that Game is only called in a
      // route with `:gameId`
      const game = await getGameById(gameId!);
      if (ignore || "error" in game) return;
      setGame(game);
    })();
    return () => {
      ignore = true;
    };
  }, [gameId]);

  return (
    game && (
      <div className="content">
        <div className="pageShell gamePageShell">
          {game.tournamentId && (
            <Box>
              <Button
                bg="var(--accent-primary)"
                color="white"
                _hover={{ bg: "var(--accent-primary-hover)" }}
                borderRadius="full"
                onClick={() => navigate(`/tournament/${game.tournamentId}`)}
              >
                Back to Tournament
              </Button>
            </Box>
          )}
          <div className="gameContainer">
            <GamePanel {...game} />
            <ChatPanel chatId={game.chat} />
          </div>
        </div>
      </div>
    )
  );
}
