// 游戏常量
const BOARD_SIZE = 9;
const EMPTY = 0;

// 游戏状态
let board = [];
let solution = [];
let initialBoard = [];
let selectedCell = null;
let gameActive = true;
let noteMode = false;
let mistakes = 0;
let hints = 3;
let remainingCells = 81;
let difficulty = 2; // 1-3, 越高越难
let startTime = null;
let timerInterval = null;
let moveHistory = [];

// 初始化游戏
function initGame() {
    // 重置游戏状态
    gameActive = true;
    mistakes = 0;
    hints = 3;
    selectedCell = null;
    noteMode = false;
    moveHistory = [];
    startTime = new Date();
    


    // 更新UI
    document.getElementById("mistakes").textContent = mistakes;
    document.getElementById("hints").textContent = hints;
    document.getElementById("note-mode-status").textContent = "关闭";
    document.getElementById("note-mode-toggle").checked = false;
    document.getElementById("game-status").textContent = "当前状态: 游戏进行中";

    // 生成数独
    generateSudoku();
    

    // 启动计时器
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);

    // 创建棋盘UI
    createBoard();
}

// 生成数独
function generateSudoku() {
    // 创建完整解决方案
    solution = createSolvedBoard();

    // 根据难度移除数字
    board = JSON.parse(JSON.stringify(solution));
   

    let cellsToRemove;
    switch (difficulty) {
        case 1:
            cellsToRemove = 30;
            break; // 简单
        case 2:
            cellsToRemove = 45;
            break; // 中等
        case 3:
            cellsToRemove = 55;
            break; // 困难
        default:
            cellsToRemove = 45;
    }

    removeNumbers(board, cellsToRemove);
    initialBoard = JSON.parse(JSON.stringify(board));
    remainingCells = cellsToRemove;
    document.getElementById("remaining").textContent = cellsToRemove;
}

// 创建已解决的数独板
function createSolvedBoard() {
    const board = Array(BOARD_SIZE)
        .fill()
        .map(() => Array(BOARD_SIZE).fill(EMPTY));
    fillBoard(board);
    return board;
}

// 使用回溯法填充板
function fillBoard(board) {
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (board[row][col] === EMPTY) {
                 const nums = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);

                for (const num of nums) {
                    if (isValidPlacement(board, row, col, num)) {
                        board[row][col] = num;

                        if (fillBoard(board)) {
                            return true;
                        }

                        board[row][col] = EMPTY;
                    }
                }

                return false;
            }
        }
    }
    return true;
}

// 随机移除数字
function removeNumbers(board, count) {
    let removed = 0;
    let attempts = 0;
    const maxAttempts = 500; // 防止无限循环
    while (removed < count) {
        const row = Math.floor(Math.random() * BOARD_SIZE);
        const col = Math.floor(Math.random() * BOARD_SIZE);
        attempts++;

        if (board[row][col] !== EMPTY) {
            // 保存旧值
            const backup = board[row][col];
            board[row][col] = EMPTY;

            // 检查是否仍然有唯一解
            const tempBoard = JSON.parse(JSON.stringify(board));
             const solutionCount = countSolutions(tempBoard);
            if (solutionCount === 1) {
                removed++;
            } else {
                board[row][col] = backup;
            }
        }
    }
}

// 计算解决方案的数量
        function countSolutions(board) {
            // 找到第一个空格
            let row = -1;
            let col = -1;
            for (let r = 0; r < BOARD_SIZE; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    if (board[r][c] === EMPTY) {
                        row = r;
                        col = c;
                        break;
                    }
                }
                if (row !== -1) break;
            }

            // 如果没有空格，找到一个解
            if (row === -1) {
                return 1;
            }

            let solutions = 0;
            for (let num = 1; num <= 9; num++) {
                if (isValidPlacement(board, row, col, num)) {
                    board[row][col] = num;
                    solutions += countSolutions(board);
                    board[row][col] = EMPTY; // 回溯
                    // 如果已经找到两个解，提前退出
                    if (solutions >= 2) {
                        return solutions;
                    }
                }
            }
            return solutions;
        }

// 计算空单元格数量
function countEmptyCells() {
    let count = 0;
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (board[row][col] === EMPTY) count++;
        }
    }
    return count;
}

// 检查数字放置是否有效
function isValidPlacement(board, row, col, num) {
    // 检查行
    for (let i = 0; i < BOARD_SIZE; i++) {
        if (board[row][i] === num) return false;
    }

    // 检查列
    for (let i = 0; i < BOARD_SIZE; i++) {
        if (board[i][col] === num) return false;
    }

    // 检查3x3子网格
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;

    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[startRow + i][startCol + j] === num) return false;
        }
    }

    return true;
}

// 创建棋盘UI
function createBoard() {
    const boardElement = document.getElementById("sudoku-board");
    boardElement.innerHTML = "";
    boardElement.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, 1fr)`;

    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const cell = document.createElement("div");
            cell.className = "cell";
            cell.dataset.row = String(row);
            cell.dataset.col = String(col);

            if (board[row][col] !== EMPTY) {
                cell.textContent = board[row][col];
                cell.classList.add("fixed");
            } else {
                // 添加笔记容器
                const notes = document.createElement("div");
                notes.className = "notes";
                notes.id = `notes-${row}-${col}`;
                cell.appendChild(notes);
            }

            cell.addEventListener("click", () => selectCell(row, col));
            boardElement.appendChild(cell);
        }
    }
}

// 选择单元格
function selectCell(row, col) {
    if (!gameActive||initialBoard[row][col]!==EMPTY) return;

    // 移除之前选择的单元格样式
    if (selectedCell) {
        const prevCell = document.querySelector(
            `.cell[data-row="${selectedCell.row}"][data-col="${selectedCell.col}"]`
        );
        prevCell.classList.remove("selected");
    }

    // 设置当前选择的单元格
    selectedCell = { row, col };
    const cell = document.querySelector(
        `.cell[data-row="${row}"][data-col="${col}"]`
    );
    cell.classList.add("selected");
}

// 放置数字
function placeNumber(num) {
    if (!selectedCell || !gameActive) return;

    const { row, col } = selectedCell;
    const cell = document.querySelector(
        `.cell[data-row="${row}"][data-col="${col}"]`
    );

    if (cell.classList.contains("fixed")) return;

    // 清除错误状态
    cell.classList.remove("error");
    cell.classList.remove("correct");
    cell.classList.remove("missing");

    if (noteMode) {
        // 笔记模式
        const notes = document.getElementById(`notes-${row}-${col}`);
        const note = notes.querySelector(`.note-${num}`);

        if (note) {
            return;
        }
        if(num===0){
            document.getElementById(`notes-${row}-${col}`).innerHTML = "";
        }
        else {
            const noteDiv = document.createElement("div");
            noteDiv.className = `note-number note-${num}`;
            noteDiv.textContent = num;
            notes.appendChild(noteDiv);
        }
    } else {
        const oldValue = board[row][col];
        // 记录历史
        moveHistory.push({
            row,
            col,
            prevValue: oldValue,
            prevNotes: getCurrentNotes(row, col),
        });

        // 正常模式
        if (num === 0) {
            // 清除单元格
            board[row][col] = EMPTY;
            cell.textContent = "";
           
            if (oldValue !== EMPTY) {
                remainingCells++;
            }
        } else {
            // 放置数字
            board[row][col] = num;
            cell.textContent = num;

            // 如果原来是空的，现在填了数字，剩余格子数减少
            if (oldValue === EMPTY) {
                remainingCells--;
            }
        }
        document.getElementById("remaining").textContent = remainingCells;
        // 检查是否完成
        if (remainingCells === 0) {
            // 检查是否完全正确
            if (checkSolution()) {
                endGame(true);
            } else {
                document.getElementById('game-status').textContent = "当前状态: 已完成但存在错误";
            }
        }
    }
}


// 获取当前笔记
function getCurrentNotes(row, col) {
    const notes = document.getElementById(`notes-${row}-${col}`);
    if (!notes) return [];

    const noteNumbers = [];
    notes.querySelectorAll(".note-number").forEach((note) => {
        noteNumbers.push(parseInt(note.textContent));
    });

    return noteNumbers;
}

// 撤销操作
function undoMove() {
    if (moveHistory.length === 0) return;

    const lastMove = moveHistory.pop();
    const { row, col, prevValue, prevNotes } = lastMove;
    const cell = document.querySelector(
        `.cell[data-row="${row}"][data-col="${col}"]`
    );
    const currentValue = board[row][col];

    // 恢复值
    board[row][col] = prevValue;

    if (prevValue === EMPTY) {
        cell.textContent = "";
        if (currentValue !== EMPTY) {
            remainingCells++;
        }
        // 恢复笔记
        const notes = document.getElementById(`notes-${row}-${col}`);
        notes.innerHTML = "";

        prevNotes.forEach((note) => {
            const noteDiv = document.createElement("div");
            noteDiv.className = `note-number note-${note}`;
            noteDiv.textContent = note;
            notes.appendChild(noteDiv);
        });
    } else {
        if (currentValue === EMPTY) {
            remainingCells--;
        }
        cell.textContent = prevValue;
        cell.querySelector(".notes").innerHTML = "";
    }
    document.getElementById("remaining").textContent = remainingCells;

    // 移除错误状态
    cell.classList.remove("error");
    cell.classList.remove("correct");
    cell.classList.remove("missing");

}

// 提供提示
function giveHint() {
    if (hints <= 0 || !gameActive) return;

    // 查找一个空单元格
    let emptyCells = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (board[row][col] === EMPTY) {
                emptyCells.push({ row, col });
            }
        }
    }

    if (emptyCells.length === 0) return;

    // 随机选择一个空单元格
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    const { row, col } = emptyCells[randomIndex];

    // 填充正确的数字
    board[row][col] = solution[row][col];

    // 更新UI
    const cell = document.querySelector(
        `.cell[data-row="${row}"][data-col="${col}"]`
    );
    cell.textContent = solution[row][col];
    cell.classList.add("hint");
     if (noteMode) {
         const notes = cell.querySelector(".notes");
         if (notes) {
             // 增加容错判断，避免元素不存在时出错
             notes.innerHTML = "";
         }
     }

    // 更新状态
    hints--;
    remainingCells--;
    document.getElementById("hints").textContent = hints;
    document.getElementById("remaining").textContent = remainingCells;

    
}

// 检查答案
function checkSolution() {
    let hasErrors = false;
    // 先清除所有错误标记
    document.querySelectorAll(".cell").forEach((cell) => {
        cell.classList.remove("error");
    });
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (board[row][col] !== solution[row][col]) {
                 const cell = document.querySelector(
                     `.cell[data-row="${row}"][data-col="${col}"]`
                 );
                cell.classList.add("error");
                 hasErrors = true;
            }
        }
    }
    if (hasErrors) {
        mistakes++;
    }
    document.getElementById("mistakes").textContent = mistakes;
    return !hasErrors;
}

// 显示答案
function showSolution() {
    if (!gameActive) return;
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const cell = document.querySelector(
                `.cell[data-row="${row}"][data-col="${col}"]`
            );

            // 移除所有状态类
            cell.classList.remove("error", "correct", "missing");

            // 只处理非固定单元格
            if (initialBoard[row][col] === EMPTY) {
                if (board[row][col] === EMPTY) {
                    // 未填写的单元格
                    cell.textContent = solution[row][col];
                    cell.classList.add("missing");
                } else if (board[row][col] === solution[row][col]) {
                    // 用户填写正确
                    cell.classList.add("correct");
                } else {
                    // 用户填写错误
                    cell.classList.add("error");
                }
            }
        }
    }

    endGame(false);
}

// 更新计时器
function updateTimer() {
    if (!startTime) return;

    const now = new Date();
    const diff = Math.floor((now - startTime) / 1000);
    const minutes = Math.floor(diff / 60)
        .toString()
        .padStart(2, "0");
    const seconds = (diff % 60).toString().padStart(2, "0");

    document.getElementById("timer").textContent = `${minutes}:${seconds}`;
}

// 结束游戏
function endGame(isWin) {
    gameActive = false;
    clearInterval(timerInterval);

    // 创建胜利消息
    const winMessage = document.createElement("div");
    winMessage.className = "win-message";

    if (isWin) {
        winMessage.innerHTML = `
                    <h2>恭喜完成!</h2>
                    <p>你成功解决了数独谜题</p>
                    <p>用时: ${document.getElementById("timer").textContent}</p>
                    <p>错误次数: ${mistakes}</p>
                    <p>使用提示: ${3 - hints}</p>
                    <div class="win-buttons">
                        <button class="btn btn-success" id="play-again-btn">再玩一局</button>
                        <button class="btn" id="close-message-btn">关闭</button>
                    </div>
                `;
    } else {
        winMessage.innerHTML = `
                    <h2>数独答案</h2>
                    <div class="solution-status">
                        <div class="status-item">
                            <div class="status-color correct-color"></div>
                            <span>正确答案</span>
                        </div>
                        <div class="status-item">
                            <div class="status-color error-color"></div>
                            <span>错误答案</span>
                        </div>
                        <div class="status-item">
                            <div class="status-color missing-color"></div>
                            <span>未填写</span>
                        </div>
                    </div>
                    <p>您的完成度: ${cellsToRemove - remainingCells}/${cellsToRemove}</p>
                    <div class="win-buttons">
                        <button class="btn btn-success" id="play-again-btn">新游戏</button>
                        <button class="btn" id="close-message-btn">关闭</button>
                    </div>
                `;
    }

    document.body.appendChild(winMessage);

    // 添加事件监听
    document.getElementById("play-again-btn").addEventListener("click", () => {
        document.body.removeChild(winMessage);
        initGame();
    });

    document
        .getElementById("close-message-btn")
        .addEventListener("click", () => {
            document.body.removeChild(winMessage);
        });
}

// 工具函数
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}


// 键盘事件处理
function handleKeyDown(event) {
    // 检查游戏是否激活
    if (!gameActive) return;
    
    // 获取按键值（兼容不同浏览器的键值表示）
    const key = event.key;
    const keyCode = event.keyCode;
    
    // 数字键 1-9（主键盘和小键盘都支持）
    if ((key >= '1' && key <= '9') || (keyCode >= 97 && keyCode <= 105)) {
        // 小键盘数字键码是97-105，转换为1-9
        const num = keyCode >= 97 ? keyCode - 96 : parseInt(key);
        placeNumber(num);
        // 阻止事件冒泡，避免浏览器默认行为
        event.preventDefault();
    }
    // 清除键 (0 或 Backspace 或 Delete)
    else if (key === '0' || key === 'Backspace' || key === 'Delete' || keyCode === 46) {
        placeNumber(0);
        event.preventDefault();
    }
}
        

// 事件监听初始化
function initEventListeners() {
    // 新游戏按钮
    document.getElementById("new-game-btn").addEventListener("click", initGame);

    // 检查答案按钮
    document.getElementById("check-btn").addEventListener("click", () => {
       if (checkSolution()) {
           if (remainingCells === 0) {
               endGame(true);
           } else {
               document.getElementById("game-status").textContent =
                   "当前状态：已完成部分无错误";
           }
       } else {
           document.getElementById("game-status").textContent =
               "当前状态：存在错误";
       }
    });

    // 显示答案按钮
    document
        .getElementById("solve-btn")
        .addEventListener("click", showSolution);

    // 提示按钮
    document.getElementById("hint-btn").addEventListener("click", giveHint);

    // 撤销按钮
    document.getElementById("undo-btn").addEventListener("click", undoMove);

    // 数字按钮
    document.querySelectorAll(".num-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const num = parseInt(btn.dataset.number);
            placeNumber(num);
        });
    });

    // 难度选择
    document
        .getElementById("difficulty-level")
        .addEventListener("input", (e) => {
            difficulty = parseInt(e.target.value);
            const levelNames = ["简单", "中等", "困难"];
            document.getElementById("difficulty-level-display").textContent =
                levelNames[difficulty - 1];
            document.getElementById("difficulty-display").textContent =
                levelNames[difficulty - 1];
            initGame();
        });

    // 笔记模式切换
    document
        .getElementById("note-mode-toggle")
        .addEventListener("change", (e) => {
            noteMode = e.target.checked;
            document.getElementById("note-mode-status").textContent = noteMode
                ? "开启"
                : "关闭";
        });
    
    document.addEventListener("keydown", handleKeyDown);
}

// 初始化游戏
window.addEventListener("load", () => {
    initGame();
    initEventListeners();
});
