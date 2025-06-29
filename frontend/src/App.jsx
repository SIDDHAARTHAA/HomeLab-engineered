// src/pages/DriveClone.jsx
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpAZ,
  ArrowDownAZ,
  ArrowUp01,
  ArrowDown01,
  FileImage,
  FileVideo,
  File,
  Folder,
  FileArchive,
  Download,
} from "lucide-react";

const API = import.meta.env.VITE_API;

// Helper to get icon based on file type
function getFileIcon(name) {
  if (!name) return <File className="w-5 h-5 text-gray-400 flex-shrink-0 mr-2" />;
  const ext = name.split(".").pop().toLowerCase();
  if (name.endsWith("/")) return <Folder className="w-5 h-5 text-yellow-500 flex-shrink-0 mr-2" />;
  if (["zip"].includes(ext)) return <FileArchive className="w-5 h-5 text-orange-500 flex-shrink-0 mr-2" />;
  if (["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"].includes(ext))
    return <FileImage className="w-5 h-5 text-blue-400 flex-shrink-0 mr-2" />;
  if (["mp4", "mkv", "avi", "mov", "webm"].includes(ext))
    return <FileVideo className="w-5 h-5 text-purple-400 flex-shrink-0 mr-2" />;
  return <File className="w-5 h-5 text-gray-400 flex-shrink-0 mr-2" />;
}

export default function App() {
  const [files, setFiles] = useState([]);
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [storage, setStorage] = useState(null);
  const fileInputRef = useRef();

  // Fetch files on mount and after upload
  const fetchFiles = () => {
    fetch(`${API}/list`)
      .then((res) => res.json())
      .then((data) => setFiles(data))
      .catch(() => setFiles([]));
  };

  // Fetch storage info
  const fetchStorage = () => {
    fetch(`${API}/storage`)
      .then((res) => res.json())
      .then((data) => setStorage(data));
  };

  useEffect(() => {
    fetchFiles();
    fetchStorage();
    const interval = setInterval(() => {
      fetchFiles();
      fetchStorage();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleUpload = async (e) => {
    const selected = Array.from(e.target.files);
    if (selected.length === 0) return;

    const formData = new FormData();
    for (let file of selected) formData.append("files", file);

    await fetch(`${API}/upload`, {
      method: "POST",
      body: formData,
    });

    fetchFiles();
    fetchStorage();
    fileInputRef.current.value = ""; // Reset input
  };

  // Sorting logic
  const [fileSizes, setFileSizes] = useState({});
  useEffect(() => {
    // Fetch all file sizes in parallel
    const fetchSizes = async () => {
      const entries = await Promise.all(
        files.map(async (file) => {
          const res = await fetch(`${API}/download/${file}`, { method: "HEAD" });
          const bytes = res.headers.get("content-length");
          return [file, bytes ? Number(bytes) : 0];
        })
      );
      setFileSizes(Object.fromEntries(entries));
    };
    if (files.length > 0) fetchSizes();
  }, [files]);

  const sortedFiles = [...files].sort((a, b) => {
    if (sortBy === "name") {
      if (sortDir === "asc") return a.localeCompare(b);
      else return b.localeCompare(a);
    }
    if (sortBy === "size") {
      const sizeA = fileSizes[a] || 0;
      const sizeB = fileSizes[b] || 0;
      if (sortDir === "asc") return sizeA - sizeB;
      else return sizeB - sizeA;
    }
    return 0;
  });

  const handleSort = (col) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir("asc");
    }
  };

  // Download handler
  const handleDownload = (filename) => {
    window.open(`${API}/download/${encodeURIComponent(filename)}`, "_blank");
  };

  // Storage bar
  function StorageBar() {
    if (!storage) return null;
    // Parse percentage as number (strip % if present)
    const percent = parseFloat(storage.percentage);
    return (
      <div
        className="relative h-10 flex items-center w-full"
        title={`${storage.used} used of ${storage.total}`}
      >
        <div className="flex-1 h-full rounded bg-gray-200 overflow-hidden relative">
          <div
            className="absolute left-0 top-0 h-full bg-blue-600 transition-all"
            style={{
              width: `${percent}%`,
              borderRadius: "0.5rem 0 0 0.5rem",
            }}
          />
          <div
            className="absolute right-0 top-0 h-full w-full border-2 border-dashed border-gray-400 pointer-events-none"
            style={{
              borderLeft: "none",
              borderRadius: "0.5rem",
            }}
          />
        </div>
        <div className="ml-3 whitespace-nowrap text-gray-700 font-medium text-base">
          {percent.toFixed(2)}% used
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center px-2 py-4">
      <div className="w-full max-w-screen-lg">
        <div className="flex flex-col md:flex-row items-center gap-4 mb-6 w-full">
          <button
            onClick={() => fileInputRef.current.click()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500"
            style={{ height: "2.5rem" }}
          >
            Upload Files
          </button>
          <input
            type="file"
            multiple
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleUpload}
          />
          {/* Storage Bar */}
          <div className="flex-1 w-full">
            <StorageBar />
          </div>
        </div>
        <div className="bg-white p-2 md:p-4 rounded shadow mt-2">
          {files.length === 0 ? (
            <p className="text-sm text-gray-400 text-center">no files</p>
          ) : (
            <>
              {/* Header */}
              <div className="hidden md:grid grid-cols-[3fr_1fr_40px] font-semibold border-b pb-2 mb-2 text-left">
                <button
                  className="flex items-center gap-1 focus:outline-none"
                  onClick={() => handleSort("name")}
                >
                  Name
                  {sortBy === "name" &&
                    (sortDir === "asc" ? (
                      <ArrowDownAZ className="w-4 h-4 ml-1" />
                    ) : (
                      <ArrowUpAZ className="w-4 h-4 ml-1" />
                    ))}
                </button>
                <button
                  className="flex items-center gap-1 focus:outline-none"
                  onClick={() => handleSort("size")}
                >
                  Size
                  {sortBy === "size" &&
                    (sortDir === "asc" ? (
                      <ArrowDown01 className="w-4 h-4 ml-1" />
                    ) : (
                      <ArrowUp01 className="w-4 h-4 ml-1" />
                    ))}
                </button>
                <div></div>
              </div>
              {/* Mobile Header */}
              <div className="md:hidden grid grid-cols-[2fr_1fr_32px] font-semibold border-b pb-2 mb-2 text-left text-xs">
                <button
                  className="flex items-center gap-1 focus:outline-none"
                  onClick={() => handleSort("name")}
                >
                  Name
                  {sortBy === "name" &&
                    (sortDir === "asc" ? (
                      <ArrowDownAZ className="w-4 h-4 ml-1" />
                    ) : (
                      <ArrowUpAZ className="w-4 h-4 ml-1" />
                    ))}
                </button>
                <button
                  className="flex items-center gap-1 focus:outline-none"
                  onClick={() => handleSort("size")}
                >
                  Size
                  {sortBy === "size" &&
                    (sortDir === "asc" ? (
                      <ArrowDown01 className="w-4 h-4 ml-1" />
                    ) : (
                      <ArrowUp01 className="w-4 h-4 ml-1" />
                    ))}
                </button>
                <div></div>
              </div>
              {/* Rows */}
              <div className="flex flex-col gap-1">
                {sortedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-[3fr_1fr_40px] md:grid-cols-[3fr_1fr_40px] items-center border-b py-2 text-left"
                  >
                    <span
                      className="flex items-center gap-2 min-w-0"
                      title={file}
                      style={{
                        fontSize: "0.98rem",
                        wordBreak: "break-all",
                      }}
                    >
                      {getFileIcon(file)}
                      <span className="truncate flex-1 min-w-0 max-w-full">{file}</span>
                    </span>
                    <span>
                      {fileSizes[file] !== undefined
                        ? formatBytes(fileSizes[file])
                        : ""}
                    </span>
                    <button
                      className="justify-self-end px-2 py-1"
                      title="Download"
                      onClick={() => handleDownload(file)}
                    >
                      <Download className="w-5 h-5 text-gray-600 hover:text-blue-600" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes) return "";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i];
}
