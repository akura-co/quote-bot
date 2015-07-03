'use strict';
var https = require('https');
var util = require('util');
var os = require('os');
var fs = require('fs');

// helpers
var l = console.log;
var e = console.error;
function lo(obj) {
  l(util.inspect(obj, {depth: null, colors: true}));
}

// API methods
var METHOD_GET_UPDATES = 'getUpdates';
var METHOD_SET_WEBHOOK = 'setWebhook';
var METHOD_SEND_MESSAGE = 'sendMessage';




// read params
var homeDir = (process.env.HOME || process.env.USERPROFILE) + '/.quoteBot/';
var params = require(homeDir + 'conf.json');
l('read params:');
lo(params);


// read quotes
var rusQuotes = fs.readFileSync(homeDir + 'ru').toString().trimRight().split(os.EOL);
var rusQuotesLength = rusQuotes.length;
var engQuotes = fs.readFileSync(homeDir + 'en').toString().trimRight().split(os.EOL);
var engQuotesLength = engQuotes.length;

/*
// starting
var maxUpdateId = '';
if (params.webHookUrl) {
  // use webhook
  listenUpdates();
}
else {
  // manually checking for updates
  checkForUpdates();
}
*/

// TODO need testing
function listenUpdates(){
  l();
  l('listenUpdates');

  function startServer(){

    /*var options = {
     key: fs.readFileSync(homeDir + 'key.pem'),
     cert: fs.readFileSync(homeDir + 'cert.pem')
     // or pfx: fs.readFileSync('server.pfx')
     };*/

    // starting webserver
    https.createServer(options, function (req, res) {
      l();
      l('got update request');

      res.statusCode = 200; // ?

      var data = '';
      req
        .on('data', function (chunk) { // receiving data
          data += chunk;
        })
        .on('end', function() { // all data received
          // trustNo1
          try {
            data = JSON.parse(data);
          }
          catch(err) {
            e('JSON parse error');
            lo(err);
            res.end('bad'); // ?
            return;
          }

          res.end('good'); // ?
          processOneUpdate(data);
        });
    }).listen();
  }

  setWebhook()
}

function setWebhook () {
  https.get(util.format('%s%s/%s?url=%s', params.apiUrl, params.apiKey, METHOD_SET_WEBHOOK, params.webHookUrl), function(res) {
    l('response', res.statusCode);

    var data = '';
    res
      .on('data', function (chunk) {
        data += chunk;
      })
      .on('end', function() {
        // trustNo1
console.log(data)
        try {
          data = JSON.parse(data);
        }
        catch(err) {
          e('JSON parse error');
          lo(err);
          return;
        }

        if (data.ok === false) {
          e('something bad happened');
          lo(data);
          return;
        }

        // everything is good
        l('webhook setup successful');
//        startServer();
      });
  }).on('error', function(err) {
    e('webhook setup error', e.message);
  });
}

function checkForUpdates() {
  l();
  l('checkForUpdates');

  function checkAgain(){
    setTimeout(checkForUpdates, params.getUpdatesInterval);
  }

  https
    .get(util.format('%s%s/%s?offset=%s', params.apiUrl, params.apiKey, METHOD_GET_UPDATES, maxUpdateId), function(res) {
    l('response', res.statusCode);

    var data = '';
    res
      .on('data', function (chunk) { // receiving data
        l('got body chunk');
        data += chunk;
      })
      .on('end', function() { // all data received
        // trustNo1
        try {
          data = JSON.parse(data);
        }
        catch(err) {
          e('JSON parse error');
          lo(err);
          checkAgain();
          return;
        }

        if (data.ok === false) {
          e('something bad happened');
          lo(data);
          checkAgain();
          return;
        }

        // everything is good
        if (data.result.length) {
          processUpdates(data);
        }
        else {
          l('no updates yet');
        }

        checkAgain();
      });
  })
    .on('error', function(e) {
      l('error checking updates', e.message);
      checkAgain();
    });
}



function processUpdates(data){
  l();
  l('processUpdates');

  // iterate updates
  data.result.forEach(function(update){
    processOneUpdate(update)
  });

  // increase to confirm updates
  maxUpdateId = Number.parseInt(maxUpdateId) + 1;
  l('new maxUpdateId:', maxUpdateId);
}



function processOneUpdate(update) {
  l();
  l('processOneUpdate');
  lo(update);

  // will use it with METHOD_GET_UPDATES
  var maxUpdateId = update.update_id;

  https.get(util.format('%s%s/%s?chat_id=%s&reply_to_message_id=%s&text=%s', params.apiUrl, params.apiKey,
                        METHOD_SEND_MESSAGE, update.message.chat.id, update.message.messsage_id,
                        encodeURI(getRandomQuote(update.message.text))), function(res) {
    l('response', res.statusCode);
  });

}



function getRandomQuote(msgText) {
  var quotes;
  var length;
  if (/[а-яА-Я]/.test(msgText)) {
    quotes = rusQuotes;
    length = rusQuotesLength;
  }
  else {
    quotes = engQuotes;
    length = engQuotesLength;
  }

  return quotes[Math.floor(Math.random() * quotes.length)];
}

module.exports = function () {
  setWebhook()
  return function (req, res, next) {
l(req.url)
    processOneUpdate(req.body)
    res.end()
  }
}

