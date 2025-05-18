camino-a-casa-api:
  name: "Camino a Casa – API (Backend)"
  description: >
    Backend del MVP de Camino a Casa, una plataforma que conecta personas que desean adoptar perros o gatos con quienes los ofrecen en adopción.
  stack:
    - Node.js
    - Express.js
    - PostgreSQL
    - Supabase (opcional)
    - JWT
    - REST API
  structure:
    - controllers/
    - routes/
    - models/
    - middlewares/
    - utils/
    - index.js
    - .env
    - package.json
  setup:
    steps:
      - git clone https://github.com/ivancancan/camino-a-casa-api.git
      - cd camino-a-casa-api
      - npm install
      - create .env file with:
          - PORT=3000
          - DATABASE_URL=your_postgres_url
          - JWT_SECRET=your_jwt_secret
      - node index.js
  endpoints:
    - POST /auth/register
    - POST /auth/login
    - GET /mascotas
    - POST /mascotas
    - POST /match
    - GET /match
    - POST /mensajes
  roadmap:
    - [x] Setup inicial
    - [ ] Autenticación básica
    - [ ] CRUD de mascotas
    - [ ] Sistema de matches
    - [ ] Chat entre usuarios
    - [ ] Admin dashboard
