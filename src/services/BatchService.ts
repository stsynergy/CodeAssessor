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

  async getOrCreatePlaygroundBatch(candidateIds: string[]): Promise<WithId<Batch>> {
    const batches = await batchRepository.findAll({ name: "Playground" } as any);
    let playgroundBatch = batches[0];

    if (!playgroundBatch) {
      playgroundBatch = await batchRepository.create({
        name: "Playground",
        candidateIds: candidateIds.map(id => new ObjectId(id)),
        createdAt: new Date(),
      } as any);
    } else {
      // Ensure all candidates are in the lineup
      const existingIdsSet = new Set(playgroundBatch.candidateIds.map((id: any) => id.toString()));
      const missingIds = candidateIds.filter(id => !existingIdsSet.has(id));

      if (missingIds.length > 0) {
        const newCandidateIds = [
          ...playgroundBatch.candidateIds,
          ...missingIds.map(id => new ObjectId(id))
        ];
        await batchRepository.update(playgroundBatch._id.toString(), { candidateIds: newCandidateIds });
        playgroundBatch.candidateIds = newCandidateIds;
      }
    }

    return playgroundBatch;
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

