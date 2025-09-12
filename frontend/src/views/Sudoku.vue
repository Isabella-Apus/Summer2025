<template>
  <div class="sudoku-container">
    <div class="container">
      <header>
        <h1>数独挑战</h1>
        <p class="subtitle">每行、每列、每子方格都必须包含1-9的数字且不重复</p>
      </header>

      <div class="game-area">
        <div class="game-board-container">
          <div class="board-header">
            <h2 class="board-title">数独谜题</h2>
            <div class="timer">{{ formattedTime }}</div>
          </div>

          <!-- 数独棋盘 -->
          <div id="sudoku-board">
            <div v-for="(cell, index) in flatBoard" :key="index" class="cell" :class="getCellClasses(index)"
              @click="selectCell(getRow(index), getCol(index))">
              <!-- 固定数字 -->
              <template v-if="isFixed(index)">{{ cell }}</template>
              <!-- 用户填写的数字 -->
              <template v-else-if="cell !== 0">{{ cell }}</template>
              <!-- 笔记 -->
              <div v-else class="notes">
                <div v-for="n in 9" :key="n" class="note-number">
                  {{ notes[index] && notes[index].has(n) ? n : '' }}
                </div>
              </div>
            </div>
          </div>

          <!-- 游戏控制按钮 -->
          <div class="controls">
            <button class="btn btn-warning" @click="startNewGame">新游戏</button>
            <button class="btn btn-danger" @click="checkSolution">检查答案</button>
            <button class="btn btn-success" @click="showSolution">显示答案</button>
            <button class="btn btn-info" @click="giveHint">提示</button>
            <button class="btn" @click="undoMove">撤销</button>
            <button class="btn btn-save" @click="openSaveModal">保存残局</button>
          </div>

          <!-- 数字输入按钮 -->
          <div class="number-controls">
            <button v-for="n in 9" :key="n" class="num-btn" @click="placeNumber(n)">{{ n }}</button>
            <button class="num-btn" @click="placeNumber(0)">清除</button>
          </div>

          <!-- 笔记模式切换 -->
          <div class="note-mode">
            <span>笔记模式:</span>
            <label class="switch">
              <input type="checkbox" v-model="noteMode" />
              <span class="slider"></span>
            </label>
            <span>{{ noteMode ? '开启' : '关闭' }}</span>
          </div>
        </div>

        <!-- 右侧信息面板 -->
        <div class="game-info">
          <div class="info-card">
            <h3>游戏状态</h3>
            <div class="stats">
              <div class="stat">
                <div class="stat-value">{{ mistakes }}</div>
                <div class="stat-label">错误次数</div>
              </div>
              <div class="stat">
                <div class="stat-value">{{ hints }}</div>
                <div class="stat-label">剩余提示</div>
              </div>
              <div class="stat">
                <div class="stat-value">{{ remainingCells }}</div>
                <div class="stat-label">剩余空格</div>
              </div>
              <div class="stat">
                <div class="stat-value">{{ difficultyName }}</div>
                <div class="stat-label">难度级别</div>
              </div>
            </div>
          </div>
          <div class="info-card">
            <h3>游戏设置</h3>
            <div class="difficulty-selector">
              <label>难度级别: <span class="level-indicator">{{ difficultyName }}</span></label>
              <div class="slider-container">
                <input type="range" min="1" max="3" v-model.number="difficulty" @change="startNewGame" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 胜利/答案弹窗 -->
    <div v-if="isGameFinished" class="win-message">
      <h2>{{ winTitle }}</h2>
      <p v-if="winMessage">{{ winMessage }}</p>
      <div class="win-buttons">
        <button class="btn btn-success" @click="startNewGame">新游戏</button>
        <button class="btn" @click="isGameFinished = false">关闭</button>
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
import { ref, reactive, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import api from '@/services/api';

const board = ref([]);
const initialBoard = ref([]);
const solution = ref([]);
const notes = reactive({}); 
const selectedCell = ref(null); 
const gameActive = ref(true);
const noteMode = ref(false);
const mistakes = ref(0);
const hints = ref(3);
const difficulty = ref(2); 
const playTime = ref(0);
const timerInterval = ref(null);
const moveHistory = ref([]);
const isGameFinished = ref(false);
const winTitle = ref('');
const winMessage = ref('');
const isSaveModalVisible = ref(false);
const puzzleNameInput = ref('');
const currentRecordId = ref(null);
const cellStatus = reactive({}); 
const SIZE = 9
const EMPTY = 0
const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const startTime = ref(null);
const gameName = ref('');

//计算属性
const flatBoard = computed(() => board.value.flat());
const remainingCells = computed(() => board.value.flat().filter(c => c === 0).length);
const difficultyName = computed(() => ['简单', '中等', '困难'][difficulty.value - 1]);
const formattedTime = computed(() => {
  const minutes = Math.floor(playTime.value / 60).toString().padStart(2, '0');
  const seconds = (playTime.value % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
});

//游戏核心方法
const startNewGame = () => {
  // 根据难度生成数独
  const puzzle = generate(difficulty.value);
  initialBoard.value = puzzle.map(row => [...row]);
  board.value = puzzle.map(row => [...row]);

  // 求解数独以获取答案
  const solvedPuzzle = solve(puzzle);
  solution.value = solvedPuzzle;

  // 重置状态
  gameActive.value = true;
  mistakes.value = 0;
  hints.value = 3;
  playTime.value = 0;
  moveHistory.value = [];
  selectedCell.value = null;
  isGameFinished.value = false;
  currentRecordId.value = null;
  Object.keys(notes).forEach(key => delete notes[key]);
  Object.keys(cellStatus).forEach(key => delete cellStatus[key]);

  startTimer();
  startTime.value = new Date();
};

const startTimer = () => {
  if (timerInterval.value) clearInterval(timerInterval.value);
  timerInterval.value = setInterval(() => {
    if (gameActive.value) playTime.value++;
  }, 1000);
};

const selectCell = (row, col) => {
  if (!gameActive.value || initialBoard.value[row][col] !== 0) return;
  selectedCell.value = { row, col };
};

const placeNumber = (num) => {
  if (!selectedCell.value || !gameActive.value) return;
  const { row, col } = selectedCell.value;
  const index = row * SIZE + col;
  const oldVal = board.value[row][col];
  const oldNotes = notes[`${row}-${col}`] ? new Set(notes[`${row}-${col}`]) : new Set();
  moveHistory.value.push({ row, col, oldVal, oldNotes });

  // 清除检查状态
  delete cellStatus[`${row}-${col}`];

  if (noteMode.value) {
    //笔记模式
    if (!notes[index]) notes[index] = new Set();
    if (num === 0) {
      notes[index].clear();
    } else {
      if (notes[index].has(num)) {
        notes[index].delete(num);
      } else {
        notes[index].add(num);
      }
    }
  } else {
    //正常填数
    board.value[row][col] = num;
    if (notes[index]) notes[index].clear();
    // 检查是否完成
    if (remainingCells.value === 1 && num !== 0) {
      checkSolution(true);
    }
  }
};

const undoMove = () => {
  if (moveHistory.value.length === 0) return;
  const last = moveHistory.value.pop();
  const { row, col, oldVal, oldNotes } = last;
  const index = row * SIZE + col;
  board.value[row][col] = oldVal;
  notes[index] = oldNotes;
};

const checkSolution = (isFinalCheck = false) => {
  let hasErrors = false;
  let isFinishCheck = true;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (initialBoard.value[r][c] !== 0) continue;
      const key = `${r}-${c}`;
      if (board.value[r][c] !== 0 && board.value[r][c] !== solution.value[r][c]) {
        cellStatus[key] = 'error';
        hasErrors = true;
      } else if (board.value[r][c] === solution.value[r][c]) {
        cellStatus[key] = 'correct';
      } else if (board.value[r][c] === 0) {
        isFinishCheck = false;
      }
    }
  }
  if (hasErrors) mistakes.value++;

  if (isFinalCheck && isFinishCheck && !hasErrors) {
    gameActive.value = false;
    clearInterval(timerInterval.value);
    winTitle.value = "恭喜完成!";
    winMessage.value = `用时: ${formattedTime.value}, 错误次数: ${mistakes.value}`;
    isGameFinished.value = true;
    recordGameSession(1);
  }
};

const showSolution = () => {
  gameActive.value = false;
  clearInterval(timerInterval.value);

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (initialBoard.value[r][c] !== EMPTY) continue;
      const key = `${r}-${c}`;
      const userVal = board.value[r][c];

      if (userVal === EMPTY) {
        cellStatus[key] = 'missing'; 
      } else if (userVal === solution.value[r][c]) {
        cellStatus[key] = 'correct'; 
      } else {
        cellStatus[key] = 'error'; 
      }
    }
  }

  board.value = solution.value.map(row => [...row]);

  winTitle.value = "答案已显示";
  winMessage.value = "状态说明：绿色-填写正确，红色-填写错误，蓝色-未填写。";
  isGameFinished.value = true;
  recordGameSession(0);
};

const giveHint = () => {
  if (hints.value <= 0) return;
  const emptyCells = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board.value[r][c] === 0) emptyCells.push({ r, c });
    }
  }
  if (emptyCells.length > 0) {
    const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    board.value[cell.r][cell.c] = solution.value[cell.r][cell.c];
    hints.value--;
  }
};

//检查数字放置是否合理
function isValid(board, row, col, num) {
  for (let x = 0; x < SIZE; x++) {
    if (board[row][x] === num) return false;
  }
  for (let x = 0; x < SIZE; x++) {
    if (board[x][col] === num) return false;
  }
  const startRow = row - (row % 3);
  const startCol = col - (col % 3);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[i + startRow][j + startCol] === num) return false;
    }
  }
  return true;
}

//求解数独
function solveSudoku(board) {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (board[row][col] === EMPTY) {
        for (let num = 1; num <= SIZE; num++) {
          if (isValid(board, row, col, num)) {
            board[row][col] = num;
            if (solveSudoku(board)) return true;
            board[row][col] = EMPTY;
          }
        }
        return false;
      }
    }
  }
  return true;
}

//随机打乱数组
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

//计算数独解的数量（确保唯一解）
function countSolutions(board) {
  let row = -1, col = -1;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === EMPTY) {
        row = r; col = c; break;
      }
    }
    if (row !== -1) break;
  }

  if (row === -1) return 1;

  let count = 0;
  for (let num = 1; num <= SIZE; num++) {
    if (isValid(board, row, col, num)) {
      board[row][col] = num;
      count += countSolutions(board);
      board[row][col] = EMPTY; 
      if (count >= 2) return 2; 
    }
  }
  return count;
}

function fillBoard(board) {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (board[row][col] === EMPTY) {
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const num of nums) {
          if (isValid(board, row, col, num)) {
            board[row][col] = num;
            if (fillBoard(board)) return true;
            board[row][col] = EMPTY;
          }
        }
        return false;
      }
    }
  }
  return true;
}

//生成数独
function generate(difficulty = 2) {
  const fullBoard = Array(SIZE).fill(0).map(() => Array(SIZE).fill(EMPTY));
  fillBoard(fullBoard); 

  const puzzle = fullBoard.map(row => [...row]);

  let cellsToRemove;
  switch (difficulty) {
    case 1: cellsToRemove = 40; break; 
    case 3: cellsToRemove = 55; break;     default: cellsToRemove = 48; break;
  }

  let removed = 0;
  while (removed < cellsToRemove) {
    const row = Math.floor(Math.random() * SIZE);
    const col = Math.floor(Math.random() * SIZE);

    if (puzzle[row][col] !== EMPTY) {
      const backup = puzzle[row][col];
      puzzle[row][col] = EMPTY;

      const tempBoard = puzzle.map(r => [...r]);
      const solutionCount = countSolutions(tempBoard);

      if (solutionCount !== 1) { 
        puzzle[row][col] = backup;
      } else {
        removed++;
      }
    }
  }
  return puzzle;
}

function solve(puzzle) {
  const solution = puzzle.map((row) => [...row]);
  solveSudoku(solution);
  return solution;
}

//页面设计
const getRow = i => Math.floor(i / 9);
const getCol = i => i % 9;
const isFixed = i => initialBoard.value[getRow(i)][getCol(i)] !== 0;
const getCellClasses = (index) => {
  const row = getRow(index);
  const col = getCol(index);
  const classes = {
    fixed: isFixed(index),
    selected: selectedCell.value && selectedCell.value.row === row && selectedCell.value.col === col,
    error: cellStatus[`${row}-${col}`] === 'error',
    correct: cellStatus[`${row}-${col}`] === 'correct',
    missing: cellStatus[`${row}-${col}`] === 'missing',
  };
  // 添加九宫格粗边框的类
  if ((col + 1) % 3 === 0 && col < 8) classes['border-right'] = true;
  if ((row + 1) % 3 === 0 && row < 8) classes['border-bottom'] = true;
  return classes;
};

// --- 保存和加载 ---
const openSaveModal = () => {
  if (!gameActive.value) {
    alert("请在游戏进行中保存残局");
    return;
  }
  if (currentRecordId.value && gameName.value) {
    puzzleNameInput.value = gameName.value;
  } else {
    const date = new Date().toISOString().split("T")[0];
    puzzleNameInput.value = `数独残局_${date}`;
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
        gameType: 'sudoku',
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
    initialBoard: initialBoard.value,
    board: board.value,
    solution: solution.value,
    notes: Object.fromEntries(Object.entries(notes).map(([k, v]) => [k, Array.from(v)])),
    playTime: playTime.value,
    mistakes: mistakes.value,
    remainingCells: remainingCells.value,
    hints: hints.value,
    difficulty: difficulty.value,
  };
  try {
    let response;
    if (currentRecordId.value) {
      response = await api.put(`/update-game/${currentRecordId.value}`, { gameType: 'sudoku', gameState });
      alert("更新成功！");
    } else {
      response = await api.post('/save-game', { gameType: 'sudoku', gameState });
      alert("保存成功！");
    }
    if (response.data.recordId) currentRecordId.value = response.data.recordId;
    isSaveModalVisible.value = false;
  } catch (err) {
    alert("保存失败: " + (err.response?.data?.error || err.message));
  }
};

const loadPuzzleFromRoute = async (recordId) => {
  try {
    const response = await api.get(`/load-game/${recordId}`);
    const { gameState } = response.data.data;

    initialBoard.value = gameState.initialBoard;
    board.value = gameState.board;
    solution.value = gameState.solution;
    Object.keys(notes).forEach(key => delete notes[key]);
    Object.entries(gameState.notes || {}).forEach(([k, v]) => notes[k] = new Set(v));
    playTime.value = gameState.playTime;
    mistakes.value = gameState.mistakes;
    hints.value = gameState.hints;
    difficulty.value = gameState.difficulty;
    gameActive.value = true;
    isGameFinished.value = false;
    currentRecordId.value = recordId;
    gameName.value = gameState.name;

    startTimer();

  } catch (err) {
    alert("加载残局失败: " + (err.response?.data?.error || err.message));
    router.push('/games/sudoku');
  }
};

const recordGameSession = async (winStatus) => {
  if (!startTime.value) return;

  const sessionData = {
    gameType: 'sudoku',
    startTime: startTime.value.toISOString(),
    endTime: new Date().toISOString(),
    winStatus: winStatus, // 1=胜利, 0=中途退出
  };
  try {
    await api.post('/api/stat/record-game-session', sessionData);
  } catch (error) {
    console.error("记录游戏会话失败:", error);
  }
};


// --- 生命周期和键盘事件 ---
onMounted(() => {
  if (!authStore.isLoggedIn) {
    alert("请先登录以进行游戏。");
    router.push('/');
    authStore.openAuthModal();
    return;
  }

  const recordId = route.query.load;
  if (recordId) {
    loadPuzzleFromRoute(recordId);
  } else {
    startNewGame();
  }

  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  if (gameActive.value) {
    recordGameSession(0);
  }
  window.removeEventListener('keydown', handleKeyDown);
  if (timerInterval.value) clearInterval(timerInterval.value);
});

const handleKeyDown = (e) => {
  if (selectedCell.value && gameActive.value) {
    if (e.key >= '1' && e.key <= '9') {
      placeNumber(parseInt(e.key));
      e.preventDefault();
    } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
      placeNumber(0);
      e.preventDefault();
    }
  }
};
</script>


<style scoped>
.sudoku-container {
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
  -webkit-text-fill-color: transparent;
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

#sudoku-board {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 1px;
  width: 500px;
  height: 500px;
  margin: 0 auto;
  background: #2c3e50;
  border: 3px solid #34495e;
  position: relative;
}

.cell {
  display: flex;
  justify-content: center;
  align-items: center;
  background: white;
  font-size: 1.8rem;
  font-weight: bold;
  color: #2c3e50;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}

.cell.fixed {
  background-color: #e0e0e0;
  color: #2c3e50;
  cursor: not-allowed;
}

.cell:not(.fixed):hover {
  background-color: #f1f2f6;
}

.cell.selected {
  background-color: #aed6f1;
  transform: scale(1.05);
  box-shadow: 0 0 5px rgba(52, 152, 219, 0.7);
  z-index: 1;
}

.cell.error {
  background-color: #f5b7b1;
}

.cell.correct {
  background-color: #d5f5e3;
  color: #27ae60;
}

.cell.missing {
  color: #3498db;
}

.cell.border-right {
  border-right: 3px solid #34495e;
}

.cell.border-bottom {
  border-bottom: 3px solid #34495e;
}

.notes {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  font-size: 0.8rem;
  color: #3498db;
  padding: 2px;
}

.note-number {
  display: flex;
  justify-content: center;
  align-items: center;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 25px;
}

.number-controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 15px;
}

.btn {
  padding: 12px 20px;
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: bold;
  transition: all 0.3s;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  min-width: 100px;
}

.btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
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

.btn-info {
  background: linear-gradient(135deg, #9b59b6, #8e44ad);
}

.btn-save {
  background: linear-gradient(135deg, #ecee72, #afb140);
}

.num-btn {
  width: 50px;
  height: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.5rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.num-btn:hover {
  background: #2980b9;
  transform: scale(1.05);
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

.difficulty-selector {
  margin-top: 15px;
}

.difficulty-selector label {
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
  width: 80px;
  text-align: center;
  font-weight: bold;
  color: #f39c12;
}

.note-mode {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 15px;
  padding: 10px;
  background: rgba(52, 152, 219, 0.2);
  border-radius: 8px;
}

.switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 34px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked+.slider {
  background-color: #3498db;
}

input:checked+.slider:before {
  transform: translateX(26px);
}

.win-message {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.9);
  padding: 40px 60px;
  border-radius: 15px;
  text-align: center;
  z-index: 100;
  box-shadow: 0 0 40px rgba(255, 255, 255, 0.3);
  border: 3px solid #f39c12;
  animation: popIn 0.5s ease-out;
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

  #sudoku-board {
    width: 100%;
    height: auto;
    aspect-ratio: 1/1;
  }

  h1 {
    font-size: 2.2rem;
  }

  .controls,
  .number-controls {
    gap: 8px;
  }

  .btn {
    padding: 10px 15px;
    font-size: 0.9rem;
    min-width: 80px;
  }

  .num-btn {
    width: calc(10% - 8px);
    height: auto;
    aspect-ratio: 1/1;
    font-size: 1.2rem;
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