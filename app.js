var express = require('express');
var session = require('express-session');
require('dotenv').config();
var path = require('path');
var db = require('./config/db');
var authRoutes = require('./routes/authRoutes');
var eventRoutes = require('./routes/eventRoutes');
var attendanceRoutes = require('./routes/attendanceRoutes');
var certificateRoutes = require('./routes/certificateRoutes');
var adminRoutes = require('./routes/adminRoutes');
var app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
var sessionConfig = {
    secret: process.env.SESSION_SECRET || 'secret-key',
    resave: false,
    saveUninitialized: false
};

app.use(session(sessionConfig));
app.use('/auth', authRoutes);
app.use('/student', eventRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/certificate', certificateRoutes);
app.use('/admin', adminRoutes);
app.get('/', (req, res) => {
    res.json({ message: 'Certificate portal API is running', routes: ['/auth', '/student', '/attendance', '/certificate', '/admin'] });
});
var port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});