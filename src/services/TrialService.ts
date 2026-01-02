import { trialRepository } from "@/repositories/TrialRepository";
import { Trial } from "@/types";
import { WithId, ObjectId } from "mongodb";

export class TrialService {
  async getTrials(params: { subjectId?: string; batchId?: string }): Promise<WithId<Trial>[]> {
    if (params.subjectId) {
      return trialRepository.findBySubjectId(params.subjectId);
    }
    if (params.batchId) {
      return trialRepository.findByBatchId(params.batchId);
    }
    return trialRepository.findAll();
  }

  async getTrialById(id: string): Promise<WithId<Trial> | null> {
    return trialRepository.findById(id);
  }

  async createTrial(data: Omit<Trial, "_id">): Promise<WithId<Trial>> {
    const preparedData = {
      ...data,
      subjectId: new ObjectId(data.subjectId),
      batchId: new ObjectId(data.batchId)
    };
    return trialRepository.create(preparedData as any);
  }

  async updateTrial(id: string, data: Partial<Trial>): Promise<boolean> {
    const updateData = { ...data };
    if (updateData.subjectId) updateData.subjectId = new ObjectId(updateData.subjectId);
    if (updateData.batchId) updateData.batchId = new ObjectId(updateData.batchId);
    return trialRepository.update(id, updateData);
  }

  async deleteTrial(id: string): Promise<boolean> {
    return trialRepository.delete(id);
  }
}

export const trialService = new TrialService();

