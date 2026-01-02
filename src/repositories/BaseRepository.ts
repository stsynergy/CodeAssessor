import { Db, ObjectId, Collection, Document, Filter, OptionalUnlessRequiredId, WithId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export abstract class BaseRepository<T extends Document> {
  protected abstract collectionName: string;

  protected async getCollection(): Promise<Collection<T>> {
    const db = await getDb();
    return db.collection<T>(this.collectionName);
  }

  protected toObjectId(id: string | ObjectId): ObjectId {
    if (id instanceof ObjectId) return id;
    if (!ObjectId.isValid(id)) {
      throw new Error(`Invalid ObjectId: ${id}`);
    }
    return new ObjectId(id);
  }

  async findById(id: string | ObjectId): Promise<WithId<T> | null> {
    const collection = await this.getCollection();
    return collection.findOne({ _id: this.toObjectId(id) } as any);
  }

  async findAll(query: Filter<T> = {}, sort: any = { createdAt: -1 }): Promise<WithId<T>[]> {
    const collection = await this.getCollection();
    return collection.find(query).sort(sort).toArray();
  }

  async create(data: OptionalUnlessRequiredId<T>): Promise<WithId<T>> {
    const collection = await this.getCollection();
    const result = await collection.insertOne({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    return { ...data, _id: result.insertedId } as unknown as WithId<T>;
  }

  async update(id: string | ObjectId, data: Partial<T>): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.updateOne(
      { _id: this.toObjectId(id) } as any,
      { 
        $set: { 
          ...data, 
          updatedAt: new Date() 
        } 
      }
    );
    return result.matchedCount > 0;
  }

  async delete(id: string | ObjectId): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.deleteOne({ _id: this.toObjectId(id) } as any);
    return result.deletedCount > 0;
  }
}

