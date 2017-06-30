'use strict';
var _ = require('underscore')
var https = require('https');
var util = require('util');
var os = require('os');
var fs = require('fs');

var home
try {
  home = __dirname.match(/^\/home\/[^\/]+/)[0]
} catch (e) {
  home = '/home/ubuntu'
}

// helpers
var l = console.log;
var e = console.error;
function lo(obj) {
  l(util.inspect(obj, {depth: null, colors: true}));
}

// API methods
var METHOD_SET_WEBHOOK = 'setWebhook';
var METHOD_SEND_MESSAGE = 'sendMessage';



// read params
var homeDir = home + '/.quote-bot/';
var params = require(homeDir + 'conf.json');
l('read params:');
lo(params);



// read quotes
var quote = {}
_.each(['en', 'ru'], function (ln) {
  quote[ln] = fs.readFileSync(homeDir + ln + '2', {encoding: 'utf8'}).split(os.EOL)
  quote[ln] = _.filter(quote[ln], function (d) {return /^\*/.test(d)})
  quote[ln] = _.map(quote[ln], function (d) {return d.replace(/^\*/, '')})
})

function setWebhook () {
  https.get(util.format('%s%s/%s?url=%s', params.apiUrl, params.apiKey, METHOD_SET_WEBHOOK, params.webHookUrl), function(res) {
    l('response', res.statusCode);

    var data = '';
    res
      .on('data', function (chunk) {
        data += chunk;
      })
      .on('end', function() {
        l(data);

        // trustNo1
        try {
          data = JSON.parse(data);
        }
        catch(err) {
          e('JSON parse error', err);
          return;
        }

        if (data.ok === false) {
          e('something bad happened');
          lo(data);
          return;
        }

        l('webhook set successful');
      });
  }).on('error', function(err) {
    e('error setting webhook', err.message);
  });
}



function processUpdate(update) {
  if (!update.message)
    return;
  l();
  l('processUpdate');
  lo(update);

  https.get(util.format('%s%s/%s?chat_id=%s&reply_to_message_id=%s&text=%s', params.apiUrl, params.apiKey,
                        METHOD_SEND_MESSAGE, update.message.chat.id, update.message.messsage_id,
                        encodeURI(getRandomQuote(update.message.text))), function(res) {
    l('response', res.statusCode);
  });

}



function getRandomQuote (msgText) {
  var ln = 'en'
  if (/[а-яА-Я]/.test(msgText))
    ln = 'ru'
  return _.sample(quote[ln])
}



module.exports = function () {
  setWebhook();
  return function (req, res, next) {
    l(req.url);
    processUpdate(req.body);
    res.end()
  }
};
