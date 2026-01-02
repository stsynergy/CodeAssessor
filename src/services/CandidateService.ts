import { candidateRepository } from "@/repositories/CandidateRepository";
import { Candidate } from "@/types";
import { ObjectId, WithId } from "mongodb";

export class CandidateService {
  async getAllCandidates(): Promise<WithId<Candidate>[]> {
    return candidateRepository.findAll();
  }

  async getCandidateById(id: string): Promise<WithId<Candidate> | null> {
    return candidateRepository.findById(id);
  }

  async createCandidate(data: Omit<Candidate, "_id">): Promise<WithId<Candidate>> {
    return candidateRepository.create(data as any);
  }

  async updateCandidate(id: string, data: Partial<Candidate>): Promise<boolean> {
    return candidateRepository.update(id, data);
  }

  async deleteCandidate(id: string): Promise<boolean> {
    return candidateRepository.delete(id);
  }
}

export const candidateService = new CandidateService();

