import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB || "countdown";

if (!uri) {
  throw new Error("MONGODB_URI is not defined");
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // prevent multiple connections in dev (Next.js hot reload)
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!global._mongoClientPromise) {
  client = new MongoClient(uri);
  global._mongoClientPromise = client.connect();
}

clientPromise = global._mongoClientPromise;

export async function getDb() {
  const client = await clientPromise;
  return client.db(dbName);
}
