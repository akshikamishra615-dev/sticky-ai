"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  fallbackHref: string;
  className?: string;
  label?: string;
  onClick?: () => void;
}

export function BackButton({ fallbackHref, className = "", label = "Back", onClick }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={handleBack}
      className={`text-[var(--secondary-text)] hover:text-[var(--primary-text)] hover:bg-[var(--elevated)] -ml-2 ${className}`}
      aria-label="Go back"
    >
      <ArrowLeft className="w-4 h-4 mr-1" />
      {label}
    </Button>
  );
}
