"use client";

import * as React from "react";
import { Paperclip, Mic, Send, X, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkDocumentStatus } from "@/lib/server/rag";

interface ChatInputProps {
  onSend: (message: string, useRAG: boolean, language: string, documentIds?: string[]) => void;
  onStop?: () => void;
  disabled?: boolean;
  documents?: { id: string; name: string }[];
}

export function ChatInput({ onSend, onStop, disabled, documents }: ChatInputProps) {
  const [input, setInput] = React.useState("");
  const [useRAG, setUseRAG] = React.useState(false);
  const [selectedDocs, setSelectedDocs] = React.useState<string[]>([]);
  const [showDocSelector, setShowDocSelector] = React.useState(false);
  const [language, setLanguage] = React.useState("Auto Detect");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Attachment State
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = React.useState<{ id?: string; name: string; status: 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED' } | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Voice State
  const [isRecording, setIsRecording] = React.useState(false);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);

  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

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
    if (!input.trim() || disabled || isProcessing || isRecording) return;
    if (attachment && attachment.status !== 'READY') return;
    
    setIsProcessing(true);
    setError(null);
    const finalMessage = input.trim();

    try {
      let finalDocIds: string[] | undefined = undefined;
      if (useRAG && selectedDocs.length > 0) {
        finalDocIds = [...selectedDocs];
      }
      
      if (attachment?.id && attachment.status === 'READY') {
        finalDocIds = finalDocIds || [];
        if (!finalDocIds.includes(attachment.id)) {
          finalDocIds.push(attachment.id);
        }
      }

      onSend(finalMessage, useRAG || !!attachment, language, finalDocIds);
      setInput("");
      setAttachment(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
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

          setInput((prev) => (prev ? `${prev} ${data.text}` : data.text));
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
    <div className="max-w-4xl mx-auto w-full relative">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />

      <div className="relative flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-sm focus-within:ring-2 focus-within:ring-[var(--ai-accent)] focus-within:border-transparent transition-all">
        <div className="px-3 pt-2 pb-1 flex items-center justify-between border-b border-[var(--border)]/30 mb-2">
           <div className="flex flex-wrap items-center gap-2">
             <button 
               onClick={() => { setUseRAG(false); setShowDocSelector(false); }} 
               className={`text-xs font-medium px-2 py-1 rounded-md transition-colors ${!useRAG ? 'bg-[var(--elevated)] text-[var(--primary-text)]' : 'text-[var(--muted-text)] hover:text-[var(--secondary-text)]'}`}
             >
               General AI
             </button>
             <div className="relative">
               <button 
                 onClick={() => {
                   if (!useRAG) {
                     setUseRAG(true);
                     setSelectedDocs([]);
                   } else {
                     setShowDocSelector(!showDocSelector);
                   }
                 }}
                 className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition-colors ${useRAG ? 'bg-[var(--ai-accent)]/10 text-[var(--ai-accent)]' : 'text-[var(--muted-text)] hover:text-[var(--secondary-text)]'}`}
               >
                 {selectedDocs.length > 0 ? `${selectedDocs.length} Document${selectedDocs.length > 1 ? 's' : ''}` : 'My Knowledge Base'}
                 {useRAG && <span className="ml-1 text-[10px]">▼</span>}
               </button>
               
               {showDocSelector && useRAG && (
                 <>
                   <div className="fixed inset-0 z-40" onClick={() => setShowDocSelector(false)} />
                   <div className="absolute left-0 top-full mt-1 w-64 max-h-60 overflow-y-auto bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg z-50 p-2 flex flex-col gap-1">
                     <div 
                       className={`flex items-center px-2 py-1.5 rounded cursor-pointer hover:bg-[var(--elevated)] ${selectedDocs.length === 0 ? 'bg-[var(--ai-accent)]/10 text-[var(--ai-accent)] font-medium' : 'text-[var(--primary-text)]'}`}
                       onClick={() => setSelectedDocs([])}
                     >
                       All Documents
                     </div>
                     {documents?.map(doc => (
                       <div 
                         key={doc.id}
                         className="flex items-center px-2 py-1.5 rounded cursor-pointer hover:bg-[var(--elevated)]"
                         onClick={() => {
                           setSelectedDocs(prev => 
                             prev.includes(doc.id) 
                               ? prev.filter(id => id !== doc.id)
                               : [...prev, doc.id]
                           );
                         }}
                       >
                         <input 
                           type="checkbox" 
                           checked={selectedDocs.includes(doc.id)} 
                           onChange={() => {}}
                           className="mr-2 rounded border-[var(--border)] text-[var(--ai-accent)] focus:ring-[var(--ai-accent)] pointer-events-none"
                         />
                         <span className="text-sm truncate text-[var(--primary-text)]">{doc.name}</span>
                       </div>
                     ))}
                     {(!documents || documents.length === 0) && (
                       <div className="px-2 py-1.5 text-xs text-[var(--muted-text)] italic">No documents available.</div>
                     )}
                   </div>
                 </>
               )}
             </div>
           </div>
            
            <div className="flex items-center space-x-1 ml-auto shrink-0">
              <span className="hidden sm:inline text-[10px] text-[var(--muted-text)] uppercase tracking-wider font-semibold mr-1">Language</span>
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-[var(--elevated)] text-[var(--primary-text)] text-xs rounded-md border border-[var(--border)]/50 px-2 py-1 outline-none focus:ring-1 focus:ring-[var(--ai-accent)] transition-all max-w-[100px] sm:max-w-none"
              >
                <option value="Auto Detect">Auto Detect</option>
                <option value="English">English</option>
                <option value="Spanish">Español</option>
                <option value="French">Français</option>
                <option value="German">Deutsch</option>
                <option value="Hindi">हिन्दी</option>
                <option value="Japanese">日本語</option>
                <option value="Chinese">中文</option>
              </select>
            </div>
        </div>

        {error && (
          <div className="px-3 py-1.5 mb-2 text-xs text-[var(--error)] bg-[var(--error)]/10 rounded-md border border-[var(--error)]/20 mx-3">
            {error}
          </div>
        )}

        <div className="flex flex-col">
          {attachment && (
           <div className="px-3 py-1 mb-1 flex items-center">
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

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? "Listening..." : "Message AI..."}
            className="w-full resize-none bg-transparent px-4 py-2 text-[var(--primary-text)] focus:outline-none min-h-[60px] max-h-[160px] scrollbar-thin placeholder:text-[var(--muted-text)] text-sm sm:text-base"
            rows={1}
            disabled={isProcessing || isRecording}
          />
        </div>

        <div className="flex items-center justify-between px-2 pb-2 pt-1">
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              className={`h-9 w-9 rounded-full transition-colors ${attachment ? 'text-[var(--ai-accent)] bg-[var(--ai-accent)]/10' : 'text-[var(--muted-text)] hover:text-[var(--primary-text)] hover:bg-[var(--elevated)]'}`}
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || isRecording}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            
            {!isRecording ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-[var(--muted-text)] hover:text-[var(--primary-text)] hover:bg-[var(--elevated)] transition-colors"
                onClick={startRecording}
                disabled={isProcessing}
              >
                <Mic className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors animate-pulse"
                onClick={stopRecording}
              >
                <Square className="h-4 w-4 fill-current" />
              </Button>
            )}
          </div>
          
          <div className="flex items-center">
            {disabled ? (
              <Button
                size="icon"
                onClick={onStop}
                className="h-9 w-9 rounded-full bg-[var(--elevated)] border border-[var(--border)] text-[var(--primary-text)] hover:bg-[var(--border)] transition-all shadow-sm"
              >
                <Square className="h-4 w-4 fill-current" />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={handleSend}
                disabled={(!input.trim() && !attachment) || isProcessing || isRecording || (attachment !== null && attachment.status !== 'READY')}
                className={`h-9 w-9 rounded-full transition-all shadow-sm ${
                  input.trim() || attachment?.status === 'READY'
                    ? "bg-[var(--ai-accent)] text-white hover:opacity-90" 
                    : "bg-[var(--elevated)] text-[var(--muted-text)] cursor-not-allowed"
                }`}
              >
                {isProcessing && !attachment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
