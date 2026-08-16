"use client";

import * as React from "react";
import { ConversationHistory } from "@/components/ai/conversation-history";
import { ChatMessage } from "@/components/ai/chat-message";
import { ChatInput } from "@/components/ai/chat-input";
import { TypingIndicator } from "@/components/ai/typing-indicator";
import { suggestedPrompts, type Conversation, type Message } from "@/lib/mock-data";
import { Sparkles } from "lucide-react";
import { createConversation, saveMessage, deleteConversation } from "@/lib/server/conversations";
import { Button } from "@/components/ui/button";

// External ID generator for optimistic UI (will be replaced by real IDs)
let idCounter = 1;
const generateId = (prefix: string) => `${prefix}-${Date.now()}-${idCounter++}`;

interface AiClientProps {
  initialConversations: Conversation[];
  initialDocuments?: { id: string; name: string }[];
  userName: string;
  userImage?: string;
}

function useSelectionAutoScroll() {
  React.useEffect(() => {
    let isDragging = false;
    let animationFrameId: number;

    const handlePointerDown = () => {
      isDragging = true;
    };

    const handlePointerUp = () => {
      isDragging = false;
      cancelAnimationFrame(animationFrameId);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      
      const selection = window.getSelection();
      if (!selection || selection.toString().length === 0) return;

      const y = e.clientY;
      const windowHeight = window.innerHeight;
      const edgeThreshold = 60;
      
      const mainContainer = document.querySelector('main');
      if (!mainContainer) return;

      cancelAnimationFrame(animationFrameId);

      const scroll = () => {
        if (!isDragging) return;
        
        if (y < edgeThreshold) {
          mainContainer.scrollTop -= 10;
          animationFrameId = requestAnimationFrame(scroll);
        } else if (y > windowHeight - edgeThreshold) {
          mainContainer.scrollTop += 10;
          animationFrameId = requestAnimationFrame(scroll);
        }
      };

      if (y < edgeThreshold || y > windowHeight - edgeThreshold) {
        animationFrameId = requestAnimationFrame(scroll);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointermove', handlePointerMove);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointermove', handlePointerMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
}

export function AiClient({ initialConversations, initialDocuments, userName, userImage }: AiClientProps) {
  useSelectionAutoScroll();
  const [conversations, setConversations] = React.useState<Conversation[]>(initialConversations);
  // Default to first conversation if it exists
  const [activeId, setActiveId] = React.useState<string | null>(initialConversations.length > 0 ? initialConversations[0].id : null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [convoToDelete, setConvoToDelete] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };
  
  const activeConversation = conversations.find(c => c.id === activeId);

  React.useEffect(() => {
    const main = document.querySelector('main');
    if (main) {
      main.scrollTop = main.scrollHeight;
    }
  }, [activeConversation?.messages, isGenerating]);


  const handleSend = async (content: string, useRAG: boolean = false, language: string = "Auto Detect", documentIds?: string[]) => {
    if (!content.trim() || isGenerating) return;

    let currentConversationId = activeId;
    let updatedConversations = [...conversations];

    setIsGenerating(true); // set early to disable input
    
    // If no active conversation, create one in the database
    if (!currentConversationId) {
      const title = content.slice(0, 30) + (content.length > 30 ? "..." : "");
      
      try {
        const newServerConv = await createConversation(title);
        currentConversationId = newServerConv.id;
        
        const newConv: Conversation = {
          id: newServerConv.id,
          title: newServerConv.title,
          subject: "General",
          date: "Today",
          messages: []
        };
        
        updatedConversations.unshift(newConv);
        setActiveId(newServerConv.id);
      } catch (e) {
        console.error("Failed to create conversation:", e);
        setIsGenerating(false);
        return;
      }
    }

    // Save user message to database
    let savedUserMsg: Message;
    try {
      const serverMsg = await saveMessage(currentConversationId, "user", content);
      savedUserMsg = {
        id: serverMsg.id,
        role: "user",
        content: serverMsg.content,
        timestamp: serverMsg.timestamp
      };
    } catch (e) {
      console.error("Failed to save user message:", e);
      setIsGenerating(false);
      return;
    }

    // Add user message to state
    updatedConversations = updatedConversations.map(c => 
      c.id === currentConversationId 
        ? { ...c, messages: [...c.messages, savedUserMsg] }
        : c
    );
    
    setConversations(updatedConversations);

    // Generate AI response
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: currentConversationId,
          messages: updatedConversations.find(c => c.id === currentConversationId)?.messages.map(m => ({
            role: m.role === 'ai' ? 'assistant' : m.role,
            content: m.content
          })),
          useRAG,
          language,
          documentIds
        })
      });

      if (!response.ok) {
        throw new Error("Failed to generate response");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      const aiMessageId = generateId("msg");
      let fullContent = "";

      // Add empty AI message to state
      const initialAiMessage: Message = {
        id: aiMessageId,
        role: "ai",
        content: "",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setConversations(prev => prev.map(c => 
        c.id === currentConversationId 
          ? { ...c, messages: [...c.messages, initialAiMessage] }
          : c
      ));

      // Read stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const updatedContent = fullContent + chunk;
        fullContent = updatedContent;
        
        // Incrementally update UI
        setConversations(prev => prev.map(c => 
          c.id === currentConversationId 
            ? {
                ...c,
                messages: c.messages.map(m => 
                  m.id === aiMessageId ? { ...m, content: updatedContent } : m
                )
              }
            : c
        ));
      }

      if (!fullContent.trim()) {
        throw new Error("AI generation failed or returned empty text.");
      }
      
      // DB persistence is handled by the server onFinish callback
    } catch (e) {
      console.error("Failed to generate AI response:", e);
      
      // Replace the empty AI message with a safe error message if it exists, otherwise append it.
      setConversations(prev => prev.map(c => {
        if (c.id !== currentConversationId) return c;
        
        // Check if the last message was the AI's empty message
        const lastMsg = c.messages[c.messages.length - 1];
        const errorContent = "⚠️ *AI generation failed. Please try again.*";
        
        if (lastMsg && lastMsg.role === "ai" && !lastMsg.content.trim()) {
          return {
            ...c,
            messages: c.messages.map(m => 
              m.id === lastMsg.id ? { ...m, content: errorContent } : m
            )
          };
        }
        
        return {
          ...c,
          messages: [...c.messages, {
            id: generateId("msg"),
            role: "ai",
            content: errorContent,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]
        };
      }));
    } finally {
      setIsGenerating(false);
    }
  };

  React.useEffect(() => {
    const dashboardQuery = sessionStorage.getItem("dashboard_ai_query");
    if (dashboardQuery) {
      sessionStorage.removeItem("dashboard_ai_query");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleSend(dashboardQuery, false, "Auto Detect");
    }
  }, [handleSend]);

  const handleRegenerate = async (messageId: string) => {
    if (!activeId || isGenerating) return;
    
    const conv = conversations.find(c => c.id === activeId);
    if (!conv) return;
    
    // Find the user message right before this AI message
    const aiIndex = conv.messages.findIndex(m => m.id === messageId);
    if (aiIndex <= 0) return;
    
    // Remove the old AI message from UI
    const updatedMessages = [...conv.messages];
    updatedMessages.splice(aiIndex, 1);
    
    setConversations(prev => prev.map(c => 
      c.id === activeId ? { ...c, messages: updatedMessages } : c
    ));
    
    setIsGenerating(true);
    
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeId,
          messages: updatedMessages.map(m => ({
            role: m.role === 'ai' ? 'assistant' : m.role,
            content: m.content
          })),
          useRAG: false,
          language: "Auto Detect"
        })
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate response");
      }
      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      const aiMessageId = generateId("msg");
      let fullContent = "";

      const aiMessage: Message = {
        id: aiMessageId,
        role: "ai",
        content: "",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setConversations(prev => prev.map(c => 
        c.id === activeId ? { ...c, messages: [...c.messages, aiMessage] } : c
      ));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const updatedContent = fullContent + chunk;
        fullContent = updatedContent;
        
        setConversations(prev => prev.map(c => 
          c.id === activeId 
            ? {
                ...c,
                messages: c.messages.map(m => 
                  m.id === aiMessageId ? { ...m, content: updatedContent } : m
                )
              }
            : c
        ));
      }
      
      if (!fullContent.trim()) {
        throw new Error("AI generation failed or returned empty text.");
      }
    } catch (e) {
      console.error("Failed to regenerate response:", e);
      setConversations(prev => prev.map(c => {
        if (c.id !== activeId) return c;
        
        const lastMsg = c.messages[c.messages.length - 1];
        const errorContent = "⚠️ *AI generation failed. Please try again.*";
        
        if (lastMsg && lastMsg.role === "ai" && !lastMsg.content.trim()) {
          return {
            ...c,
            messages: c.messages.map(m => 
              m.id === lastMsg.id ? { ...m, content: errorContent } : m
            )
          };
        }
        
        return {
          ...c,
          messages: [...c.messages, {
            id: generateId("msg"),
            role: "ai",
            content: errorContent,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]
        };
      }));
    } finally {
      setIsGenerating(false);
    }
  };
  const confirmDelete = async () => {
    if (!convoToDelete) return;
    
    setIsDeleting(true);
    
    const idToDelete = convoToDelete;
    const backupConversations = [...conversations];
    const backupActiveId = activeId;
    
    // Optimistic UI update
    setConversations(prev => prev.filter(c => c.id !== idToDelete));
    if (activeId === idToDelete) {
      const remaining = conversations.filter(c => c.id !== idToDelete);
      setActiveId(remaining.length > 0 ? remaining[0].id : null);
    }
    
    try {
      await deleteConversation(idToDelete);
      setConvoToDelete(null);
      setIsDeleting(false);
    } catch (e) {
      console.error("Failed to delete conversation:", e);
      // Revert optimistic update
      setConversations(backupConversations);
      setActiveId(backupActiveId);
      setConvoToDelete(null);
      setIsDeleting(false);
      showToast("Failed to delete conversation.");
    }
  };




  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full bg-[var(--background)]">
      {/* Sidebar History */}
      <ConversationHistory 
        conversations={conversations} 
        activeId={activeId} 
        onSelect={(id) => setActiveId(id)} 
        onDelete={(id) => setConvoToDelete(id)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative w-full">
        
        {/* Chat Messages */}
        <div className="flex-1 w-full pb-32 pt-6">
          {activeConversation?.messages && activeConversation.messages.length > 0 ? (
            <div className="flex flex-col">
              {activeConversation.messages.map(msg => (
                <ChatMessage 
                  key={msg.id} 
                  message={msg} 
                  onRegenerate={msg.role === "ai" ? handleRegenerate : undefined} 
                  userName={userName}
                  userImage={userImage}
                  documents={initialDocuments}
                />
              ))}
              {isGenerating && <TypingIndicator />}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[50vh] max-w-2xl mx-auto px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--ai-accent)]/10 flex items-center justify-center mb-6 ring-1 ring-[var(--ai-accent)]/20 shadow-[0_0_40px_rgba(var(--ai-accent-rgb),0.1)]">
                <Sparkles className="w-8 h-8 text-[var(--ai-accent)]" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--primary-text)] mb-2">Sticky AI</h2>
              <p className="text-[var(--secondary-text)] mb-8">
                Your personal AI learning companion. What do you want to learn today?
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                {suggestedPrompts.map((prompt, i) => (
                  <button 
                    key={i}
                    onClick={() => handleSend(prompt)}
                    className="p-4 text-sm text-left rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--ai-accent)] hover:shadow-sm transition-all text-[var(--secondary-text)] hover:text-[var(--primary-text)]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="sticky bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-[var(--background)] 80% via-[var(--background)] to-transparent pt-10 pb-6 px-4">
          <div className="max-w-4xl mx-auto w-full">
            <ChatInput onSend={handleSend} disabled={isGenerating} documents={initialDocuments} />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {convoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg max-w-sm w-full p-6 animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-[var(--primary-text)] mb-2">Delete this conversation?</h3>
            <p className="text-[var(--secondary-text)] text-sm mb-6">This will permanently delete the conversation and all of its messages.</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setConvoToDelete(null)} disabled={isDeleting}>Cancel</Button>
              <Button className="bg-[var(--error)] text-white hover:bg-[var(--error)]/90" onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
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
  );
}
