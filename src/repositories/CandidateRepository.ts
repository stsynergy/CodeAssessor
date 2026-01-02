import { Candidate } from "@/types";
import { BaseRepository } from "./BaseRepository";
import { WithId } from "mongodb";

export class CandidateRepository extends BaseRepository<Candidate> {
  protected collectionName = "candidates";

  async findByName(name: string): Promise<WithId<Candidate> | null> {
    const collection = await this.getCollection();
    return collection.findOne({ name } as any);
  }
}

export const candidateRepository = new CandidateRepository();

