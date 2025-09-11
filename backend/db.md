```mermaid
sequenceDiagram
    participant Frontend
    participant Backend
    participant Database
    
    Frontend->>Backend: POST /register (username, password)
    Backend->>Database: INSERT INTO users
    Database-->>Backend: ���û�ID
    Backend-->>Frontend: ע��ɹ� + �û�ID
    
    Frontend->>Backend: POST /login (credentials)
    Backend->>Database: SELECT * FROM users
    Database-->>Backend: �û���¼
    Backend-->>Frontend: ��֤����
    
    Frontend->>Backend: POST /save-game (token, gameState)
    Backend->>Database: INSERT/UPDATE game_records
    Database-->>Backend: �������
    Backend-->>Frontend: ����ɹ�
    
    Frontend->>Backend: GET /load-game (token)
    Backend->>Database: SELECT game_state
    Database-->>Backend: ��Ϸ״̬JSON
    Backend-->>Frontend: ���������Ϸ״̬
```