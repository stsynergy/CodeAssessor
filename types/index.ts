export type Language = "javascript" | "typescript" | "python" | "java" | "c" | "cpp" | "csharp" | "php" | "rust";

export interface Snippet {
  id: string;
  name: string; // This is the Candidate Name
  content: string;
  language?: Language;
}

export interface AssessmentResult {
  providerId: string;
  modelId: string;
  reportMarkdown: string;
  scores: Record<string, string>; // Candidate Name -> Raw Score String (e.g. "4/15")
  timestamp: Date;
}

export interface Subject {
  _id?: string;
  batchId: string;
  thingName: string;
  context: string;
  language: Language;
  snippets: Snippet[]; // Candidates
  trialsNeeded: number;
  providerId?: string;
  modelId?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Trial {
  _id?: string;
  subjectId: string;
  batchId: string;
  status: 'pending' | 'needs_review' | 'completed';
  result?: AssessmentResult;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Batch {
  _id?: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt?: Date;
}
