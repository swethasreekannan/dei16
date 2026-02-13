"use client";

import { useState, useCallback } from "react";
import { uploadBrandAsset } from "@/lib/api";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface FileUploaderProps {
  clientId: string;
  onUploadComplete?: () => void;
}

interface UploadingFile {
  file: File;
  status: "uploading" | "success" | "error";
  error?: string;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
];

export function FileUploader({ clientId, onUploadComplete }: FileUploaderProps) {
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const newUploading: UploadingFile[] = fileArray.map((file) => ({
        file,
        status: "uploading" as const,
      }));

      setUploading((prev) => [...prev, ...newUploading]);

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        try {
          await uploadBrandAsset(clientId, file);
          setUploading((prev) =>
            prev.map((u) =>
              u.file === file ? { ...u, status: "success" as const } : u
            )
          );
        } catch (err: any) {
          setUploading((prev) =>
            prev.map((u) =>
              u.file === file
                ? {
                    ...u,
                    status: "error" as const,
                    error: err.message || "Upload failed",
                  }
                : u
            )
          );
        }
      }

      onUploadComplete?.();
    },
    [clientId, onUploadComplete]
  );

  return (
    <div>
      {/* Drop zone */}
      <label
        className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
          dragOver
            ? "border-accent bg-accent/5"
            : "border-border hover:border-accent/50 hover:bg-muted/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <Upload className="h-6 w-6 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-accent">Click to upload</span> or
          drag and drop
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF, Images, PPTX, XLSX, DOCX, CSV
        </p>
        <input
          type="file"
          className="hidden"
          multiple
          accept={ACCEPTED_TYPES.join(",")}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </label>

      {/* Upload status */}
      {uploading.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploading.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 py-2 px-3 bg-muted rounded-lg text-sm"
            >
              {item.status === "uploading" && (
                <Loader2 className="h-4 w-4 text-accent animate-spin" />
              )}
              {item.status === "success" && (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              {item.status === "error" && (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 truncate">{item.file.name}</span>
              {item.error && (
                <span className="text-xs text-destructive">{item.error}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
