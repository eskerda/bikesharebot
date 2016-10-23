var url = require('url');
var request = require('request-promise');
var redis = require('redis');

var config = require('./config.js');
var endpoint = 'https://api.citybik.es';
var networks_url = url.resolve(endpoint, '/v2/networks');

class CitybikesCache {
    constructor(options) {
        this.client = redis.createClient(options);
    }

    networks(cb) {
        var self = this;
        this.client.get('networks', function(err, networks) {
            if (!networks) {
                request({uri: networks_url}).then(
                    function(networks) {
                        self.client.setex('networks', config.expire_netlist,
                                          networks);
                        return cb(JSON.parse(networks).networks);
                    }
                );
            } else {
                return cb(JSON.parse(networks).networks);
            }
        });
    }

    network(net, cb) {
        var self = this;
        var id = net.id;
        this.client.get(id, function(err, network) {
            if (!network) {
                var uri = url.resolve(endpoint, net.href);
                request({uri: uri}).then(
                    function(network) {
                        self.client.setex(id, config.expire, network);
                        return cb(JSON.parse(network).network);
                    }
                );
            } else {
                return cb(JSON.parse(network).network);
            }
        });
    }

    nearest(lat, lng, num, cb) {
        // Get networks, find nearest
        // Get network, find nearest
        var distance = function(xy, xy2) {
            return Math.hypot(xy[0] - xy2[0], xy[1] - xy2[1])
        };

        var compare = function(a, b) {
            if (a[1] > b[1])
                return 1;
            else if (a[1] < b[1])
                return -1;
            else
                return 0;
        };
        var self = this;
        self.networks(function(networks) {
            var nearest_net = networks.map(function(el) {
                var xy2 = [el.location.latitude, el.location.longitude];
                return [el, distance([lat, lng], xy2)];
            }).sort(compare)[0][0];
            self.network(nearest_net, function(network) {
                var stations = network.stations.map(function(el) {
                    var xy2 = [el.latitude, el.longitude];
                    return [el, distance([lat, lng], xy2)];
                }).sort(compare).splice(0, num);
                return cb(stations.map(function(el){return el[0];}));
            });
        });
    }
}

module.exports = CitybikesCache;
