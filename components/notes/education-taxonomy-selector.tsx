"use client";

import * as React from "react";
import { educationTaxonomy, EducationLevel } from "@/lib/education-taxonomy";
import { ChevronDown } from "lucide-react";

export type EducationMetadata = Record<string, string>;

interface EducationTaxonomySelectorProps {
  metadata: EducationMetadata;
  onChange: (metadata: EducationMetadata) => void;
  isValid: (valid: boolean) => void;
  isProfileMode?: boolean;
}

// A reusable Select + Optional "Other" Custom Input Field Component
function DynamicSelect({ 
  label, 
  value, 
  options, 
  onChange, 
  placeholder,
  required = true
}: { 
  label: string; 
  value: string; 
  options: string[]; 
  onChange: (val: string) => void; 
  placeholder: string;
  required?: boolean;
}) {
  const isOther = !options.includes(value) && value !== "";
  const selectValue = isOther ? "Other" : value;

  return (
    <div className="space-y-2 w-full animate-in fade-in slide-in-from-top-2">
      <label className="block text-sm font-semibold text-[var(--primary-text)]">{label}</label>
      <div className="relative">
        <select
          value={selectValue}
          onChange={(e) => {
            if (e.target.value === "Other") {
              onChange(""); // Clear for custom input
            } else {
              onChange(e.target.value);
            }
          }}
          className="w-full p-3 pr-10 border border-[var(--border)] rounded-xl bg-[var(--surface)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--ai-accent)] focus:border-transparent outline-none appearance-none"
          required={required && !isOther}
        >
          <option value="" disabled>{placeholder}</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
          {!options.includes("Other") && <option value="Other">Other</option>}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-text)] pointer-events-none" />
      </div>

      {(selectValue === "Other" || isOther) && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter custom ${label.toLowerCase()}`}
          className="w-full mt-2 p-3 border border-[var(--border)] rounded-xl bg-[var(--surface)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--ai-accent)] focus:border-transparent outline-none"
          required={required}
          autoFocus
        />
      )}
    </div>
  );
}

export function EducationTaxonomySelector({ metadata, onChange, isValid, isProfileMode }: EducationTaxonomySelectorProps) {
  const updateField = (key: string, value: string) => {
    const newData = { ...metadata, [key]: value };
    // Clear dependent fields if parent changes
    if (key === "educationLevel") {
      Object.keys(newData).forEach(k => {
        if (k !== "educationLevel") delete newData[k];
      });
    }
    if (key === "class") delete newData["stream"];
    if (key === "category") {
      delete newData["degree"];
      delete newData["branch"];
    }
    if (key === "degree") delete newData["branch"];
    
    onChange(newData);
  };

  const level = metadata.educationLevel as EducationLevel;
  
  React.useEffect(() => {
    // Validation Logic
    let valid = false;
    
    if (isProfileMode) {
      // In profile mode, everything is optional except the initial selection implies they want to save it
      valid = true;
    } else {
      if (!metadata.subject?.trim() || !metadata.topic?.trim() || !level) {
        valid = false;
      } else if (level === "School") {
      valid = !!metadata.board && !!metadata.class && 
              (metadata.class === "Class 11" || metadata.class === "Class 12" ? !!metadata.stream : true);
    } else if (level === "Undergraduate" || level === "Postgraduate") {
      valid = !!metadata.category && !!metadata.degree && !!metadata.year;
    } else if (level === "Competitive / Entrance Exams") {
      valid = !!metadata.exam;
    } else {
      valid = true; // Fallback validation for 'Other' levels
    }
    }
    isValid(valid);
  }, [metadata, level, isValid, isProfileMode]);

  return (
    <div className="space-y-6">
      <DynamicSelect
        label="Education Level"
        value={level || ""}
        options={educationTaxonomy.levels}
        onChange={(v) => updateField("educationLevel", v)}
        placeholder="Select Education Level"
      />

      {level === "School" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DynamicSelect
              label="Board"
              value={metadata.board || ""}
              options={educationTaxonomy.schoolBoards}
              onChange={(v) => updateField("board", v)}
              placeholder="Select Board"
            />
            <DynamicSelect
              label="Class"
              value={metadata.class || ""}
              options={educationTaxonomy.schoolClasses}
              onChange={(v) => updateField("class", v)}
              placeholder="Select Class"
            />
          </div>
          {(metadata.class === "Class 11" || metadata.class === "Class 12") && (
            <DynamicSelect
              label="Stream"
              value={metadata.stream || ""}
              options={educationTaxonomy.schoolStreams}
              onChange={(v) => updateField("stream", v)}
              placeholder="Select Stream"
            />
          )}
        </>
      )}

      {(level === "Undergraduate" || level === "Postgraduate") && (
        <>
          <DynamicSelect
            label="Category"
            value={metadata.category || ""}
            options={level === "Undergraduate" ? educationTaxonomy.ugCategories : educationTaxonomy.pgCategories}
            onChange={(v) => updateField("category", v)}
            placeholder="Select Category"
          />
          {metadata.category && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DynamicSelect
                label="Degree"
                value={metadata.degree || ""}
                options={educationTaxonomy.degreesByCategory[metadata.category] || []}
                onChange={(v) => updateField("degree", v)}
                placeholder="Select Degree"
              />
              {metadata.degree && (
                <DynamicSelect
                  label="Branch / Specialization"
                  value={metadata.branch || ""}
                  options={educationTaxonomy.branchesByDegree[metadata.degree] || []}
                  onChange={(v) => updateField("branch", v)}
                  placeholder="Select Branch/Specialization"
                  required={false}
                />
              )}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DynamicSelect
              label="Year"
              value={metadata.year || ""}
              options={["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Other"]}
              onChange={(v) => updateField("year", v)}
              placeholder="Select Year"
            />
            <DynamicSelect
              label="Semester"
              value={metadata.semester || ""}
              options={["1st Semester", "2nd Semester", "3rd Semester", "4th Semester", "5th Semester", "6th Semester", "7th Semester", "8th Semester", "9th Semester", "10th Semester", "Other"]}
              onChange={(v) => updateField("semester", v)}
              placeholder="Select Semester (Optional)"
              required={false}
            />
          </div>
        </>
      )}

      {level === "Diploma / Polytechnic" && (
        <DynamicSelect
          label="Diploma Category"
          value={metadata.category || ""}
          options={educationTaxonomy.diplomaCategories}
          onChange={(v) => updateField("category", v)}
          placeholder="Select Diploma Category"
        />
      )}

      {level === "ITI / Vocational" && (
        <DynamicSelect
          label="Trade / Vocation"
          value={metadata.trade || ""}
          options={educationTaxonomy.itiTrades}
          onChange={(v) => updateField("trade", v)}
          placeholder="Select Trade"
        />
      )}

      {level === "Professional Courses" && (
        <DynamicSelect
          label="Course"
          value={metadata.course || ""}
          options={educationTaxonomy.professionalCourses}
          onChange={(v) => updateField("course", v)}
          placeholder="Select Course"
        />
      )}

      {level === "Competitive / Entrance Exams" && (
        <DynamicSelect
          label="Exam"
          value={metadata.exam || ""}
          options={educationTaxonomy.competitiveExams}
          onChange={(v) => updateField("exam", v)}
          placeholder="Select Exam"
        />
      )}

      {level && !isProfileMode && (
        <div className="space-y-4 pt-4 border-t border-[var(--border)]">
          <div>
            <label className="block text-sm font-semibold text-[var(--primary-text)] mb-2">Subject / Section</label>
            <input 
              type="text"
              placeholder="e.g. Mathematics, Organic Chemistry, Reasoning"
              value={metadata.subject || ""}
              onChange={(e) => updateField("subject", e.target.value)}
              className="w-full p-3 border border-[var(--border)] rounded-xl bg-[var(--surface)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--ai-accent)] focus:border-transparent outline-none placeholder-[var(--muted-text)]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--primary-text)] mb-2">Chapter / Topic</label>
            <input 
              type="text"
              placeholder="e.g. Thermodynamics, Cellular Respiration"
              value={metadata.topic || ""}
              onChange={(e) => updateField("topic", e.target.value)}
              className="w-full p-3 border border-[var(--border)] rounded-xl bg-[var(--surface)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--ai-accent)] focus:border-transparent outline-none placeholder-[var(--muted-text)]"
              required
            />
          </div>
        </div>
      )}
    </div>
  );
}
