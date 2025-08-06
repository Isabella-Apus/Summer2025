// ��Ϸ����
const BOARD_SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = -1;

// ��Ϸ״̬
let board = [];
let currentPlayer = BLACK; //Ĭ�Ϻڷ�����
let gameMode = "pvp"; // 'pvp' ���˻� 'pve'�˻�
let gameActive = true;
let aiLevel = 2; // 1-3, Խ��Խ����
let moveHistory = [];
let lastMove = null;
let moveCount = 0;
let gameTime = 0;
let lastBlackMove = null;
let timerInterval = null; //��ʱ������
let blackStore = 0;
let whiteScore = 0;

// ��ʼ����Ϸ
function initGame() {
    // ����������
    board = Array(BOARD_SIZE)
        .fill()
        .map(() => Array(BOARD_SIZE).fill(EMPTY));

    // ������Ϸ״̬
    currentPlayer = BLACK;
    gameActive = true;
    moveHistory = [];
    lastMove = null;
    moveCount = 0;
    lastBlackMove = null;
    gameTime = 0;

    // ����UI
    updatePlayerTurn();
    document.getElementById("moves-count").textContent = "0";
    document.getElementById("history-steps").innerHTML = "";

    // ������ʱ��
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        gameTime++;
        document.getElementById("game-time").textContent = gameTime;
    }, 1000);

    // ��������UI
    createBoard();
}

// ��������UI
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

            // ��ӽ������
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

            cell.addEventListener("click", () => handleCellClick(i, j)); //���ʱ��
            boardElement.appendChild(cell); //�������Ӹ�����ӵ�����������
        }
    }
}

// ������ӵ��
function handleCellClick(row, col) {
    if (!gameActive || board[row][col] !== EMPTY) return; //��Ϸδ�����λ���������ӣ���ִ������

    // �������
    placeStone(row, col, currentPlayer);
    // ��¼��һ���ڷ�����λ��
    if (currentPlayer === BLACK) {
        lastBlackMove = { row, col };
    }

    // ���ʤ��
    if (checkWin(row, col)) {
        endGame(currentPlayer);
        return;
    }

    // ���ƽ�֣�����������
    if (moveCount === BOARD_SIZE * BOARD_SIZE) {
        endGame(EMPTY);
        return;
    }

    // �л����
    currentPlayer = -currentPlayer;
    updatePlayerTurn();

    // ������˻���ս���ֵ�����
    if (gameMode === "pve" && currentPlayer === WHITE && gameActive) {
        setTimeout(computerMove, 500); // �ӳ�500msģ��˼��
    }
}

// ��������
function placeStone(row, col, player) {
    board[row][col] = player;
    moveCount++;

    moveHistory.push({ row: row, col: col, player: player, step: moveCount });

    // ����UI
    const cell = document.querySelector(
        `.cell[data-row="${row}"][data-col="${col}"]`
    );
    const stone = document.createElement("div");
    stone.className = `stone ${
        player === BLACK ? "black-stone" : "white-stone"
    }`;

    // ��������һ������Ӹ���
    if (lastMove) {
        const lastCell = document.querySelector(
            `.cell[data-row="${lastMove.row}"][data-col="${lastMove.col}"] .stone`
        );
        if (lastCell) lastCell.classList.remove("last-move");
    }

    stone.classList.add("last-move");
    cell.appendChild(stone);
    lastMove = { row, col };

    // ������ʷ
    addToHistory(row, col, player, moveCount);

    // ����ͳ������
    document.getElementById("moves-count").textContent = moveCount;
}

// �����ʷ��¼
function addToHistory(row, col, player, step) {
    const historySteps = document.getElementById("history-steps");
    const stepElement = document.createElement("div");
    stepElement.className = `step ${player === BLACK ? "black" : "white"}`;
    stepElement.textContent = step;
    stepElement.dataset.row = row;
    stepElement.dataset.col = col;

    stepElement.addEventListener("click", () => {
        // ֱ��ʹ�ñհ��е� row/col������ DOM ���Ե��������⣩
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
            console.error(`δ�ҵ����ӣ�(${row}, ${col})`);
            console.log(
                "��ǰ���̸��ӣ�",
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

// ��������
function computerMove() {
    if (!gameActive) return;

    // �����Ѷȼ���ѡ��AI����
    let move;

    if (aiLevel === 1) {
        // �е��Ѷ� - ��������
        move = getBasicStrategyMove();
    } else if (aiLevel === 2) {
        // �ϸ��Ѷ� - ��������ƽ��
        move = getBalancedMove();
    } else {
        // ר���Ѷ� - ��߼�����
        move = getExpertMove();
    }

    // ����
    placeStone(move.row, move.col, WHITE);

    // ���ʤ��
    if (checkWin(move.row, move.col)) {
        endGame(WHITE);
        return;
    }

    // ���ƽ��
    if (moveCount === BOARD_SIZE * BOARD_SIZE) {
        endGame(EMPTY);
        return;
    }

    // �л������
    currentPlayer = BLACK;
    updatePlayerTurn();
}

// ��ȡָ����Χ�ڵ����п�λ
function getEmptyCellsInRange(centerRow, centerCol, range) {
    const emptyCells = [];

    // ������Χ�ڵ����е�Ԫ��
    for (let i = centerRow - range; i <= centerRow + range; i++) {
        for (let j = centerCol - range; j <= centerCol + range; j++) {
            // ����Ƿ������̷�Χ����Ϊ��λ
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

// ������Ӳ���
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
    // ���û�кڷ����Ӽ�¼������Ϊ�գ���������λ��
    if (!lastBlackMove || moveCount === 0) {
        const center = Math.floor(BOARD_SIZE / 2);
        return { row: center, col: center };
    }

    // ����С��Χ��ʼ���ԣ�������
    for (let range = 1; range <= BOARD_SIZE; range++) {
        // ��ȡ��ǰ��Χ�ڵ����п�λ
        const emptyCells = getEmptyCellsInRange(
            lastBlackMove.row,
            lastBlackMove.col,
            range
        );

        // ����÷�Χ���п�λ�����ѡ��һ��
        if (emptyCells.length > 0) {
            return emptyCells[Math.floor(Math.random() * emptyCells.length)];
        }
    }

    // ������з�Χ�����ˣ������ϲ����ܣ���Ϊ���̲���ͬʱ����
    return {
        row: Math.floor(Math.random() * BOARD_SIZE),
        col: Math.floor(Math.random() * BOARD_SIZE),
    };
}

// �������� - ���ȷ��غͽ���
function getBasicStrategyMove() {
    // 1. ����Լ��Ƿ񼴽���ʤ
    let move = findWinningMove(WHITE);
    if (move) return move;

    // 2. �������Ƿ񼴽���ʤ
    move = findWinningMove(BLACK);
    if (move) return move;

    // 4. �������
    return getRandomPlus();
}

// ƽ����� - ƽ������ͷ���
function getBalancedMove() {
    // 1. ����Լ��Ƿ񼴽���ʤ
    let move = findWinningMove(WHITE);
    if (move) return move;

    // 2. �������Ƿ񼴽���ʤ
    move = findWinningMove(BLACK);
    if (move) return move;

    // 3. ������������
    move = createAttackOpportunity();
    if (move) return move;

    // 4. ���ض��ֵĽ���
    move = blockOpponentAttack();
    if (move) return move;

    // 5. Ѱ������λ��
    move = findStrategicPosition();
    if (move) return move;
}

// ר�Ҳ��� - ʹ������ʽ��������
function getExpertMove() {
    // 1. ����Լ��Ƿ񼴽���ʤ
    let move = findWinningMove(WHITE);
    if (move) return move;

    // 2. �������Ƿ񼴽���ʤ
    move = findWinningMove(BLACK);
    if (move) return move;

    // 3. ʹ�����������ҵ����λ��
    return findBestPosition();
}

// ����Ƿ��м�����ʤ��λ��
function findWinningMove(player) {
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] !== EMPTY) continue;

            // ���������λ������
            board[i][j] = player;

            // ����Ƿ��ʤ
            if (checkWin(i, j)) {
                // ��������
                board[i][j] = EMPTY;
                return { row: i, col: j };
            }

            // ��������
            board[i][j] = EMPTY;
        }
    }
    return null;
}

// Ѱ��ս��λ��
function findStrategicPosition() {
    // ���ȿ�������
    const center = Math.floor(BOARD_SIZE / 2);

    // ��������ӣ��������������Ӹ�������
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] !== EMPTY) {
                // �����Χ�Ŀ�λ
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
                                // ������λ�ø������ȼ�
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

    // �������Ϊ�գ���������λ��
    if (moveCount === 0) {
        return { row: center, col: center };
    }

    // ���򷵻����λ��
    return getRandomPlus();
}

// ������������
function createAttackOpportunity() {
    // Ѱ�ҿ����γɻ�������ĵ�λ��
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] !== EMPTY) continue;

            board[i][j] = WHITE;

            // ����Ƿ����γɻ���
            if (countThreats(i, j, WHITE) >= 2) {
                board[i][j] = EMPTY;
                return { row: i, col: j };
            }

            board[i][j] = EMPTY;
        }
    }
    return null;
}

// ���ض��ֵĽ���
function blockOpponentAttack() {
    // Ѱ�Ҷ��ֿ����γ���в��λ��
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] !== EMPTY) continue;

            board[i][j] = BLACK;

            // �������Ƿ����γɶ����в
            if (countThreats(i, j, BLACK) >= 1) {
                board[i][j] = EMPTY;
                return { row: i, col: j };
            }

            board[i][j] = EMPTY;
        }
    }
    return null;
}

// ������в����
function countThreats(row, col, player) {
    let threatCount = 0;
    const directions = [
        [0, 1], // ˮƽ
        [1, 0], // ��ֱ
        [1, 1], // �Խ���
        [1, -1], // ���Խ���
    ];

    for (const [dx, dy] of directions) {
        let count = 1; // ��ǰλ��

        // ������
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

        // ������
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

// ʹ�����������ҵ����λ��
function findBestPosition() {
    let bestScore = -Infinity;
    let bestMove = null;

    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] !== EMPTY) continue;

            // �������λ��
            const score = evaluatePosition(i, j);

            if (score > bestScore) {
                bestScore = score;
                bestMove = { row: i, col: j };
            }
        }
    }

    return bestMove || getRandomMove();
}

// ����λ�õļ�ֵ
function evaluatePosition(row, col) {
    let score = 0;

    // ����λ�ø��м�ֵ
    const center = Math.floor(BOARD_SIZE / 2);
    const distanceToCenter = Math.abs(row - center) + Math.abs(col - center);
    score += (BOARD_SIZE - distanceToCenter) * 5;

    // ����ÿ������
    const directions = [
        [0, 1], // ˮƽ
        [1, 0], // ��ֱ
        [1, 1], // �Խ���
        [1, -1], // ���Խ���
    ];

    for (const [dx, dy] of directions) {
        // �������ӵ�Ǳ��
        board[row][col] = WHITE;
        score += evaluateLine(row, col, dx, dy, WHITE) * 5;
        board[row][col] = EMPTY;

        // �������ӵ���в
        board[row][col] = BLACK;
        score += evaluateLine(row, col, dx, dy, BLACK) * 8;
        board[row][col] = EMPTY;
    }

    return score;
}

// ����һ�����ϵ�Ǳ��
function evaluateLine(row, col, dx, dy, player) {
    let score = 0;
    let count = 1; // ��ǰλ��
    let flag3 = 0;
    // ������
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

    // ������
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

    // ��������������
    if (count >= 5) {
        score += 100000; // ��ʤ
    } else if (count === 4) {
        score += 1000; // ����
    } else if (count === 3) {
        score += 500; // ����
        if (flag3 === 1) {
            score -= 450;
        }
    } else if (count === 2) {
        score += 50; // ���
    }

    return score;
}

// ����Ƿ��ʤ
function checkWin(row, col) {
    const player = board[row][col];
    if (player === EMPTY) return false;

    const directions = [
        [0, 1], // ˮƽ
        [1, 0], // ��ֱ
        [1, 1], // �Խ���
        [1, -1], // ���Խ���
    ];

    for (const [dx, dy] of directions) {
        let count = 1; // ��ǰλ��

        // ������
        for (let i = 1; i <= 4; i++) {
            const ni = row + dx * i;
            const nj = col + dy * i;

            if (ni < 0 || ni >= BOARD_SIZE || nj < 0 || nj >= BOARD_SIZE) break;
            if (board[ni][nj] !== player) break;
            count++;
        }

        // ������
        for (let i = 1; i <= 4; i++) {
            const ni = row - dx * i;
            const nj = col - dy * i;

            if (ni < 0 || ni >= BOARD_SIZE || nj < 0 || nj >= BOARD_SIZE) break;
            if (board[ni][nj] !== player) break;
            count++;
        }

        // ����ҵ�5����
        if (count >= 5) {
            return true;
        }
    }

    return false;
}

// ������һغ���ʾ
function updatePlayerTurn() {
    const playerTurn = document.getElementById("player-turn");
    if (currentPlayer === BLACK) {
        playerTurn.textContent = "�ڷ��غ�";
        playerTurn.style.background =
            "linear-gradient(135deg, #2c3e50, #1c2833)";
        playerTurn.style.color = "#ecf0f1";
    } else {
        playerTurn.textContent = "�׷��غ�";
        playerTurn.style.background =
            "linear-gradient(135deg, #ecf0f1, #bdc3c7)";
        playerTurn.style.color = "#2c3e50";
    }
}

// ���幦��
function undoMove() {
    if (moveHistory.length < 1 || !gameActive) return;

    // ��ȡ���һ��
    const last = moveHistory.pop();
    if (!last) {
        console.log("�޷���ȡ���һ��");
        return;
    }

    // ���������Ƴ�����
    board[last.row][last.col] = EMPTY;
    const cell = document.querySelector(
        `.cell[data-row="${last.row}"][data-col="${last.col}"]`
    );
    if (!cell) {
        console.log(`�Ҳ�����Ԫ��: ��${last.row}, ��${last.col}`);
        return;
    }

    const stone = cell.querySelector(".stone");
    if (stone) {
        stone.remove();
        console.log(`���Ƴ�����: ��${last.row}, ��${last.col}`);
    } else {
        console.log(`��Ԫ����û������: ��${last.row}, ��${last.col}`);
    }

    // �������һ�����
    if (lastMove && lastMove.row === last.row && lastMove.col === last.col) {
        lastMove = null;
    }

    moveCount--;

    // ����ʷ��¼���Ƴ�
    const historySteps = document.getElementById("history-steps");
    if (historySteps.lastChild) {
        historySteps.removeChild(historySteps.lastChild);
    }

    // ���µ�ǰ���
    currentPlayer = last.player;

    // ���²�����ʾ
    document.getElementById("moves-count").textContent = moveCount;

    // ������˻���ս����Ҫ�����Ƴ����Ե�һ��
    if (gameMode === "pve" && moveHistory.length > 0) {
        if (last.player === BLACK) {
            // Ѱ�ҵ����ڶ����ڷ�����
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
        // ����ʷ��¼���Ƴ�
        if (historySteps.lastChild) {
            historySteps.removeChild(historySteps.lastChild);
        }
    }
    updatePlayerTurn();

    // ������Ϸ״̬�����¼�
    if (typeof onGameStateChanged === "function") {
        onGameStateChanged();
    }

    console.log("������ɣ���ǰmoveHistory����:", moveHistory.length);

    // ���²�����ʾ
    document.getElementById("moves-count").textContent = moveCount;

    // ����lastMoveΪ��ǰ���һ��
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

// ������Ϸ
function endGame(winner) {
    gameActive = false;
    clearInterval(timerInterval);

    // ����ʤ����Ϣ
    const winMessage = document.createElement("div");
    winMessage.className = "win-message";

    if (winner === BLACK) {
        blackStore++;
        document.getElementById("black-score").textContent = blackStore;
        winMessage.innerHTML = `
                    <h2>����ʤ��!</h2>
                    <p>��ϲ�ڷ���һ�ʤ����Ϸ�������� ${moveCount} ��</p>
                    <div class="win-buttons">
                        <button class="btn btn-success" id="play-again-btn">����һ��</button>
                        <button class="btn" id="close-message-btn">�ر�</button>
                    </div>
                `;
    } else if (winner === WHITE) {
        whiteScore++;
        document.getElementById("white-score").textContent = whiteScore;
        winMessage.innerHTML = `
                    <h2>����ʤ��!</h2>
                    <p>��ϲ�׷�${
                        gameMode === "pve" ? "����" : "���"
                    }��ʤ����Ϸ�������� ${moveCount} ��</p>
                    <div class="win-buttons">
                        <button class="btn btn-success" id="play-again-btn">����һ��</button>
                        <button class="btn" id="close-message-btn">�ر�</button>
                    </div>
                `;
    } else {
        winMessage.innerHTML = `
                    <h2>ƽ��!</h2>
                    <p>�����֣��������ţ���������δ��ʤ��</p>
                    <div class="win-buttons">
                        <button class="btn btn-success" id="play-again-btn">����һ��</button>
                        <button class="btn" id="close-message-btn">�ر�</button>
                    </div>
                `;
    }

    document.body.appendChild(winMessage);

    // ����¼�����
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

//���÷�������
function resetScores() {
    blackStore = 0;
    whiteScore = 0;
    document.getElementById("black-score").textContent = blackStore;
    document.getElementById("white-score").textContent = whiteScore;
}
// �¼�������ʼ��
function initEventListeners() {
    // ���尴ť
    document.getElementById("undo-btn").addEventListener("click", undoMove);

    // ���¿�ʼ��ť
    document.getElementById("restart-btn").addEventListener("click", initGame);

    // ������Ϸ��ť
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
        alert("��Ϸ�ѱ��棡");
    });

    // ������Ϸ��ť
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

            // ����UI
            updatePlayerTurn();
            document.getElementById("moves-count").textContent = moveCount;
            document.getElementById("game-time").textContent = gameTime;
            document.getElementById("black-score").textContent = blackStore;
            document.getElementById("white-score").textContent = whiteScore;
            // ���»�������
            createBoard();
            redrawBoard();

            // �ؽ���ʷ��¼
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

            // �ָ���ʱ��
            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                gameTime++;
                document.getElementById("game-time").textContent = gameTime;
            }, 1000);

            alert("��Ϸ�ѻָ���");
        } else {
            alert("û���ҵ��������Ϸ��");
        }
    });

    // ��Ϸģʽ�л�
    document.querySelectorAll(".mode-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".mode-btn").forEach((b) => {
                b.classList.remove("active");
            });
            btn.classList.add("active");
            gameMode = btn.dataset.mode;

            resetScores();

            // ����AI�Ѷ����ÿɼ���
            document.getElementById("difficulty-settings").style.display =
                gameMode === "pve" ? "block" : "none";

            // ���¿�ʼ��Ϸ
            initGame();
        });
    });

    // AI�Ѷȵ���
    document.getElementById("ai-level").addEventListener("input", (e) => {
        aiLevel = parseInt(e.target.value);
        const levelNames = ["����", "�е�", "����"];
        document.getElementById("ai-level-display").textContent =
            levelNames[aiLevel - 1];
        resetScores();
        initGame();
    });
}

// ���»�������
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

                // ��������һ������Ӹ���
                if (lastMove && lastMove.row === i && lastMove.col === j) {
                    stone.classList.add("last-move");
                }

                cell.appendChild(stone);
            }
        }
    }
}

// ��ʼ����Ϸ
window.addEventListener("load", () => {
    document.getElementById("black-score").textContent = "0";
    document.getElementById("white-score").textContent = "0";
    initGame();
    initEventListeners();
});
