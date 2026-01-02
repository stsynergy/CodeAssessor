import { Subject } from "@/types";
import { BaseRepository } from "./BaseRepository";
import { WithId, ObjectId } from "mongodb";

export class SubjectRepository extends BaseRepository<Subject> {
  protected collectionName = "subjects";

  async findByBatchId(batchId: string | ObjectId): Promise<WithId<Subject>[]> {
    return this.findAll({ batchId: this.toObjectId(batchId) } as any);
  }
}

export const subjectRepository = new SubjectRepository();

