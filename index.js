'use strict';

var express = require('express'),
    morgan = require('morgan'),
    githubApi = require('./node-github'),
    RSS = require('rss'),
    request = require('request');

var app = express(),
    github = new githubApi({
        version: '3.0.0',
        protocol: 'https',
        timeout: 3000,
        headers: {
            'user-agent': 'Github-To-RSS-App',
        },
    }),
    feedOptions = {
        title: 'GitHub Notifications',
        description: 'GitHub Notifications feed',
        generator: 'Github-To-RSS-App',
        site_url: '',
    };

github.authenticate({
    type: 'token',
    token: process.env.OAUTH_TOKEN,
});

app.set('port', Number(process.env.PORT || 3000));

app.use(morgan());

app.get('/', function(req, res) {
    res.send('Hello world!');
});

app.get('/feed', function(req, res) {
    console.time('Request time');
    console.time('GitHub API query');
    github.notifications.getAll({
        all: true
    }, function(err, ghres) {
        var items = ghres.filter(function(it) {
            return !!it.unread;
        });
        console.timeEnd('GitHub API query');

        console.time('Feed generation');
        var feed = new RSS(feedOptions);
        for (var i = 0; i < Math.min(items.length, 20); i++) {
            var item = items[i];
            var id = new Buffer(item.subject.url).toString('base64');
            feed.item({
                title: item.subject.title,
                description: 'From ' + item.repository.full_name + ' (' + item.repository.description + ')',
                url: req.protocol + '://' + req.get('host') + '/track/' + id,
                date: item.updated_at,
                guid: id,
            });
        }
        console.timeEnd('Feed generation');

        res.set('Content-Type', 'application/rss+xml');
        res.send(feed.xml());
        console.timeEnd('Request time');
    });
});

app.get('/track/:url', function(req, res) {
    var url = new Buffer(req.param('url'), 'base64').toString('ascii');
    request({
        url: url,
        headers: {
            'User-Agent': 'Github-To-RSS-App/1.0',
        },
    }, function(err, response, body) {
        if (!err && response.statusCode == 200) {
            var obj = JSON.parse(body);
            var redir = obj._links.html.href;
            res.redirect(redir);
        } else {
            res.status(500).send(response);
        }
    })
});

app.listen(app.get('port'), function() {
    console.log('App running on %j', app.get('port'));
});
