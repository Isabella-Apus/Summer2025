// ��Ϸ����
const BOARD_SIZE = 9;
const EMPTY = 0;

// ��Ϸ״̬
let board = [];
let solution = [];
let initialBoard = [];
let selectedCell = null;
let gameActive = true;
let noteMode = false;
let mistakes = 0;
let hints = 3;
let remainingCells = 81;
let difficulty = 2; // 1-3, Խ��Խ��
let startTime = null;
let timerInterval = null;
let moveHistory = [];

// ��ʼ����Ϸ
function initGame() {
    // ������Ϸ״̬
    gameActive = true;
    mistakes = 0;
    hints = 3;
    selectedCell = null;
    noteMode = false;
    moveHistory = [];
    startTime = new Date();
    


    // ����UI
    document.getElementById("mistakes").textContent = mistakes;
    document.getElementById("hints").textContent = hints;
    document.getElementById("note-mode-status").textContent = "�ر�";
    document.getElementById("note-mode-toggle").checked = false;
    document.getElementById("game-status").textContent = "��ǰ״̬: ��Ϸ������";

    // ��������
    generateSudoku();
    

    // ������ʱ��
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);

    // ��������UI
    createBoard();
}

// ��������
function generateSudoku() {
    // ���������������
    solution = createSolvedBoard();

    // �����Ѷ��Ƴ�����
    board = JSON.parse(JSON.stringify(solution));
   

    let cellsToRemove;
    switch (difficulty) {
        case 1:
            cellsToRemove = 30;
            break; // ��
        case 2:
            cellsToRemove = 45;
            break; // �е�
        case 3:
            cellsToRemove = 55;
            break; // ����
        default:
            cellsToRemove = 45;
    }

    removeNumbers(board, cellsToRemove);
    initialBoard = JSON.parse(JSON.stringify(board));
    remainingCells = cellsToRemove;
    document.getElementById("remaining").textContent = cellsToRemove;
}

// �����ѽ����������
function createSolvedBoard() {
    const board = Array(BOARD_SIZE)
        .fill()
        .map(() => Array(BOARD_SIZE).fill(EMPTY));
    fillBoard(board);
    return board;
}

// ʹ�û��ݷ�����
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

// ����Ƴ�����
function removeNumbers(board, count) {
    let removed = 0;
    let attempts = 0;
    const maxAttempts = 500; // ��ֹ����ѭ��
    while (removed < count) {
        const row = Math.floor(Math.random() * BOARD_SIZE);
        const col = Math.floor(Math.random() * BOARD_SIZE);
        attempts++;

        if (board[row][col] !== EMPTY) {
            // �����ֵ
            const backup = board[row][col];
            board[row][col] = EMPTY;

            // ����Ƿ���Ȼ��Ψһ��
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

// ����������������
        function countSolutions(board) {
            // �ҵ���һ���ո�
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

            // ���û�пո��ҵ�һ����
            if (row === -1) {
                return 1;
            }

            let solutions = 0;
            for (let num = 1; num <= 9; num++) {
                if (isValidPlacement(board, row, col, num)) {
                    board[row][col] = num;
                    solutions += countSolutions(board);
                    board[row][col] = EMPTY; // ����
                    // ����Ѿ��ҵ������⣬��ǰ�˳�
                    if (solutions >= 2) {
                        return solutions;
                    }
                }
            }
            return solutions;
        }

// ����յ�Ԫ������
function countEmptyCells() {
    let count = 0;
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (board[row][col] === EMPTY) count++;
        }
    }
    return count;
}

// ������ַ����Ƿ���Ч
function isValidPlacement(board, row, col, num) {
    // �����
    for (let i = 0; i < BOARD_SIZE; i++) {
        if (board[row][i] === num) return false;
    }

    // �����
    for (let i = 0; i < BOARD_SIZE; i++) {
        if (board[i][col] === num) return false;
    }

    // ���3x3������
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;

    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[startRow + i][startCol + j] === num) return false;
        }
    }

    return true;
}

// ��������UI
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
                // ��ӱʼ�����
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

// ѡ��Ԫ��
function selectCell(row, col) {
    if (!gameActive||initialBoard[row][col]!==EMPTY) return;

    // �Ƴ�֮ǰѡ��ĵ�Ԫ����ʽ
    if (selectedCell) {
        const prevCell = document.querySelector(
            `.cell[data-row="${selectedCell.row}"][data-col="${selectedCell.col}"]`
        );
        prevCell.classList.remove("selected");
    }

    // ���õ�ǰѡ��ĵ�Ԫ��
    selectedCell = { row, col };
    const cell = document.querySelector(
        `.cell[data-row="${row}"][data-col="${col}"]`
    );
    cell.classList.add("selected");
}

// ��������
function placeNumber(num) {
    if (!selectedCell || !gameActive) return;

    const { row, col } = selectedCell;
    const cell = document.querySelector(
        `.cell[data-row="${row}"][data-col="${col}"]`
    );

    if (cell.classList.contains("fixed")) return;

    // �������״̬
    cell.classList.remove("error");
    cell.classList.remove("correct");
    cell.classList.remove("missing");

    if (noteMode) {
        // �ʼ�ģʽ
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
        // ��¼��ʷ
        moveHistory.push({
            row,
            col,
            prevValue: oldValue,
            prevNotes: getCurrentNotes(row, col),
        });

        // ����ģʽ
        if (num === 0) {
            // �����Ԫ��
            board[row][col] = EMPTY;
            cell.textContent = "";
           
            if (oldValue !== EMPTY) {
                remainingCells++;
            }
        } else {
            // ��������
            board[row][col] = num;
            cell.textContent = num;

            // ���ԭ���ǿյģ������������֣�ʣ�����������
            if (oldValue === EMPTY) {
                remainingCells--;
            }
        }
        document.getElementById("remaining").textContent = remainingCells;
        // ����Ƿ����
        if (remainingCells === 0) {
            // ����Ƿ���ȫ��ȷ
            if (checkSolution()) {
                endGame(true);
            } else {
                document.getElementById('game-status').textContent = "��ǰ״̬: ����ɵ����ڴ���";
            }
        }
    }
}


// ��ȡ��ǰ�ʼ�
function getCurrentNotes(row, col) {
    const notes = document.getElementById(`notes-${row}-${col}`);
    if (!notes) return [];

    const noteNumbers = [];
    notes.querySelectorAll(".note-number").forEach((note) => {
        noteNumbers.push(parseInt(note.textContent));
    });

    return noteNumbers;
}

// ��������
function undoMove() {
    if (moveHistory.length === 0) return;

    const lastMove = moveHistory.pop();
    const { row, col, prevValue, prevNotes } = lastMove;
    const cell = document.querySelector(
        `.cell[data-row="${row}"][data-col="${col}"]`
    );
    const currentValue = board[row][col];

    // �ָ�ֵ
    board[row][col] = prevValue;

    if (prevValue === EMPTY) {
        cell.textContent = "";
        if (currentValue !== EMPTY) {
            remainingCells++;
        }
        // �ָ��ʼ�
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

    // �Ƴ�����״̬
    cell.classList.remove("error");
    cell.classList.remove("correct");
    cell.classList.remove("missing");

}

// �ṩ��ʾ
function giveHint() {
    if (hints <= 0 || !gameActive) return;

    // ����һ���յ�Ԫ��
    let emptyCells = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (board[row][col] === EMPTY) {
                emptyCells.push({ row, col });
            }
        }
    }

    if (emptyCells.length === 0) return;

    // ���ѡ��һ���յ�Ԫ��
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    const { row, col } = emptyCells[randomIndex];

    // �����ȷ������
    board[row][col] = solution[row][col];

    // ����UI
    const cell = document.querySelector(
        `.cell[data-row="${row}"][data-col="${col}"]`
    );
    cell.textContent = solution[row][col];
    cell.classList.add("hint");
     if (noteMode) {
         const notes = cell.querySelector(".notes");
         if (notes) {
             // �����ݴ��жϣ�����Ԫ�ز�����ʱ����
             notes.innerHTML = "";
         }
     }

    // ����״̬
    hints--;
    remainingCells--;
    document.getElementById("hints").textContent = hints;
    document.getElementById("remaining").textContent = remainingCells;

    
}

// ����
function checkSolution() {
    let hasErrors = false;
    // ��������д�����
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

// ��ʾ��
function showSolution() {
    if (!gameActive) return;
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const cell = document.querySelector(
                `.cell[data-row="${row}"][data-col="${col}"]`
            );

            // �Ƴ�����״̬��
            cell.classList.remove("error", "correct", "missing");

            // ֻ����ǹ̶���Ԫ��
            if (initialBoard[row][col] === EMPTY) {
                if (board[row][col] === EMPTY) {
                    // δ��д�ĵ�Ԫ��
                    cell.textContent = solution[row][col];
                    cell.classList.add("missing");
                } else if (board[row][col] === solution[row][col]) {
                    // �û���д��ȷ
                    cell.classList.add("correct");
                } else {
                    // �û���д����
                    cell.classList.add("error");
                }
            }
        }
    }

    endGame(false);
}

// ���¼�ʱ��
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

// ������Ϸ
function endGame(isWin) {
    gameActive = false;
    clearInterval(timerInterval);

    // ����ʤ����Ϣ
    const winMessage = document.createElement("div");
    winMessage.className = "win-message";

    if (isWin) {
        winMessage.innerHTML = `
                    <h2>��ϲ���!</h2>
                    <p>��ɹ��������������</p>
                    <p>��ʱ: ${document.getElementById("timer").textContent}</p>
                    <p>�������: ${mistakes}</p>
                    <p>ʹ����ʾ: ${3 - hints}</p>
                    <div class="win-buttons">
                        <button class="btn btn-success" id="play-again-btn">����һ��</button>
                        <button class="btn" id="close-message-btn">�ر�</button>
                    </div>
                `;
    } else {
        winMessage.innerHTML = `
                    <h2>������</h2>
                    <div class="solution-status">
                        <div class="status-item">
                            <div class="status-color correct-color"></div>
                            <span>��ȷ��</span>
                        </div>
                        <div class="status-item">
                            <div class="status-color error-color"></div>
                            <span>�����</span>
                        </div>
                        <div class="status-item">
                            <div class="status-color missing-color"></div>
                            <span>δ��д</span>
                        </div>
                    </div>
                    <p>������ɶ�: ${cellsToRemove - remainingCells}/${cellsToRemove}</p>
                    <div class="win-buttons">
                        <button class="btn btn-success" id="play-again-btn">����Ϸ</button>
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

// ���ߺ���
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}


// �����¼�����
function handleKeyDown(event) {
    // �����Ϸ�Ƿ񼤻�
    if (!gameActive) return;
    
    // ��ȡ����ֵ�����ݲ�ͬ������ļ�ֵ��ʾ��
    const key = event.key;
    const keyCode = event.keyCode;
    
    // ���ּ� 1-9�������̺�С���̶�֧�֣�
    if ((key >= '1' && key <= '9') || (keyCode >= 97 && keyCode <= 105)) {
        // С�������ּ�����97-105��ת��Ϊ1-9
        const num = keyCode >= 97 ? keyCode - 96 : parseInt(key);
        placeNumber(num);
        // ��ֹ�¼�ð�ݣ����������Ĭ����Ϊ
        event.preventDefault();
    }
    // ����� (0 �� Backspace �� Delete)
    else if (key === '0' || key === 'Backspace' || key === 'Delete' || keyCode === 46) {
        placeNumber(0);
        event.preventDefault();
    }
}
        

// �¼�������ʼ��
function initEventListeners() {
    // ����Ϸ��ť
    document.getElementById("new-game-btn").addEventListener("click", initGame);

    // ���𰸰�ť
    document.getElementById("check-btn").addEventListener("click", () => {
       if (checkSolution()) {
           if (remainingCells === 0) {
               endGame(true);
           } else {
               document.getElementById("game-status").textContent =
                   "��ǰ״̬������ɲ����޴���";
           }
       } else {
           document.getElementById("game-status").textContent =
               "��ǰ״̬�����ڴ���";
       }
    });

    // ��ʾ�𰸰�ť
    document
        .getElementById("solve-btn")
        .addEventListener("click", showSolution);

    // ��ʾ��ť
    document.getElementById("hint-btn").addEventListener("click", giveHint);

    // ������ť
    document.getElementById("undo-btn").addEventListener("click", undoMove);

    // ���ְ�ť
    document.querySelectorAll(".num-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const num = parseInt(btn.dataset.number);
            placeNumber(num);
        });
    });

    // �Ѷ�ѡ��
    document
        .getElementById("difficulty-level")
        .addEventListener("input", (e) => {
            difficulty = parseInt(e.target.value);
            const levelNames = ["��", "�е�", "����"];
            document.getElementById("difficulty-level-display").textContent =
                levelNames[difficulty - 1];
            document.getElementById("difficulty-display").textContent =
                levelNames[difficulty - 1];
            initGame();
        });

    // �ʼ�ģʽ�л�
    document
        .getElementById("note-mode-toggle")
        .addEventListener("change", (e) => {
            noteMode = e.target.checked;
            document.getElementById("note-mode-status").textContent = noteMode
                ? "����"
                : "�ر�";
        });
    
    document.addEventListener("keydown", handleKeyDown);
}

// ��ʼ����Ϸ
window.addEventListener("load", () => {
    initGame();
    initEventListeners();
});
