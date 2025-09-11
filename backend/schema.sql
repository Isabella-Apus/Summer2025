-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 创建游戏记录表
CREATE TABLE IF NOT EXISTS game_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  game_type VARCHAR(20) NOT NULL,
  game_state TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- user_game_stats 表
CREATE TABLE IF NOT EXISTS user_game_stats (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    game_type VARCHAR(20) NOT NULL, -- 'gobang', 'sudoku'
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- friend_relation 表
CREATE TABLE IF NOT EXISTS friend_relation (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,           -- 请求发起者ID
    friend_id INT NOT NULL,         -- 请求接收者ID
    status TINYINT NOT NULL DEFAULT 0, -- 0=待同意, 1=已同意, 2=已拒绝
    reject_reason VARCHAR(100) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY (user_id, friend_id), -- 确保同一对用户之间只有一条关系记录
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 为 user_game_stats 表添加索引以优化查询
CREATE INDEX idx_user_game_stats_user_id_game_type ON user_game_stats (user_id, game_type);
CREATE INDEX idx_user_game_stats_start_time ON user_game_stats (start_time);

-- 为 friend_relation 表添加索引以优化查询
CREATE INDEX idx_friend_relation_user_id ON friend_relation (user_id);
CREATE INDEX idx_friend_relation_friend_id ON friend_relation (friend_id);
CREATE INDEX idx_friend_relation_status ON friend_relation (status);