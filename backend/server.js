const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
dns.setDefaultResultOrder('ipv4first');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'] }
});

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api/auth',   require('./routes/auth'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/meals',  require('./routes/meals'));
app.use('/api/chat',   require('./routes/chat'));

// Socket.IO — real time order updates + chat
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

app.get('/', (req, res) => res.json({ message: 'HealHome API running ✅' }));

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected ✅');
    server.listen(process.env.PORT || 5000, () =>
      console.log(`Server running on port ${process.env.PORT} ✅`)
    );
  })
  .catch(err => console.error('MongoDB error:', err));