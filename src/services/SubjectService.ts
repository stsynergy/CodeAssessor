import { subjectRepository } from "@/repositories/SubjectRepository";
import { Subject } from "@/types";
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
}

export const subjectService = new SubjectService();

