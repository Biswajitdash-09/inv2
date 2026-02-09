"use client";

import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/Icon";
import { ingestInvoice } from "@/lib/api";

const DropZone = ({ onUploadComplete, uploadMetadata = {}, theme = "light" }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const progressCancelRef = useRef(false);

  // ... (keep existing logic) ...
  const onDrop = useCallback(async (acceptedFiles) => {
    // ... (logic is same)
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadSuccess(false);

    const total = acceptedFiles.length;

    const runSmoothProgress = (fromPercent, toPercent, durationMs = 1000) => {
      progressCancelRef.current = false;
      const start = Date.now();
      const tick = () => {
        if (progressCancelRef.current) return;
        const elapsed = Date.now() - start;
        const t = Math.min(elapsed / durationMs, 1);
        const eased = t * (2 - t);
        const value = fromPercent + (toPercent - fromPercent) * eased;
        setUploadProgress((p) => Math.max(p, Math.round(value)));
        if (t < 1) setTimeout(tick, 60);
      };
      tick();
    };

    try {
      for (let i = 0; i < total; i++) {
        const file = acceptedFiles[i];
        const segmentStart = 5 + (i / total) * 85;
        const segmentEnd = 5 + ((i + 1) / total) * 85;
        setUploadProgress(Math.round(segmentStart));

        const uploadPromise = ingestInvoice(file, uploadMetadata);
        runSmoothProgress(segmentStart, segmentEnd - 1, 1500);
        await uploadPromise;

        progressCancelRef.current = true;
        setUploadProgress(Math.round(segmentEnd));
      }

      progressCancelRef.current = true;
      runSmoothProgress(90, 100, 500);
      await new Promise((r) => setTimeout(r, 500));
      setUploadProgress(100);
      setUploadSuccess(true);

      if (onUploadComplete) onUploadComplete();

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadSuccess(false);
      }, 1500);
    } catch (error) {
      progressCancelRef.current = true;
      console.error("Upload failed:", error);
      alert(`Upload failed: ${error.message}`);
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 5,
    noClick: false // Allow click on container
  });

  const isDark = theme === "dark";

  return (
    <div className="w-full h-full min-h-[200px] sm:min-h-[300px]">
      <div
        {...getRootProps()}
        className={`
          relative w-full h-full rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-6 sm:p-8
          ${isDragActive
            ? "border-primary bg-primary/5 shadow-inner scale-[0.99]"
            : isDark
              ? "border-white/20 hover:border-white/40 hover:bg-white/10 bg-white/5"
              : "border-gray-300 hover:border-primary/50 hover:bg-white/40 bg-white/20"
          }
          ${isDragReject ? "border-error bg-error/5" : ""}
          backdrop-blur-sm cursor-pointer overflow-hidden group
        `}
      >
        <input {...getInputProps()} />

        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center w-full z-10"
            >
              {uploadSuccess ? (
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mb-4 mx-auto"
                  >
                    <Icon name="Check" size={40} className="text-success" />
                  </motion.div>
                  <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-700'}`}>Uploaded!</h3>
                  <p className={isDark ? 'text-indigo-200' : 'text-gray-500'}>Processing your invoices...</p>
                </div>
              ) : (
                <div className="w-full max-w-xs text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 mx-auto animate-pulse">
                    <Icon name="UploadCloud" size={32} className="text-primary" />
                  </div>
                  <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>Uploading Files...</h3>
                  <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, uploadProgress)}%` }}
                      transition={{ type: "tween", duration: 0.35 }}
                    />
                  </div>
                  <p className={`text-xs mt-2 ${isDark ? 'text-indigo-200' : 'text-gray-500'}`}>{Math.min(100, Math.round(uploadProgress))}%</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center z-10"
            >
              <div className={`
                w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center transition-colors duration-300
                ${isDragActive
                  ? "bg-primary text-white shadow-xl shadow-primary/30"
                  : isDark
                    ? "bg-white/10 text-white shadow-lg"
                    : "bg-white/60 text-primary shadow-lg"
                }
              `}>
                <Icon name="Upload" size={36} className={isDragActive ? "animate-bounce" : ""} />
              </div>

              <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                {isDragActive ? "Drop files here" : "Upload Invoices"}
              </h3>
              <p className={`mb-6 max-w-xs mx-auto ${isDark ? 'text-indigo-100' : 'text-gray-500'}`}>
                Drag & drop your invoices here, or click to browse files.
                <br />
                <span className="text-xs opacity-70">(PDF, Word, Excel, JPG, PNG supported)</span>
              </p>

              <button type="button" className={`btn rounded-full px-8 border-2 font-bold hover:scale-105 transition-transform ${isDark ? 'btn-white text-indigo-600 hover:bg-white/90 border-transparent' : 'btn-outline btn-primary'}`}>
                Browse Files
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Decorative elements inside dropzone */}
        {!isUploading && (
          <>
            <div className={`absolute top-10 left-10 rotate-12 pointer-events-none group-hover:scale-110 transition-transform ${isDark ? 'text-white/10' : 'text-gray-300'}`}>
              <Icon name="FileText" size={48} />
            </div>
            <div className={`absolute bottom-10 right-10 -rotate-12 pointer-events-none group-hover:scale-110 transition-transform ${isDark ? 'text-white/10' : 'text-gray-300'}`}>
              <Icon name="Image" size={48} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

DropZone.displayName = "DropZone";

export default DropZone;