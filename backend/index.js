const express = require('express');
const multer = require('multer');
const fs = require('fs');
const fsp = require('fs').promises; // Add this line
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
const MAX_STORAGE = 100 * 1024 * 1024 * 1024;

// Helper to get unique filename
//working
function getUniqueFilename(folder, originalName) {
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);
  let filename = originalName;
  let counter = 1;
  while (fs.existsSync(path.join(folder, filename))) {
    filename = `${base}(${counter})${ext}`;
    counter++;
  }
  return filename;
}

// Upload config
//working=>The disk storage engine gives you full control on storing files to disk.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, folderPath),
  filename: (req, file, cb) => {
    const uniqueName = getUniqueFilename(folderPath, file.originalname);
    cb(null, uniqueName);
  }
});
// upload=> this is the middleware that handles uploads
const upload = multer({ storage:storage });

// Use async/await with fs.promises
const getFolderSize = async (folderPath) => {
  let totalSize = 0;
  const entries = await fsp.readdir(folderPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);

    if (entry.isFile()) {
      const stat = await fsp.stat(fullPath);
      totalSize += stat.size;
    } else if (entry.isDirectory()) {
      totalSize += await getFolderSize(fullPath); // recursive
    }
  }

  return totalSize;
};

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(2)} ${units[i]}`;
}

// List files end point
//working/understood
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

app.get('/storage', async (req, res) => {
  try {
    const used = await getFolderSize(folderPath);
    const percentage = (used / MAX_STORAGE) * 100;

    res.json({
      used: formatBytes(used),
      total: formatBytes(MAX_STORAGE),
      percentage: `${percentage.toFixed(2)}%`
    });
  } catch (err) {
    console.error('Error calculating storage:', err);
    res.status(500).json({ error: 'Failed to calculate storage.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
