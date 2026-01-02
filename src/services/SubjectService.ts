import { subjectRepository } from "@/repositories/SubjectRepository";
import { candidateRepository } from "@/repositories/CandidateRepository";
import { trialRepository } from "@/repositories/TrialRepository";
import { batchRepository } from "@/repositories/BatchRepository";
import { Subject, Snippet } from "@/types";
import { WithId, ObjectId } from "mongodb";

export class SubjectService {
  async getAllSubjects(batchId?: string): Promise<WithId<Subject>[]> {
    if (batchId) {
      return subjectRepository.findByBatchId(batchId);
    }
    return subjectRepository.findAll();
  }

  async getSubjectById(id: string): Promise<WithId<Subject> | null> {
    return subjectRepository.findById(id);
  }

  async createSubject(data: Omit<Subject, "_id">): Promise<WithId<Subject>> {
    // Ensure batchId is an ObjectId
    const preparedData = {
      ...data,
      batchId: new ObjectId(data.batchId)
    };
    return subjectRepository.create(preparedData as any);
  }

  async updateSubject(id: string, data: Partial<Subject>): Promise<boolean> {
    const updateData = { ...data };
    if (updateData.batchId) {
      updateData.batchId = new ObjectId(updateData.batchId);
    }
    return subjectRepository.update(id, updateData);
  }

  async deleteSubject(id: string): Promise<boolean> {
    return subjectRepository.delete(id);
  }

  async importSubjects(batchId: string, items: any[]): Promise<void> {
    const allCandidates = await candidateRepository.findAll();
    const batch = await batchRepository.findById(batchId);
    if (!batch) throw new Error("Batch not found");

    const batchCandidateIds = new Set((batch.candidateIds || []).map(id => id.toString()));
    let lineupChanged = false;
    
    for (const item of items) {
      const mappedSnippets: Snippet[] = [];
      if (Array.isArray(item.snippets)) {
        for (const s of item.snippets) {
          const globalCand = allCandidates.find(c => c.name.toLowerCase() === s.name.toLowerCase());
          if (globalCand) {
            mappedSnippets.push({
              candidateId: globalCand._id!,
              content: s.content
            });

            // Ensure candidate is in the batch lineup
            if (!batchCandidateIds.has(globalCand._id.toString())) {
              batchCandidateIds.add(globalCand._id.toString());
              lineupChanged = true;
            }
          }
        }
      }

      const subjectData: Omit<Subject, "_id"> = {
        batchId: new ObjectId(batchId),
        thingName: item.thingName || "Untitled",
        context: item.context || "",
        language: item.language || "javascript",
        trialsNeeded: item.trialsNeeded || 3,
        snippets: mappedSnippets,
        providerId: item.providerId,
        modelId: item.modelId,
        createdAt: new Date()
      };

      const savedSubject = await subjectRepository.create(subjectData as any);
      
      // Create initial trials
      for (let i = 0; i < (subjectData.trialsNeeded || 3); i++) {
        await trialRepository.create({
          subjectId: savedSubject._id,
          batchId: new ObjectId(batchId),
          status: 'pending',
          providerId: item.providerId,
          modelId: item.modelId,
          createdAt: new Date()
        } as any);
      }
    }

    if (lineupChanged) {
      await batchRepository.update(batchId, { 
        candidateIds: Array.from(batchCandidateIds).map(id => new ObjectId(id)) 
      });
    }
  }
}

export const subjectService = new SubjectService();

