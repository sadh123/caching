// Import the installed modules.
const express = require('express');
const responseTime = require('response-time')
const axios = require('axios');
const redis = require('redis');
let bodyParser = require('body-parser');
const { json } = require('body-parser');
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
  // Extract the query from url and trim trailing spaces
  //console.log(req);
  const query = req.query.query;
  console.log(query);
  //Sconsole.log(client.lrange(`wikipedia:${query}`, 0, -1 ));
  // Build the Wikipedia API url
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=parse&format=json&section=0&page=${query}`;
  const listKey =JSON.stringify("wikipedia:"+query);
  // Try fetching the result from Redis first in case we have it cached
  return client.lrange(listKey ,(err, result) => {
    // If that key exist in Redis store
    console.log(result);
    if (result) {
      const resultJSON = result;
      console.log("from cache");

      return res.status(200).json(resultJSON);

    } else { // Key does not exist in Redis store
      console.log("from api");
      // Fetch directly from Wikipedia API

      return axios.get(searchUrl)
        .then(response => {
          const responseJSON = response.data;
            const listVar= 'Redis Cache from list';
           // const listKey =JSON.stringify("wikipedia:"+query);
          // Save the Wikipedia API response in Redis store
          client.RPUSH (listKey,listVar);
          // Send JSON response to client
          return res.status(200).json({ source: 'Wikipedia API', ...responseJSON, });
        })
        .catch(err => {
          return res.json(err);
        });
    }
  });
});

app.listen(5000, () => {
  console.log('Server listening on port: ', 5000);
});