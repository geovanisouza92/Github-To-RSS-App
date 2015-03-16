'use strict';

var express = require('express'),
    morgan = require('morgan'),
    githubApi = require('./node-github'),
    RSS = require('rss');

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
    },
    feed = new RSS(feedOptions);

github.authenticate({
    type: 'token',
    token: process.env.OAUTH_TOKEN,
});

app.set('port', Number(process.env.PORT || 3000));

app.use(morgan());

app.get('/', function(req, res) {
    github.notifications.getAll({
        all: true
    }, function(err, ghres) {

        for (var i = 0; i < Math.min(ghres.length, 20); i++) {
            var item = ghres[i];
            feed.item({
                title: item.subject.title,
                description: 'From ' + item.repository.full_name + ' (' + item.repository.description + ')',
                url: item.subject.url.replace('api.', '').replace('repos/', ''),
                date: item.updated_at,
            });
        }

        res.set('Content-Type', 'application/rss+xml');
        res.send(feed.xml());
    });
});

app.listen(app.get('port'), function() {
    console.log('App running on %j', app.get('port'));
});
