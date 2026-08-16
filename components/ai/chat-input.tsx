"use client";

import * as React from "react";
import { Paperclip, Mic, Send, X, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (message: string, useRAG: boolean, language: string, documentIds?: string[]) => void;
  disabled?: boolean;
  documents?: { id: string; name: string }[];
}

export function ChatInput({ onSend, disabled, documents }: ChatInputProps) {
  const [input, setInput] = React.useState("");
  const [useRAG, setUseRAG] = React.useState(false);
  const [selectedDocs, setSelectedDocs] = React.useState<string[]>([]);
  const [showDocSelector, setShowDocSelector] = React.useState(false);
  const [language, setLanguage] = React.useState("Auto Detect");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Attachment State
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
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
    if ((!input.trim() && !selectedFile) || disabled || isProcessing || isRecording) return;
    
    setIsProcessing(true);
    setError(null);
    let finalMessage = input.trim();

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
        setSelectedFile(null);
      }

      onSend(finalMessage, useRAG, language, useRAG && selectedDocs.length > 0 ? selectedDocs : undefined);
      setInput("");
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
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
                <option value="Hindi">Hindi</option>
                <option value="Hinglish">Hinglish</option>
                <option value="Tamil">Tamil</option>
              </select>
            </div>
         </div>
         
         {error && (
            <div className="px-3 py-1 mb-2">
              <div className="text-xs text-[var(--error)] bg-[var(--error)]/10 px-2 py-1 rounded">
                {error}
              </div>
            </div>
         )}
         
         {selectedFile && (
           <div className="px-3 py-1 mb-1 flex items-center">
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

        <div className="flex px-3 pt-1 pb-2">
          <textarea
            ref={textareaRef}
            placeholder={isRecording ? "Listening..." : "Message Sticky AI..."}
            className="flex-1 bg-transparent text-[var(--primary-text)] placeholder:text-[var(--muted-text)] focus:outline-none resize-none min-h-[44px] max-h-40 py-2.5 overflow-y-auto"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isProcessing || isRecording}
          />
        </div>
        
        <div className="flex items-center justify-between px-1 pt-1 pb-1 border-t border-[var(--border)]/30 mt-1">
          <div className="flex items-center space-x-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-[var(--secondary-text)] rounded-full h-9 w-9"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || isRecording || disabled}
              aria-label="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            
            {isRecording ? (
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-[var(--error)] bg-[var(--error)]/10 rounded-full h-9 w-9 animate-pulse"
                onClick={stopRecording}
                aria-label="Stop recording"
              >
                <Square className="h-4 w-4 fill-current" />
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-[var(--secondary-text)] rounded-full h-9 w-9"
                onClick={startRecording}
                disabled={isProcessing || disabled}
                aria-label="Start voice input"
              >
                <Mic className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <Button 
            variant="ai" 
            size="icon" 
            className="rounded-full h-10 w-10 transition-all duration-300"
            disabled={(!input.trim() && !selectedFile) || disabled || isProcessing || isRecording}
            onClick={handleSend}
            aria-label="Send message"
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
