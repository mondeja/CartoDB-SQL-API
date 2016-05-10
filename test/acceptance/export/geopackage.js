require('../../helper');

var app = require(global.settings.app_root + '/app/app')();
var assert = require('../../support/assert');
var sqlite = require('sqlite3');
var fs      = require('fs');

describe('geopackage query', function(){
    // Default name, cartodb-query, fails because of the hyphen.
    var table_name = 'a_gpkg_table'

    it('returns a valid geopackage database', function(done){
        assert.response(app, {
            url: '/api/v1/sql?q=SELECT%20*%20FROM%20untitle_table_4%20LIMIT%201&format=geopackage&filename=' + table_name,
            headers: {host: 'vizzuality.cartodb.com'},
            method: 'GET'
        },{ }, function(res) {
            assert.equal(res.statusCode, 200, res.body);
            assert.equal(res.headers["content-type"], "application/x-sqlite3; charset=utf-8");
            console.log(res.headers["content-disposition"])
            assert.notEqual(res.headers["content-disposition"].indexOf(table_name + ".gpkg"), -1);
            var db = new sqlite.Database(':memory:', res.body);
            var qr = db.get("PRAGMA database_list", function(err){
                assert.equal(err, null);
                done();
            });
            assert.notEqual(qr, undefined);
        });

    });

    it('gets database and geopackage schema', function(done){
        assert.response(app, {
            url: '/api/v1/sql?q=SELECT%20*%20FROM%20untitle_table_4%20LIMIT%201&format=geopackage&filename=' + table_name,
            headers: {host: 'vizzuality.cartodb.com'},
            encoding: 'binary',
            method: 'GET'
        },{ }, function(res) {
            var tmpfile = '/tmp/a_geopackage_file.gpkg';
            try {
              fs.writeFileSync(tmpfile, res.body, 'binary');
            } catch(err) {
              return done(err);
            }

            var db = new sqlite.Database(tmpfile, function(err) {
              if(!!err) {
                return done(err);
              }

              db.serialize(function() {
                var schemaQuery = "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name";
                var sqr = db.get(schemaQuery, function(err, row) {
                  assert.equal(err, null);
                  assert.equal(row.name, table_name);
                });
                assert.notEqual(sqr, undefined);

                var gpkgQuery = "SELECT table_name FROM gpkg_contents";
                var gqr = db.get(gpkgQuery, function(err, row) {
                  assert.equal(row.table_name, table_name);
                  assert.equal(err, null);
                });
                assert.notEqual(gqr, undefined);

                var dataQuery = "SELECT * FROM " + table_name + " order by cartodb_id";
                var dqr = db.get(dataQuery, function(err, row) {
                  assert.equal(err, null);
                  assert.equal(row.cartodb_id, 1);
                  assert.equal(row.name, 'Hawai');
                  done();
                });
                assert.notEqual(dqr, undefined);
              });
            });
        });
    });

});
