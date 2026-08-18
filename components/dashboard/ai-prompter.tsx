"use client";

import * as React from "react";
import { Paperclip, Mic, Send, X, Loader2, Square } from "lucide-react";
import { suggestedPrompts } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { checkDocumentStatus } from "@/lib/server/rag";

export function AiPrompter() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [isFocused, setIsFocused] = React.useState(false);
  
  // Attachment State
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = React.useState<{ id?: string; name: string; status: 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED' } | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Voice State
  const [isRecording, setIsRecording] = React.useState(false);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);

  // Polling for attachment status
  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isActive = true;
    
    const poll = async () => {
      if (!isActive) return;
      if (attachment?.id && attachment.status === 'PROCESSING') {
        try {
          const doc = await checkDocumentStatus(attachment.id);
          if (!isActive) return;

          if (!doc) {
            setAttachment(null);
            return;
          }

          if (doc.status === 'READY' || doc.status === 'FAILED') {
            setAttachment(prev => prev ? { ...prev, status: doc.status as 'READY' | 'FAILED' } : null);
            if (doc.status === 'FAILED') setError("Failed to process attachment");
            return;
          }
        } catch (e) {
          console.error(e);
        }
        
        if (isActive) {
          timeoutId = setTimeout(poll, 3000);
        }
      }
    };
    
    if (attachment?.id && attachment.status === 'PROCESSING') {
      poll();
    }
    
    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [attachment?.id, attachment?.status]);

  // Cleanup MediaRecorder on unmount
  React.useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      const tracks = mediaRecorderRef.current?.stream.getTracks() || [];
      tracks.forEach(track => track.stop());
    };
  }, []);

  const handleSend = async () => {
    if (!query.trim() && !attachment) return;
    if (isProcessing || isRecording) return;
    if (attachment && attachment.status !== 'READY') return;
    
    setIsProcessing(true);
    setError(null);
    const finalMessage = query.trim() || (attachment ? `Please analyze the attached document: ${attachment.name}` : "");

    try {
      sessionStorage.setItem("dashboard_ai_query", finalMessage);
      if (attachment?.id && attachment.status === 'READY') {
        sessionStorage.setItem("dashboard_ai_document_id", attachment.id);
      }
      router.push("/ai");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        stream.getTracks().forEach(track => track.stop());

        if (audioBlob.size === 0) {
          setIsProcessing(false);
          return;
        }

        try {
          const formData = new FormData();
          formData.append("file", audioBlob, "recording.webm");

          const res = await fetch("/api/ai/transcribe", {
            method: "POST",
            body: formData
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || "Failed to transcribe audio");
          }

          setQuery((prev) => (prev ? `${prev} ${data.text}` : data.text));
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : "Transcription failed";
          setError(errorMessage);
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      setError("Microphone permission denied or unavailable");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAttachment({ name: file.name, status: 'UPLOADING' });
      setError(null);
      
      try {
        const formData = new FormData();
        formData.append("file", file);
        
        const res = await fetch("/api/upload-document", {
          method: "POST",
          body: formData
        });
        const data = await res.json();
        
        if (!res.ok || !data.success) {
          throw new Error(data.error?.message || "Failed to upload file");
        }
        
        setAttachment({ 
          id: data.id, 
          name: file.name, 
          status: data.status === 'READY' ? 'READY' : 'PROCESSING' 
        });
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Upload failed";
        setError(errorMessage);
        setAttachment(null);
      }
      
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center animate-in fade-in zoom-in duration-500 delay-150 fill-mode-both">
      <div 
        className={cn(
          "w-full bg-[var(--surface)] border-2 rounded-2xl shadow-lg transition-all duration-300 relative",
          isFocused ? "border-[var(--ai-accent)] shadow-[0_0_20px_rgba(var(--ai-accent-rgb),0.15)] ring-4 ring-[var(--ai-accent)]/10" : "border-[var(--border)] hover:border-[var(--ai-accent)]/50",
          error ? "border-[var(--error)] hover:border-[var(--error)]" : ""
        )}
      >
        {error && (
          <div className="px-4 py-2 text-xs text-[var(--error)] bg-[var(--error)]/5 border-b border-[var(--error)]/20 rounded-t-2xl">
            {error}
          </div>
        )}
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
        />

        <div className="flex flex-col p-2">
          {attachment && (
            <div className="px-2 py-1 flex items-center">
              <div className="flex items-center gap-2 bg-[var(--elevated)] px-3 py-1.5 rounded-lg border border-[var(--border)] max-w-full">
                {attachment.status === 'READY' ? (
                  <Paperclip className="w-4 h-4 shrink-0 text-[var(--ai-accent)]" />
                ) : attachment.status === 'FAILED' ? (
                  <X className="w-4 h-4 shrink-0 text-[var(--error)]" />
                ) : (
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin text-[var(--ai-accent)]" />
                )}
                <span className="text-sm text-[var(--primary-text)] truncate max-w-[200px] sm:max-w-xs">{attachment.name}</span>
                
                {attachment.status === 'UPLOADING' && <span className="text-xs text-[var(--muted-text)] ml-1 shrink-0">(Uploading...)</span>}
                {attachment.status === 'PROCESSING' && <span className="text-xs text-[var(--muted-text)] ml-1 shrink-0">(Processing...)</span>}
                {attachment.status === 'FAILED' && <span className="text-xs text-[var(--error)] ml-1 shrink-0">(Failed)</span>}

                <button 
                  onClick={() => setAttachment(null)}
                  className="ml-2 text-[var(--muted-text)] hover:text-[var(--error)] transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center">
            <input
              type="text"
              placeholder="What are we working on today?"
              className="flex-1 bg-transparent px-4 py-3 text-[var(--primary-text)] placeholder:text-[var(--muted-text)] focus:outline-none text-base sm:text-lg"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              disabled={isProcessing || isRecording}
            />

            <div className="flex items-center space-x-2 pr-2 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-10 w-10 rounded-full transition-colors", attachment ? "text-[var(--ai-accent)] bg-[var(--ai-accent)]/10" : "text-[var(--muted-text)] hover:text-[var(--primary-text)] hover:bg-[var(--elevated)]")}
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing || isRecording}
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              
              {!isRecording ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full text-[var(--muted-text)] hover:text-[var(--primary-text)] hover:bg-[var(--elevated)] transition-colors"
                  onClick={startRecording}
                  disabled={isProcessing}
                >
                  <Mic className="h-5 w-5" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors animate-pulse"
                  onClick={stopRecording}
                >
                  <Square className="h-4 w-4 fill-current" />
                </Button>
              )}

              <Button
                size="icon"
                onClick={handleSend}
                disabled={(!query.trim() && !attachment) || isProcessing || isRecording || (attachment !== null && attachment.status !== 'READY')}
                className={cn(
                  "h-10 w-10 rounded-full transition-all shadow-md",
                  (query.trim() || attachment?.status === 'READY') && !isProcessing
                    ? "bg-[var(--ai-accent)] text-white hover:opacity-90 hover:scale-105" 
                    : "bg-[var(--elevated)] text-[var(--muted-text)] cursor-not-allowed"
                )}
              >
                {isProcessing && !attachment ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5 ml-0.5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Suggested Prompts */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {suggestedPrompts.map((prompt, idx) => (
          <button
            key={idx}
            className="px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--secondary-text)] text-xs font-medium hover:text-[var(--primary-text)] hover:border-[var(--ai-accent)]/50 hover:bg-[var(--ai-accent)]/5 transition-all shadow-sm whitespace-nowrap"
            onClick={() => setQuery(prompt)}
            disabled={isProcessing || isRecording}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
