import { Batch } from "@/types";
import { BaseRepository } from "./BaseRepository";
import { WithId } from "mongodb";

export class BatchRepository extends BaseRepository<Batch> {
  protected collectionName = "batches";

  async findByName(name: string): Promise<WithId<Batch> | null> {
    const collection = await this.getCollection();
    return collection.findOne({ name } as any);
  }
}

export const batchRepository = new BatchRepository();

