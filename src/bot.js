
'use strict'

const slack = require('slack')
const _ = require('lodash')
const config = require('./config')
const https = require('https')
const String = require('string')

var Botkit = require('botkit');

var controller = Botkit.slackbot({
    debug: true
});

var bot = controller.spawn({
    token: config('SLACK_TOKEN')
}).startRTM();

controller.hears(['hello'], 'direct_message,ambient', function(bot, message) {
  bot.reply(message, 'yesssss');
});


controller.hears([/[A-Z]+-[0-9]+/g], 'direct_message,ambient', function(bot, message) {
  getTicketDescription(message, 0);
});

function getTicketDescription(message, index) {
  var title = message.match[index];
  var options = {
    auth: 'angel.suhardi:Msuha_1234',
    hostname: 'placed.atlassian.net',
    port: 443,
    path: '/rest/api/2/issue/' + title,
    method: 'GET'
  };

  var req = https.request(options, function(res) {
    console.log('STATUS: ' + res.statusCode);
    console.log('HEADERS: ' + JSON.stringify(res.headers));
    var body = '';
    res.on('data', function(d) {
      body += d;
    });

    res.on('end', function(e) {
      if (String(res.statusCode).startsWith("2")) {
        var data = JSON.parse(body);
        var description = data.fields.description;
        var summary = data.fields.summary;
        var issue_type = data.fields.issuetype.name;
        var project = data.fields.project.name;
        var status = data.fields.status.name;
        var assignee = data.fields.assignee ? data.fields.assignee.displayName : 'Unassigned';

        var color_code = '';
        var color = data.fields.status.statusCategory.colorName;
        switch(color) {
          case "green":
            color_code = "good";
            break;
          case "yellow":
            color_code = "warning";
            break;
          case "red":
            color_code = "danger";
            break;
        }


        bot.reply(message, {
              'attachments' :[
                  {
                      'author_name': project + ' | ' + title,
                      'author_link': 'https://placed.atlassian.net/browse/' + title,
                      'color': color_code,
                      'text': description,
                      'title': summary,
                      'title_link': 'https://placed.atlassian.net/browse/' + title,
                      'footer': issue_type,
                      'footer_icon': 'http://mariasuhardi.com/assets/images/' + issue_type + '.png',
                      'fields': [
                        {
                            "title": "Status",
                            "value": status,
                            "short": true
                        },
                        {
                            "title": "Assignee",
                            "value": assignee,
                            "short": true
                        }
                      ]
                  }
              ]
          });

          if((message.match.length - (index + 1)) > 0) {
            getTicketDescription(message, index + 1)
          }
        } else {
          bot.reply(message, {
              "text": "_Oops, looks like_ `" + title + "` _does not exist._"
          })
        }
      })
  });
  req.end();
}

module.exports = bot
