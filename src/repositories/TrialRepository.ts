import { Trial } from "@/types";
import { BaseRepository } from "./BaseRepository";
import { WithId, ObjectId } from "mongodb";

export class TrialRepository extends BaseRepository<Trial> {
  protected collectionName = "trials";

  async findBySubjectId(subjectId: string | ObjectId): Promise<WithId<Trial>[]> {
    return this.findAll({ subjectId: this.toObjectId(subjectId) } as any);
  }

  async findByBatchId(batchId: string | ObjectId): Promise<WithId<Trial>[]> {
    return this.findAll({ batchId: this.toObjectId(batchId) } as any);
  }
}

export const trialRepository = new TrialRepository();

