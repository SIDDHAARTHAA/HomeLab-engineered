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
  List,
  LayoutGrid,
  FileText,
  Trash2,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const API = import.meta.env.VITE_API;

// Helper to get icon based on file type
function getFileIcon(name) {
  if (!name) return <File className="w-8 h-8 text-gray-400 flex-shrink-0" />;
  const ext = name.split(".").pop().toLowerCase();
  if (name.endsWith("/")) return <Folder className="w-8 h-8 text-yellow-500 flex-shrink-0" />;
  if (["zip","rar"].includes(ext)) return <FileArchive className="w-8 h-8 text-orange-500 flex-shrink-0" />;
  if (["pdf"].includes(ext)) return <FileText className="w-8 h-8 text-red-500 flex-shrink-0" />;
  if (["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"].includes(ext))
    return <FileImage className="w-8 h-8 text-blue-400 flex-shrink-0" />;
  if (["mp4", "mkv", "avi", "mov", "webm"].includes(ext))
    return <FileVideo className="w-8 h-8 text-purple-400 flex-shrink-0" />;
  return <File className="w-8 h-8 text-gray-400 flex-shrink-0" />;
}

// Helper to check if file is image
function isImage(name) {
  const ext = name.split(".").pop().toLowerCase();
  return ["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"].includes(ext);
}

// Helper to check if file is video
function isVideo(name) {
  const ext = name.split(".").pop().toLowerCase();
  return ["mp4", "mkv", "avi", "mov", "webm"].includes(ext);
}

export default function App() {
  const [files, setFiles] = useState([]);
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [storage, setStorage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [view, setView] = useState("grid"); // "grid" or "list"
  const [currentPath, setCurrentPath] = useState([]);
  const fileInputRef = useRef();
  const prevFilesRef = useRef([]);
  const prevStorageRef = useRef(null);

  // Fetch files on mount and after upload
  const fetchFiles = () => {
    fetch(`${API}/list?path=${encodeURIComponent(currentPath.join("/"))}`)
      .then(res => res.json())
      .then(data => setFiles(data))
      .catch(() => setFiles([]));
  };

  // Fetch storage info
  const fetchStorage = () => {
    fetch(`${API}/storage`)
      .then((res) => res.json())
      .then((data) => {
        if (JSON.stringify(prevStorageRef.current) !== JSON.stringify(data)) {
          setStorage(data);
          prevStorageRef.current = data;
        }
      });
  };

  useEffect(() => {
    fetchFiles();
    fetchStorage();
    const interval = setInterval(() => {
      fetchFiles();
      fetchStorage();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleUpload = async (e) => {
    const selected = Array.from(e.target.files);
    if (selected.length === 0) return;

    setUploading(true);
    const toastId = toast.loading("Uploading files... Please do not refresh.");
    window.onbeforeunload = () => "Upload in progress. Are you sure you want to leave?";

    const formData = new FormData();
    for (let file of selected) formData.append("files", file);

    await fetch(`${API}/upload`, {
      method: "POST",
      body: formData,
    });

    setUploading(false);
    window.onbeforeunload = null;
    toast.success("Upload complete!", { id: toastId });

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

  // Delete handler
  const handleDelete = async (filename) => {
    if (!window.confirm(`Delete ${filename}?`)) return;
    const toastId = toast.loading("Deleting...");
    try {
      const res = await fetch(`${API}/delete/${encodeURIComponent(filename)}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("File deleted!", { id: toastId });
        fetchFiles();
        fetchStorage();
      } else {
        const data = await res.json();
        toast.error(data.error || "Delete failed", { id: toastId });
      }
    } catch (err) {
      toast.error("Delete failed", { id: toastId });
    }
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

  // Dummy breadcrumb
  function Breadcrumb() {
    return (
      <nav className="text-gray-500 text-sm font-medium flex gap-1 items-center">
        <span
          className="cursor-pointer hover:underline"
          onClick={() => setCurrentPath([])}
        >Home</span>
        {currentPath.map((seg, idx) => (
          <span key={idx} className="flex items-center gap-1">
            <span>/</span>
            <span
              className="cursor-pointer hover:underline"
              onClick={() => setCurrentPath(currentPath.slice(0, idx + 1))}
            >{seg}</span>
          </span>
        ))}
      </nav>
    );
  }

  // Toggle button
  function ViewToggle() {
    return (
      <div className="flex items-center gap-1 bg-gray-100 rounded-full border border-gray-300 overflow-hidden">
        <button
          className={`px-3 py-1 flex items-center gap-1 text-sm ${
            view === "list" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-200"
          }`}
          onClick={() => setView("list")}
        >
          <List className="w-4 h-4" />
        </button>
        <button
          className={`px-3 py-1 flex items-center gap-1 text-sm ${
            view === "grid" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-200"
          }`}
          onClick={() => setView("grid")}
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Grid view
  function GridView() {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 py-4">
        {sortedFiles.map((file, idx) => (
          <div
            key={idx}
            className="bg-white rounded-lg shadow flex flex-col items-center p-3 relative group"
          >
            {/* Top: Icon or preview */}
            <div className="w-full flex flex-col items-center">
              {isImage(file) ? (
                <img
                  src={`${API}/download/${encodeURIComponent(file)}`}
                  alt={file}
                  className="w-16 h-16 object-cover rounded mb-2 border"
                  loading="lazy"
                />
              ) : isVideo(file) ? (
                <video
                  src={`${API}/download/${encodeURIComponent(file)}`}
                  className="w-16 h-16 object-cover rounded mb-2 border"
                  muted
                  preload="metadata"
                  controls={false}
                />
              ) : (
                <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded mb-2 border">
                  {getFileIcon(file)}
                </div>
              )}
            </div>
            {/* Name */}
            <div
              className="w-full text-xs font-medium text-center truncate"
              title={file}
              style={{ maxWidth: "100%" }}
            >
              {file}
            </div>
            {/* Download button top right */}
            <button
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition"
              title="Download"
              onClick={() => handleDownload(file)}
            >
              <Download className="w-5 h-5 text-gray-600 hover:text-blue-600" />
            </button>
            {/* Delete button top left */}
            <button
              className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition"
              title="Delete"
              onClick={() => handleDelete(file)}
            >
              <Trash2 className="w-5 h-5 text-red-600 hover:text-red-800" />
            </button>
            {/* Size bottom */}
            <div className="w-full text-xs text-gray-500 text-center mt-2">
              {fileSizes[file] !== undefined ? formatBytes(fileSizes[file]) : ""}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // List view (same as before)
  function ListView() {
    return (
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
    );
  }

  function CreateFolderButton() {
    const [open, setOpen] = useState(false);
    const [folderName, setFolderName] = useState("");
    const handleCreate = async () => {
      if (!folderName) return;
      const res = await fetch(`${API}/mkdir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: currentPath.join("/"), name: folderName }),
      });
      if (res.ok) {
        toast.success("Folder created!");
        fetchFiles();
        setOpen(false);
        setFolderName("");
      } else {
        toast.error("Failed to create folder");
      }
    };
    return (
      <>
        <button
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-500"
          onClick={() => setOpen(true)}
        >Create Folder</button>
        {open && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow flex flex-col gap-2">
              <input
                className="border px-2 py-1 rounded"
                placeholder="Folder name"
                value={folderName}
                onChange={e => setFolderName(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setOpen(false)} className="px-3 py-1">Cancel</button>
                <button onClick={handleCreate} className="bg-green-600 text-white px-3 py-1 rounded">Create</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  function RenameButton({ entry }) {
    const [open, setOpen] = useState(false);
    const [newName, setNewName] = useState(entry.name);
    const handleRename = async () => {
      if (!newName || newName === entry.name) return;
      const res = await fetch(`${API}/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: currentPath.join("/"),
          oldName: entry.name,
          newName,
        }),
      });
      if (res.ok) {
        toast.success("Renamed!");
        fetchFiles();
        setOpen(false);
      } else {
        toast.error("Rename failed");
      }
    };
    return (
      <>
        <button onClick={() => setOpen(true)} className="ml-2 text-xs text-blue-600 underline">Rename</button>
        {open && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow flex flex-col gap-2">
              <input
                className="border px-2 py-1 rounded"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setOpen(false)} className="px-3 py-1">Cancel</button>
                <button onClick={handleRename} className="bg-blue-600 text-white px-3 py-1 rounded">Rename</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center px-2 py-4">
      <Toaster />
      <div className="w-full max-w-screen-lg">
        <div className="flex flex-col md:flex-row items-center gap-4 mb-6 w-full sticky top-0 z-20 bg-gray-100 pt-4 pb-2">
          <button
            onClick={() => fileInputRef.current.click()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500"
            style={{ height: "2.5rem" }}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload Files"}
          </button>
          <CreateFolderButton />
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
        {/* Breadcrumb and toggle */}
        <div className="flex items-center justify-between mb-2">
          <Breadcrumb />
          <ViewToggle />
        </div>
        <div className="bg-white p-2 md:p-4 rounded shadow mt-2">
          {files.length === 0 ? (
            <p className="text-sm text-gray-400 text-center">no files</p>
          ) : view === "grid" ? (
            <GridView />
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
              <ListView />
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
