import { MongoMemoryReplSet, MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll } from "vitest";

let mongoServer: MongoMemoryServer | null = null;

let replSet: MongoMemoryReplSet;

export function setupTestDB() {
  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1 },
    });

    const uri = replSet.getUri();
    await mongoose.connect(uri);
    return replSet;
  });

  afterEach(async () => {
    // Standard cleanup
    const collections = mongoose.connection.collections;
    for (const key of Object.keys(collections)) {
      const collection = collections[key];
      if (collection) await collection.deleteMany({});
    }
  });

  afterAll(async () => {
    // 1. Close Mongoose connection first
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    // 2. ALWAYS stop the replSet if it exists
    if (replSet) {
      // 'true' ensures the storage directory is deleted even if the process is stubborn
      await replSet.stop({ doCleanup: true });
    }
  });
}
