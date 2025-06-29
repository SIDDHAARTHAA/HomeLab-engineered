// src/pages/DriveClone.jsx
import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API;

export default function DriveClone() {
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState([]);

  // Always fetch files on mount and after upload
  const fetchFiles = () => {
    fetch(`${API}/list`)
      .then((res) => res.json())
      .then((data) => setFiles(data))
      .catch(() => setFiles([]));
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUpload = async () => {
    if (selected.length === 0) return alert("No files selected");

    const formData = new FormData();
    for (let file of selected) formData.append("files", file);

    await fetch(`${API}/upload`, {
      method: "POST",
      body: formData,
    });

    alert("Upload complete");
    setSelected([]);
    fetchFiles(); // Refresh file list after upload
  };

  const handleDownload = (filename) => {
    window.open(`${API}/download/${filename}`);
  };

  return (
    <div className="min-h-screen p-6 bg-gray-100 text-center">
      <h1 className="text-3xl font-bold mb-4">Drive Clone</h1>

      <input
        type="file"
        multiple
        onChange={(e) => setSelected(Array.from(e.target.files))}
        className="mb-4"
      />

      <button
        onClick={handleUpload}
        className="bg-blue-600 text-white px-4 py-2 rounded mb-6 hover:bg-blue-500"
      >
        Upload Files
      </button>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Available Files:</h2>
        {files.length === 0 && <p>No files found</p>}
        <ul className="space-y-2">
          {files.map((file, index) => (
            <li
              key={index}
              className="flex justify-between items-center px-2 py-1 border-b"
            >
              <span>{file}</span>
              <button
                onClick={() => handleDownload(file)}
                className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-500"
              >
                Download
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
