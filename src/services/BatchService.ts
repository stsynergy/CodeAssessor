import { batchRepository } from "@/repositories/BatchRepository";
import { Batch } from "@/types";
import { ObjectId, WithId } from "mongodb";

export class BatchService {
  async getAllBatches(): Promise<WithId<Batch>[]> {
    return batchRepository.findAll();
  }

  async getBatchById(id: string): Promise<WithId<Batch> | null> {
    return batchRepository.findById(id);
  }

  async createBatch(data: Omit<Batch, "_id">): Promise<WithId<Batch>> {
    const preparedData = this.prepareBatchData(data);
    return batchRepository.create(preparedData as any);
  }

  async updateBatch(id: string, data: Partial<Batch>): Promise<boolean> {
    const preparedData = this.prepareBatchData(data);
    return batchRepository.update(id, preparedData);
  }

  async deleteBatch(id: string): Promise<boolean> {
    return batchRepository.delete(id);
  }

  private prepareBatchData(data: Partial<Batch>): Partial<Batch> {
    const prepared = { ...data };
    if (prepared.candidateIds) {
      prepared.candidateIds = prepared.candidateIds.map((id: any) => 
        ObjectId.isValid(id) ? new ObjectId(id) : id
      );
    }
    return prepared;
  }
}

export const batchService = new BatchService();

