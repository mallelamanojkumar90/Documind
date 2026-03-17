"use client";

import React, { useState, useCallback } from "react";
import { Upload, FileText, X } from "lucide-react";
import { useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface PDFUploaderProps {
  onUploadComplete?: (documentId: Id<"documents">) => void;
}

export function PDFUploader({ onUploadComplete }: PDFUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<"pending" | "processing" | "ready" | "error">("pending");

  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const saveDocument = useMutation(api.documents.saveDocument);
  const ingestDocument = useAction(api.ingest.ingestDocument);

  const handleUpload = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file");
      return;
    }

    setIsUploading(true);
    setUploadProgress("pending");

    try {
      // Step 1: Generate upload URL
      const uploadUrl = await generateUploadUrl();

      // Step 2: Upload file to Convex storage
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();
      const storageId = result.storageId;

      // Step 3: Save document metadata
      const documentId = await saveDocument({
        name: file.name,
        storageId,
        size: file.size,
      });

      setUploadProgress("processing");

      // Step 4: Trigger ingestion (parse, chunk, embed)
      await ingestDocument({
        documentId: documentId as unknown as string,
        storageId,
      });

      setUploadProgress("ready");

      // Notify parent of successful upload
      onUploadComplete?.(documentId);

      setIsUploading(false);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadProgress("error");
      setIsUploading(false);
    }
  }, [generateUploadUrl, saveDocument, ingestDocument, onUploadComplete]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleUpload(files[0]);
    }
  }, [handleUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(files[0]);
    }
  }, [handleUpload]);

  return (
    <div className="w-full">
      {/* Drag and Drop Zone */}
      <div
        className={`
          drag-zone
          ${isDragging ? "drag-over" : ""}
          ${isUploading ? "opacity-50 pointer-events-none" : ""}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
          id="pdf-upload"
          disabled={!!isUploading}
        />
        <label htmlFor="pdf-upload" className="cursor-pointer">
          <div className="flex flex-col items-center gap-3">
            <Upload size={40} className="text-[var(--brand-primary)]" />
            <div>
              <p className="font-medium text-[var(--brand-ink)]">
                {isUploading ? "Uploading..." : "Drop PDF here or click to upload"}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Supports PDF files up to 10MB
              </p>
            </div>
          </div>
        </label>
      </div>

      {/* Upload Progress / Status */}
      {isUploading || uploadProgress !== "pending" ? (
        <div className="mt-4 p-3 card-base flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-[var(--brand-primary)]" />
            <span className="text-sm">
              {uploadProgress === "pending" && "Upload started..."}
              {uploadProgress === "processing" && "Processing PDF..."}
              {uploadProgress === "ready" && "Ready to chat!"}
              {uploadProgress === "error" && "Upload failed"}
            </span>
          </div>
          {uploadProgress === "error" && (
            <button
              className="btn-ghost-danger p-1"
              onClick={() => {
                setUploadProgress("pending");
                setIsUploading(false);
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
