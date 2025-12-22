export type Language = "javascript" | "typescript" | "python" | "java" | "c" | "cpp" | "csharp" | "php" | "rust";

export interface Candidate {
  _id?: string;
  name: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Snippet {
  candidateId: string;
  content: string;
}

export interface AssessmentResult {
  providerId: string;
  modelId: string;
  reportMarkdown: string;
  scores: Record<string, string>; // Candidate ID -> Raw Score String (e.g. "4/15")
  timestamp: Date;
}

export interface Subject {
  _id?: string;
  batchId: string;
  thingName: string;
  context: string;
  language: Language;
  snippets: Snippet[]; // Linked to candidates via candidateId
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
  candidateIds: string[]; // Global candidates active for this batch
  description?: string;
  createdAt: Date;
  updatedAt?: Date;
}
