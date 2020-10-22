// Import the installed modules.
const express = require('express');
const responseTime = require('response-time')
const axios = require('axios');
const redis = require('redis');
let bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json());



//app.use(bodyParser.urlencoded({ extended: false }));
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
const REDISCACHEHOSTNAME = 'shopmandu.redis.cache.windows.net';
const REDISCACHEKEY = 'GUHnxVwKtOa27Xz3eVHN++u9M3S9GZhNlZstBuSdrxk=';
// create and connect redis client to local instance.
const client = redis.createClient(6380, REDISCACHEHOSTNAME,
  { auth_pass: REDISCACHEKEY, tls: { servername: REDISCACHEHOSTNAME } });

// Print redis errors to the console
client.on('error', (err) => {
  console.log("Error " + err);
});

// use response-time as a middleware
app.use(responseTime());


// create an api/search route
app.get('/api/search', (req, res) => {
  var start = new Date();
  // Extract the query from url and trim trailing spaces
  //console.log(req);
  const query = req.query.query;
  console.log(query);
  // Build the Wikipedia API url
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=parse&format=json&section=0&page=${query}`;

  // Try fetching the result from Redis first in case we have it cached
  return client.get(`wikipedia:${query}`, (err, result) => {
    // If that key exist in Redis store
    if (result) {
      const resultJSON = JSON.parse(result);
      console.log("from cache");
      console.log('Request took:', new Date() - start, 'ms');
      return res.status(200).json(resultJSON);

    } else { // Key does not exist in Redis store
      console.log("from api");
      // Fetch directly from Wikipedia API

      return axios.get(searchUrl)
        .then(response => {
          const responseJSON = response.data;

          // Save the Wikipedia API response in Redis store
          client.setex(`wikipedia:${query}`, 3600, JSON.stringify({ source: 'Redis Cache string', ...responseJSON, }));
          // Send JSON response to client
          console.log('Request took:', new Date() - start, 'ms');
          return res.status(200).json({ source: 'Wikipedia API', ...responseJSON, });
        })
        .catch(err => {
          return res.json(err);
        });
    }
  });
});

app.listen(1000, () => {
  console.log('Server listening on port: ', 1000);
});