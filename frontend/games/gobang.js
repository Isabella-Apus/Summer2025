// 游戏常量
const BOARD_SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = -1;

// 游戏状态
let board = [];
let currentPlayer = BLACK; //默认黑方先行
let gameMode = "pvp"; // 'pvp' 人人或 'pve'人机
let gameActive = true;
let aiLevel = 2; // 1-3, 越高越智能
let moveHistory = [];
let lastMove = null;
let moveCount = 0;
let gameTime = 0;
let lastBlackMove = null;
let timerInterval = null; //计时器开关
let blackStore = 0;
let whiteScore = 0;

// 初始化游戏
function initGame() {
    // 创建空棋盘
    board = Array(BOARD_SIZE)
        .fill()
        .map(() => Array(BOARD_SIZE).fill(EMPTY));

    // 重置游戏状态
    currentPlayer = BLACK;
    gameActive = true;
    moveHistory = [];
    lastMove = null;
    moveCount = 0;
    lastBlackMove = null;
    gameTime = 0;

    // 更新UI
    updatePlayerTurn();
    document.getElementById("moves-count").textContent = "0";
    document.getElementById("history-steps").innerHTML = "";

    // 启动计时器
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        gameTime++;
        document.getElementById("game-time").textContent = gameTime;
    }, 1000);

    // 创建棋盘UI
    createBoard();
}

// 创建棋盘UI
function createBoard() {
    const boardElement = document.getElementById("game-board");
    boardElement.innerHTML = "";
    boardElement.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, 1fr)`;

    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            const cell = document.createElement("div");
            cell.className = "cell";
            cell.dataset.row = String(i);
            cell.dataset.col = String(j);

            // 添加交叉点标记
            if (
                (i === 3 || i === 7 || i === 11) &&
                (j === 3 || j === 7 || j === 11)
            ) {
                const dot = document.createElement("div");
                dot.style.position = "absolute";
                dot.style.width = "6px";
                dot.style.height = "6px";
                dot.style.backgroundColor = "#000";
                dot.style.borderRadius = "50%";
                cell.appendChild(dot);
            }

            cell.addEventListener("click", () => handleCellClick(i, j)); //点击时间
            boardElement.appendChild(cell); //将下棋子格子添加到棋盘容器中
        }
    }
}

// 处理格子点击
function handleCellClick(row, col) {
    if (!gameActive || board[row][col] !== EMPTY) return; //游戏未激活或位置已有棋子，不执行落子

    // 玩家落子
    placeStone(row, col, currentPlayer);
    // 记录上一个黑方落子位置
    if (currentPlayer === BLACK) {
        lastBlackMove = { row, col };
    }

    // 检查胜负
    if (checkWin(row, col)) {
        endGame(currentPlayer);
        return;
    }

    // 检查平局（棋盘已满）
    if (moveCount === BOARD_SIZE * BOARD_SIZE) {
        endGame(EMPTY);
        return;
    }

    // 切换玩家
    currentPlayer = -currentPlayer;
    updatePlayerTurn();

    // 如果是人机对战且轮到电脑
    if (gameMode === "pve" && currentPlayer === WHITE && gameActive) {
        setTimeout(computerMove, 500); // 延迟500ms模拟思考
    }
}

// 放置棋子
function placeStone(row, col, player) {
    board[row][col] = player;
    moveCount++;

    moveHistory.push({ row: row, col: col, player: player, step: moveCount });

    // 更新UI
    const cell = document.querySelector(
        `.cell[data-row="${row}"][data-col="${col}"]`
    );
    const stone = document.createElement("div");
    stone.className = `stone ${
        player === BLACK ? "black-stone" : "white-stone"
    }`;

    // 如果是最后一步，添加高亮
    if (lastMove) {
        const lastCell = document.querySelector(
            `.cell[data-row="${lastMove.row}"][data-col="${lastMove.col}"] .stone`
        );
        if (lastCell) lastCell.classList.remove("last-move");
    }

    stone.classList.add("last-move");
    cell.appendChild(stone);
    lastMove = { row, col };

    // 更新历史
    addToHistory(row, col, player, moveCount);

    // 更新统计数据
    document.getElementById("moves-count").textContent = moveCount;
}

// 添加历史记录
function addToHistory(row, col, player, step) {
    const historySteps = document.getElementById("history-steps");
    const stepElement = document.createElement("div");
    stepElement.className = `step ${player === BLACK ? "black" : "white"}`;
    stepElement.textContent = step;
    stepElement.dataset.row = row;
    stepElement.dataset.col = col;

    stepElement.addEventListener("click", () => {
        // 直接使用闭包中的 row/col（避免 DOM 属性的类型问题）
        const targetCell = document.querySelector(
            `.cell[data-row="${row}"][data-col="${col}"]`
        );
        if (targetCell) {
            targetCell.scrollIntoView({ behavior: "smooth", block: "center" });
            targetCell.style.boxShadow = "0 0 10px 3px #ff3366";
            setTimeout(() => {
                targetCell.style.boxShadow = "";
            }, 2000);
        } else {
            console.error(`未找到格子：(${row}, ${col})`);
            console.log(
                "当前棋盘格子：",
                Array.from(document.querySelectorAll(".cell")).map((cell) => ({
                    row: cell.dataset.row,
                    col: cell.dataset.col,
                }))
            );
        }
    });

    historySteps.appendChild(stepElement);
    historySteps.scrollTop = historySteps.scrollHeight;
}

// 电脑走棋
function computerMove() {
    if (!gameActive) return;

    // 根据难度级别选择AI策略
    let move;

    if (aiLevel === 1) {
        // 中等难度 - 基础策略
        move = getBasicStrategyMove();
    } else if (aiLevel === 2) {
        // 较高难度 - 进攻防守平衡
        move = getBalancedMove();
    } else {
        // 专家难度 - 最高级策略
        move = getExpertMove();
    }

    // 落子
    placeStone(move.row, move.col, WHITE);

    // 检查胜负
    if (checkWin(move.row, move.col)) {
        endGame(WHITE);
        return;
    }

    // 检查平局
    if (moveCount === BOARD_SIZE * BOARD_SIZE) {
        endGame(EMPTY);
        return;
    }

    // 切换回玩家
    currentPlayer = BLACK;
    updatePlayerTurn();
}

// 获取指定范围内的所有空位
function getEmptyCellsInRange(centerRow, centerCol, range) {
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
                board[i][j] === EMPTY
            ) {
                emptyCells.push({ row: i, col: j });
            }
        }
    }

    return emptyCells;
}

// 随机落子策略
function getRandomMove() {
    const emptyCells = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] === EMPTY) {
                emptyCells.push({ row: i, col: j });
            }
        }
    }

    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

function getRandomPlus() {
    // 如果没有黑方落子记录或棋盘为空，返回中心位置
    if (!lastBlackMove || moveCount === 0) {
        const center = Math.floor(BOARD_SIZE / 2);
        return { row: center, col: center };
    }

    // 从最小范围开始尝试，逐步扩大
    for (let range = 1; range <= BOARD_SIZE; range++) {
        // 获取当前范围内的所有空位
        const emptyCells = getEmptyCellsInRange(
            lastBlackMove.row,
            lastBlackMove.col,
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
function getBasicStrategyMove() {
    // 1. 检查自己是否即将获胜
    let move = findWinningMove(WHITE);
    if (move) return move;

    // 2. 检查对手是否即将获胜
    move = findWinningMove(BLACK);
    if (move) return move;

    // 4. 随机落子
    return getRandomPlus();
}

// 平衡策略 - 平衡进攻和防守
function getBalancedMove() {
    // 1. 检查自己是否即将获胜
    let move = findWinningMove(WHITE);
    if (move) return move;

    // 2. 检查对手是否即将获胜
    move = findWinningMove(BLACK);
    if (move) return move;

    // 3. 创建进攻机会
    move = createAttackOpportunity();
    if (move) return move;

    // 4. 防守对手的进攻
    move = blockOpponentAttack();
    if (move) return move;

    // 5. 寻找有利位置
    move = findStrategicPosition();
    if (move) return move;
}

// 专家策略 - 使用启发式评估函数
function getExpertMove() {
    // 1. 检查自己是否即将获胜
    let move = findWinningMove(WHITE);
    if (move) return move;

    // 2. 检查对手是否即将获胜
    move = findWinningMove(BLACK);
    if (move) return move;

    // 3. 使用评估函数找到最佳位置
    return findBestPosition();
}

// 检查是否有即将获胜的位置
function findWinningMove(player) {
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] !== EMPTY) continue;

            // 尝试在这个位置落子
            board[i][j] = player;

            // 检查是否获胜
            if (checkWin(i, j)) {
                // 撤销落子
                board[i][j] = EMPTY;
                return { row: i, col: j };
            }

            // 撤销落子
            board[i][j] = EMPTY;
        }
    }
    return null;
}

// 寻找战略位置
function findStrategicPosition() {
    // 优先靠近中心
    const center = Math.floor(BOARD_SIZE / 2);

    // 如果有棋子，优先在已有棋子附近落子
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] !== EMPTY) {
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
                            if (board[ni][nj] === EMPTY) {
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
    if (moveCount === 0) {
        return { row: center, col: center };
    }

    // 否则返回随机位置
    return getRandomPlus();
}

// 创建进攻机会
function createAttackOpportunity() {
    // 寻找可以形成活三或冲四的位置
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] !== EMPTY) continue;

            board[i][j] = WHITE;

            // 检查是否能形成活三
            if (countThreats(i, j, WHITE) >= 2) {
                board[i][j] = EMPTY;
                return { row: i, col: j };
            }

            board[i][j] = EMPTY;
        }
    }
    return null;
}

// 防守对手的进攻
function blockOpponentAttack() {
    // 寻找对手可能形成威胁的位置
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] !== EMPTY) continue;

            board[i][j] = BLACK;

            // 检查对手是否能形成多个威胁
            if (countThreats(i, j, BLACK) >= 1) {
                board[i][j] = EMPTY;
                return { row: i, col: j };
            }

            board[i][j] = EMPTY;
        }
    }
    return null;
}

// 计算威胁数量
function countThreats(row, col, player) {
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
            if (board[ni][nj] === player) {
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
            if (board[ni][nj] === player) {
                count++;
            } else {
                break;
            }
        }

        if (count >= 4) {
            threatCount++;
        }
    }

    return threatCount;
}

// 使用评估函数找到最佳位置
function findBestPosition() {
    let bestScore = -Infinity;
    let bestMove = null;

    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] !== EMPTY) continue;

            // 评估这个位置
            const score = evaluatePosition(i, j);

            if (score > bestScore) {
                bestScore = score;
                bestMove = { row: i, col: j };
            }
        }
    }

    return bestMove || getRandomMove();
}

// 评估位置的价值
function evaluatePosition(row, col) {
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
        board[row][col] = WHITE;
        score += evaluateLine(row, col, dx, dy, WHITE) * 5;
        board[row][col] = EMPTY;

        // 评估黑子的威胁
        board[row][col] = BLACK;
        score += evaluateLine(row, col, dx, dy, BLACK) * 8;
        board[row][col] = EMPTY;
    }

    return score;
}

// 评估一条线上的潜力
function evaluateLine(row, col, dx, dy, player) {
    let score = 0;
    let count = 1; // 当前位置
    let flag3 = 0;
    // 正向检查
    for (let i = 1; i <= 4; i++) {
        const ni = row + dx * i;
        const nj = col + dy * i;

        if (ni < 0 || ni >= BOARD_SIZE || nj < 0 || nj >= BOARD_SIZE) break;

        if (board[ni][nj] === player) {
            count++;
        } else if (board[ni][nj] === -player) {
            flag3 = 1;
            break;
        }
    }

    // 反向检查
    for (let i = 1; i <= 4; i++) {
        const ni = row - dx * i;
        const nj = col - dy * i;

        if (ni < 0 || ni >= BOARD_SIZE || nj < 0 || nj >= BOARD_SIZE) break;

        if (board[ni][nj] === player) {
            count++;
        } else if (board[ni][nj] === -player) {
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

// 检查是否获胜
function checkWin(row, col) {
    const player = board[row][col];
    if (player === EMPTY) return false;

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
            if (board[ni][nj] !== player) break;
            count++;
        }

        // 反向检查
        for (let i = 1; i <= 4; i++) {
            const ni = row - dx * i;
            const nj = col - dy * i;

            if (ni < 0 || ni >= BOARD_SIZE || nj < 0 || nj >= BOARD_SIZE) break;
            if (board[ni][nj] !== player) break;
            count++;
        }

        // 如果找到5连子
        if (count >= 5) {
            return true;
        }
    }

    return false;
}

// 更新玩家回合显示
function updatePlayerTurn() {
    const playerTurn = document.getElementById("player-turn");
    if (currentPlayer === BLACK) {
        playerTurn.textContent = "黑方回合";
        playerTurn.style.background =
            "linear-gradient(135deg, #2c3e50, #1c2833)";
        playerTurn.style.color = "#ecf0f1";
    } else {
        playerTurn.textContent = "白方回合";
        playerTurn.style.background =
            "linear-gradient(135deg, #ecf0f1, #bdc3c7)";
        playerTurn.style.color = "#2c3e50";
    }
}

// 悔棋功能
function undoMove() {
    if (moveHistory.length < 1 || !gameActive) return;

    // 获取最后一步
    const last = moveHistory.pop();
    if (!last) {
        console.log("无法获取最后一步");
        return;
    }

    // 从棋盘上移除棋子
    board[last.row][last.col] = EMPTY;
    const cell = document.querySelector(
        `.cell[data-row="${last.row}"][data-col="${last.col}"]`
    );
    if (!cell) {
        console.log(`找不到单元格: 行${last.row}, 列${last.col}`);
        return;
    }

    const stone = cell.querySelector(".stone");
    if (stone) {
        stone.remove();
        console.log(`已移除棋子: 行${last.row}, 列${last.col}`);
    } else {
        console.log(`单元格中没有棋子: 行${last.row}, 列${last.col}`);
    }

    // 更新最后一步标记
    if (lastMove && lastMove.row === last.row && lastMove.col === last.col) {
        lastMove = null;
    }

    moveCount--;

    // 从历史记录中移除
    const historySteps = document.getElementById("history-steps");
    if (historySteps.lastChild) {
        historySteps.removeChild(historySteps.lastChild);
    }

    // 更新当前玩家
    currentPlayer = last.player;

    // 更新步数显示
    document.getElementById("moves-count").textContent = moveCount;

    // 如果是人机对战，需要额外移除电脑的一步
    if (gameMode === "pve" && moveHistory.length > 0) {
        if (last.player === BLACK) {
            // 寻找倒数第二个黑方落子
            lastBlackMove = null;
            for (let i = moveHistory.length - 1; i >= 0; i--) {
                if (moveHistory[i].player === BLACK) {
                    lastBlackMove = {
                        row: moveHistory[i].row,
                        col: moveHistory[i].col,
                    };
                    break;
                }
            }
        }
        const computerMove = moveHistory.pop();
        board[computerMove.row][computerMove.col] = EMPTY;
        const computerCell = document.querySelector(
            `.cell[data-row="${computerMove.row}"][data-col="${computerMove.col}"]`
        );
        const computerStone = computerCell.querySelector(".stone");
        if (computerStone) computerStone.remove();

        moveCount--;
        currentPlayer = BLACK;
        // 从历史记录中移除
        if (historySteps.lastChild) {
            historySteps.removeChild(historySteps.lastChild);
        }
    }
    updatePlayerTurn();

    // 触发游戏状态更新事件
    if (typeof onGameStateChanged === "function") {
        onGameStateChanged();
    }

    console.log("悔棋完成，当前moveHistory长度:", moveHistory.length);

    // 更新步数显示
    document.getElementById("moves-count").textContent = moveCount;

    // 更新lastMove为当前最后一步
    lastMove =
        moveHistory.length > 0
            ? {
                  row: moveHistory[moveHistory.length - 1].row,
                  col: moveHistory[moveHistory.length - 1].col,
              }
            : null;
    if (lastMove) {
        const lastCell = document.querySelector(
            `.cell[data-row="${lastMove.row}"][data-col="${lastMove.col}"] .stone`
        );
        if (lastCell) lastCell.classList.add("last-move");
    }
}

// 结束游戏
function endGame(winner) {
    gameActive = false;
    clearInterval(timerInterval);

    // 创建胜利消息
    const winMessage = document.createElement("div");
    winMessage.className = "win-message";

    if (winner === BLACK) {
        blackStore++;
        document.getElementById("black-score").textContent = blackStore;
        winMessage.innerHTML = `
                    <h2>黑棋胜利!</h2>
                    <p>恭喜黑方玩家获胜，游戏共进行了 ${moveCount} 步</p>
                    <div class="win-buttons">
                        <button class="btn btn-success" id="play-again-btn">再玩一局</button>
                        <button class="btn" id="close-message-btn">关闭</button>
                    </div>
                `;
    } else if (winner === WHITE) {
        whiteScore++;
        document.getElementById("white-score").textContent = whiteScore;
        winMessage.innerHTML = `
                    <h2>白棋胜利!</h2>
                    <p>恭喜白方${
                        gameMode === "pve" ? "电脑" : "玩家"
                    }获胜，游戏共进行了 ${moveCount} 步</p>
                    <div class="win-buttons">
                        <button class="btn btn-success" id="play-again-btn">再玩一局</button>
                        <button class="btn" id="close-message-btn">关闭</button>
                    </div>
                `;
    } else {
        winMessage.innerHTML = `
                    <h2>平局!</h2>
                    <p>棋逢对手，将遇良才，棋盘已满未分胜负</p>
                    <div class="win-buttons">
                        <button class="btn btn-success" id="play-again-btn">再玩一局</button>
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

//重置分数函数
function resetScores() {
    blackStore = 0;
    whiteScore = 0;
    document.getElementById("black-score").textContent = blackStore;
    document.getElementById("white-score").textContent = whiteScore;
}
// 事件监听初始化
function initEventListeners() {
    // 悔棋按钮
    document.getElementById("undo-btn").addEventListener("click", undoMove);

    // 重新开始按钮
    document.getElementById("restart-btn").addEventListener("click", initGame);

    // 保存游戏按钮
    document.getElementById("save-btn").addEventListener("click", () => {
        localStorage.setItem(
            "gobang_save",
            JSON.stringify({
                board,
                currentPlayer,
                gameMode,
                moveHistory,
                moveCount,
                gameTime,
                blackStore,
                whiteScore,
                lastBlackMove,
            })
        );
        alert("游戏已保存！");
    });

    // 复盘游戏按钮
    document.getElementById("replay-btn").addEventListener("click", () => {
        const savedGame = localStorage.getItem("gobang_save");
        if (savedGame) {
            const gameData = JSON.parse(savedGame);
            board = gameData.board;
            currentPlayer = gameData.currentPlayer;
            gameMode = gameData.gameMode;
            moveHistory = gameData.moveHistory;
            moveCount = gameData.moveCount;
            gameTime = gameData.gameTime;
            blackStore = gameData.blackStore;
            whiteScore = gameData.whiteScore;
            lastBlackMove = gameData.lastBlackMove;

            // 更新UI
            updatePlayerTurn();
            document.getElementById("moves-count").textContent = moveCount;
            document.getElementById("game-time").textContent = gameTime;
            document.getElementById("black-score").textContent = blackStore;
            document.getElementById("white-score").textContent = whiteScore;
            // 重新绘制棋盘
            createBoard();
            redrawBoard();

            // 重建历史记录
            const historySteps = document.getElementById("history-steps");
            historySteps.innerHTML = "";
            moveHistory.forEach((move) => {
                addToHistory(move.row, move.col, move.player, move.step);
            });
            lastMove =
                moveHistory.length > 0
                    ? {
                          row: moveHistory[moveHistory.length - 1].row,
                          col: moveHistory[moveHistory.length - 1].col,
                      }
                    : null;
            if (lastMove) {
                const lastCell = document.querySelector(
                    `.cell[data-row="${lastMove.row}"][data-col="${lastMove.col}"] .stone`
                );
                if (lastCell) lastCell.classList.add("last-move");
            }
            gameActive = true;

            // 恢复计时器
            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                gameTime++;
                document.getElementById("game-time").textContent = gameTime;
            }, 1000);

            alert("游戏已恢复！");
        } else {
            alert("没有找到保存的游戏！");
        }
    });

    // 游戏模式切换
    document.querySelectorAll(".mode-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".mode-btn").forEach((b) => {
                b.classList.remove("active");
            });
            btn.classList.add("active");
            gameMode = btn.dataset.mode;

            resetScores();

            // 更新AI难度设置可见性
            document.getElementById("difficulty-settings").style.display =
                gameMode === "pve" ? "block" : "none";

            // 重新开始游戏
            initGame();
        });
    });

    // AI难度调整
    document.getElementById("ai-level").addEventListener("input", (e) => {
        aiLevel = parseInt(e.target.value);
        const levelNames = ["初级", "中等", "困难"];
        document.getElementById("ai-level-display").textContent =
            levelNames[aiLevel - 1];
        resetScores();
        initGame();
    });
}

// 重新绘制棋盘
function redrawBoard() {
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] !== EMPTY) {
                const cell = document.querySelector(
                    `.cell[data-row="${i}"][data-col="${j}"]`
                );
                const stone = document.createElement("div");
                stone.className = `stone ${
                    board[i][j] === BLACK ? "black-stone" : "white-stone"
                }`;

                // 如果是最后一步，添加高亮
                if (lastMove && lastMove.row === i && lastMove.col === j) {
                    stone.classList.add("last-move");
                }

                cell.appendChild(stone);
            }
        }
    }
}

// 初始化游戏
window.addEventListener("load", () => {
    document.getElementById("black-score").textContent = "0";
    document.getElementById("white-score").textContent = "0";
    initGame();
    initEventListeners();
});
