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
    "Medical & Dental": ["MBBS", "BDS", "Nursing", "Physiotherapy", "Medical Laboratory Technology", "BAMS", "BHMS", "MD", "MS", "Other"],
    "Commerce & Management": ["B.Com", "BBA", "BBM", "BMS", "M.Com", "MBA", "PGDM", "Other"],
    "Science": ["B.Sc", "B.Sc (Hons)", "M.Sc", "Other"],
    "Arts & Humanities": ["BA", "BA (Hons)", "BFA", "MA", "MFA", "Other"],
    "Law": ["LLB", "BA LLB", "BBA LLB", "B.Com LLB", "LLM", "Other"],
    "Pharmacy": ["B.Pharm", "Pharm.D", "M.Pharm", "D.Pharm", "Other"],
    "Architecture": ["B.Arch", "M.Arch", "Other"],
    "Other": ["Other"]
  },
  branchesByDegree: {
    "B.Tech": [
      "Computer Science / CSE", "Information Technology", "Electronics & Communication",
      "Electrical Engineering", "Mechanical Engineering", "Civil Engineering",
      "Chemical Engineering", "Artificial Intelligence & Machine Learning", "Data Science",
      "Computer Applications", "Software Engineering", "Cyber Security", "Biotechnology",
      "Instrumentation", "Aerospace", "Mechatronics", "Robotics", "Other"
    ],
    "BE": [
      "Computer Science / CSE", "Information Technology", "Electronics & Communication",
      "Electrical Engineering", "Mechanical Engineering", "Civil Engineering",
      "Chemical Engineering", "Artificial Intelligence & Machine Learning", "Data Science",
      "Computer Applications", "Software Engineering", "Cyber Security", "Biotechnology",
      "Instrumentation", "Aerospace", "Mechatronics", "Robotics", "Other"
    ],
    "M.Tech": [
      "Computer Science", "Information Technology", "Electronics & Communication",
      "Electrical Engineering", "Mechanical Engineering", "Civil Engineering", "Other"
    ],
    "ME": [
      "Computer Science", "Information Technology", "Electronics & Communication",
      "Electrical Engineering", "Mechanical Engineering", "Civil Engineering", "Other"
    ],
    "B.Com": ["Accounting", "Finance", "Economics", "Business Studies", "Marketing", "Human Resource Management", "General", "Other"],
    "BBA": ["Accounting", "Finance", "Economics", "Business Studies", "Marketing", "Human Resource Management", "General", "Other"],
    "BBM": ["Accounting", "Finance", "Economics", "Business Studies", "Marketing", "Human Resource Management", "General", "Other"],
    "MBA": ["Marketing", "Finance", "Human Resource Management", "Operations", "Information Technology", "International Business", "Other"],
    "B.Sc": ["Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "Statistics", "Biotechnology", "Environmental Science", "Other"],
    "B.Sc (Hons)": ["Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "Statistics", "Biotechnology", "Environmental Science", "Other"],
    "M.Sc": ["Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "Statistics", "Biotechnology", "Environmental Science", "Other"],
    "BA": ["English", "Hindi", "History", "Geography", "Political Science", "Sociology", "Psychology", "Philosophy", "Economics", "Journalism/Mass Communication", "Other"],
    "BA (Hons)": ["English", "Hindi", "History", "Geography", "Political Science", "Sociology", "Psychology", "Philosophy", "Economics", "Journalism/Mass Communication", "Other"],
    "MA": ["English", "Hindi", "History", "Geography", "Political Science", "Sociology", "Psychology", "Philosophy", "Economics", "Journalism/Mass Communication", "Other"]
  }
};
