import * as React from "react";
import { type Note, subjects } from "@/lib/mock-notes";
import { X, Sparkles, ChevronRight, CheckCircle2, Paperclip, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NoteViewer } from "./note-viewer";
import { generateNoteAction } from "@/lib/actions/ai-actions";
import { EducationTaxonomySelector, type EducationMetadata } from "./education-taxonomy-selector";
import { BackButton } from "@/components/ui/back-button";

interface CreateNoteFlowProps {
  onClose: () => void;
  onSave: (note: Note) => void;
}

type Step = 1 | 2 | 3 | 4;

export function CreateNoteFlow({ onClose, onSave }: CreateNoteFlowProps) {
  const [step, setStep] = React.useState<Step>(1);
  
  // Form State
  const [metadata, setMetadata] = React.useState<EducationMetadata>({ educationLevel: "" });
  const [isMetadataValid, setIsMetadataValid] = React.useState(false);
  const [instructions, setInstructions] = React.useState("");
  const [style, setStyle] = React.useState("Detailed Study Notes");
  
  // Generation State
  const [generatedNote, setGeneratedNote] = React.useState<Note | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleGenerate = async () => {
    setStep(3); // Loading state
    setError(null);
    try {
      const subject = metadata.subject || "General";
      const topic = metadata.topic || "Topic";
      const response = await generateNoteAction(subject, topic, { style, instructions, educationMetadata: metadata });
      
      if (!response.success || !response.note) {
        throw new Error(response.error || "Failed to generate note.");
      }

      const newNote: Note = {
        id: `note-${Date.now()}`,
        title: response.note.title,
        subject: response.note.subject,
        topic: response.note.topic,
        description: response.note.description,
        lastUpdated: "Just now",
        readTime: "5 min read",
        isAiGenerated: true,
        isBookmarked: false,
        sections: response.note.sections
      };
      
      setGeneratedNote(newNote);
      setStep(4); // Review state
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message || "An unexpected error occurred during generation.");
    }
  };

  const handleSave = () => {
    if (generatedNote) {
      onSave(generatedNote);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--background)] flex flex-col animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)] shrink-0">
        <div className="flex items-center gap-2">
          <BackButton fallbackHref="/notes" onClick={onClose} />
          <Sparkles className="w-5 h-5 ml-2 text-[var(--ai-accent)]" />
          <h2 className="text-lg font-bold text-[var(--primary-text)]">Create AI Note</h2>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[var(--elevated)] h-1 shrink-0">
        <div 
          className="bg-[var(--ai-accent)] h-1 transition-all duration-500" 
          style={{ width: `${(step / 4) * 100}%` }} 
        />
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
          
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-8">
              <div>
                <h3 className="text-2xl font-bold text-[var(--primary-text)] mb-2">What are you learning?</h3>
                <p className="text-[var(--secondary-text)]">Define the subject and core topic for your study material.</p>
              </div>

              <div className="space-y-6">
                <EducationTaxonomySelector 
                  metadata={metadata} 
                  onChange={setMetadata} 
                  isValid={setIsMetadataValid} 
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={() => setStep(2)} 
                  disabled={!isMetadataValid}
                  className="bg-[var(--primary-text)] text-[var(--background)] hover:opacity-90"
                >
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-8">
              <div>
                <h3 className="text-2xl font-bold text-[var(--primary-text)] mb-2">Customize your notes</h3>
                <p className="text-[var(--secondary-text)]">Tell Sticky AI exactly how you want the material structured.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-[var(--primary-text)] mb-3">Note Style</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {["Quick Revision", "Detailed Study Notes", "Exam Preparation", "Concept Explanation"].map(opt => (
                      <button
                        key={opt}
                        onClick={() => setStyle(opt)}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          style === opt 
                            ? "border-[var(--ai-accent)] bg-[var(--ai-accent)]/10 ring-1 ring-[var(--ai-accent)]" 
                            : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--muted-text)]"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={`font-medium ${style === opt ? "text-[var(--ai-accent)]" : "text-[var(--primary-text)]"}`}>
                            {opt}
                          </span>
                          {style === opt && <CheckCircle2 className="w-4 h-4 text-[var(--ai-accent)]" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--primary-text)] mb-2">Specific Instructions (Optional)</label>
                  <textarea 
                    placeholder="e.g. Include a lot of practice questions, focus on edge cases..."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={4}
                    className="w-full p-3 border border-[var(--border)] rounded-xl bg-[var(--surface)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--ai-accent)] focus:border-transparent outline-none placeholder-[var(--muted-text)] resize-none"
                  />
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <button className="flex items-center text-[var(--muted-text)] hover:text-[var(--ai-accent)] transition-colors group">
                      <Paperclip className="w-4 h-4 mr-1.5 group-hover:scale-110 transition-transform" />
                      Attach syllabus or past notes (Coming soon)
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button variant="ai" onClick={handleGenerate} className="shadow-md shadow-[var(--ai-accent)]/20">
                  <Sparkles className="w-4 h-4 mr-2" /> Generate Notes
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
              {error ? (
                <>
                  <div className="relative mb-8">
                    <div className="w-20 h-20 rounded-full bg-[var(--error)]/10 flex items-center justify-center ring-1 ring-[var(--error)]/30">
                      <X className="w-10 h-10 text-[var(--error)]" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-[var(--primary-text)] mb-2">Generation Failed</h3>
                  <p className="text-[var(--secondary-text)] max-w-sm mb-6">
                    {error}
                  </p>
                  <Button variant="outline" onClick={handleGenerate}>
                    Retry
                  </Button>
                </>
              ) : (
                <>
                  <div className="relative mb-8">
                    <div className="w-20 h-20 rounded-full bg-[var(--ai-accent)]/10 flex items-center justify-center ring-1 ring-[var(--ai-accent)]/30 animate-pulse">
                      <Sparkles className="w-10 h-10 text-[var(--ai-accent)]" />
                    </div>
                    {/* Decorative orbiting dot */}
                    <div className="absolute top-0 left-0 w-full h-full animate-spin [animation-duration:3s]">
                      <div className="w-3 h-3 bg-[var(--ai-accent)] rounded-full absolute -top-1.5 left-1/2 -translate-x-1/2 blur-[1px]" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-[var(--primary-text)] mb-2">Sticky AI is creating your notes</h3>
                  <p className="text-[var(--secondary-text)] max-w-sm">
                    Analyzing {metadata.topic || "your topic"} and structuring it for {style.toLowerCase()}...
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {step === 4 && generatedNote && (
          <div className="animate-in fade-in slide-in-from-bottom-8">
            <div className="bg-[var(--elevated)] border-b border-[var(--border)] px-4 py-3 sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
                <span className="font-medium text-[var(--primary-text)]">Generation Complete</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Discard
                </Button>
                <Button variant="outline" size="sm" onClick={handleGenerate} className="gap-2">
                  <Loader2 className="w-3 h-3" /> Regenerate
                </Button>
                <Button size="sm" onClick={handleSave} className="bg-[var(--ai-accent)] text-[var(--ai-accent-fg)] hover:bg-[var(--ai-accent)]/90">
                  Save to Library
                </Button>
              </div>
            </div>
            {/* Re-use NoteViewer component but without the "Back" button wrapper since we're in the modal */}
            <div className="py-8">
              <NoteViewer note={generatedNote} isPreview />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
