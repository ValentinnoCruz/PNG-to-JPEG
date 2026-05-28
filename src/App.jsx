import React, { useState, useRef, useCallback } from 'react';
import { 
  UploadCloud, 
  Image as ImageIcon, 
  Download, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Settings,
  Info
} from 'lucide-react';

// --- Binary Metadata Utilities ---
const extractPngMetadata = async (file) => {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  let offset = 8; // Skip PNG signature
  let metadata = { exifData: null, dpiX: null, dpiY: null };

  try {
    while (offset + 8 <= view.byteLength) {
      const length = view.getUint32(offset);
      // Corrupted chunk length safeguard
      if (offset + 12 + length > view.byteLength) break; 

      const type = String.fromCharCode(
        view.getUint8(offset + 4),
        view.getUint8(offset + 5),
        view.getUint8(offset + 6),
        view.getUint8(offset + 7)
      );

      if (type === 'eXIf') {
        // Extract raw EXIF binary data
        metadata.exifData = new Uint8Array(buffer, offset + 8, length);
      } else if (type === 'pHYs') {
        // Extract physical pixel dimensions (DPI/Resolution)
        const ppuX = view.getUint32(offset + 8);
        const ppuY = view.getUint32(offset + 12);
        const unit = view.getUint8(offset + 16);
        if (unit === 1) { // 1 = pixels per meter
          metadata.dpiX = Math.round(ppuX * 0.0254);
          metadata.dpiY = Math.round(ppuY * 0.0254);
        }
      } else if (type === 'IEND') {
        break; // End of PNG
      }
      offset += 12 + length; // move to next chunk
    }
  } catch (e) {
    console.warn("Could not parse all PNG chunks for metadata.", e);
  }
  return metadata;
};

const processJpegMetadata = async (jpegBlob, metadata) => {
  const buffer = await jpegBlob.arrayBuffer();
  const view = new DataView(buffer);
  const uint8View = new Uint8Array(buffer);
  
  // 1. Update DPI in JFIF APP0 segment if canvas generated it
  if (metadata.dpiX && metadata.dpiY) {
    let offset = 2;
    while (offset < view.byteLength) {
      if (view.getUint8(offset) === 0xFF && view.getUint8(offset + 1) === 0xE0) {
        if (view.getUint32(offset + 4) === 0x4A464946) { // 'JFIF' identifier
          view.setUint8(offset + 11, 1); // 1 = dots per inch
          view.setUint16(offset + 12, metadata.dpiX);
          view.setUint16(offset + 14, metadata.dpiY);
          break;
        }
      }
      const segmentLength = view.getUint16(offset + 2);
      if (segmentLength < 2) break; // safeguard
      offset += 2 + segmentLength;
      if (offset >= view.byteLength || view.getUint8(offset) !== 0xFF) break;
    }
  }

  // 2. Insert EXIF APP1 segment if present in the original PNG
  if (metadata.exifData) {
    const app1Length = 2 + 6 + metadata.exifData.length;
    const app1Segment = new Uint8Array(2 + app1Length);
    app1Segment[0] = 0xFF; // Marker start
    app1Segment[1] = 0xE1; // APP1 Marker
    app1Segment[2] = (app1Length >> 8) & 0xFF;
    app1Segment[3] = app1Length & 0xFF;
    app1Segment[4] = 0x45; // E
    app1Segment[5] = 0x78; // x
    app1Segment[6] = 0x69; // i
    app1Segment[7] = 0x66; // f
    app1Segment[8] = 0x00;
    app1Segment[9] = 0x00;
    app1Segment.set(metadata.exifData, 10);

    // Find insertion point (after FF D8 and potential APP0 segment)
    let insertPos = 2;
    if (uint8View[2] === 0xFF && uint8View[3] === 0xE0) {
        const app0Length = view.getUint16(4);
        insertPos = 4 + app0Length;
    }

    const newJpeg = new Uint8Array(uint8View.length + app1Segment.length);
    newJpeg.set(uint8View.subarray(0, insertPos), 0);
    newJpeg.set(app1Segment, insertPos);
    newJpeg.set(uint8View.subarray(insertPos), insertPos + app1Segment.length);
    
    return new Blob([newJpeg], { type: 'image/jpeg' });
  }

  return new Blob([uint8View], { type: 'image/jpeg' });
};
// ------------------------------

export default function App() {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFiles = async (newFiles) => {
    const pngFiles = Array.from(newFiles).filter(
      file => file.type === 'image/png'
    );

    if (pngFiles.length === 0) return;

    const initialFileStates = pngFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      originalFile: file,
      name: file.name,
      status: 'converting',
      jpegUrl: null,
      error: null
    }));

    setFiles(prev => [...initialFileStates, ...prev]);

    // Process each file
    for (const fileState of initialFileStates) {
      try {
        const jpegBlob = await convertToJpeg(fileState.originalFile);
        const jpegUrl = URL.createObjectURL(jpegBlob);
        
        setFiles(prev => prev.map(f => {
          if (f.id === fileState.id) {
            return { ...f, status: 'done', jpegUrl, convertedSize: jpegBlob.size };
          }
          return f;
        }));
      } catch (err) {
        setFiles(prev => prev.map(f => {
          if (f.id === fileState.id) {
            return { ...f, status: 'error', error: err.message };
          }
          return f;
        }));
      }
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, []);

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // Reset input so same files can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const convertToJpeg = async (file) => {
    // 1. Extract metadata directly from the PNG binary
    const metadata = await extractPngMetadata(file);

    // 2. Convert pixel data to JPEG via Canvas (Maintains 100% dimension resolution)
    const jpegBlob = await new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        // Draw white background to handle PNG transparency
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (blob) resolve(blob);
            else reject(new Error('Conversion failed.'));
          },
          'image/jpeg',
          1.0
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to read image data.'));
      };

      img.src = url;
    });

    // 3. Inject the extracted metadata back into the new JPEG binary
    return await processJpegMetadata(jpegBlob, metadata);
  };

  const removeFile = (id) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file && file.jpegUrl) {
        URL.revokeObjectURL(file.jpegUrl);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const downloadFile = (file) => {
    if (!file.jpegUrl) return;
    const a = document.createElement('a');
    a.href = file.jpegUrl;
    // Replace .png extension with .jpeg
    a.download = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans p-6 md:p-12 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-slate-800 text-blue-400 rounded-2xl mb-2 shadow-sm border border-slate-700">
            <ImageIcon size={32} strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">High-Fidelity Converter</h1>
          <p className="text-slate-400 max-w-xl mx-auto text-lg">
            Convert PNG files to JPEG format effortlessly. Retains 100% original resolution and outputs at maximum visual quality.
          </p>
        </header>

        {/* Info Banner */}
        <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-xl flex items-start gap-3 text-slate-300 text-sm shadow-sm">
          <Info className="shrink-0 mt-0.5 text-blue-400" size={18} />
          <p>
            <strong className="text-white">Metadata Preservation Active:</strong> While web browsers normally strip EXIF data and print resolution during conversion, this app uses custom binary parsing to extract exact metadata and print dimensions (DPI) from your PNGs and safely injects them into the resulting JPEGs.
          </p>
        </div>

        {/* Dropzone */}
        <div
          className={`relative overflow-hidden border-2 border-dashed rounded-3xl transition-all duration-300 ease-out flex flex-col items-center justify-center py-16 px-6 text-center cursor-pointer group
            ${isDragging 
              ? 'border-blue-500 bg-slate-800 scale-[1.02]' 
              : 'border-slate-600 bg-slate-800/30 hover:border-blue-500 hover:bg-slate-800/80'
            }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            accept=".png,image/png"
            multiple
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileInput}
          />
          <div className={`p-4 rounded-full mb-4 transition-colors ${isDragging ? 'bg-slate-700 text-blue-400' : 'bg-slate-900/50 text-slate-400 group-hover:bg-slate-900 group-hover:text-blue-400'}`}>
            <UploadCloud size={40} strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-white">Drag & Drop PNG files here</h3>
          <p className="text-slate-400">or click to browse from your device</p>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="bg-slate-800 rounded-3xl shadow-lg border border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
              <h2 className="font-semibold text-slate-300 flex items-center gap-2">
                <Settings size={18} className="text-slate-500" />
                Conversion Queue ({files.length})
              </h2>
            </div>
            
            <ul className="divide-y divide-slate-700 max-h-[500px] overflow-y-auto">
              {files.map(file => (
                <li key={file.id} className="p-4 sm:px-6 hover:bg-slate-700/50 transition-colors flex flex-col sm:flex-row sm:items-center gap-4">
                  
                  {/* File Info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 shrink-0 rounded-lg bg-slate-900 flex items-center justify-center overflow-hidden border border-slate-700">
                      {file.jpegUrl ? (
                        <img src={file.jpegUrl} alt="preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={20} className="text-slate-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-200 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-sm">
                        <span className="text-slate-400">
                          {formatSize(file.originalFile.size)}
                        </span>
                        {file.convertedSize && (
                          <>
                            <span className="text-slate-600">→</span>
                            <span className="text-emerald-400 font-medium">
                              {formatSize(file.convertedSize)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-2 sm:mt-0 pl-16 sm:pl-0">
                    {file.status === 'converting' && (
                      <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Converting...
                      </div>
                    )}

                    {file.status === 'error' && (
                      <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
                        <AlertCircle size={18} />
                        Failed
                      </div>
                    )}

                    {file.status === 'done' && (
                      <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium mr-4">
                        <CheckCircle2 size={18} />
                        Ready
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {file.status === 'done' && (
                        <button
                          onClick={() => downloadFile(file)}
                          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-slate-900"
                          title="Download JPEG"
                        >
                          <Download size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => removeFile(file.id)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 focus:ring-offset-slate-900"
                        title="Remove"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}