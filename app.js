var express = require('express');
var session = require('express-session');
require('dotenv').config();
var path = require('path');
var authRoutes = require('./routes/authRoutes');
var eventRoutes = require('./routes/eventRoutes');
var attendanceRoutes = require('./routes/attendanceRoutes');
var certificateRoutes = require('./routes/certificateRoutes');
var adminRoutes = require('./routes/adminRoutes');
var app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
var sessionConfig = {
    secret: process.env.SESSION_SECRET,
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
    res.redirect('/auth/login');
});
app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});