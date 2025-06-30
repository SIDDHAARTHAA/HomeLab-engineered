const express = require('express');
const multer = require('multer');
const fs = require('fs');
const fsp = require('fs').promises; // Add this line
const path = require('path');
const cors = require('cors');
const archiver = require('archiver'); // npm install archiver
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
  const relPath = req.query.path || "";
  const absPath = path.join(folderPath, relPath);
  fs.readdir(absPath, { withFileTypes: true }, (err, entries) => {
    if (err) return res.status(500).send('Error reading directory');
    res.json(entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory()
    })));
  });
});

//Upload files
app.post('/upload', upload.array('files', 100), (req, res) => {
  res.json({ message: 'Files uploaded successfully' });
});

//Download file
app.get('/download/:filename', (req, res) => {
  const relPath = req.query.path || "";
  const filename = req.params.filename;
  const absPath = path.join(folderPath, relPath, filename);
  if (!fs.existsSync(absPath)) return res.status(404).send('File not found');
  if (fs.lstatSync(absPath).isDirectory()) {
    res.attachment(filename + ".zip");
    const archive = archiver('zip');
    archive.directory(absPath, false);
    archive.pipe(res);
    archive.finalize();
  } else {
    res.download(absPath);
  }
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
app.delete('/delete/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    // Prevent directory traversal
    if (filename.includes("..")) return res.status(400).json({ error: "Invalid filename" });
    const file = path.join(folderPath, filename);
    if (!fs.existsSync(file)) return res.status(404).json({ error: "File not found" });
    await fsp.unlink(file);
    res.json({ message: "File deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Failed to delete file" });
  }
});
app.post('/mkdir', (req, res) => {
  const { path: relPath, name } = req.body;
  if (!name || name.includes("..") || name.includes("/")) {
    return res.status(400).json({ error: "Invalid folder name" });
  }
  const absPath = path.join(folderPath, relPath || "", name);
  fs.mkdir(absPath, { recursive: false }, (err) => {
    if (err) return res.status(500).json({ error: "Failed to create folder" });
    res.json({ message: "Folder created" });
  });
});
app.post('/rename', (req, res) => {
  const { path: relPath, oldName, newName } = req.body;
  if (!oldName || !newName || oldName.includes("..") || newName.includes("..")) {
    return res.status(400).json({ error: "Invalid name" });
  }
  const absOld = path.join(folderPath, relPath || "", oldName);
  const absNew = path.join(folderPath, relPath || "", newName);
  fs.rename(absOld, absNew, (err) => {
    if (err) return res.status(500).json({ error: "Failed to rename" });
    res.json({ message: "Renamed" });
  });
});

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
