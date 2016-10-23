const url = require('url');
var TelegramBot = require('node-telegram-bot-api');

var config = require('./config.js');
var CitybikesCache = require('./cb_cache.js');


var Cb = new CitybikesCache(config.redis);

// Cb.networks(function(data) {
//     console.log(data.networks[0]);
//     Cb.network(data.networks[0], function(data) {
//         console.log(data.network.stations[0]);
//     });
// });

var get_stations_and_send = function(lat, lng, bot, msg) {
    var msgFormatStations = function(stations) {
        var i = 0;
        stations.forEach(function(station) {
            var text = '**' + station.name + '**';
            text += '\n';
            text += station.free_bikes + ' 🚲';
            text += ' ' + station.empty_slots + ' 🅿';
            var options = {
                parse_mode: 'Markdown',
            };
            setTimeout(function() {
                bot.sendLocation(msg.from.id, station.latitude,
                                 station.longitude)
                bot.sendMessage(msg.from.id, text, options);
            }, i * 1000);
            i++;
        });
    };
    Cb.nearest(lat, lng, 5, msgFormatStations);
}
var init = function(networks) {
    var bot = new TelegramBot(config.token, {polling: true});
    bot.on('location', function(msg) {
        var lat = msg.location.latitude;
        var lng = msg.location.longitude;
        return get_stations_and_send(lat, lng, bot, msg);
    });

    bot.onText(/\/address$/, function(msg, match) {
        bot.sendMessage(msg.from.id, 'ie: /address Foo Street 10, BarCity')
    });

    bot.onText(/\/address (.*)/, function(msg, match) {
        var address = match[1];
    });
};

Cb.networks(init);
