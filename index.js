var _ = require('underscore')
var fs = require('fs')
var package = require('./package')

module.exports = () => {
  var quote = _.object(_.map(['en', 'ru'], ln =>
    [ln, _.filter(_.map(fs.readFileSync(__dirname + '/../.' + package.name + '/' + ln, 'utf8').split('\n'), d => d.trim(), _.identity))]
  ))
  return (req, res) => {
    console.log(req.body)
    if (!req.body.message)
      return res.end()
    var ln = 'en'
    if (req.body.message && /[а-яА-Я]/.test(req.body.message.text))
      ln = 'ru'
    var text = _.sample(quote[ln])
    res.json({method: 'sendMessage', chat_id: req.body.message.chat.id, text: text})
  }
}
