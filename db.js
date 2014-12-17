var pg = require('pg');

var db = {};

db.config = {
  database: "bartstopdb",
  port: 5432,
  host: "localhost"
};

//Connect to database
db.connect = function(runAfterConnecting) {
  pg.connect(db.config, function(err, client, done){
    if (err) {
      console.error("OOOPS!!! SOMETHING WENT WRONG!", err);
    }
    runAfterConnecting(client);
    done();
  });
};
//Insert or delete to database
db.query = function(statement, params, callback){
  db.connect(function(client){
    client.query(statement, params, callback);
  });
};

module.exports = db;