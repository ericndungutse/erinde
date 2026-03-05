import mongoose from "mongoose";
import { MongoMemoryReplSet, MongoMemoryServer } from "mongodb-memory-server";
import { beforeAll, afterAll, afterEach } from "vitest";

let mongoServer: MongoMemoryServer | null = null;

let replSet: MongoMemoryReplSet;

export function setupTestDB() {
  beforeAll(async () => {
    // create in-memory replica set
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1 }, // single-node replica set
    });

    const uri = replSet.getUri();
    await mongoose.connect(uri);
  });

  afterEach(async () => {
    const collections = mongoose.connection.collections;

    for (const key of Object.keys(collections)) {
      const collection = collections[key];
      if (collection) await collection.deleteMany({});
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }

    if (mongoServer) {
      await mongoServer.stop();
      mongoServer = null;
      await replSet.stop();
    }
  });
}
