"use client";

import * as React from "react";
import { Paperclip, Mic, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (message: string, useRAG: boolean, language: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = React.useState("");
  const [showTooltip, setShowTooltip] = React.useState<string | null>(null);
  const [useRAG, setUseRAG] = React.useState(false);
  const [language, setLanguage] = React.useState("Auto Detect");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim(), useRAG, language);
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const showComingSoon = (feature: string) => {
    setShowTooltip(feature);
    setTimeout(() => setShowTooltip(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto w-full relative">
      {/* Coming soon tooltip */}
      {showTooltip && (
        <div className="absolute -top-10 left-4 bg-[var(--elevated)] text-[var(--primary-text)] text-xs px-3 py-1.5 rounded-lg shadow-md border border-[var(--border)] animate-in fade-in slide-in-from-bottom-2">
          {showTooltip} is coming soon!
        </div>
      )}

      <div className="relative flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-sm focus-within:ring-2 focus-within:ring-[var(--ai-accent)] focus-within:border-transparent transition-all">
        <div className="px-3 pt-2 pb-1 flex items-center justify-between border-b border-[var(--border)]/30 mb-2">
           <div className="flex items-center gap-2">
             <button 
               onClick={() => setUseRAG(false)} 
               className={`text-xs font-medium px-2 py-1 rounded-md transition-colors ${!useRAG ? 'bg-[var(--elevated)] text-[var(--primary-text)]' : 'text-[var(--muted-text)] hover:text-[var(--secondary-text)]'}`}
             >
               General AI
             </button>
             <button 
               onClick={() => setUseRAG(true)}
               className={`text-xs font-medium px-2 py-1 rounded-md transition-colors ${useRAG ? 'bg-[var(--ai-accent)]/10 text-[var(--ai-accent)]' : 'text-[var(--muted-text)] hover:text-[var(--secondary-text)]'}`}
             >
               My Knowledge Base
             </button>
           </div>
            
            <div className="flex items-center space-x-1 ml-auto">
              <span className="text-[10px] text-[var(--muted-text)] uppercase tracking-wider font-semibold mr-1">Language</span>
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-[var(--elevated)] text-[var(--primary-text)] text-xs rounded-md border border-[var(--border)]/50 px-2 py-1 outline-none focus:ring-1 focus:ring-[var(--ai-accent)] transition-all"
              >
                <option value="Auto Detect">Auto Detect</option>
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Hinglish">Hinglish</option>
                <option value="Tamil">Tamil</option>
                <option value="Telugu">Telugu</option>
                <option value="Bengali">Bengali</option>
                <option value="Marathi">Marathi</option>
                <option value="Gujarati">Gujarati</option>
                <option value="Kannada">Kannada</option>
                <option value="Malayalam">Malayalam</option>
                <option value="Punjabi">Punjabi</option>
              </select>
            </div>
         </div>
        <div className="flex px-3 pt-1 pb-2">
          <textarea
            ref={textareaRef}
            placeholder="Message Sticky AI..."
            className="flex-1 bg-transparent text-[var(--primary-text)] placeholder:text-[var(--muted-text)] focus:outline-none resize-none min-h-[44px] max-h-40 py-2.5 overflow-y-auto"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
        </div>
        <div className="flex items-center justify-between px-1 pt-1 pb-1 border-t border-[var(--border)]/30 mt-1">
          <div className="flex items-center space-x-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-[var(--secondary-text)] rounded-full h-9 w-9"
              onClick={() => showComingSoon("Attachments")}
            >
              <Paperclip className="h-4 w-4" />
              <span className="sr-only">Attach file</span>
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-[var(--secondary-text)] rounded-full h-9 w-9"
              onClick={() => showComingSoon("Voice input")}
            >
              <Mic className="h-4 w-4" />
              <span className="sr-only">Voice input</span>
            </Button>
          </div>
          
          <Button 
            variant="ai" 
            size="icon" 
            className="rounded-full h-10 w-10 transition-all duration-300"
            disabled={!input.trim() || disabled}
            onClick={handleSend}
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </div>
      <p className="text-center text-[10px] text-[var(--muted-text)] mt-3">
        Sticky AI can make mistakes. Consider verifying important information.
      </p>
    </div>
  );
}
