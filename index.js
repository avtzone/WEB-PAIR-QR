const express = require('express');
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8000;

// Body parser first
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Import routes
let server = require('./qr');
let code = require('./pair');

// Routes
app.use('/qr', server);
app.use('/code', code);

app.use('/pair', (req, res) => {
  res.sendFile(path.join(__dirname, 'pair.html'));
});

app.use('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'main.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

module.exports = app;
