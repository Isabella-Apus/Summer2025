require('dotenv').config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise"); 
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const { body, query, param, validationResult } = require("express-validator");
const path = require("path");
const { error } = require("console");

const app = express();
const PORT = process.env.PORT || 3000;
const saltRounds = 10; //哈希强度
const JWT_SECRET = process.env.JWT_SECRET||"(7 % x) + bHATg8DdjpYf";

const mysqlPool = mysql.createPool({
    host: process.env.MYSQLHOST || "localhost",
    user: process.env.MYSQLUSER || "root",
    password: process.env.MYSQLPASSWORD || "root",
    database: process.env.MYSQLDATABASE || "gamehub",
    port: process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// 验证 MySQL 连接
async function checkMysqlConn() {
    try {
        const conn = await mysqlPool.getConnection();
        console.log("成功连接 MySQL 数据库！");
        conn.release(); 
    } catch (err) {
        console.error("MySQL 连接失败：", err.message);
        process.exit(1); 
    }
}
checkMysqlConn(); // 启动时执行连接检查

//中间件配置（处理跨域、解析请求）
app.use(helmet());
app.use(
    cors({
        // 同时允许本地和线上前端的地址
        origin: [
            "http://localhost:5173",
            "https://frontend-production-9a0f.up.railway.app",
        ],
        credentials: true,
    })
);
app.use(bodyParser.json());

app.use((req, res, next) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    next();
});

//创建数据库表（users 用户表 + game_records 游戏记录表 + user_game_stats 用户游戏记录表 + friend_relation 好友关系表）
async function createTables() {
    try {
        const conn = await mysqlPool.getConnection();
        //创建用户表，包含id(自增整数主键)，username(UNIQUE不重复，NOT NULL必填)，password(后续为哈希值),created_at创建时间，last_online最后在线时间
        await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_online DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        //创建游戏记录表，包含user_id,game_type,game_state,created_at创建时间，updated_at更新时间
        await conn.query(`
      CREATE TABLE IF NOT EXISTS game_records (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        game_type VARCHAR(20) NOT NULL, -- 'gobang'/'sudoku'
        game_state TEXT NOT NULL,       -- JSON 字符串
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE -- 级联删除
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
        //创建用户游戏记录表，包含id,user_id,game_type,start_time开始时间,end_time结束时间,created_at
        await conn.query(
            `CREATE TABLE IF NOT EXISTS user_game_stats (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                game_type VARCHAR(20) NOT NULL,
                start_time DATETIME NOT NULL,
                end_time DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
        );
        //创建好友列表，包含id,user_id,friend_id好友id,status好友状态，reject_reason拒绝理由，created_at,updated_at
        await conn.query(`
              CREATE TABLE IF NOT EXISTS friend_relation (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                friend_id INT NOT NULL,
                status TINYINT NOT NULL DEFAULT 0, -- 0=未处理, 1=接受, 2=拒绝
                reject_reason VARCHAR(100) DEFAULT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY (user_id, friend_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);

        console.log("MySQL 表结构初始化完成（users + game_records + 触发器）");
        conn.release();
    } catch (err) {
        console.error("创建 MySQL 表失败：", err.message);
    }
}
createTables();

//认证中间件（验证用户是否登录，保护需要登录的接口）
function authenticate(req, res, next) {
    // 从请求头获取 Token（格式：Bearer <token>）
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) return res.status(401).json({ error: "未授权访问：缺少token" });

    jwt.verify(token, JWT_SECRET, async (err, user) => {
        if (err) return res.status(403).json({ error: "未授权访问：Token无效或已过期" });
        req.userId = user.id;

        //更新用户最后在线时间
        try {
            const conn = await mysqlPool.getConnection();
            await conn.query("UPDATE users SET last_online = NOW() WHERE id =?", [req.userId]);
            conn.release();
        } catch (updateErr) {
            console.error("更新用户在线时间失败：", updateErr);
        }
        next();
    });
}

//游戏状态验证函数（确保存储的游戏数据格式正确）
function validateGameState(gameType, gameState) {
    const gameRules = {
        sudoku: [
            "board", // 数独棋盘（9x9数组）
            "solution", // 数独答案（9x9数组）
            "initialBoard", // 初始棋盘（9x9数组）
            "difficulty", // 难度（1-3）
            "playtime",  //游玩时间
            "remainingCells" // 剩余单元格
        ],
        gobang: [
            "board", // 五子棋棋盘（15x15数组）
            "currentPlayer", // 当前玩家（1=黑，-1=白）
            "gameMode", // 对战模式（pvp/pve）
            "moveCount", // 步数（正整数）
            "gameTime", //游玩时间
            "blackScore", //黑棋得分
            "whiteScore"  //白棋得分
        ],
    };

    // 校验游戏类型是否支持
    if (!gameRules[gameType]) {
        console.error(`不支持的游戏类型：${gameType}`);
        return false;
    }

    //校验必填字段是否存在且格式正确
    const requiredFields = gameRules[gameType];
    for (const field of requiredFields) {
        // 字段不存在
        if (!(field in gameState)) {
            if (["playtime", "remainingCells", "gameTime", "blackScore", "whiteScore", "aiLevel"].includes(field)) {
                continue;
            }
            console.error(`游戏状态缺少必填字段：${field}`);
            return false;
        }

        // 字段格式校验（差异化处理）
        switch (`${gameType}_${field}`) {
            // Sudoku 专属格式
            case "sudoku_board":
            case "sudoku_solution":
            case "sudoku_initialBoard":
                if (
                    !Array.isArray(gameState[field]) ||
                    gameState[field].length !== 9 ||
                    !gameState[field].every(
                        (row) => Array.isArray(row) && row.length === 9
                    )
                ) {
                    console.error(`Sudoku ${field} 格式错误（需9x9数组）`);
                    return false;
                }
                break;

            // Gobang 专属格式
            case "gobang_board":
                if (
                    !Array.isArray(gameState[field]) ||
                    gameState[field].length !== 15 ||
                    !gameState[field].every(
                        (row) => Array.isArray(row) && row.length === 15
                    )
                ) {
                    console.error(`Gobang ${field} 格式错误（需15x15数组）`);
                    return false;
                }
                break;
            case "gobang_currentPlayer":
                if (![1, -1].includes(gameState[field])) {
                    console.error(`Gobang currentPlayer 错误（需1或-1）`);
                    return false;
                }
                break;
            case "gobang_gameMode":
                if (!["pvp", "pve"].includes(gameState[field])) {
                    console.error(`Gobang gameMode 错误（需pvp或pve）`);
                    return false;
                }
                break;
        }
    }

    return true;
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
        .toString()
        .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
}

// 接口定义
//用户注册接口（POST /register）
app.post(
    "/register",
    [
        body("username")
            .trim()
            .isLength({ min: 3, max: 20 })
            .withMessage("用户名长度需在3到20个字符之间")
            .matches(/^[a-zA-Z0-9_]+$/)
            .withMessage("用户名只能包含字母、数字和下划线"),
        body("password")
            .isLength({ min: 6 })
            .withMessage("密码至少需要6个字符"),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { username, password } = req.body;

        try {
            const conn = await mysqlPool.getConnection();

            const [existingUser] = await conn.query(
                "SELECT id FROM users WHERE username = ?",
                [username]
            );

            if (existingUser.length > 0) {
                conn.release();
                return res.status(409).json({ error: "用户名已存在" });
            }
            // 密码加密（bcrypt 哈希，避免明文存储）
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            const [result] = await conn.query(
                "INSERT INTO users (username, password) VALUES (?, ?)",
                [username, hashedPassword]
            );

            conn.release();
            res.status(200).json({
                success: true,
                userId: result.insertId, 
                message: "注册成功",
            });
        } catch (err) {
            console.error("注册错误：".err);
            res.status(500).json({ error: "服务器错误：" + err.message });
        }
});

//用户登录接口（POST /login）
app.post(
    "/login",
    [
        body("username").trim().notEmpty().withMessage("用户名不能为空"),
        body("password").notEmpty().withMessage("密码不能为空"),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;

        try {
            const conn = await mysqlPool.getConnection();

            // 查询用户（MySQL 返回数组，取第一个元素 [0]）
            const [users] = await conn.query(
                "SELECT id, username, password FROM users WHERE username = ?",
                [username]
            );
            conn.release();

            const user = users[0];
            if (!user) {
                return res.status(401).json({ error: "用户名或密码错误" });
            }

            // 密码对比
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ error: "用户名或密码错误" });
            }

            // 生成 JWT Token
            const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "6h" });
           
            //更新用户最后在线时间
            const updateConn = await mysqlPool.getConnection();
            await updateConn.query("UPDATE users SET last_online = NOW() WHERE id = ?", [user.id]);
            updateConn.release();

            res.json({
                success: true,
                token,
                userId: user.id,
                username:user.username,
                message: "登录成功",
            });
        } catch (err) {
            console.error("登录错误：", err);
            res.status(500).json({ error: "数据库错误：" + err.message });
        }
    }
);

//用户信息接口（GET /profile，需登录）
app.get("/profile", authenticate, async (req, res) => {
    // 根据用户 ID 查询用户信息（不返回密码，保护隐私）
    try {
        const conn = await mysqlPool.getConnection();
        const [users] = await conn.query(
            "SELECT id, username, created_at FROM users WHERE id = ?",
            [req.userId]
        );
        conn.release();

        const user = users[0];
        if (!user) {
            return res.status(404).json({ error: "用户不存在" });
        }

        res.status(200).json(user);
    } catch (err) {
        console.error("获取用户信息错误：", err);
        res.status(500).json({ error: "数据库错误：" + err.message });
    }
});

//保存游戏状态接口（POST /save-game，需登录）
app.post("/save-game", authenticate, async (req, res) => {
    const { gameType, gameState } = req.body;

    // 验证游戏状态格式
    if (!gameType || !gameState || !validateGameState(gameType, gameState)) {
        return res.status(400).json({ error: "无效的游戏状态" });
    }

    try {
        const conn = await mysqlPool.getConnection();
        const gameStateStr = JSON.stringify(gameState);

        const [result] = await conn.query(
            "INSERT INTO game_records (user_id, game_type, game_state,created_at,updated_at) VALUES (?,?,?,now(),now())",
            [req.userId, gameType, gameStateStr]
        );

        conn.release();
        res.status(200).json({
            success: true,
            message: "游戏残局已成功保存",
            tip: "可在'我的残局'中查看所有保存记录",
            recordId:result.insertId,
        });
    } catch (err) {
        console.error("保存游戏状态错误：", err);
        res.status(500).json({ error: "数据库错误：" + err.message });
    }
});

//加载游戏状态接口（GET /load-game/:id，需登录）
app.get("/load-game/:id", authenticate, async (req, res) => {
    const { id } = req.params; 

    // 查询该用户最新的游戏记录
    try {
        const conn = await mysqlPool.getConnection();
        const [rows] = await conn.query(
            `SELECT game_state FROM game_records 
            WHERE id = ? AND user_id = ?
            LIMIT 1`,
            [id, req.userId]
        );
        conn.release();

        if (rows.length === 0) {
            return res.status(404).json({ error: "游戏记录不存在或无权访问" });
        }

        const gameState = JSON.parse(rows[0].game_state);
        res.status(200).json({
            success: true,
            data: { gameState, recordId: id, gameType:rows[0].game_type},
        });
    } catch (parseErr) {
        console.error("加载游戏状态错误：", parseErr);
        res.status(500).json({
            error: "解析游戏状态失败：" + parseErr.message,
        });
    }
});

//获取游戏历史接口（GET /game-history，需登录）
app.get("/game-history", authenticate, async (req, res) => {
    // 查询该用户的所有游戏记录（仅返回基本信息，不返回完整游戏状态）
    try {
        const conn = await mysqlPool.getConnection();
        const [records] = await conn.query(
            `SELECT id, game_type, game_state, created_at, updated_at 
       FROM game_records 
       WHERE user_id = ? 
       ORDER BY updated_at DESC`,
            [req.userId]
        );
        conn.release();

        const history = records.map((row) => {
            let name = "未命名";
            let simpleState = null;
            try {
                const gameState = JSON.parse(row.game_state);
                if (gameState.name && typeof gameState.name === "string")
                    name = gameState.name.trim() || name;
                switch (row.game_type) {
                    case "sudoku":
                        simpleState = {
                            difficulty:
                                ["简单", "中等", "困难"][
                                    gameState.difficulty - 1
                                ] || "未知",
                            playtime: formatTime(gameState.playTime || 0), // 格式化时间（分:秒）
                            remainingCells: gameState.remainingCells || 0,
                            progress:
                                gameState.initialBoard &&
                                gameState.initialBoard
                                    .flat()
                                    .filter((v) => v === 0).length
                                    ? `${
                                          gameState.initialBoard
                                              .flat()
                                              .filter((v) => v === 0).length -
                                          (gameState.remainingCells || 0)
                                      }/${
                                          gameState.initialBoard
                                              .flat()
                                              .filter((v) => v === 0).length
                                      }`
                                    : "N/A",
                        };
                        break;

                    case "gobang":
                        simpleState = {
                            gameMode:
                                gameState.gameMode === "pvp"
                                    ? "人人对战"
                                    : "人机对战",
                            aiLevel: gameState.aiLevel
                                ? ["初级", "中等", "困难"][
                                      gameState.aiLevel - 1
                                  ]
                                : "未知",
                            moveCount: gameState.moveCount || 0,
                            playtime: formatTime(gameState.gameTime || 0), // Gobang 用 gameTime 存储时间
                            score: `黑:${gameState.blackStore || 0} 白:${
                                gameState.whiteScore || 0
                            }`,
                        };
                        break;
                }
            } catch (parseErr) {
                console.error("解析game_state失败：", parseErr);
                name = "数据异常"; // 标记异常数据
                simpleState = { error: "数据解析异常" };
            }
            return {
                id: row.id,
                gameType: row.game_type,
                gameState: row.game_state,  //为什么不返回这个
                name: name,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                simpleState: simpleState,
            };
        });
        res.status(200).json({
            success: true,
            count: history.length,
            data: history,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: "数据库错误：" + err.message,
        });
    }
});
//删除游戏记录接口（DELETE /delete-game/:id，需登录）
app.delete("/delete-game/:id", authenticate, async (req, res) => {
    const { id } = req.params;

    try {
        const conn = await mysqlPool.getConnection();
        const [result] = await conn.query(
            "DELETE FROM game_records WHERE id = ? AND user_id = ?",
            [id, req.userId]
        );
        conn.release();
        if (result.length === 0) {
            return res.status(404).json({ error: "游戏记录不存在或无权删除" });
        }
        res.status(200).json({ success: true, message: "游戏记录已删除" });
    } catch (err) {
        console.error("删除游戏记录错误：", err);
        res.status(500).json({ error: "数据库错误：" + err.message });
    }
});
// 检查残局名称是否重复（GET /check-puzzle-name，需登录）
app.get("/check-puzzle-name", authenticate,
    [
        query('gameType').isIn(['gobang', 'sudoku']).withMessage('无效的游戏类型'),
        query('name').trim().notEmpty().withMessage('残局名称不能为空'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        try {
            const { gameType, name } = req.query;
            const conn = await mysqlPool.getConnection();
            const [rows] = await conn.query(
            `SELECT id 
             FROM game_records 
             WHERE user_id = ? 
               AND game_type = ? 
               AND JSON_EXTRACT(game_state, '$.name') = ? 
             LIMIT 1`, // 找到1条即说明重复，提前终止
            [req.userId, gameType,name.trim()] // 去空格，避免“名称 ”和“名称”视为不同
            );
            conn.release();

            // 返回是否存在（exists: true=重复，false=可保存）
            res.status(200).json({
                success: true,
                exists: rows.length > 0,
            });  
        } catch (err) {
            console.error("检查残局名称失败:", err);
            res.status(500).json({
                success: false,
                error: "检查名称失败：" + err.message,
        });
    }
});
// 更新游戏记录接口（PUT /update-game/:id，需登录）
app.put("/update-game/:id", authenticate,
    [
        param('id').isInt().withMessage('无效的记录ID'),
        body('gameType').isIn(['gobang', 'sudoku']).withMessage('无效的游戏类型'),
        body('gameState').isObject().withMessage('游戏状态必须是一个对象'),
    ], async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params; 
        const { gameType, gameState } = req.body;

        if (!validateGameState(gameType, gameState)) {
            return res.status(400).json({ error: "无效的游戏状态格式" });
        }

        try {
            const conn = await mysqlPool.getConnection();

            //检查记录是否存在且属于当前用户
        const [existingRecords] = await conn.query(
                "SELECT id FROM game_records WHERE id = ? AND user_id = ? AND game_type = ?",
                [id, req.userId, gameType]
            );

            if (existingRecords.length === 0) {
                conn.release();
                return res.status(404).json({
                    error: "游戏记录不存在或无权更新",
                });
            }

            // 执行更新操作
            const gameStateStr = JSON.stringify(gameState);
            await conn.query(
                "UPDATE game_records SET game_state = ?, updated_at = NOW() WHERE id = ?",
                [gameStateStr, id]
            );  

            conn.release();

            // 返回成功响应
            res.status(200).json({
                success: true,
                message: "游戏记录已成功更新",
                data: { id }, // 返回更新的记录ID
            });
        } catch (err) {
            console.error("更新游戏记录失败：", err);
            res.status(500).json({
                error: "服务器错误：" + err.message,
            });
        }
});

//记录游戏行为接口（POST /api/stat/record-game-session
app.post(
    "/api/stat/record-game-session",
    authenticate,
    [
        body("gameType")
            .isIn(["gobang", "sudoku"])
            .withMessage("无效的游戏类型"),
        body("startTime").isISO8601().toDate().withMessage("startTime 无效"),
        body("endTime").isISO8601().toDate().withMessage("endTime 无效"),
        body("winStatus").isIn([0, 1, -1]).withMessage("无效的胜利状态"),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { gameType, startTime, endTime, winStatus } = req.body;
        const duration_seconds = Math.round(
            (new Date(endTime) - new Date(startTime)) / 1000
        );

        // 避免负数时长
        if (duration_seconds < 0) {
            return res.status(400).json({ error: "结束时间不能早于开始时间" });
        }

        try {
            const conn = await mysqlPool.getConnection();
            await conn.query(
                "INSERT INTO user_game_stats (user_id, game_type, start_time, end_time, duration_seconds, win_status) VALUES (?, ?, ?, ?, ?, ?)",
                [
                    req.userId,
                    gameType,
                    startTime,
                    endTime,
                    duration_seconds,
                    winStatus,
                ]
            );
            conn.release();
            res.status(201).json({
                success: true,
                message: "游戏会话记录成功",
            });
        } catch (err) {
            console.error("记录游戏会话失败:", err);
            res.status(500).json({ error: "服务器错误：" + err.message });
        }
    }
);

//获取用户状态 （GET /api/stat/summary）
app.get("/api/stats/summary", authenticate, async (req, res) => {
    try {
        const conn = await mysqlPool.getConnection();
        const userId = req.userId;

        //获取总统计
        const [totalStats] = await conn.query(
            `SELECT 
                COUNT(*) as total_sessions, 
                SUM(duration_seconds) as total_duration_seconds 
            FROM user_game_stats WHERE user_id = ?`,
            [userId]
        );

        //获取游戏时长占比和最常玩的游戏
        const [ratios] = await conn.query(
            `SELECT 
                game_type, SUM(duration_seconds) as duration 
            FROM user_game_stats WHERE user_id = ? GROUP BY game_type ORDER BY duration DESC`,
            [userId]
        );

        // 五子棋胜率
        const [gobangStats] = await conn.query(
            `SELECT 
                SUM(CASE WHEN win_status = 1 THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN win_status = -1 THEN 1 ELSE 0 END) as losses
            FROM user_game_stats WHERE user_id = ? AND game_type = 'gobang'`,
            [userId]
        );

        // 数独最佳时间 (只统计胜利的)
        const [sudokuStats] = await conn.query(
            `SELECT 
                MIN(duration_seconds) as best_time_seconds 
            FROM user_game_stats WHERE user_id = ? AND game_type = 'sudoku' AND win_status = 1`,
            [userId]
        );

        conn.release();

        // 整理数据
        const summary = {
            total_sessions: totalStats[0].total_sessions || 0,
            total_duration_minutes: Math.round(
                (totalStats[0].total_duration_seconds || 0) / 60
            ),
            most_played_game: ratios.length > 0 ? ratios[0].game_type : "无",
            gobang_wins: parseInt(gobangStats[0].wins) || 0,
            gobang_losses: parseInt(gobangStats[0].losses) || 0,
            sudoku_best_time_seconds: sudokuStats[0].best_time_seconds || null, // 如果没有记录则为null
        };

        res.status(200).json({ success: true, data: summary });
    } catch (err) {
        console.error("获取统计汇总失败:", err);
        res.status(500).json({ error: "服务器错误：" + err.message });
    }
});

//搜索用户接口（GET /api/friend/search）
app.get(
    "/api/friend/search",
    authenticate,
    [query("username").trim().notEmpty().withMessage("搜索用户名不能为空")],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username } = req.query;
        try {
            const conn = await mysqlPool.getConnection();
            // 搜索用户，排除自己，并用 LEFT JOIN 查出与当前用户的关系
            const [users] = await conn.query(
                `SELECT 
                u.id, 
                u.username,
                fr.status AS friendship_status,
                fr.user_id AS request_sender_id
             FROM users u
             LEFT JOIN friend_relation fr 
                ON (fr.user_id = ? AND fr.friend_id = u.id) OR (fr.user_id = u.id AND fr.friend_id = ?)
             WHERE u.username LIKE ? AND u.id != ?
             LIMIT 10`,
                [req.userId, req.userId, `%${username}%`, req.userId]
            );
            conn.release();

            // 格式化返回结果
            const searchResults = users.map((user) => {
                let status = "not_friends";
                if (user.friendship_status === 1) {
                    status = "friends";
                } else if (user.friendship_status === 0) {
                    status =
                        user.request_sender_id === req.userId
                            ? "request_sent"
                            : "request_received";
                }
                return { id: user.id, username: user.username, status };
            });

            res.status(200).json({ success: true, data: searchResults });
        } catch (err) {
            console.error("搜索用户失败:", err);
            res.status(500).json({ error: "服务器错误：" + err.message });
        }
    }
);

//发送好友请求接口（POST /api/friend/request）
app.post(
    "/api/friend/request",
    authenticate,
    [body("friend_id").isInt().withMessage("好友ID必须是整数")],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { friend_id } = req.body;

        if (req.userId === friend_id) {
            return res.status(400).json({ error: "不能添加自己为好友" });
        }

        try {
            const conn = await mysqlPool.getConnection();

            // 检查对方用户是否存在
            const [targetUser] = await conn.query(
                "SELECT id FROM users WHERE id = ?",
                [friend_id]
            );
            if (targetUser.length === 0) {
                conn.release();
                return res.status(404).json({ error: "目标用户不存在" });
            }

            // 检查是否已存在关系 (好友或已发送请求)
            const [existingRelation] = await conn.query(
                "SELECT id FROM friend_relation WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
                [req.userId, friend_id, friend_id, req.userId]
            );
            if (existingRelation.length > 0) {
                conn.release();
                return res
                    .status(409)
                    .json({ error: "你们已经是好友或已有待处理的请求" });
            }

            // 插入新的好友请求记录
            await conn.query(
                "INSERT INTO friend_relation (user_id, friend_id, status) VALUES (?, ?, 0)", // status 0 = pending
                [req.userId, friend_id]
            );
            conn.release();

            res.status(201).json({ success: true, message: "好友请求已发送" });
        } catch (err) {
            console.error("发送好友请求失败:", err);
            res.status(500).json({ error: "服务器错误：" + err.message });
        }
    }
);

//获取收到的好友请求列表（GET /api/friend/requests）
app.get("/api/friend/requests", authenticate, async (req, res) => {
    try {
        const conn = await mysqlPool.getConnection();
        const [requests] = await conn.query(
            `SELECT fr.id, u.username AS sender_username, fr.created_at
             FROM friend_relation fr
             JOIN users u ON fr.user_id = u.id
             WHERE fr.friend_id = ? AND fr.status = 0`,
            [req.userId]
        );
        conn.release();
        res.status(200).json({ success: true, data: requests });
    } catch (err) {
        console.error("获取好友请求列表失败:", err);
        res.status(500).json({ error: "服务器错误：" + err.message });
    }
});

//处理好友请求接口（PUT /api/friend/request/:id）
app.put(
    "/api/friend/request/:id",
    authenticate,
    [
        param("id").isInt().withMessage("请求ID无效"),
        body("status")
            .isIn([1, 2])
            .withMessage("状态必须是 1 (同意) 或 2 (拒绝)"),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { status, reject_reason } = req.body;

        try {
            const conn = await mysqlPool.getConnection();
            const [result] = await conn.query(
                "UPDATE friend_relation SET status = ?, reject_reason = ?, updated_at = NOW() WHERE id = ? AND friend_id = ?",
                [status, status === 2 ? reject_reason : null, id, req.userId]
            );
            conn.release();

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "请求不存在或无权操作" });
            }

            res.status(200).json({
                success: true,
                message: `好友请求已${status === 1 ? "接受" : "拒绝"}`,
            });
        } catch (err) {
            console.error("处理好友请求失败:", err);
            res.status(500).json({ error: "服务器错误：" + err.message });
        }
    }
);

//获取好友列表接口（/api/friend/list）
app.get("/api/friend/list", authenticate, async (req, res) => {
    try {
        const conn = await mysqlPool.getConnection();
        const [friends] = await conn.query(
            `SELECT u.id, u.username, u.last_online
             FROM users u
             JOIN friend_relation fr ON (u.id = fr.user_id OR u.id = fr.friend_id)
             WHERE (fr.user_id = ? OR fr.friend_id = ?)
               AND fr.status = 1
               AND u.id != ?
             ORDER BY u.last_online DESC`,
            [req.userId, req.userId, req.userId]
        );
        conn.release();
        res.status(200).json({ success: true, data: friends });
    } catch (err) {
        console.error("获取好友列表失败:", err);
        res.status(500).json({ error: "服务器错误：" + err.message });
    }
});

//删除好友接口（DELETE /api/friend/:friend_id）
app.delete(
    "/api/friend/:friend_id",
    authenticate,
    [param("friend_id").isInt().withMessage("好友ID无效")],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { friend_id } = req.params;

        try {
            const conn = await mysqlPool.getConnection();
            const [result] = await conn.query(
                "DELETE FROM friend_relation WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)) AND status = 1",
                [req.userId, friend_id, friend_id, req.userId]
            );
            conn.release();

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "好友关系不存在" });
            }

            res.status(200).json({ success: true, message: "好友已删除" });
        } catch (err) {
            console.error("删除好友失败:", err);
            res.status(500).json({ error: "服务器错误：" + err.message });
        }
    }
);
//获取当前用户的收藏列表(GET /api/user/favorites)
app.get("/api/user/favorites", authenticate, async (req, res) => {
    try {
        const conn = await mysqlPool.getConnection();
        const [favorites] = await conn.query(
            "SELECT game_id FROM user_favorites WHERE user_id = ?",
            [req.userId]
        );
        conn.release();
        
        // 返回一个只包含 game_id 的数组，例如 ['gobang', 'sudoku']
        res.status(200).json({ success: true, data: favorites.map(f => f.game_id) });
    } catch (err) {
        console.error("获取收藏列表失败:", err);
        res.status(500).json({ error: "服务器错误：" + err.message });
    }
});

//添加一个收藏(POST /api/user/favorites)
app.post("/api/user/favorites", authenticate, [
    body('game_id').trim().notEmpty().withMessage('游戏ID不能为空')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { game_id } = req.body;
    try {
        const conn = await mysqlPool.getConnection();
        // INSERT IGNORE 会在记录已存在时忽略错误，避免因重复收藏而报错
        await conn.query(
            "INSERT IGNORE INTO user_favorites (user_id, game_id) VALUES (?, ?)",
            [req.userId, game_id]
        );
        conn.release();
        res.status(201).json({ success: true, message: "收藏成功" });
    } catch (err) {
        console.error("添加收藏失败:", err);
        res.status(500).json({ error: "服务器错误：" + err.message });
    }
});

//移除一个收藏(DELETE /api/user/favorites/:game_id)
app.delete("/api/user/favorites/:game_id", authenticate, [
    param('game_id').trim().notEmpty().withMessage('游戏ID不能为空')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { game_id } = req.params;
    try {
        const conn = await mysqlPool.getConnection();
        await conn.query(
            "DELETE FROM user_favorites WHERE user_id = ? AND game_id = ?",
            [req.userId, game_id]
        );
        conn.release();
        res.status(200).json({ success: true, message: "取消收藏成功" });
    } catch (err) {
        console.error("取消收藏失败:", err);
        res.status(500).json({ error: "服务器错误：" + err.message });
    }
});

//好友排行榜(GET /api/stats/friend-rankings)
app.get("/api/stats/friend-rankings", authenticate, async (req, res) => {
    try {
        const conn = await mysqlPool.getConnection();
        const userId = req.userId;

        // 获取当前用户的好友ID列表
        const [friendRows] = await conn.query(
            `SELECT 
                CASE 
                    WHEN user_id = ? THEN friend_id 
                    ELSE user_id 
                END as friend_id
             FROM friend_relation 
             WHERE (user_id = ? OR friend_id = ?) AND status = 1`,
            [userId, userId, userId]
        );
        const friendIds = friendRows.map(row => row.friend_id);
        
        // 将当前用户ID也加入列表，以便一起查询
        const allUserIds = [userId, ...friendIds];
        
        if (allUserIds.length === 0) {
            conn.release();
            return res.status(200).json({ success: true, data: [] });
        }

        const placeholders = allUserIds.map(() => '?').join(',');

        // 一次性查询所有相关用户的统计数据和用户名
        const [stats] = await conn.query(
            `SELECT 
                s.user_id,
                u.username,
                COUNT(*) as total_sessions,
                SUM(s.duration_seconds) as total_duration_seconds,
                SUM(CASE WHEN s.game_type = 'gobang' AND s.win_status = 1 THEN 1 ELSE 0 END) as gobang_wins,
                SUM(CASE WHEN s.game_type = 'gobang' AND s.win_status = -1 THEN 1 ELSE 0 END) as gobang_losses,
                MIN(CASE WHEN s.game_type = 'sudoku' AND s.win_status = 1 THEN s.duration_seconds ELSE NULL END) as sudoku_best_time
            FROM users u
            LEFT JOIN user_game_stats s ON u.id = s.user_id
            WHERE u.id IN (${placeholders})
            GROUP BY u.id, u.username`,
            allUserIds
        );
        
        conn.release();

        const rankingsData = stats.map(stat => {
            const gobang_wins = parseInt(stat.gobang_wins) || 0;
            const gobang_losses = parseInt(stat.gobang_losses) || 0;

            const gobang_total = gobang_wins + gobang_losses;
            const gobang_win_rate = gobang_total > 0 ? (gobang_wins / gobang_total) * 100 : 0;

            return {
                user_id: stat.user_id,
                username: stat.username,
                total_sessions: parseInt(stat.total_sessions),
                total_duration_minutes: Math.round(stat.total_duration_seconds / 60),
                gobang_win_rate: parseFloat(gobang_win_rate.toFixed(2)),
                sudoku_best_time: stat.sudoku_best_time, // 可能是 null
            };
        });
        
        res.status(200).json({ success: true, data: rankingsData });
        
    } catch (err) {
        console.error("获取好友排行榜失败:", err);
        res.status(500).json({ error: "服务器错误：" + err.message });
    }
});


//启动后端服务
app.listen(PORT, () => {
    console.log(`后端服务已启动！运行地址：http://localhost:${PORT}`);
    console.log("--- 基础接口 ---");
    console.log("- POST /register：用户注册");
    console.log("- POST /login：用户登录");
    console.log("- GET  /profile：获取用户信息（需登录）");
    console.log("--- 游戏存档接口 ---");
    console.log("- POST /save-game：保存游戏状态（需登录）");
    console.log("- GET  /load-game/:id：加载游戏状态（需登录）");
    console.log("- GET  /game-history：获取游戏历史（需登录）");
    console.log("- DELETE /delete-game/:id：删除游戏记录（需登录）");
    console.log("- PUT /update-game/:id：更新游戏记录（需登录）");
    console.log("--- 用户统计接口 ---");
    console.log("- POST /api/stat/record-game-session：记录游戏会话（需登录）");
    console.log("- GET  /api/stats/summary：获取用户状态（需登录）");
    console.log("--- 好友功能接口 ---");
    console.log("- GET  /api/friend/search?username=...：搜索用户（需登录）");
    console.log("- POST /api/friend/request：发送好友请求（需登录）");
    console.log("- GET  /api/friend/requests：获取收到的好友请求（需登录）");
    console.log("- PUT  /api/friend/request/:id：处理好友请求（需登录）");
    console.log("- GET  /api/friend/list：获取好友列表（需登录）");
    console.log("- DELETE /api/friend/:friend_id：删除好友（需登录）");
    console.log("---用户收藏接口---");
    console.log("- GET /api/user/favorites：获取当前用户的收藏列表（需登录）");
    console.log("- POST /api/user/favorites：添加一个收藏（需登录）");
    console.log("- DELETE /api/user/favorites/:game_id：移除一个收藏（需登录）");
    console.log("- GET /api/stats/friend-rankings");
});
