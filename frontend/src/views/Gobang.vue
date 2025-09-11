<template>
  <!-- 游戏主容器 -->
  <div class="gobang-container">
    <div class="container">
      <header>
        <h1>五子棋</h1>
        <p class="subtitle">先将五颗同色棋子连成一线方获胜</p>
      </header>

      <div class="game-area">
        <!-- 左侧棋盘与控制区 -->
        <div class="game-board-container">
          <div class="board-header">
            <h2 class="board-title">五子棋战场</h2>
            <div class="player-turn" :style="playerTurnStyle">
              {{ playerTurnText }}
            </div>
          </div>

          <!-- 棋盘网格 -->
          <div id="game-board">
            <div v-for="(cell, index) in flatBoard" :key="index" class="cell"
              @click="handleCellClick(getRow(index), getCol(index))">
              <!-- 棋子 -->
              <div v-if="cell !== EMPTY"
                :class="['stone', cell === BLACK ? 'black-stone' : 'white-stone', isLastMove(getRow(index), getCol(index)) ? 'last-move' : '']">
              </div>
              <!-- 交叉点标记 -->
              <div v-if="isStarPoint(getRow(index), getCol(index))" class="star-point"></div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="controls">
            <button class="btn btn-warning" @click="undoMove">悔棋</button>
            <button class="btn btn-danger" @click="initGame">重新开始</button>
            <button class="btn" @click="openSaveModal">保存残局</button>
          </div>
        </div>

        <!-- 右侧信息面板 -->
        <div class="game-info">
          <div class="info-card">
            <h3>游戏状态</h3>
            <div class="stats">
              <div class="stat">
                <div class="stat-value">{{ blackScore }}</div>
                <div class="stat-label">黑子得分</div>
              </div>
              <div class="stat">
                <div class="stat-value">{{ whiteScore }}</div>
                <div class="stat-label">白子得分</div>
              </div>
              <div class="stat">
                <div class="stat-value">{{ moveCount }}</div>
                <div class="stat-label">步数</div>
              </div>
              <div class="stat">
                <div class="stat-value">{{ formattedGameTime }}</div>
                <div class="stat-label">时间</div>
              </div>
            </div>
          </div>
          <div class="info-card">
            <h3>游戏模式</h3>
            <div class="game-modes">
              <button class="mode-btn" :class="{ active: gameMode === 'pvp' }"
                @click="changeGameMode('pvp')">人人对战</button>
              <button class="mode-btn" :class="{ active: gameMode === 'pve' }"
                @click="changeGameMode('pve')">人机对战</button>
            </div>
            <div class="difficulty" v-if="gameMode === 'pve'">
              <label>AI难度: <span class="level-indicator">{{ aiLevelName }}</span></label>
              <div class="slider-container">
                <input type="range" min="1" max="3" v-model.number="aiLevel" @change="initGame" />
              </div>
            </div>
          </div>
          <div class="info-card">
            <h3>落子历史</h3>
            <div class="history-container" ref="historyContainerRef">
              <div class="history-steps">
                <div v-for="move in moveHistory" :key="move.step"
                  :class="['step', move.player === BLACK ? 'black' : 'white']">
                  {{ move.step }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 胜利/平局消息弹窗 -->
    <div v-if="winner !== null" class="win-message">
      <h2>{{ winMessageTitle }}</h2>
      <p>{{ winMessageSubtitle }}</p>
      <div class="win-buttons">
        <button class="btn btn-success" @click="initGame">再玩一局</button>
        <button class="btn" @click="winner = null">关闭</button>
      </div>
    </div>

    <!-- 保存残局弹窗 -->
    <div v-if="isSaveModalVisible" class="modal">
      <div class="modal-content">
        <h3>保存残局</h3>
        <div class="modal-body">
          <label for="modal-puzzle-name">请输入残局名称：</label>
          <input type="text" id="modal-puzzle-name" v-model="puzzleNameInput" placeholder="输入名称"
            @keyup.enter="confirmSavePuzzle" />
        </div>
        <div class="modal-actions">
          <button class="btn btn-danger" @click="isSaveModalVisible = false">取消</button>
          <button class="btn btn-success" @click="confirmSavePuzzle">确认保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed, watch, nextTick, toRaw } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import api from '@/services/api';

// --- 游戏常量 ---
const BOARD_SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = -1;

// --- Vue 响应式状态 ---
const board = ref([]);
const currentPlayer = ref(BLACK);
const gameMode = ref('pvp');
const gameActive = ref(true);
const aiLevel = ref(2); // 1-初级, 2-中等, 3-困难
const moveHistory = ref([]);
const lastMove = ref(null);
const moveCount = ref(0);
const gameTime = ref(0);
const timerInterval = ref(null);
const blackScore = ref(0);
const whiteScore = ref(0);
const winner = ref(null); // null-进行中, 0-平局, 1-黑胜, -1-白胜
const isSaveModalVisible = ref(false);
const puzzleNameInput = ref('');
const currentRecordId = ref(null); // 用于跟踪当前加载的残局ID
const gameName = ref('');
const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const startTime = ref(null);

// --- 计算属性 (Computed Properties) ---
const flatBoard = computed(() => board.value.flat());
const playerTurnText = computed(() => currentPlayer.value === BLACK ? '黑方回合' : '白方回合');
const playerTurnStyle = computed(() => {
  if (currentPlayer.value === BLACK) {
    return { background: 'linear-gradient(135deg, #2c3e50, #1c2833)', color: '#ecf0f1' };
  } else {
    return { background: 'linear-gradient(135deg, #ecf0f1, #bdc3c7)', color: '#2c3e50' };
  }
});
const aiLevelName = computed(() => ['初级', '中等', '困难'][aiLevel.value - 1]);
const formattedGameTime = computed(() => {
  const minutes = Math.floor(gameTime.value / 60);
  const seconds = gameTime.value % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
});
const winMessageTitle = computed(() => {
  if (winner.value === BLACK) return '黑棋胜利!';
  if (winner.value === WHITE) return '白棋胜利!';
  if (winner.value === EMPTY) return '平局!';
  return '';
});
const winMessageSubtitle = computed(() => {
  if (winner.value !== EMPTY) return `恭喜获胜方！游戏共进行了 ${moveCount.value} 步。`;
  return '棋逢对手，棋盘已满未分胜负。';
});


// --- 游戏核心方法 ---
const initGame = () => {
  board.value = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(EMPTY));
  currentPlayer.value = BLACK;
  gameActive.value = true;
  moveHistory.value = [];
  lastMove.value = null;
  moveCount.value = 0;
  gameTime.value = 0;
  winner.value = null;
  currentRecordId.value = null; // 新游戏重置ID
  startTime.value = new Date();
  // 启动计时器
  if (timerInterval.value) clearInterval(timerInterval.value);
  timerInterval.value = setInterval(() => {
    if (gameActive.value) gameTime.value++;
  }, 1000);
};

const placeStone = (row, col, player) => {
  board.value[row][col] = player;
  moveCount.value++;
  lastMove.value = { row, col };
  moveHistory.value.push({ row, col, player, step: moveCount.value });
};

const handleCellClick = (row, col) => {
  if (!gameActive.value || board.value[row][col] !== EMPTY) return;

  placeStone(row, col, currentPlayer.value);

  if (checkWin(board.value,row, col)) {
    endGame(currentPlayer.value);
    return;
  }
  if (moveCount.value === BOARD_SIZE * BOARD_SIZE) {
    endGame(EMPTY);
    return;
  }

  currentPlayer.value *= -1; // 切换玩家

  if (gameMode.value === 'pve' && currentPlayer.value === WHITE) {
    setTimeout(computerMove, 500);
  }
};

const checkWin = (currentBoard,row, col) => {
  const player = currentBoard[row][col];
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (const [dr, dc] of directions) {
    let count = 1;
    for (let i = 1; i < 5; i++) {
      const r = row + i * dr;
      const c = col + i * dc;
      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE || currentBoard[r][c] !== player) break;
      count++;
    }
    for (let i = 1; i < 5; i++) {
      const r = row - i * dr;
      const c = col - i * dc;
      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE || currentBoard[r][c] !== player) break;
      count++;
    }
    if (count >= 5) return true;
  }
  return false;
};

const endGame = (winPlayer) => {
  gameActive.value = false;
  winner.value = winPlayer;
  if (winPlayer === BLACK) blackScore.value++;
  if (winPlayer === WHITE) whiteScore.value++;
  let winStatus = 0; // 默认平局
  if (gameMode.value === 'pvp') {
    //只记录人机对战
  } else {
    // 人机对战，假设玩家是黑方
    if (winPlayer === BLACK) winStatus = 1; // 战胜AI
    if (winPlayer === WHITE) winStatus = -1; // 负于AI
  }
  recordGameSession(winStatus);
};

// --- AI 下子逻辑  ---
const computerMove = () => {
  if (!gameActive.value) return;

  const currentBoard = toRaw(board.value);
  const currentLastBlackMove = moveHistory.value.filter(move => move.player === BLACK).pop() || null;
  // 根据难度级别选择AI策略
  let move;

  if (aiLevel.value === 1) {
    // 中等难度 - 基础策略
    move = getBasicStrategyMove(currentBoard,currentLastBlackMove);
  } else if (aiLevel.value === 2) {
    // 较高难度 - 进攻防守平衡
    move = getBalancedMove(currentBoard, currentLastBlackMove);
  } else {
    // 专家难度 - 最高级策略
    move = getExpertMove(currentBoard, currentLastBlackMove);
  }
  if (moveCount.value !== BOARD_SIZE * BOARD_SIZE) {
    placeStone(move.row, move.col, WHITE);
    if (checkWin(board.value,move.row, move.col)) {
      endGame(WHITE);
    } else if (moveCount.value === BOARD_SIZE * BOARD_SIZE) {
      endGame(EMPTY);
    } else {
      currentPlayer.value = BLACK;
    }
  }
};
// 获取指定范围内的所有空位
const getEmptyCellsInRange=(currentBoard,centerRow, centerCol, range)=> {
  const emptyCells = [];

  // 遍历范围内的所有单元格
  for (let i = centerRow - range; i <= centerRow + range; i++) {
    for (let j = centerCol - range; j <= centerCol + range; j++) {
      // 检查是否在棋盘范围内且为空位
      if (
        i >= 0 &&
        i < BOARD_SIZE &&
        j >= 0 &&
        j < BOARD_SIZE &&
        currentBoard[i][j] === EMPTY
      ) {
        emptyCells.push({ row: i, col: j });
      }
    }
  }

  return emptyCells;
}

// 随机落子策略
const getRandomMove = (currentBoard) => {
  const emptyCells = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (currentBoard[i][j] === EMPTY) {
        emptyCells.push({ row: i, col: j });
      }
    }
  }

  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

const getRandomPlus=(currentBoard,currentLastBlackMove)=> {
  // 如果没有黑方落子记录或棋盘为空，返回中心位置
  if (!currentLastBlackMove || moveCount.value === 0) {
    const center = Math.floor(BOARD_SIZE / 2);
    return { row: center, col: center };
  }

  // 从最小范围开始尝试，逐步扩大
  for (let range = 1; range <= BOARD_SIZE; range++) {
    // 获取当前范围内的所有空位
    const emptyCells = getEmptyCellsInRange(
      currentBoard,
      currentLastBlackMove.row,
      currentLastBlackMove.col,
      range
    );

    // 如果该范围内有空位，随机选择一个
    if (emptyCells.length > 0) {
      return emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }
  }

  // 如果所有范围都满了（理论上不可能，因为棋盘不会同时满）
  return {
    row: Math.floor(Math.random() * BOARD_SIZE),
    col: Math.floor(Math.random() * BOARD_SIZE),
  };
}

// 基础策略 - 优先防守和进攻
const getBasicStrategyMove=(currentBoard,currentLastBlackMove)=> {
  // 1. 检查自己是否即将获胜
  let move = findWinningMove(currentBoard,WHITE);
  if (move) return move;

  // 2. 检查对手是否即将获胜
  move = findWinningMove(currentBoard,BLACK);
  if (move) return move;

  // 4. 随机落子
  return getRandomPlus(currentBoard,currentLastBlackMove);
}

// 平衡策略 - 平衡进攻和防守
const getBalancedMove=(currentBoard,currentLastBlackMove)=> {
  // 1. 检查自己是否即将获胜
  let move = findWinningMove(currentBoard,WHITE);
  if (move) return move;

  // 2. 检查对手是否即将获胜
  move = findWinningMove(currentBoard,BLACK);
  if (move) return move;

  // 3. 创建进攻机会
  move = createAttackOpportunity(currentBoard);
  if (move) return move;

  // 4. 防守对手的进攻
  move = blockOpponentAttack(currentBoard);
  if (move) return move;

  // 5. 寻找有利位置
  move = findStrategicPosition(currentBoard,currentLastBlackMove);
  if (move) return move;
}

// 专家策略 - 使用启发式评估函数
const getExpertMove=(currentBoard,currentLastBlackMove)=> {
  // 1. 检查自己是否即将获胜
  let move = findWinningMove(currentBoard,WHITE);
  if (move) return move;

  // 2. 检查对手是否即将获胜
  move = findWinningMove(currentBoard,BLACK);
  if (move) return move;

  // 3. 使用评估函数找到最佳位置
  return findBestPosition(currentBoard,currentLastBlackMove);
}

// 检查是否有即将获胜的位置
const findWinningMove = (currentBoard, player) => {
  const temBoard = currentBoard.map(row => [...row]);
  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (temBoard[i][j] !== EMPTY) continue;

      // 尝试在这个位置落子
      temBoard[i][j] = player;

      // 检查是否获胜
      if (checkWin(temBoard,i, j)) {
        // 撤销落子
        temBoard[i][j] = EMPTY;
        return { row: i, col: j };
      }

      // 撤销落子
      temBoard[i][j] = EMPTY;
    }
  }
  return null;
}

// 寻找战略位置
const findStrategicPosition=(currentBoard,currentLastBlackMove)=> {
  // 优先靠近中心
  const center = Math.floor(BOARD_SIZE / 2);

  // 如果有棋子，优先在已有棋子附近落子
  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (currentBoard[i][j] !== EMPTY) {
        // 检查周围的空位
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const ni = i + dx;
            const nj = j + dy;

            if (
              ni >= 0 &&
              ni < BOARD_SIZE &&
              nj >= 0 &&
              nj < BOARD_SIZE
            ) {
              if (currentBoard[ni][nj] === EMPTY) {
                // 给中心位置更高优先级
                const distanceToCenter =
                  Math.abs(ni - center) +
                  Math.abs(nj - center);
                const score = 100 - distanceToCenter;

                if (Math.random() < score / 100) {
                  return { row: ni, col: nj };
                }
              }
            }
          }
        }
      }
    }
  }

  // 如果棋盘为空，返回中心位置
  if (moveCount.value === 0) {
    return { row: center, col: center };
  }

  // 否则返回随机位置
  return getRandomPlus(currentBoard,currentLastBlackMove);
}

// 创建进攻机会
const createAttackOpportunity=(currentBoard)=> {
  // 寻找可以形成活三或冲四的位置
  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (currentBoard[i][j] !== EMPTY) continue;

      currentBoard[i][j] = WHITE;

      // 检查是否能形成活三
      if (countThreats(currentBoard,i, j, WHITE) >= 2) {
        currentBoard[i][j] = EMPTY;
        return { row: i, col: j };
      }

      currentBoard[i][j] = EMPTY;
    }
  }
  return null;
}

// 防守对手的进攻
const blockOpponentAttack=(currentBoard)=> {
  // 寻找对手可能形成威胁的位置
  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (currentBoard[i][j] !== EMPTY) continue;

      currentBoard[i][j] = BLACK;

      // 检查对手是否能形成多个威胁
      if (countThreats(currentBoard,i, j, BLACK) >= 1) {
        currentBoard[i][j] = EMPTY;
        return { row: i, col: j };
      }

      currentBoard[i][j] = EMPTY;
    }
  }
  return null;
}

// 计算威胁数量
const countThreats=(currentBoard,row, col, player)=> {
  let threatCount = 0;
  const directions = [
    [0, 1], // 水平
    [1, 0], // 垂直
    [1, 1], // 对角线
    [1, -1], // 反对角线
  ];

  for (const [dx, dy] of directions) {
    let count = 1; // 当前位置

    // 正向检查
    for (let i = 1; i <= 4; i++) {
      const ni = row + dx * i;
      const nj = col + dy * i;

      if (ni < 0 || ni >= BOARD_SIZE || nj < 0 || nj >= BOARD_SIZE) break;
      if (currentBoard[ni][nj] === player) {
        count++;
      } else {
        break;
      }
    }

    // 反向检查
    for (let i = 1; i <= 4; i++) {
      const ni = row - dx * i;
      const nj = col - dy * i;

      if (ni < 0 || ni >= BOARD_SIZE || nj < 0 || nj >= BOARD_SIZE) break;
      if (currentBoard[ni][nj] === player) {
        count++;
      } else {
        break;
      }
    }

    if (count >= 3) {
      threatCount++;
    }
  }

  return threatCount;
}

// 使用评估函数找到最佳位置
const findBestPosition=(currentBoard,currentLastBlackMove)=> {
  let bestScore = -Infinity;
  let bestMove = null;

  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (currentBoard[i][j] !== EMPTY) continue;

      // 评估这个位置
      const score = evaluatePosition(currentBoard,i, j);

      if (score > bestScore) {
        bestScore = score;
        bestMove = { row: i, col: j };
      }
    }
  }

  return bestMove || getRandomPlus(currentBoard,currentLastBlackMove);
}

// 评估位置的价值
const evaluatePosition=(currentBoard,row, col)=> {
  let score = 0;

  // 中心位置更有价值
  const center = Math.floor(BOARD_SIZE / 2);
  const distanceToCenter = Math.abs(row - center) + Math.abs(col - center);
  score += (BOARD_SIZE - distanceToCenter) * 5;

  // 评估每个方向
  const directions = [
    [0, 1], // 水平
    [1, 0], // 垂直
    [1, 1], // 对角线
    [1, -1], // 反对角线
  ];

  for (const [dx, dy] of directions) {
    // 评估白子的潜力
    currentBoard[row][col] = WHITE;
    score += evaluateLine(currentBoard, row, col, dx, dy, WHITE) * 5;
    currentBoard[row][col] = EMPTY;

    // 评估黑子的威胁
    currentBoard[row][col] = BLACK;
    score += evaluateLine(currentBoard, row, col, dx, dy, BLACK) * 8;
    currentBoard[row][col] = EMPTY;
  }

  return score;
}

// 评估一条线上的潜力
const evaluateLine=(currentBoard,row, col, dx, dy, player)=> {
  let score = 0;
  let count = 1; // 当前位置
  let flag3 = 0;
  // 正向检查
  for (let i = 1; i <= 4; i++) {
    const ni = row + dx * i;
    const nj = col + dy * i;

    if (ni < 0 || ni >= BOARD_SIZE || nj < 0 || nj >= BOARD_SIZE) break;

    if (currentBoard[ni][nj] === player) {
      count++;
    } else if (currentBoard[ni][nj] === -player) {
      flag3 = 1;
      break;
    }
  }

  // 反向检查
  for (let i = 1; i <= 4; i++) {
    const ni = row - dx * i;
    const nj = col - dy * i;

    if (ni < 0 || ni >= BOARD_SIZE || nj < 0 || nj >= BOARD_SIZE) break;

    if (currentBoard[ni][nj] === player) {
      count++;
    } else if (currentBoard[ni][nj] === -player) {
      flag3 = 1;
      break;
    }
  }

  // 根据连子数评分
  if (count >= 5) {
    score += 100000; // 获胜
  } else if (count === 4) {
    score += 1000; // 活四
  } else if (count === 3) {
    score += 500; // 活三
    if (flag3 === 1) {
      score -= 450;
    }
  } else if (count === 2) {
    score += 50; // 活二
  }

  return score;
}


// --- UI 辅助方法 ---
const getRow = index => Math.floor(index / BOARD_SIZE);
const getCol = index => index % BOARD_SIZE;
const isLastMove = (row, col) => lastMove.value && lastMove.value.row === row && lastMove.value.col === col;
const isStarPoint = (row, col) => (row === 3 || row === 7 || row === 11) && (col === 3 || col === 7 || col === 11);


const changeGameMode = (mode) => {
  if (gameMode.value === mode) return;
  gameMode.value = mode;
  blackScore.value = 0;
  whiteScore.value = 0;
  initGame();
};

const undoMove = () => {
  if (moveHistory.value.length < 1 || !gameActive.value) return;

  // 如果是 PVE 模式，一次悔两步
  const stepsToUndo = (gameMode.value === 'pve' && currentPlayer.value === BLACK && moveHistory.value.length >= 2) ? 2 : 1;

  for (let i = 0; i < stepsToUndo; i++) {
    const last = moveHistory.value.pop();
    if (last) {
      board.value[last.row][last.col] = EMPTY;
      moveCount.value--;
    }
  }

  currentPlayer.value = moveHistory.value.length > 0 ? -moveHistory.value[moveHistory.value.length - 1].player : BLACK;
  lastMove.value = moveHistory.value.length > 0 ? moveHistory.value[moveHistory.value.length - 1] : null;
};

// --- 保存和加载残局 ---
const openSaveModal = () => {
  if (!gameActive.value) {
    alert("请在游戏进行中保存残局");
    return;
  }

  if (currentRecordId.value && gameName.value) {
    puzzleNameInput.value = gameName.value;
  } else {
    const date = new Date().toISOString().split("T")[0];
    puzzleNameInput.value = `五子棋残局_${date}`;
  }
    isSaveModalVisible.value = true;
  
};

const confirmSavePuzzle = async () => {
  const inputName = puzzleNameInput.value.trim();
  if (!inputName) {
    alert("请输入残局名称");
    return;
  }
  if (!currentRecordId.value) {
    const checkResponse = await api.get('/check-puzzle-name', {
      params: {
        gameType: 'gobang',
        name: inputName
      }
    });
    if (checkResponse.data.exists) {
      alert(`已存在名为“${inputName}”的残局，请修改名称`);
      return; 
    }
  }
  const gameState = {
    name: puzzleNameInput.value,
    board: board.value,
    currentPlayer: currentPlayer.value,
    gameMode: gameMode.value,
    aiLevel: aiLevel.value,
    moveHistory: moveHistory.value,
    moveCount: moveCount.value,
    gameTime: gameTime.value,
    blackScore: blackScore.value,
    whiteScore: whiteScore.value,
    lastMove: lastMove.value,
    gameActive: gameActive.value
  };

  try {
    let response;
    if (currentRecordId.value) {
      // 更新
      response = await api.put(`/update-game/${currentRecordId.value}`, { gameType: 'gobang', gameState });
    } else {
      // 新增
      response = await api.post('/save-game', { gameType: 'gobang', gameState });
    }
    alert(response.data.message || "残局保存成功！");
    if (!currentRecordId.value&&response.data.recordId) currentRecordId.value = response.data.recordId;
    isSaveModalVisible.value = false;
  } catch (err) {
    alert("保存失败：" + (err.response?.data?.error || err.message));
  }
};

const loadPuzzleFromRoute = async (recordId) => {
  try {
    const response = await api.get(`/load-game/${recordId}`);
    const { gameState } = response.data.data;

    // 恢复状态
    board.value = gameState.board;
    currentPlayer.value = gameState.currentPlayer;
    gameMode.value = gameState.gameMode;
    aiLevel.value = gameState.aiLevel;
    moveHistory.value = gameState.moveHistory;
    moveCount.value = gameState.moveCount;
    gameTime.value = gameState.gameTime;
    blackScore.value = gameState.blackScore;
    whiteScore.value = gameState.whiteScore;
    lastMove.value = gameState.lastMove;
    gameActive.value = gameState.gameActive;
    currentRecordId.value = recordId;
    gameName.value = gameState.name;

    // 重启计时器
    if (timerInterval.value) clearInterval(timerInterval.value);
    timerInterval.value = setInterval(() => {
      if (gameActive.value) gameTime.value++;
    }, 1000);

    alert("残局加载成功！");

  } catch (err) {
    alert("加载残局失败：" + (err.response?.data?.error || err.message));
    router.push('/games/gobang'); // 加载失败则重置URL
  }
};
// --- 发送统计数据 ---
const recordGameSession = async (winStatus) => {
  if (!startTime.value) return; // 如果没有开始时间，则不记录

  const sessionData = {
    gameType: 'gobang',
    startTime: startTime.value.toISOString(),
    endTime: new Date().toISOString(),
    winStatus: winStatus, // 1=胜, -1=负, 0=平局/中途退出
  };
  try {
    await api.post('/api/stat/record-game-session', sessionData);
  } catch (error) {
    console.error("记录游戏会话失败:", error);
  }
};

// --- Vue 生命周期钩子 ---
onMounted(() => {
  if (!authStore.isLoggedIn) {
    alert("请先登录以进行游戏。");
    router.push('/');
    authStore.openAuthModal();
    return;
  }

  // 检查 URL 中是否有 load 参数
  const recordIdToLoad = route.query.load;
  if (recordIdToLoad) {
    loadPuzzleFromRoute(recordIdToLoad);
  } else {
    initGame();
  }
});

onUnmounted(() => {
  if (gameActive.value) {
    recordGameSession(0);
  } if (timerInterval.value) clearInterval(timerInterval.value);
})
</script>


<style scoped>
.gobang-container {
  background: #c3eaf4;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  color: white;
  width: 100%;
}

.container {
  max-width: 1200px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

header {
  text-align: center;
  padding: 20px;
  margin-bottom: 20px;
  width: 100%;
}

h1 {
  font-size: 2.8rem;
  margin-bottom: 10px;
  background: #2b2b96;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  letter-spacing: 2px;
}

.subtitle {
  font-size: 1.2rem;
  opacity: 0.8;
  max-width: 600px;
  margin: 0 auto;
  color: #000;
}

.game-area {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 30px;
  width: 100%;
  margin-top: 20px;
}

.game-board-container {
  background: rgba(25, 25, 35, 0.85);
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  position: relative;
  min-width: 550px;
}

.game-info {
  background: rgba(25, 25, 35, 0.85);
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  width: 350px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.board-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.board-title {
  font-size: 1.8rem;
  color: #ff9966;
}

.player-turn {
  font-size: 1.2rem;
  padding: 8px 15px;
  border-radius: 20px;
}

#game-board {
  display: grid;
  grid-template-columns: repeat(15, 1fr);
  gap: 0;
  width: 500px;
  height: 500px;
  margin: 0 auto;
  background: #dcb35c;
  border: 3px solid #8b5a2b;
  position: relative;
}

.cell {
  position: relative;
  border: 1px solid #8b5a2b;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background-color 0.2s;
}

.cell:hover {
  background-color: rgba(220, 179, 92, 0.7);
}

.star-point {
  position: absolute;
  width: 8px;
  height: 8px;
  background-color: #8b5a2b;
  border-radius: 50%;
}

.stone {
  position: absolute;
  width: 85%;
  height: 85%;
  border-radius: 50%;
  z-index: 2;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}

.black-stone {
  background: radial-gradient(circle at 30% 30%, #666, #000);
}

.white-stone {
  background: radial-gradient(circle at 30% 30%, #fff, #ccc);
}

.last-move {
  box-shadow: 0 0 0 3px #ff3366 !important;

}

.controls {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 25px;
  flex-wrap: wrap;
}

.btn {
  padding: 12px 25px;
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: bold;
  transition: all 0.3s;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
}

.btn:active {
  transform: translateY(1px);
}

.btn-danger {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
}

.btn-success {
  background: linear-gradient(135deg, #2ecc71, #27ae60);
}

.btn-warning {
  background: linear-gradient(135deg, #f39c12, #e67e22);
}

.info-card {
  background: rgba(30, 30, 40, 0.7);
  border-radius: 12px;
  padding: 20px;
}

.info-card h3 {
  color: #3498db;
  margin-bottom: 15px;
  font-size: 1.4rem;
  border-bottom: 2px solid rgba(52, 152, 219, 0.3);
  padding-bottom: 8px;
}

.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-top: 10px;
}

.stat {
  background: rgba(255, 255, 255, 0.08);
  padding: 12px;
  border-radius: 8px;
  text-align: center;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: bold;
  margin: 5px 0;
  color: #f39c12;
}

.stat-label {
  font-size: 0.9rem;
  opacity: 0.7;
}

.game-modes {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.mode-btn {
  flex: 1;
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
}

.mode-btn.active {
  background: #3498db;
  box-shadow: 0 0 15px rgba(52, 152, 219, 0.5);
}

.mode-btn:hover:not(.active) {
  background: rgba(255, 255, 255, 0.2);
}

.difficulty {
  margin-top: 15px;
}

.difficulty label {
  display: block;
  margin-bottom: 8px;
  opacity: 0.8;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

input[type=range] {
  flex: 1;
  height: 10px;
  appearance: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  outline: none;
}

input[type=range]::-webkit-slider-thumb {
  appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #3498db;
  cursor: pointer;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
}

.level-indicator {
  width: 40px;
  text-align: center;
  font-weight: bold;
  color: #f39c12;
}

.history-container {
  max-height: 200px;
  overflow-y: auto;
  margin-top: 15px;
  padding-right: 10px;
}

.history-steps {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
  gap: 8px;
}

.step {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 0.9rem;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.2s;
}

.step.black {
  background: rgba(0, 0, 0, 0.6);
}

.step.white {
  background: rgba(255, 255, 255, 0.6);
  color: #333;
}

.win-message {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.85);
  padding: 30px 50px;
  border-radius: 15px;
  text-align: center;
  z-index: 100;
  box-shadow: 0 0 30px rgba(255, 255, 255, 0.2);
  border: 2px solid #f39c12;
  animation: popIn 0.5s ease-out;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.modal-content {
  background-color: #1a1a2e;
  padding: 25px;
  border-radius: 10px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.modal h3 {
  margin-top: 0;
  color: #f39c12;
  text-align: center;
}

.modal-body {
  margin: 20px 0;
}

.modal-body label {
  display: block;
  margin-bottom: 8px;
  color: rgba(255, 255, 255, 0.8);
}

#modal-puzzle-name {
  width: 100%;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

@keyframes popIn {
  0% {
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 0;
  }

  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
}

.win-message h2 {
  font-size: 2.5rem;
  margin-bottom: 20px;
  color: #f39c12;
}

.win-message p {
  font-size: 1.2rem;
  margin-bottom: 30px;
}

.win-buttons {
  display: flex;
  gap: 15px;
  justify-content: center;
}

@media (max-width: 1000px) {
  .game-area {
    flex-direction: column;
    align-items: center;
  }

  .game-info {
    width: 100%;
    max-width: 550px;
  }
}

@media (max-width: 600px) {
  .game-board-container {
    min-width: 100%;
    padding: 15px;
  }

  #game-board {
    width: 100%;
    height: auto;
    aspect-ratio: 1/1;
  }

  h1 {
    font-size: 2.2rem;
  }

  .controls {
    gap: 10px;
  }

  .btn {
    padding: 10px 15px;
    font-size: 0.9rem;
  }

  .win-message {
    padding: 20px;
    width: 90%;
  }

  .win-message h2 {
    font-size: 1.8rem;
  }
}
</style>