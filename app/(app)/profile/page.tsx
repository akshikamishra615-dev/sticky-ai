"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { EducationTaxonomySelector, EducationMetadata } from "@/components/notes/education-taxonomy-selector";
import { updateProfileMetadata, updateUserName, removeProfileImage } from "@/lib/actions/profile-actions";
import { logoutAction } from "@/lib/actions/auth-actions";
import { Upload, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  
  const [name, setName] = React.useState(session?.user?.name || "");
  const [educationMetadata, setEducationMetadata] = React.useState<EducationMetadata>({});
  
  const [isSaving, setIsSaving] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [message, setMessage] = React.useState({ text: "", type: "" });
  const [isEduValid, setIsEduValid] = React.useState(true);

  // Fetch initial profile data
  React.useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
    
    // In a real app we might fetch the profile on server and pass it as props,
    // but since this is a client component, we'll fetch it via an API endpoint 
    // or we can pass it down. Wait, we don't have a GET /api/profile endpoint yet.
    // Let's create one, or just let the user see it empty initially if not fetched.
    // Actually, I'll fetch it here via a simple fetch call.
    fetch('/api/profile').then(res => res.json()).then(data => {
      if (data.profile?.educationMetadata) {
        setEducationMetadata(data.profile.educationMetadata);
      }
    }).catch(console.error);
  }, [session?.user?.name]);

  const handleSave = async () => {
    if (!isEduValid && Object.keys(educationMetadata).length > 0) {
      setMessage({ text: "Please complete your education profile or leave it empty.", type: "error" });
      return;
    }

    setIsSaving(true);
    setMessage({ text: "", type: "" });
    try {
      if (name !== session?.user?.name) {
        const nameRes = await updateUserName(name);
        if (!nameRes.success) throw new Error(nameRes.error);
      }
      
      const eduRes = await updateProfileMetadata(educationMetadata);
      if (!eduRes.success) throw new Error(eduRes.error);

      await update(); // Update NextAuth session
      setMessage({ text: "Profile updated successfully!", type: "success" });
      router.refresh();
    } catch (error: unknown) {
      setMessage({ text: error instanceof Error ? error.message : "Failed to save profile.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setMessage({ text: "", type: "" });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/profile/upload-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      if (data.success) {
        await update(); // Update NextAuth session to pick up new image
        setMessage({ text: "Profile picture updated!", type: "success" });
        router.refresh();
      } else {
        throw new Error(data.error);
      }
    } catch (error: unknown) {
      setMessage({ text: error instanceof Error ? error.message : "Failed to upload image.", type: "error" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    try {
      await removeProfileImage();
      await update();
      setMessage({ text: "Profile picture removed.", type: "success" });
      router.refresh();
    } catch (error) {
      setMessage({ text: "Failed to remove image.", type: "error" });
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center mb-8">
        <BackButton fallbackHref="/" className="mr-4" />
        <h1 className="text-2xl font-bold text-[var(--primary-text)]">Profile & Account</h1>
      </div>

      <div className="space-y-8">
        {/* Profile Picture */}
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--primary-text)] mb-4">Profile Picture</h2>
          <div className="flex items-center space-x-6">
            <div className="relative h-24 w-24 rounded-full bg-[var(--ai-accent)]/20 flex items-center justify-center text-[var(--ai-accent)] font-bold text-3xl overflow-hidden shadow-sm">
              {session?.user?.image ? (
                <img src={session.user.image} alt="" className="h-full w-full object-cover" />
              ) : (
                session?.user?.name?.charAt(0).toUpperCase() || "?"
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              <div className="flex space-x-3">
                <label className="cursor-pointer bg-[var(--ai-accent)] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[var(--ai-accent-hover)] transition-colors inline-flex items-center">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Image
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                </label>
                {session?.user?.image && (
                  <Button variant="outline" onClick={handleRemoveImage} disabled={isUploading} className="text-[var(--error)] border-[var(--error)]/20 hover:bg-[var(--error)]/10">
                    <X className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-[var(--muted-text)]">Recommended: Square image, max 5MB. Supports JPG, PNG, WEBP.</p>
            </div>
          </div>
        </section>

        {/* Personal Information */}
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-6">
          <h2 className="text-lg font-semibold text-[var(--primary-text)]">Personal Information</h2>
          
          <div>
            <label className="block text-sm font-medium text-[var(--primary-text)] mb-2">Full Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border border-[var(--border)] rounded-xl bg-[var(--background)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--ai-accent)] focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--primary-text)] mb-2">Email Address</label>
            <input 
              type="email" 
              value={session?.user?.email || ""} 
              readOnly
              className="w-full p-3 border border-[var(--border)] rounded-xl bg-[var(--background)]/50 text-[var(--muted-text)] outline-none cursor-not-allowed"
            />
          </div>
        </section>

        {/* Education Profile */}
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-[var(--primary-text)]">Education Profile (Optional)</h2>
            <p className="text-sm text-[var(--muted-text)] mt-1">This helps Sticky AI personalize explanations and notes to your level.</p>
          </div>
          
          <EducationTaxonomySelector 
            metadata={educationMetadata} 
            onChange={setEducationMetadata} 
            isValid={setIsEduValid} 
            isProfileMode={true}
          />
        </section>

        {/* Action Buttons */}
        {message.text && (
          <div className={`p-4 rounded-xl text-sm ${message.type === 'success' ? 'bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20' : 'bg-[var(--error)]/10 text-[var(--error)] border border-[var(--error)]/20'}`}>
            {message.text}
          </div>
        )}

        <div className="flex items-center justify-between pt-4">
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" className="text-[var(--error)] hover:bg-[var(--error)]/10 hover:text-[var(--error)]">
              Logout
            </Button>
          </form>

          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-[var(--ai-accent)] text-white hover:bg-[var(--ai-accent-hover)] px-8 py-2 rounded-xl"
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
