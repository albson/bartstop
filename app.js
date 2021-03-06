var express         = require('express');
var ejs             = require ('ejs');
var app             = express();
var path		        = require('path');
var bodyParser 	    = require('body-parser');
var cookieParser    = require('cookie-parser');
var session         = require('express-session');
var LocalStrategy   = require('passport-local').Strategy;
var passport        = require('passport');
var db              = require('./db.js');
var methodOverride  = require('method-override');
var parseString     = require('xml2js').parseString;
var request         = require('request');

app.set('view engine', 'ejs');
app.use(methodOverride('_method'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({'extended':true}));
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}))
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
	db.query('SELECT * FROM users WHERE id = $1', [id], function(err, dbRes) {
		if (!err) {
			done(err, dbRes.rows[0]);
		}
	});
  // findById(id, function (err, user) {
  //   done(err, user);
  // });
});


app.listen(process.env.PORT || 3000, function(){
	console.log("Server is up!")
})

var localStrategy = new LocalStrategy(
  function(username, password, done) {
    db.query('SELECT * FROM users WHERE username = $1', [username], function(err, dbRes) {
    	var user = dbRes.rows[0];
    	console.log(username)

    	console.log(user);


      if (err) { return done(err); }
      if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
      if (user.password != password) { return done(null, false, { message: 'Invalid password' }); }
      return done(null, user);
    })
  }
);

passport.use(localStrategy);

//Render home page with Alert API
app.get('/', function(req, res){
  var url='http://api.bart.gov/api/bsa.aspx?cmd=bsa&key=MW9S-E7SL-26DU-VV8V&date=today';
  request(url, function (err,response, body) {
    parseString(body, function(err, data) {
    var alert = data.root.bsa[0]; 
      res.render('index', {user:req.user, alert:alert});
    });
  });
});

//Creating new account
app.post('/users', function(req, res) {
  db.query('INSERT INTO users (username, email, password) VALUES ($1, $2, $3)', [req.body.username, req.body.email, req.body.password], function(err, dbRes) {
    if (!err) {
    res.redirect('/');
    }
  })
})

//This user will reach this route if authentication fails
app.get('/users/failure', function(req,res) {
  res.send('Does not recognize authentication. Please click back on your browser and try again.')
});

//Authentication route when user puts their log-in information
app.post('/users/sessions', passport.authenticate('local', 
  {failureRedirect: '/users/failure'}), function(req, res) {
    res.redirect('/');
});

//Logged-in user ends session
app.delete('/users/sessions', function(req, res) {
  req.logout();
  res.redirect('/');
});

//Render XML to JSON API route results
app.get('/results', function(req, res){
  var params1 = req.query.origin;
  var params2 = req.query.destination;
  var url='http://api.bart.gov/api/sched.aspx?cmd=depart&orig='+params1+'&dest='+params2+'&date=now&key=MW9S-E7SL-26DU-VV8V&b=2&a=2&l=1';
  request(url, function (err,response, body) {
    parseString(body, function(err, data) {
    var bart = data.root; 
    var leg = bart.schedule[0].request[0].trip[2].leg;
    var user = req.user;
      res.render('results', {bart:bart, leg:leg, user:user});
    });
  });
});

//Displays user's saved routes
app.get('/users/:id', function(req,res){  
  db.query('SELECT * FROM routes WHERE user_id = $1', [req.user.id], function(err,dbRes){
    if(!err) {
      res.render('profile', {user:req.user, routes: dbRes.rows})
    }
    })
})

//Adds new routes to user's saved routes list
app.post('/routes', function(req, res) {
  db.query('INSERT INTO routes (origin, destination, user_id) VALUES ($1, $2, $3)', [req.body.origin, req.body.destination, req.user.id], function(err, dbRes) {
    if (!err) {
    res.redirect('/users/' + req.user.id);
    }
    else {
      console.log(err)
    }
  })
})

//Deletes a user's saved route
app.delete('/routes/:id', function(req, res) {
  db.query('DELETE FROM routes WHERE id = $1', [req.params.id], function(err, dbRes) {
    if (!err) {
      res.redirect('/users/' + req.user.id);
    }
  })
});


// For JSON visual display purposes. Change URL to see particular API
app.get('/parse', function(req, res){
  var url = "http://api.bart.gov/api/bsa.aspx?cmd=bsa&key=MW9S-E7SL-26DU-VV8V&date=today";
  request(url, function (err,response, body) {
    parseString(body, function(err, data) { 
      console.log(data);
      res.send(data);
    });
  });
});