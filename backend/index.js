const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT;
const folderPath = path.resolve(__dirname, process.env.FOLDER_PATH);

// Ensure folder exists
fs.mkdirSync(folderPath, { recursive: true });

app.use(cors());
app.use(express.json());
app.use(express.static(folderPath)); // Serve static files

// Upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, folderPath),
  filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

// List files
app.get('/list', (req, res) => {
  fs.readdir(folderPath, (err, files) => {
    if (err) return res.status(500).send('Error reading directory');
    res.json(files);
  });
});

//Upload files
app.post('/upload', upload.array('files', 100), (req, res) => {
  res.json({ message: 'Files uploaded successfully' });
});

//Download file
app.get('/download/:filename', (req, res) => {
  const file = path.join(folderPath, req.params.filename);
  if (!fs.existsSync(file)) return res.status(404).send('File not found');
  res.download(file);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
