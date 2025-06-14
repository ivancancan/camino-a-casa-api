const express = require('express');
const cors = require('cors');
require('dotenv-flow').config();

const app = express();
app.enable('trust proxy');
app.set('etag', false);

const PORT = process.env.PORT || 3001;

// Middlewares globales
app.use(cors());

// ❌ NO pongas estos antes de multer
// app.use(express.json());
// app.use(express.urlencoded());

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

// Rutas primero
const authRoutes = require('./routes/auth.routes');
const petRoutes = require('./routes/pet.routes');
const adopterRoutes = require('./routes/adopter.routes');
const swipeRoutes = require('./routes/swipe.routes');
const giverRoutes = require('./routes/giver.routes');
const matchRoutes = require('./routes/match.routes');
const messageRoutes = require('./routes/message.routes');

app.use('/api/auth', authRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/adopter', adopterRoutes); // ✅ Aquí debe ir antes
app.use('/api/swipes', swipeRoutes);
app.use('/api/giver', giverRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/messages', messageRoutes);

// ✅ JSON parsers después
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ruta base
app.get('/', (req, res) => {
  res.send('Camino a Casa API is running 🐾');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server listening on http://0.0.0.0:${PORT}`);
});
