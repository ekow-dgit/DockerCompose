const MongoClient = require('mongodb').MongoClient;
const redis = require('redis');

const DB_USER = process.env.MONGO_DB_USERNAME;
const DB_PASS = process.env.MONGO_DB_PASSWORD;
const REDIS_URL = process.env.REDIS_URL || 'redis://cache:6379';
const mongoUrl = `mongodb://${DB_USER}:${DB_PASS}@mongodb`;

const databaseName = "my-db";
const collectionName = "my-collection";
const cacheKey = 'user-data';

async function ingestData() {
  const mongoClient = new MongoClient(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
  const redisClient = redis.createClient({ url: REDIS_URL });

  try {
    await mongoClient.connect();
    await redisClient.connect();
    console.log("Worker connected to MongoDB and Redis");

    const db = mongoClient.db(databaseName);
    const collection = db.collection(collectionName);

    setInterval(async () => {
      const timestamp = new Date().toISOString();
      const randomValue = Math.floor(Math.random() * 100);
      
      const newData = {
        myid: 1,
        name: "Background Worker Data",
        lastUpdated: timestamp,
        status: randomValue > 50 ? "Healthy" : "Maintenance",
        value: randomValue
      };

      // 1. Update MongoDB (The Source of Truth)
      await collection.updateOne(
        { myid: 1 },
        { $set: newData },
        { upsert: true }
      );

      // 2. Push to Redis (Proactive Cache)
      // We don't set an expiry (EX) here because the worker will refresh it every 10s anyway
      await redisClient.set(cacheKey, JSON.stringify(newData));

      console.log(`[Worker] Updated DB & Cache: Value=${randomValue} at ${timestamp}`);
    }, 10000);

  } catch (error) {
    console.error("Worker Error:", error);
    process.exit(1);
  }
}

ingestData();