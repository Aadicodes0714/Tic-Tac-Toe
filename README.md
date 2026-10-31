# 🎮 PULSE 3X3 — Tic Tac Toe

<p align="center">
  <strong>A Modern Take on the Classic Tic Tac Toe Game</strong>
</p>

<p align="center">
  Built with React, TypeScript, and Vite
</p>

<p align="center">
  <a href="https://tic-tac-toe-phi-puce.vercel.app/">🌐 Live Demo</a> 
  •<a href="https://github.com/Aadicodes0714/Tic-Tac-Toe">💻 Source Code</a>
</p>

---

## 📌 About The Project

**PULSE 3X3** is a modern, browser-based implementation of the classic Tic Tac Toe game. It combines traditional two-player gameplay with a modern interface, interactive elements, and smooth visual effects.

The application is designed to provide an engaging gaming experience while demonstrating frontend development concepts such as component-based architecture, state management, event handling, and conditional rendering.

Players take turns placing X and O symbols on a 3×3 grid. The game continuously evaluates the board to identify winning combinations or a draw.

### 🎯 Project Objectives

- Develop an interactive browser-based game.
- Implement game logic for win and draw detection.
- Understand React component-based architecture.
- Manage dynamic UI updates using React state.
- Build a responsive and visually engaging interface.
- Deploy a frontend application for public access.

## ✨ Features

- **Interactive Gameplay:** Play Tic Tac Toe using a 3×3 game board.
- **Two-Player Mode:** Take turns playing as X and O.
- **Win Detection:** Identify horizontal, vertical, and diagonal winning combinations.
- **Draw Detection:** Detect when all cells are occupied without a winner.
- **Game State Management:** Update the board and player turns dynamically.
- **Visual Feedback:** Interactive animations and game result feedback.
- **Responsive Interface:** Designed for browser-based access across screen sizes.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| React 19 | Component-based UI development |
| TypeScript | Type safety and maintainable code |
| Vite | Development server and production build |
| Tailwind CSS | UI styling and responsive design |
| Motion | Animations and transitions |
| Lucide React | Interface icons |
| Canvas Confetti | Celebration effects |

## 🏗️ System Architecture

The application follows a component-based frontend architecture. The user interface, game state, game logic, and visual feedback work together to provide the complete gaming experience.


### Application Workflow

**1. Application Initialization**

The browser loads the `index.html` entry point. Vite serves the frontend application, and React initializes the user interface.

**2. UI Rendering**

React renders the game interface, including the 3×3 board, player indicators, game status, and available controls.

**3. Player Interaction**

When a player selects an available cell, the application handles the interaction through event handlers.

**4. State Management**

React state maintains the current board configuration and active player. State updates trigger the required UI re-rendering.

**5. Game Logic Execution**

After each valid move, the game evaluates the board against the possible winning combinations.

**6. Result Evaluation**

The application determines whether:
- A player has achieved a winning combination.
- All cells are occupied and the game is a draw.
- The game should continue with the next player's turn.

**7. Visual Feedback**

The interface displays the appropriate game status and uses visual effects to enhance the player experience.

## 📂 Project Structure

```text
Tic-Tac-Toe/
│
├── src/
│   └── Application source code
│       ├── React components
│       ├── Game interface
│       ├── Game logic
│       └── Styling and assets
│
├── index.html
├── package.json
├── bun.lock
├── vite.config.ts
├── tsconfig.json
├── metadata.json
├── .env.example
├── .gitignore
│
└── README.md
```

*Note: The `src` section above represents logical responsibilities, not verified individual filenames.*


## 🌐 Deployment

The application is deployed using **Vercel**.

**Live Website:**  
https://tic-tac-toe-phi-puce.vercel.app/

The GitHub repository is connected to Vercel, allowing new deployments when changes are pushed to the connected branch.

### Deployment Configuration

| Configuration | Value |
|---|---|
| Platform | Vercel |
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

## 🔮 Future Enhancements

Some potential improvements for future versions include:

- Single-player mode with an AI opponent.
- Multiple difficulty levels.
- Scoreboard and match statistics.
- Game history and replay functionality.
- Multiplayer gameplay.
- Improved accessibility and keyboard navigation.

## 👨‍💻 Author

**Aditya Gupta**

GitHub: [@Aadicodes0714](https://github.com/Aadicodes0714)

---

<p align="center">
  If you enjoyed this project, consider giving it a ⭐ on GitHub!
</p>

<p align="center">
  <strong>Built with ❤️ and React.</strong>
</p>
