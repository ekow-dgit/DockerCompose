const MongoClient = require('mongodb').MongoClient;

const DB_USER = process.env.MONGO_DB_USERNAME;
const DB_PASS = process.env.MONGO_DB_PASSWORD;
const mongoUrl = `mongodb://${DB_USER}:${DB_PASS}@mongodb`;

const databaseName = "my-db";
const collectionName = "my-collection";

async function ingestData() {
  const client = new MongoClient(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    await client.connect();
    console.log("Worker connected to MongoDB");
    const db = client.db(databaseName);
    const collection = db.collection(collectionName);

    // Run every 10 seconds
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

      await collection.updateOne(
        { myid: 1 },
        { $set: newData },
        { upsert: true }
      );

      console.log(`[Worker] Ingested new data: Value=${randomValue} at ${timestamp}`);
    }, 10000);

  } catch (error) {
    console.error("Worker Error:", error);
    process.exit(1);
  }
}

ingestData();
