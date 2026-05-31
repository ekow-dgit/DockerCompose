let express = require('express');
let path = require('path');
let fs = require('fs');
let MongoClient = require('mongodb').MongoClient;
let bodyParser = require('body-parser');
let redis = require('redis');
let app = express();

const DB_USER = process.env.MONGO_DB_USERNAME;
const DB_PASS = process.env.MONGO_DB_PASSWORD;
const REDIS_URL = process.env.REDIS_URL || 'redis://cache:6379';

const redisClient = redis.createClient({
  url: REDIS_URL
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

let db;
let client;

async function connectToDatabases() {
  try {
    await redisClient.connect();
    console.log('Connected to Redis');

    client = await MongoClient.connect(mongoUrlDockerCompose, mongoClientOptions);
    db = client.db(databaseName);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Initial connection error:', err);
    // Optionally, you might want to retry or exit
    // process.exit(1);
  }
}

connectToDatabases();

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, "index.html"));
  });

// when starting app locally, use "mongodb://admin:password@localhost:27017" URL instead
let mongoUrlDockerCompose = `mongodb://${DB_USER}:${DB_PASS}@mongodb?authSource=admin`;

// pass these options to mongo client connect request to avoid DeprecationWarning for current Server Discovery and Monitoring engine
let mongoClientOptions = { useNewUrlParser: true, useUnifiedTopology: true };

// the following db and collection will be created on first connect
let databaseName = "my-db";
let collectionName = "my-collection";

app.get('/fetch-data', async function (req, res) {
  const cacheKey = 'user-data';

  try {
    // 1. Always try Redis first
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log('Serving from Redis (Fast Path)');
      return res.send(JSON.parse(cachedData));
    }

    // 2. Fallback to MongoDB only if Redis is empty
    console.log('Cache miss, falling back to MongoDB');
    
    if (!db) {
        return res.status(500).send('Database not connected');
    }

    let myquery = { myid: 1 };
    const result = await db.collection(collectionName).findOne(myquery);
    let response = result ? result : {};
    res.send(response);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Error fetching data');
  }
});

app.listen(3000, function () {
  console.log("app listening on port 3000!");
});
