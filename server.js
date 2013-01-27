var express = require('express')
  , app = express()
  , bracelet = require('./lib/bracelet')
  , ejs = require('ejs')
  , redis = require('redis')
  , ga = require('ga')
  , history = { data: [] }
  , client;

ga = new ga('UA-20991800-8', 'echojson.com');

/**
 * Redis settings.
 */

if (process.env.REDISTOGO_URL) {
  var rtg = require('url').parse(process.env.REDISTOGO_URL);
  client = redis.createClient(rtg.port, rtg.hostname);
  client.auth(rtg.auth.split(':')[1]);} else {
  client = redis.createClient();
}

/**
 * Express settings.
 */

app.use(express.logger());
app.use(express.errorHandler({
  dumpExceptions: true,
  showStack: true
}));

app.use(express.static(__dirname + '/public'));
app.use(express.bodyParser());
app.engine('html', require('ejs').renderFile);

/**
 * Redirect from www to non www.
 */

app.use(function (req, res, next) {
  var host = (req.header('host') || '').split(':')[0];
  if (host.indexOf('www') !== -1) {
    res.redirect(req.protocol + '://' + host.replace('www.', ''));
  } else {
    next();
  }
});

/**
 * Load data from Redis and parse the JSON into the history data array.
 */

if (!history.data.length) {
  client.get('history', function (err, reply) {
    if (err === null && reply.length && typeof reply[0] === 'string') {
      history.data = JSON.parse(reply);
    }
  });
}

/**
 * Add `obj` to history array.
 *
 * @param {Object} obj
 */

history.add = function (obj) {
  obj.path = obj.path.replace('%7B', '{').replace('%7D', '}').replace('%22', '"');
  this.data.unshift(obj);
  while(this.data.length > 20) this.data.pop();
  client.set('history', JSON.stringify(this.data));
};

/**
 * Register get index route with Express.
 *
 * Returns the JSON you posted to the route or 404.
 */

app.get('/', function (req, res) {
  res.render('index.html');
});

/**
 * Register get history route with Express.
 *
 * Returns the JSON you posted to the route or 404.
 */

app.get('/_history', function (req, res) {
  ga.trackPage('_history');
  ga.trackEvent({
    category: 'history',
    action: 'GET /_history',
  });

  if (req.query.callback) {
    res.jsonp(history.data);
  } else {
    res.send(history.data);
  }
});

/**
 * Register delete history route with Express.
 *
 * Returns the JSON you posted to the route or 404.
 */

app.del('/_history', function (req, res) {
  var json = { ok: true };

  client.set('history', '');
  history.data = [];

  ga.trackPage('_history');
  ga.trackEvent({
    category: 'history',
    action: 'DELETE /_history',
  });

  if (req.query.callback) {
    res.jsonp(json);
  } else {
    res.send(json);
  }
});

/**
 * Register get JSON route with Express.
 *
 * Returns the JSON you posted to the route or 404.
 */
 
app.get('/*', function (req, res, next) {
  var _history = req.query.history || true
    , param = req.params[0];
  
  if ('favicon.ico' === param) {
    return next();
  }
  
  ga.trackPage(param);
  ga.trackEvent({
    category: 'JSON',
    action: 'GET JSON',
  });
  
  var json = bracelet.toJSON(param.split('/'));
  
  if (_history && 'false' !== _history) {
    history.add({ path: req.path, verb: 'GET', data: json });
  }
  
  if (req.query.callback) {
    res.jsonp(json);
  } else {
    res.send(json);
  }
});

/**
 * Register post JSON route with Express.
 *
 * Returns the JSON you posted to the route or 404.
 */

app.post('/*', function (req, res) {
  var _history = req.query.history || true;
  
  ga.trackPage(req.params[0]);
  ga.trackEvent({
    category: 'JSON',
    action: 'POST JSON',
  });
  
  if ('object' === typeof req.body) {
    if (_history && 'false' !== _history) {
      history.add({ path: req.path, verb: 'POST', data: req.body });
    }
    
    if (req.query.callback) {
      res.jsonp(req.body);
    } else {
      res.send(req.body);
    }
  } else {
    res.send(404);
  }
});

/**
 * Listen to environment port or 3000.
 */
 
app.listen(process.env.PORT || 3000);