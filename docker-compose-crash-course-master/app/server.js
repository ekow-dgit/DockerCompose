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
redisClient.connect();

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, "index.html"));
  });

// when starting app locally, use "mongodb://admin:password@localhost:27017" URL instead
let mongoUrlDockerCompose = `mongodb://${DB_USER}:${DB_PASS}@mongodb`;

// pass these options to mongo client connect request to avoid DeprecationWarning for current Server Discovery and Monitoring engine
let mongoClientOptions = { useNewUrlParser: true, useUnifiedTopology: true };

// the following db and collection will be created on first connect
let databaseName = "my-db";
let collectionName = "my-collection";

app.get('/fetch-data', async function (req, res) {
  let response = {};
  const cacheKey = 'user-data';

  try {
    // Try to get data from Redis cache
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log('Serving from cache');
      return res.send(JSON.parse(cachedData));
    }

    // If not in cache, get from MongoDB
    MongoClient.connect(mongoUrlDockerCompose, mongoClientOptions, function (err, client) {
      if (err) throw err;

      let db = client.db(databaseName);
      let myquery = { myid: 1 };

      db.collection(collectionName).findOne(myquery, async function (err, result) {
        if (err) throw err;
        response = result ? result : {};
        
        // Save to Redis cache for next time
        await redisClient.set(cacheKey, JSON.stringify(response), {
          EX: 5 // Cache expires in 5 seconds
        });

        client.close();
        console.log('Serving from MongoDB');
        res.send(response);
      });
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Error fetching data');
  }
});

app.listen(3000, function () {
  console.log("app listening on port 3000!");
});

