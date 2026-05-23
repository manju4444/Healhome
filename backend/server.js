const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// CORS — allow all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors());
app.use(express.json());

// Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  }
});

// Routes
app.use('/api/auth',   require('./routes/auth'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/meals',  require('./routes/meals'));
app.use('/api/chat',   require('./routes/chat'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'HealHome API running ✅' });
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_room', (orderId) => socket.join(orderId));

  socket.on('send_message', (data) => {
    io.to(data.orderId).emit('receive_message', data);
  });

  socket.on('order_status_update', (data) => {
    io.to(data.orderId).emit('order_updated', data);
  });

  socket.on('disconnect', () => console.log('Client disconnected'));
});

// Keep Render awake
const https = require('https');
setInterval(() => {
  https.get('https://healhome-backend.onrender.com/', () => {
    console.log('Server kept alive ✅');
  }).on('error', () => {});
}, 14 * 60 * 1000);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected ✅');
    server.listen(process.env.PORT || 5000, () =>
      console.log(`Server running on port ${process.env.PORT || 5000} ✅`)
    );
  })
  .catch(err => console.error('MongoDB error:', err));
