export type EducationLevel = 
  | "School" 
  | "Undergraduate" 
  | "Postgraduate" 
  | "Diploma / Polytechnic" 
  | "ITI / Vocational" 
  | "Professional Courses" 
  | "Competitive / Entrance Exams" 
  | "Other";

export interface TaxonomyStructure {
  levels: EducationLevel[];
  schoolBoards: string[];
  schoolClasses: string[];
  schoolStreams: string[];
  ugCategories: string[];
  pgCategories: string[];
  diplomaCategories: string[];
  itiTrades: string[];
  professionalCourses: string[];
  competitiveExams: string[];
  degreesByCategory: Record<string, string[]>;
  branchesByDegree: Record<string, string[]>;
}

export const educationTaxonomy: TaxonomyStructure = {
  levels: [
    "School",
    "Undergraduate",
    "Postgraduate",
    "Diploma / Polytechnic",
    "ITI / Vocational",
    "Professional Courses",
    "Competitive / Entrance Exams",
    "Other"
  ],
  schoolBoards: [
    "CBSE", "ICSE", "State Board", "IB", "IGCSE", "Other"
  ],
  schoolClasses: [
    "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
    "Class 6", "Class 7", "Class 8", "Class 9", "Class 10",
    "Class 11", "Class 12"
  ],
  schoolStreams: [
    "Science (PCM)", "Science (PCB)", "Science (PCMB)", "Commerce", "Arts / Humanities", "Other"
  ],
  ugCategories: [
    "Engineering & Technology", "Medical & Dental", "Commerce & Management", 
    "Science", "Arts & Humanities", "Law", "Pharmacy", "Architecture", "Other"
  ],
  pgCategories: [
    "Engineering & Technology", "Medical & Dental", "Commerce & Management", 
    "Science", "Arts & Humanities", "Law", "Pharmacy", "Architecture", "Other"
  ],
  diplomaCategories: [
    "Engineering Diploma", "Non-Engineering Diploma", "Medical Diploma", "Other"
  ],
  itiTrades: [
    "Electrician", "Fitter", "Welder", "Mechanic Motor Vehicle", "Computer Operator (COPA)", "Other"
  ],
  professionalCourses: [
    "CA (Chartered Accountancy)", "CS (Company Secretary)", "CMA (Cost and Management Accountancy)", "Other"
  ],
  competitiveExams: [
    "JEE Main", "JEE Advanced", "NEET UG", "NEET PG", "GATE", "CAT", "UPSC CSE", "SSC CGL", "CLAT", "NDA", "CUET", "Other"
  ],
  degreesByCategory: {
    "Engineering & Technology": ["B.Tech", "BE", "M.Tech", "ME", "BCA", "MCA", "B.Sc (IT/CS)", "Other"],
    "Medical & Dental": ["MBBS", "BDS", "BAMS", "BHMS", "MD", "MS", "Nursing", "Other"],
    "Commerce & Management": ["B.Com", "BBA", "BMS", "M.Com", "MBA", "PGDM", "Other"],
    "Science": ["B.Sc", "M.Sc", "Other"],
    "Arts & Humanities": ["BA", "MA", "BFA", "MFA", "Other"],
    "Law": ["LLB", "BA LLB", "BBA LLB", "LLM", "Other"],
    "Pharmacy": ["B.Pharm", "M.Pharm", "D.Pharm", "Pharm.D", "Other"],
    "Architecture": ["B.Arch", "M.Arch", "Other"]
  },
  branchesByDegree: {
    "B.Tech": ["Computer Science (CSE)", "Electronics (ECE)", "Mechanical (ME)", "Civil (CE)", "Electrical (EEE)", "Information Technology (IT)", "Other"],
    "BE": ["Computer Science (CSE)", "Electronics (ECE)", "Mechanical (ME)", "Civil (CE)", "Electrical (EEE)", "Information Technology (IT)", "Other"],
    "M.Tech": ["Computer Science (CSE)", "Electronics (ECE)", "Mechanical (ME)", "Civil (CE)", "Electrical (EEE)", "Information Technology (IT)", "Other"],
    "MBA": ["Marketing", "Finance", "Human Resources (HR)", "Operations", "Information Technology", "International Business", "Other"],
    "B.Sc": ["Physics", "Chemistry", "Mathematics", "Biology", "Computer Science", "Other"],
    "M.Sc": ["Physics", "Chemistry", "Mathematics", "Biology", "Computer Science", "Other"],
    "BA": ["History", "Political Science", "Economics", "Sociology", "Psychology", "English", "Other"],
    "MA": ["History", "Political Science", "Economics", "Sociology", "Psychology", "English", "Other"]
  }
};
