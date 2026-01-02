export type Language = "javascript" | "typescript" | "python" | "java" | "c" | "cpp" | "csharp" | "php" | "rust";

export interface Candidate {
  _id?: any;
  name: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Snippet {
  candidateId: any;
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
  _id?: any;
  batchId: any;
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
  _id?: any;
  subjectId: any;
  batchId: any;
  status: 'pending' | 'needs_review' | 'completed';
  providerId?: string;
  modelId?: string;
  result?: AssessmentResult;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Batch {
  _id?: any;
  name: string;
  candidateIds: any[]; // Global candidates active for this batch
  description?: string;
  createdAt: Date;
  updatedAt?: Date;
}
