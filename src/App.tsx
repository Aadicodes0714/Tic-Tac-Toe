import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Volume2, VolumeX, RotateCcw, Trash2, Zap, Trophy, Bot, Users } from 'lucide-react';

type Player = 'X' | 'O';
type CellValue = Player | null;
type GameMode = 'pvp' | 'ai-easy' | 'ai-hard';

interface WinningLineCoords {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

// Audio Synthesizer Engine
class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  playTone(freq: number, type: OscillatorType = 'sine', duration = 0.15, gainVal = 0.1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Audio context might fail in non-interactive environments
    }
  }

  playMove(isX: boolean) {
    if (isX) {
      this.playTone(440, 'sine', 0.12, 0.15);
    } else {
      this.playTone(320, 'triangle', 0.14, 0.15);
    }
  }

  playWin() {
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'triangle', 0.32, 0.18), idx * 85);
    });
  }

  playTie() {
    this.playTone(220, 'sawtooth', 0.28, 0.1);
  }

  playReset() {
    this.playTone(600, 'sine', 0.08, 0.08);
  }
}

const sound = new SoundEngine();

export default function App() {
  const [board, setBoard] = useState<CellValue[]>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
  const [startingPlayer, setStartingPlayer] = useState<Player>('X');
  const [gameMode, setGameMode] = useState<GameMode>('pvp');
  const [scores, setScores] = useState<{ X: number; O: number; draws: number }>({ X: 0, O: 0, draws: 0 });
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<Player | 'tie' | null>(null);
  const [winningCombo, setWinningCombo] = useState<number[] | null>(null);
  const [laserCoords, setLaserCoords] = useState<WinningLineCoords | null>(null);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [autoRestartEnabled, setAutoRestartEnabled] = useState<boolean>(true);
  const [autoRestartKey, setAutoRestartKey] = useState<number>(0);

  const boardRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const autoRestartTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync mute state
  const toggleMute = () => {
    sound.muted = !sound.muted;
    setIsMuted(sound.muted);
  };

  const checkWinner = (grid: CellValue[]): { winner: Player; combo: number[] } | null => {
    for (const combo of WINNING_COMBOS) {
      const [a, b, c] = combo;
      if (grid[a] && grid[a] === grid[b] && grid[a] === grid[c]) {
        return { winner: grid[a] as Player, combo };
      }
    }
    return null;
  };

  const isBoardFull = (grid: CellValue[]): boolean => {
    return grid.every((cell) => cell !== null);
  };

  // Minimax Algorithm for Master AI
  const minimax = useCallback((grid: CellValue[], depth: number, isMaximizing: boolean): number => {
    const winResult = checkWinner(grid);
    if (winResult?.winner === 'O') return 10 - depth;
    if (winResult?.winner === 'X') return depth - 10;
    if (isBoardFull(grid)) return 0;

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (grid[i] === null) {
          grid[i] = 'O';
          const evaluation = minimax(grid, depth + 1, false);
          grid[i] = null;
          maxEval = Math.max(maxEval, evaluation);
        }
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (let i = 0; i < 9; i++) {
        if (grid[i] === null) {
          grid[i] = 'X';
          const evaluation = minimax(grid, depth + 1, true);
          grid[i] = null;
          minEval = Math.min(minEval, evaluation);
        }
      }
      return minEval;
    }
  }, []);

  const calculateLaserCoords = (combo: number[]) => {
    if (!boardRef.current) return;
    const startEl = cellRefs.current[combo[0]];
    const endEl = cellRefs.current[combo[2]];
    if (!startEl || !endEl) return;

    const boardRect = boardRef.current.getBoundingClientRect();
    const startRect = startEl.getBoundingClientRect();
    const endRect = endEl.getBoundingClientRect();

    const x1 = startRect.left + startRect.width / 2 - boardRect.left;
    const y1 = startRect.top + startRect.height / 2 - boardRect.top;
    const x2 = endRect.left + endRect.width / 2 - boardRect.left;
    const y2 = endRect.top + endRect.height / 2 - boardRect.top;

    setLaserCoords({ x1, y1, x2, y2 });
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 65,
        origin: { y: 0.65 },
        colors: ['#22d3ee', '#fb7185', '#38bdf8', '#ffffff']
      });
    } catch {
      // Ignore if confetti not supported
    }
  };

  const cancelAutoRestart = useCallback(() => {
    if (autoRestartTimerRef.current) {
      clearTimeout(autoRestartTimerRef.current);
      autoRestartTimerRef.current = null;
    }
  }, []);

  const resetBoard = useCallback((nextStartingPlayer?: Player) => {
    cancelAutoRestart();
    const starter = nextStartingPlayer ?? startingPlayer;
    setBoard(Array(9).fill(null));
    setIsGameOver(false);
    setWinner(null);
    setWinningCombo(null);
    setLaserCoords(null);
    setIsAiThinking(false);
    setCurrentPlayer(starter);
    sound.playReset();
  }, [cancelAutoRestart, startingPlayer]);

  const scheduleAutoRestart = useCallback(() => {
    cancelAutoRestart();
    if (!autoRestartEnabled) return;
    setAutoRestartKey((prev) => prev + 1);

    autoRestartTimerRef.current = setTimeout(() => {
      resetBoard();
    }, 2500); // 2.5-second smooth timer
  }, [autoRestartEnabled, cancelAutoRestart, resetBoard]);

  const executeMove = useCallback((index: number, player: Player, currentBoard: CellValue[]) => {
    const nextBoard = [...currentBoard];
    nextBoard[index] = player;
    setBoard(nextBoard);
    sound.playMove(player === 'X');

    const winData = checkWinner(nextBoard);
    if (winData) {
      setIsGameOver(true);
      setWinner(winData.winner);
      setWinningCombo(winData.combo);
      setScores((prev) => ({
        ...prev,
        [winData.winner]: prev[winData.winner] + 1
      }));
      sound.playWin();
      triggerConfetti();
      calculateLaserCoords(winData.combo);
      scheduleAutoRestart();
      return;
    }

    if (isBoardFull(nextBoard)) {
      setIsGameOver(true);
      setWinner('tie');
      setScores((prev) => ({ ...prev, draws: prev.draws + 1 }));
      sound.playTie();
      scheduleAutoRestart();
      return;
    }

    const nextPlayer = player === 'X' ? 'O' : 'X';
    setCurrentPlayer(nextPlayer);
  }, [scheduleAutoRestart]);

  // AI Move Logic
  const makeAiMove = useCallback((currentGrid: CellValue[]) => {
    setIsAiThinking(true);

    const availableIndices = currentGrid
      .map((val, idx) => (val === null ? idx : null))
      .filter((val): val is number => val !== null);

    if (availableIndices.length === 0) {
      setIsAiThinking(false);
      return;
    }

    let move: number;

    if (gameMode === 'ai-easy') {
      move = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    } else {
      // AI Master (Minimax)
      if (availableIndices.length === 9) {
        const openings = [0, 2, 4, 6, 8];
        move = openings[Math.floor(Math.random() * openings.length)];
      } else {
        let bestVal = -Infinity;
        let bestMove = availableIndices[0];
        const cloned = [...currentGrid];

        for (const idx of availableIndices) {
          cloned[idx] = 'O';
          const moveVal = minimax(cloned, 0, false);
          cloned[idx] = null;
          if (moveVal > bestVal) {
            bestVal = moveVal;
            bestMove = idx;
          }
        }
        move = bestMove;
      }
    }

    setTimeout(() => {
      setIsAiThinking(false);
      executeMove(move, 'O', currentGrid);
    }, 420);
  }, [gameMode, minimax, executeMove]);

  // Handle cell click by user
  const handleCellClick = (index: number) => {
    if (isGameOver || board[index] !== null || isAiThinking) return;

    if (gameMode.startsWith('ai') && currentPlayer === 'O') {
      return;
    }

    executeMove(index, currentPlayer, board);
  };

  // Trigger AI move when it's O's turn in AI mode
  useEffect(() => {
    if (!isGameOver && currentPlayer === 'O' && gameMode.startsWith('ai') && !isAiThinking) {
      makeAiMove(board);
    }
  }, [currentPlayer, isGameOver, gameMode, board, isAiThinking, makeAiMove]);

  // Cleanup auto restart on unmount
  useEffect(() => {
    return () => {
      cancelAutoRestart();
    };
  }, [cancelAutoRestart]);

  const resetAllScores = () => {
    setScores({ X: 0, O: 0, draws: 0 });
    resetBoard();
  };

  const handleModeChange = (mode: GameMode) => {
    setGameMode(mode);
    resetBoard();
  };

  const handleStartingPlayerChange = (player: Player) => {
    setStartingPlayer(player);
    resetBoard(player);
  };

  // Status Badge Label & Style
  const getStatusBadge = () => {
    if (isGameOver) {
      if (winner === 'tie') {
        return {
          text: "It's a Stalemate!",
          classes: 'bg-slate-700/60 text-slate-300 border-slate-600 shadow-[0_0_15px_rgba(148,163,184,0.2)]',
          pulseColor: 'bg-slate-400',
          barColor: 'bg-slate-400'
        };
      }
      const isX = winner === 'X';
      const label = gameMode.startsWith('ai') && winner === 'O' ? 'AI' : `Player ${winner}`;
      return {
        text: `${label} Wins!`,
        classes: isX
          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-[0_0_20px_rgba(34,211,238,0.35)]'
          : 'bg-rose-500/20 text-rose-300 border-rose-400/40 shadow-[0_0_20px_rgba(251,113,133,0.35)]',
        pulseColor: isX ? 'bg-cyan-400' : 'bg-rose-400',
        barColor: isX ? 'bg-cyan-400' : 'bg-rose-400'
      };
    }

    if (currentPlayer === 'X') {
      return {
        text: gameMode.startsWith('ai') ? 'Your Turn (X)' : "X's Turn",
        classes: 'bg-slate-800/80 border-slate-700/80 text-cyan-400',
        pulseColor: 'bg-cyan-400',
        barColor: 'bg-cyan-400'
      };
    } else {
      return {
        text: gameMode.startsWith('ai') ? (isAiThinking ? 'AI Thinking...' : "AI's Turn (O)") : "O's Turn",
        classes: 'bg-slate-800/80 border-slate-700/80 text-rose-400',
        pulseColor: 'bg-rose-400',
        barColor: 'bg-rose-400'
      };
    }
  };

  const statusInfo = getStatusBadge();

  return (
    <div className="min-h-screen text-slate-100 flex flex-col items-center justify-center p-3 sm:p-6 relative select-none">
      {/* Ambient background glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[420px] h-[420px] bg-cyan-600/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[420px] h-[420px] bg-rose-600/10 rounded-full blur-[130px] pointer-events-none" />

      <main className="w-full max-w-[440px] flex flex-col items-center gap-3.5 sm:gap-4 z-10">
        {/* Top Header */}
        <header className="w-full flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wider bg-gradient-to-r from-cyan-400 via-sky-300 to-rose-400 bg-clip-text text-transparent">
              PULSE<span className="font-light text-slate-300"> 3X3</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-restart toggle pill */}
            <button
              onClick={() => {
                const next = !autoRestartEnabled;
                setAutoRestartEnabled(next);
                if (!next) cancelAutoRestart();
              }}
              title={autoRestartEnabled ? 'Auto-restart enabled (2.5s)' : 'Auto-restart paused'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                autoRestartEnabled
                  ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${autoRestartEnabled ? 'text-cyan-400 fill-cyan-400' : ''}`} />
              <span className="hidden xs:inline">Auto</span>
            </button>

            {/* Audio Mute Button */}
            <button
              onClick={toggleMute}
              className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:bg-slate-700/50 transition cursor-pointer text-slate-300 hover:text-white"
              aria-label={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-slate-500" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
            </button>
          </div>
        </header>

        {/* Game Mode Selector */}
        <div className="w-full bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800/80 backdrop-blur-md flex shadow-lg">
          <button
            onClick={() => handleModeChange('pvp')}
            className={`mode-btn flex-1 py-1.5 px-2 text-xs font-semibold rounded-xl transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
              gameMode === 'pvp'
                ? 'bg-slate-800 text-white shadow-md border border-slate-700/60'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>2 Players</span>
          </button>
          <button
            onClick={() => handleModeChange('ai-easy')}
            className={`mode-btn flex-1 py-1.5 px-2 text-xs font-semibold rounded-xl transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
              gameMode === 'ai-easy'
                ? 'bg-slate-800 text-white shadow-md border border-slate-700/60'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI (Easy)</span>
          </button>
          <button
            onClick={() => handleModeChange('ai-hard')}
            className={`mode-btn flex-1 py-1.5 px-2 text-xs font-semibold rounded-xl transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
              gameMode === 'ai-hard'
                ? 'bg-slate-800 text-white shadow-md border border-slate-700/60'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-purple-400" />
            <span>AI (Master)</span>
          </button>
        </div>

        {/* Who Plays First Toggle */}
        <div className="w-full flex items-center justify-between px-3 py-2 bg-slate-900/40 rounded-2xl border border-slate-800/80 backdrop-blur-sm">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">First Move:</span>
          <div className="inline-flex bg-slate-950/70 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => handleStartingPlayerChange('X')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition duration-200 cursor-pointer ${
                startingPlayer === 'X'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Player (X)
            </button>
            <button
              onClick={() => handleStartingPlayerChange('O')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition duration-200 cursor-pointer ${
                startingPlayer === 'O'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_10px_rgba(251,113,133,0.2)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {gameMode.startsWith('ai') ? 'AI (O)' : 'Player (O)'}
            </button>
          </div>
        </div>

        {/* Turn Indicator & Score Cards */}
        <div className="w-full flex items-center justify-between px-1 gap-2">
          {/* Player X Card */}
          <div
            className={`flex-1 flex items-center justify-start gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-900/40 border transition-all duration-300 ${
              currentPlayer === 'X' && !isGameOver
                ? 'border-cyan-500/40 glow-cyan bg-slate-900/80'
                : 'border-slate-800/60'
            }`}
          >
            <span className="text-cyan-400 font-black text-xl leading-none">✕</span>
            <div className="text-left leading-tight">
              <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">
                {gameMode.startsWith('ai') ? 'YOU (X)' : 'PLAYER X'}
              </p>
              <span className="text-sm font-extrabold text-cyan-300">{scores.X}</span>
            </div>
          </div>

          {/* Center Turn & Auto-Restart Countdown Badge */}
          <div className="flex flex-col items-center justify-center min-w-[130px]">
            <div
              className={`px-3.5 py-1.5 rounded-full border text-xs font-bold tracking-wide flex items-center gap-1.5 transition-all duration-300 ${statusInfo.classes}`}
            >
              {!isGameOver && (
                <span className={`w-2 h-2 rounded-full ${statusInfo.pulseColor} animate-ping`} />
              )}
              {isGameOver && winner && winner !== 'tie' && (
                <Trophy className="w-3.5 h-3.5" />
              )}
              <span>{statusInfo.text}</span>
            </div>

            {/* Countdown Progress Bar (smooth 2.5-second animation) */}
            {isGameOver && autoRestartEnabled && (
              <div className="w-28 h-1.5 bg-slate-800/90 rounded-full mt-2 overflow-hidden border border-slate-700/50 shadow-inner">
                <div
                  key={autoRestartKey}
                  className={`h-full ${statusInfo.barColor} animate-progress-25 shadow-[0_0_8px_currentColor]`}
                />
              </div>
            )}
            {isGameOver && autoRestartEnabled && (
              <span className="text-[9px] text-slate-400 font-medium tracking-wider mt-1 uppercase">
                Next round in 2.5s
              </span>
            )}
          </div>

          {/* Player O Card */}
          <div
            className={`flex-1 flex items-center justify-end gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-900/40 border transition-all duration-300 ${
              currentPlayer === 'O' && !isGameOver
                ? 'border-rose-500/40 glow-rose bg-slate-900/80'
                : 'border-slate-800/60'
            }`}
          >
            <div className="text-right leading-tight">
              <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">
                {gameMode.startsWith('ai') ? 'AI (O)' : 'PLAYER O'}
              </p>
              <span className="text-sm font-extrabold text-rose-300">{scores.O}</span>
            </div>
            <span className="text-rose-400 font-black text-xl leading-none">◯</span>
          </div>
        </div>

        {/* The Grid Board */}
        <div
          ref={boardRef}
          className="relative w-full aspect-square bg-slate-900/50 p-4 rounded-3xl border border-slate-800/90 shadow-2xl backdrop-blur-xl"
        >
          <div className="grid grid-cols-3 grid-rows-3 gap-3 w-full h-full">
            {board.map((cell, index) => {
              const isWinningCell = winningCombo?.includes(index);
              return (
                <button
                  key={index}
                  ref={(el) => {
                    cellRefs.current[index] = el;
                  }}
                  onClick={() => handleCellClick(index)}
                  disabled={cell !== null || isGameOver || isAiThinking}
                  className={`cell-btn rounded-2xl flex items-center justify-center relative overflow-hidden focus:outline-none cursor-pointer disabled:cursor-default ${
                    isWinningCell
                      ? cell === 'X'
                        ? 'bg-cyan-500/15 shadow-[inset_0_0_20px_rgba(34,211,238,0.3)]'
                        : 'bg-rose-500/15 shadow-[inset_0_0_20px_rgba(251,113,133,0.3)]'
                      : ''
                  }`}
                  aria-label={`Cell ${index + 1}: ${cell || 'Empty'}`}
                >
                  {cell === 'X' && (
                    <svg
                      className="w-14 h-14 md:w-16 md:h-16 text-cyan-400 drop-shadow-[0_0_14px_rgba(34,211,238,0.8)]"
                      viewBox="0 0 64 64"
                      stroke="currentColor"
                    >
                      <line
                        x1="16"
                        y1="16"
                        x2="48"
                        y2="48"
                        strokeWidth="7"
                        strokeLinecap="round"
                        className="draw-x-1"
                      />
                      <line
                        x1="48"
                        y1="16"
                        x2="16"
                        y2="48"
                        strokeWidth="7"
                        strokeLinecap="round"
                        className="draw-x-2"
                      />
                    </svg>
                  )}

                  {cell === 'O' && (
                    <svg
                      className="w-14 h-14 md:w-16 md:h-16 text-rose-400 drop-shadow-[0_0_14px_rgba(251,113,133,0.8)]"
                      viewBox="0 0 64 64"
                      stroke="currentColor"
                      fill="none"
                    >
                      <circle
                        cx="32"
                        cy="32"
                        r="22"
                        strokeWidth="7"
                        strokeLinecap="round"
                        className="draw-o"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* Dynamic Laser Strike Overlay Line */}
          {laserCoords && winner && winner !== 'tie' && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
              <line
                x1={laserCoords.x1}
                y1={laserCoords.y1}
                x2={laserCoords.x2}
                y2={laserCoords.y2}
                stroke={winner === 'X' ? '#22d3ee' : '#fb7185'}
                strokeWidth="6"
                strokeLinecap="round"
                className="strike-line"
                style={{
                  color: winner === 'X' ? '#22d3ee' : '#fb7185'
                }}
              />
            </svg>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 w-full">
          <button
            onClick={() => resetBoard()}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-slate-800 to-slate-800/80 hover:from-slate-700 hover:to-slate-800 border border-slate-700/80 rounded-2xl font-semibold text-sm transition-all transform active:scale-95 shadow-md hover:border-slate-600 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-slate-300" />
            <span>Instant Reset</span>
          </button>

          <button
            onClick={resetAllScores}
            className="p-3 bg-slate-900/60 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 rounded-2xl transition-all cursor-pointer"
            title="Reset All Scores"
            aria-label="Reset All Scores"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Draw Counter & Footer Info */}
        <div className="flex items-center justify-between w-full px-2 text-[11px] text-slate-500 font-medium">
          <span>Draws: <strong className="text-slate-400">{scores.draws}</strong></span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
            Minimax AI Engine
          </span>
        </div>
      </main>
    </div>
  );
}
