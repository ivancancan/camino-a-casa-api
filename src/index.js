const express = require('express');
const cors = require('cors');
require('dotenv-flow').config(); // ✅ Cambiado a dotenv-flow para múltiples entornos y Railway

const app = express();
app.enable('trust proxy'); // ✅ Mover esto después de definir app

const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Importar y usar rutas
const authRoutes = require('./routes/auth.routes');
const petRoutes = require('./routes/pet.routes');
const adopterRoutes = require('./routes/adopter.routes');
const swipeRoutes = require('./routes/swipe.routes');
const giverRoutes = require('./routes/giver.routes');
const matchRoutes = require('./routes/match.routes'); // ✅ NUEVO
const messageRoutes = require('./routes/message.routes'); // ✅ NUEVO

app.use('/api/auth', authRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/adopter', adopterRoutes);
app.use('/api/swipes', swipeRoutes);
app.use('/api/giver', giverRoutes);
app.use('/api/matches', matchRoutes); // ✅ NUEVO
app.use('/api/messages', messageRoutes); // ✅ NUEVO

// Ruta base
app.get('/', (req, res) => {
  res.send('Camino a Casa API is running 🐾');
});

// Escuchar en todas las interfaces (para que funcione con Railway o Ngrok)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server listening on http://0.0.0.0:${PORT}`);
});
