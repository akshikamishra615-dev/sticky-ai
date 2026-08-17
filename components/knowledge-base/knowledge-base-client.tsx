"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Trash2, RefreshCw, UploadCloud, CheckCircle2, AlertCircle, FileSpreadsheet, FileImage, Presentation, FileType } from "lucide-react";
import { deleteDocument } from "@/lib/server/rag";
import { useRouter } from "next/navigation";

export type UploadItem = {
  clientId: string;
  file: File;
  progress: number;
  status: "QUEUED" | "UPLOADING" | "UPLOADED" | "FAILED";
  errorCode?: string;
  errorMessage?: string;
};

type DocumentType = { 
  id: string; 
  name: string; 
  size: number; 
  status: string;
  sourceType?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  createdAt: Date; 
  updatedAt: Date; 
};

const getFileIcon = (sourceType: string | undefined | null, fileName: string = "") => {
  const t = sourceType?.toLowerCase() || fileName.split('.').pop()?.toLowerCase() || "";
  if (t === "pdf") return <FileText className="h-5 w-5" />;
  if (t === "word" || t === "doc" || t === "docx") return <FileText className="h-5 w-5 text-blue-500" />;
  if (t === "excel" || t === "csv" || t === "xls" || t === "xlsx") return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
  if (t === "powerpoint" || t === "ppt" || t === "pptx") return <Presentation className="h-5 w-5 text-orange-500" />;
  if (t === "image" || t === "jpg" || t === "jpeg" || t === "png" || t === "webp") return <FileImage className="h-5 w-5 text-purple-500" />;
  if (t === "text" || t === "txt") return <FileType className="h-5 w-5 text-gray-500" />;
  return <FileText className="h-5 w-5 text-gray-400" />;
};

const RETRYABLE_ERRORS = [
  "NETWORK_ERROR",
  "SERVER_ERROR",
  "TIMEOUT",
  "EMBEDDING_FAILURE",
  "VECTOR_INDEXING_FAILURE",
  "TEMPORARY_PROCESSING_FAILURE",
  "UNKNOWN_PROCESSING_ERROR"
];

export function KnowledgeBaseClient({ initialDocuments }: { initialDocuments: DocumentType[] }) {
  const [documents, setDocuments] = React.useState<DocumentType[]>(initialDocuments);
  const [uploadQueue, setUploadQueue] = React.useState<UploadItem[]>([]);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDocuments(initialDocuments);
  }, [initialDocuments]);

  // Polling for server-side processing documents
  React.useEffect(() => {
    const hasPending = documents.some(d => 
      d.status === "PROCESSING_PDF" || 
      d.status === "GENERATING_EMBEDDINGS" || 
      d.status === "PROCESSING_DOCUMENT" ||
      d.status === "OCR_SCANNING" ||
      d.status === "INDEXING" ||
      d.status === "PROCESSING" ||
      d.status === "UPLOADING"
    );
    if (hasPending) {
      const interval = setInterval(() => {
        router.refresh();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [documents, router]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const startUpload = React.useCallback((item: UploadItem) => {
    console.log("[KB Upload] starting XHR for:", item.file.name);
    setUploadQueue(prev => prev.map(q => q.clientId === item.clientId ? { ...q, status: "UPLOADING", progress: 0 } : q));

    const formData = new FormData();
    formData.append("file", item.file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload-document", true);
    console.log("[KB Upload] endpoint: /api/upload-document");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentage = Math.round((event.loaded / event.total) * 100);
        setUploadQueue(prev => prev.map(q => q.clientId === item.clientId ? { ...q, progress: percentage } : q));
      }
    };

    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status === 200 && res.success) {
          // Insert into documents list, which starts polling automatically
          setDocuments(prev => [res, ...prev]);
          // Remove from upload queue since the server now tracks it
          setUploadQueue(prev => prev.filter(q => q.clientId !== item.clientId));
          showToast(`Upload complete: ${item.file.name}`);
        } else {
          const code = res.error?.code || "SERVER_ERROR";
          const message = res.error?.message || "The server could not process the upload. Please try again.";
          setUploadQueue(prev => prev.map(q => q.clientId === item.clientId ? { ...q, status: "FAILED", errorCode: code, errorMessage: message } : q));
        }
      } catch {
        setUploadQueue(prev => prev.map(q => q.clientId === item.clientId ? { ...q, status: "FAILED", errorCode: "SERVER_ERROR", errorMessage: "The server could not process the upload. Please try again." } : q));
      }
    };

    xhr.onerror = () => {
      setUploadQueue(prev => prev.map(q => q.clientId === item.clientId ? { ...q, status: "FAILED", errorCode: "NETWORK_ERROR", errorMessage: "Upload failed because of a network connection problem." } : q));
    };
    
    xhr.onabort = () => {
      setUploadQueue(prev => prev.map(q => q.clientId === item.clientId ? { ...q, status: "FAILED", errorCode: "NETWORK_ERROR", errorMessage: "Upload was interrupted before the file finished uploading." } : q));
    };

    xhr.send(formData);
  }, []);

  // Upload Queue Manager (Max 2 concurrent uploads)
  React.useEffect(() => {
    const activeUploads = uploadQueue.filter(item => item.status === "UPLOADING").length;
    const queuedUploads = uploadQueue.filter(item => item.status === "QUEUED");

    if (activeUploads < 2 && queuedUploads.length > 0) {
      const toStart = queuedUploads.slice(0, 2 - activeUploads);
      toStart.forEach(item => {
        startUpload(item);
      });
    }
  }, [uploadQueue, startUpload]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (files.length > 5) {
      showToast("You can upload a maximum of 5 PDFs at a time.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const newItems: UploadItem[] = [];

    files.forEach(file => {
      const clientId = Math.random().toString(36).substring(7);
      
      const ext = file.name.split('.').pop()?.toLowerCase() || "";
      const isSupported = [
        "pdf", "doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx", "txt", "jpg", "jpeg", "png", "webp"
      ].includes(ext);

      console.log("[KB Upload] selected file:", {
        name: file.name,
        size: file.size,
        type: file.type,
        extension: ext,
        validationResult: isSupported
      });

      if (!isSupported) {
        newItems.push({ clientId, file, progress: 0, status: "FAILED", errorCode: "INVALID_FILE_TYPE", errorMessage: "Unsupported file type. Please upload PDF, Word, PowerPoint, Excel, CSV, TXT, JPG, PNG, or WEBP." });
        return;
      }
      if (file.size === 0) {
        newItems.push({ clientId, file, progress: 0, status: "FAILED", errorCode: "EMPTY_FILE", errorMessage: "This file appears to be empty." });
        return;
      }
      
      let limit = 10 * 1024 * 1024; // Default 10MB
      if (ext === "pptx" || ext === "ppt") limit = 20 * 1024 * 1024;
      else if (ext === "txt" || ext === "csv") limit = 5 * 1024 * 1024;
      
      if (file.size > limit) {
        newItems.push({ clientId, file, progress: 0, status: "FAILED", errorCode: "FILE_TOO_LARGE", errorMessage: `File is too large. Maximum allowed size for this file type is ${limit / (1024 * 1024)} MB.` });
        return;
      }
      
      const isDuplicateQueue = uploadQueue.some(q => q.file.name === file.name && q.file.size === file.size);
      const isDuplicateServer = documents.some(d => d.name === file.name && d.size === file.size);
      if (isDuplicateQueue || isDuplicateServer) {
        newItems.push({ clientId, file, progress: 0, status: "FAILED", errorCode: "DUPLICATE_FILE", errorMessage: "This file has already been selected." });
        return;
      }

      newItems.push({
        clientId,
        file,
        progress: 0,
        status: "QUEUED"
      });
    });

    if (newItems.length > 0) {
      setUploadQueue(prev => [...newItems, ...prev]);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument(id);
      setDocuments(docs => docs.filter(d => d.id !== id));
      showToast("Document removed.");
    } catch (e) {
      console.error(e);
      showToast("Failed to remove document.");
    }
  };

  const handleRemoveQueueItem = (clientId: string) => {
    setUploadQueue(prev => prev.filter(q => q.clientId !== clientId));
  };

  const handleRetryUpload = (clientId: string) => {
    setUploadQueue(prev => prev.map(q => q.clientId === clientId ? { ...q, status: "QUEUED", progress: 0, errorCode: undefined, errorMessage: undefined } : q));
  };

  const handleRetryProcessing = async (documentId: string) => {
    // Immediately set UI to processing for instant feedback
    setDocuments(prev => prev.map(d => d.id === documentId ? { ...d, status: "PROCESSING_PDF", errorCode: null, errorMessage: null } : d));
    try {
      const res = await fetch("/api/retry-processing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId })
      });
      if (!res.ok) {
        const err = await res.json();
        setDocuments(prev => prev.map(d => d.id === documentId ? { ...d, status: "FAILED", errorCode: err.error?.code || "SERVER_ERROR", errorMessage: err.error?.message || "Retry failed" } : d));
      } else {
        showToast("Processing restarted.");
        router.refresh();
      }
    } catch (e) {
      console.error(e);
      setDocuments(prev => prev.map(d => d.id === documentId ? { ...d, status: "FAILED", errorCode: "NETWORK_ERROR", errorMessage: "Failed to reach server to retry processing." } : d));
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "PROCESSING_DOCUMENT": return { text: "Processing Document...", icon: <RefreshCw className="h-4 w-4 text-[var(--ai-accent)] animate-spin" /> };
      case "PROCESSING_PDF": return { text: "Processing PDF...", icon: <RefreshCw className="h-4 w-4 text-[var(--ai-accent)] animate-spin" /> };
      case "OCR_SCANNING": return { text: "OCR scanning...", icon: <RefreshCw className="h-4 w-4 text-[var(--ai-accent)] animate-spin" /> };
      case "GENERATING_EMBEDDINGS": return { text: "Generating embeddings...", icon: <RefreshCw className="h-4 w-4 text-[var(--ai-accent)] animate-spin" /> };
      case "INDEXING": return { text: "Indexing...", icon: <RefreshCw className="h-4 w-4 text-[var(--ai-accent)] animate-spin" /> };
      case "READY": return { text: "Ready ✓", icon: <CheckCircle2 className="h-4 w-4 text-[var(--success)]" /> };
      case "FAILED": return { text: "Processing failed", icon: <AlertCircle className="h-4 w-4 text-[var(--error)]" /> };
      default: return { text: status, icon: <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" /> };
    }
  };

  const serverProcessingDocs = documents.filter(d => d.status !== "READY");
  const readyDocs = documents.filter(d => d.status === "READY");
  const hasActiveUploads = uploadQueue.length > 0 || serverProcessingDocs.length > 0;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl p-6 sm:p-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--primary-text)]">Knowledge Base</h1>
            <p className="mt-1 text-sm text-[var(--secondary-text)]">
              Upload your study material and ask Sticky AI questions about it.
            </p>
          </div>
          <Button 
            className="gap-2 bg-[var(--ai-accent)] text-[var(--ai-accent-fg)] hover:bg-[var(--ai-accent)]/90"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="h-4 w-4" />
            Upload Document
          </Button>
            <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            className="hidden" 
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,image/jpeg,image/png,image/webp"
            multiple
          />
        </header>

        {hasActiveUploads && (
          <div className="mb-10">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-text)] mb-4">
              Uploading & Processing
            </h2>
            <div className="flex flex-col gap-3">
              {/* Client Queue Items */}
              {uploadQueue.map(item => {
                const isRetryable = item.errorCode ? RETRYABLE_ERRORS.includes(item.errorCode) : false;
                
                return (
                  <div key={item.clientId} className={`flex flex-col rounded-xl border p-4 ${item.status === 'FAILED' ? 'border-[var(--error)]/50 bg-[var(--error)]/5' : 'border-[var(--border)] bg-[var(--surface)]'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getFileIcon("UPLOAD", item.file.name)}
                        <span className="font-medium text-[var(--primary-text)] truncate max-w-[200px] sm:max-w-md">{item.file.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.status === 'FAILED' ? (
                          <div className="flex items-center gap-2">
                            {isRetryable && (
                              <Button variant="outline" size="sm" onClick={() => handleRetryUpload(item.clientId)} className="h-8 text-xs text-[var(--error)] hover:bg-[var(--error)]/10 hover:text-[var(--error)]">
                                <RefreshCw className="h-3 w-3 mr-1" /> Retry Upload
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveQueueItem(item.clientId)} className="h-8 text-xs text-[var(--muted-text)] hover:text-[var(--error)]">
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">
                            {item.status === 'QUEUED' ? 'Queued' : 'Uploading...'}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {item.status !== 'FAILED' && (
                      <div className="w-full">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-medium text-[var(--muted-text)]">{(item.file.size / 1024).toFixed(1)} KB</span>
                          <span className="text-[10px] font-medium text-[var(--ai-accent)]">{item.progress}%</span>
                        </div>
                        <div className="w-full bg-[var(--border)] rounded-full h-1 overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ease-out ${item.status === 'QUEUED' ? 'bg-[var(--border)]' : 'bg-[var(--ai-accent)]'}`}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {item.status === 'FAILED' && (
                      <div className="mt-2 text-sm">
                        <span className="text-[var(--error)] font-medium">✕ Upload failed</span>
                        <div className="mt-1 flex flex-col">
                          <span className="text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider">Reason:</span>
                          <span className="text-sm text-[var(--secondary-text)]">{item.errorMessage || "An unknown error occurred."}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Server Processing Items */}
              {serverProcessingDocs.map(doc => {
                const display = getStatusDisplay(doc.status);
                const isRetryable = doc.errorCode ? RETRYABLE_ERRORS.includes(doc.errorCode) : false;
                
                return (
                  <div key={doc.id} className={`flex flex-col rounded-xl border p-4 ${doc.status === 'FAILED' ? 'border-[var(--error)]/50 bg-[var(--error)]/5' : 'border-[var(--ai-accent)] bg-[var(--ai-accent)]/5'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getFileIcon(doc.sourceType, doc.name)}
                        <span className="font-medium text-[var(--primary-text)] truncate max-w-[200px] sm:max-w-md">{doc.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.status === 'FAILED' && isRetryable && (
                          <Button variant="outline" size="sm" onClick={() => handleRetryProcessing(doc.id)} className="h-8 text-xs text-[var(--error)] hover:bg-[var(--error)]/10 hover:text-[var(--error)]">
                            <RefreshCw className="h-3 w-3 mr-1" /> Retry Processing
                          </Button>
                        )}
                        <button 
                          onClick={() => handleDelete(doc.id)}
                          className="p-1.5 text-[var(--muted-text)] hover:text-[var(--error)] transition-all rounded-md hover:bg-[var(--error)]/10"
                          title="Delete document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    {doc.status !== 'FAILED' ? (
                      <div className="w-full">
                        <div className="flex items-center gap-2 mb-1.5">
                          {display.icon}
                          <span className="text-[10px] font-medium text-[var(--ai-accent)] uppercase tracking-wider">{display.text}</span>
                        </div>
                        <div className="w-full bg-[var(--border)] rounded-full h-1 overflow-hidden">
                          <div className="bg-[var(--ai-accent)] h-full w-full animate-pulse" />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1 text-sm">
                        <span className="text-[var(--error)] font-medium">✕ Processing failed</span>
                        <div className="mt-1 flex flex-col">
                          <span className="text-xs font-medium text-[var(--muted-text)] uppercase tracking-wider">Reason:</span>
                          <span className="text-sm text-[var(--secondary-text)]">{doc.errorMessage || "An unknown error occurred."}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {documents.length === 0 && uploadQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center">
            <UploadCloud className="mb-4 h-10 w-10 text-[var(--muted-text)]" />
            <h3 className="text-lg font-semibold text-[var(--primary-text)]">No documents yet</h3>
            <p className="mt-2 text-sm text-[var(--secondary-text)] max-w-md">
              Upload your documents to create a personal knowledge base. PDF, Word, PowerPoint, Excel, CSV, TXT and images supported.
            </p>
            <Button 
              className="mt-6"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              Select Documents
            </Button>
          </div>
        ) : (
          readyDocs.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-text)] mb-4">
                Knowledge Base
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {readyDocs.map((doc) => {
                  const display = getStatusDisplay(doc.status);
                  return (
                    <div key={doc.id} className="group relative flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--ai-accent)]/50 transition-colors">
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-hover)]">
                              {getFileIcon(doc.sourceType, doc.name)}
                            </div>
                            <div className="flex-1 min-w-0 pr-2">
                              <h3 className="font-semibold text-[var(--primary-text)] truncate">{doc.name}</h3>
                              <p className="text-xs text-[var(--muted-text)]">{(doc.size / 1024).toFixed(1)} KB</p>
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => handleDelete(doc.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-[var(--muted-text)] hover:text-[var(--error)] transition-all rounded-md hover:bg-[var(--error)]/10"
                            title="Delete document"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-6 flex items-center justify-between border-t border-[var(--border)] pt-4">
                        <div className="flex items-center gap-2">
                          {display.icon}
                          <span className="text-xs font-medium uppercase tracking-wider text-[var(--secondary-text)]">
                            {display.text}
                          </span>
                        </div>
                        
                        <Button variant="ghost" className="h-8 text-xs hover:bg-[var(--ai-accent)]/10 hover:text-[var(--ai-accent)]" onClick={() => router.push('/ai')}>
                          Ask AI
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="bg-[var(--surface)] border border-[var(--border)] text-[var(--primary-text)] px-4 py-3 rounded-lg shadow-lg font-medium text-sm">
              {toastMessage}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
