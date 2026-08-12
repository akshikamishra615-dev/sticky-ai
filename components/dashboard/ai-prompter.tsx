"use client";

import * as React from "react";
import { Paperclip, Mic, Send, X, Loader2, Square } from "lucide-react";
import { suggestedPrompts } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function AiPrompter() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [isFocused, setIsFocused] = React.useState(false);
  
  // Attachment State
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Voice State
  const [isRecording, setIsRecording] = React.useState(false);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);

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
    if ((!query.trim() && !selectedFile) || isProcessing || isRecording) return;
    
    setIsProcessing(true);
    setError(null);
    let finalMessage = query.trim();

    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        
        const res = await fetch("/api/ai/parse-attachment", {
          method: "POST",
          body: formData
        });
        
        const data = await res.json();
        
        if (!res.ok || !data.success) {
          throw new Error(data.error?.message || data.error || "Failed to process attachment");
        }
        
        finalMessage = `[Attached Document: ${selectedFile.name}]\n\n${data.text}\n\n${finalMessage}`;
      }

      // We save the query to sessionStorage so ai-client.tsx can pick it up
      sessionStorage.setItem("dashboard_ai_query", finalMessage);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 my-10 relative">
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--ai-accent)]/10 to-[var(--ai-accent)]/5 blur-3xl -z-10 rounded-full" />
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />

      <div 
        className={cn(
          "relative flex flex-col rounded-3xl border bg-[var(--surface)] p-3 shadow-lg transition-all duration-500",
          isFocused 
            ? "border-[var(--ai-accent)] shadow-[var(--ai-accent)]/20 ring-4 ring-[var(--ai-accent)]/10" 
            : "border-[var(--border)] hover:border-[var(--muted-text)] shadow-black/5 dark:shadow-white/5"
        )}
      >
        {error && (
          <div className="px-4 pt-2">
            <div className="text-xs text-[var(--error)] bg-[var(--error)]/10 px-2 py-1 rounded">
              {error}
            </div>
          </div>
        )}
        
        {selectedFile && (
          <div className="px-4 pt-2 flex items-center">
            <div className="flex items-center gap-2 bg-[var(--elevated)] px-3 py-1.5 rounded-lg border border-[var(--border)] max-w-full">
              <Paperclip className="w-4 h-4 shrink-0 text-[var(--ai-accent)]" />
              <span className="text-sm text-[var(--primary-text)] truncate max-w-[200px] sm:max-w-xs">{selectedFile.name}</span>
              <button 
                onClick={() => setSelectedFile(null)}
                className="ml-1 text-[var(--muted-text)] hover:text-[var(--error)] transition-colors shrink-0"
                disabled={isProcessing}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="flex px-4 pt-4 pb-4">
          <input
            type="text"
            placeholder={isRecording ? "Listening..." : "What do you want to learn today?"}
            className="flex-1 bg-transparent text-lg md:text-xl text-[var(--primary-text)] placeholder:text-[var(--muted-text)] focus:outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={isProcessing || isRecording}
          />
        </div>
        
        <div className="flex items-center justify-between px-2 pt-2">
          <div className="flex items-center space-x-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-[var(--secondary-text)] rounded-full h-10 w-10 hover:bg-[var(--elevated)] hover:text-[var(--primary-text)]"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || isRecording}
              aria-label="Attach file"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            
            {isRecording ? (
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-[var(--error)] bg-[var(--error)]/10 rounded-full h-10 w-10 animate-pulse"
                onClick={stopRecording}
                aria-label="Stop recording"
              >
                <Square className="h-5 w-5 fill-current" />
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-[var(--secondary-text)] rounded-full h-10 w-10 hover:bg-[var(--elevated)] hover:text-[var(--primary-text)]"
                onClick={startRecording}
                disabled={isProcessing}
                aria-label="Start voice input"
              >
                <Mic className="h-5 w-5" />
              </Button>
            )}
          </div>
          
          <Button 
            variant="ai" 
            size="icon" 
            className="rounded-full h-11 w-11 transition-all duration-300"
            disabled={(!query.trim() && !selectedFile) || isProcessing || isRecording}
            onClick={handleSend}
            aria-label="Ask Sticky AI"
          >
            {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 pt-2">
        <span className="text-xs font-semibold text-[var(--muted-text)] uppercase tracking-widest">Try asking</span>
        <div className="flex flex-wrap justify-center items-center gap-2 px-2 max-w-2xl">
          {suggestedPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(prompt);
                sessionStorage.setItem("dashboard_ai_query", prompt);
                router.push("/ai");
              }}
              disabled={isProcessing || isRecording}
              className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--secondary-text)] transition-all duration-300 hover:border-[var(--ai-accent)] hover:text-[var(--ai-accent)] hover:shadow-sm hover:shadow-[var(--ai-accent)]/10 focus:outline-none focus:ring-2 focus:ring-[var(--ai-accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)] disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
