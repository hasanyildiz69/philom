const express = require("express");
const app = express();
const path = require("path");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const session = require("express-session");

const sessionOptions = {
	secret: "secret cookie thang",
	resave: true,
	saveUninitialized: true
};

// requiring database and models
require("./db");
const mongoose = require("mongoose");
// const Link = mongoose.model("Link");

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

app.use(morgan("tiny"));
app.use(session(sessionOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

//AIRTABLE
const Airtable = require('airtable');
Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: 'key7hriyx2rRS88Gn'
});
const base = Airtable.base('appQnbzyvd5JZmo1v');

base('Trips')	
	.select()
	.eachPage(function page(records, fetchNextPage) {
	    records.forEach(function(record) {
	    	if (record.get('Trip Name') !== undefined) {
		        console.log(record.get('Trip Name'));
		        console.log('Start:', record.get('Start Date'), 'End:', record.get('End Date'));
		        const it = record.get('Itinerary');
		        if (it !== undefined) {
		        	getItinerary(it);
		        }
		        
	    	}
	    });
	    fetchNextPage();

	}, function done(err) {
	    if (err) { console.error(err); return; }
	});

function getItinerary(id) {
	const obj = {};
	let arr = [];
	base('Itineraries').find(id, function(err, record) {
	    if (err) { console.error(err); return; }
	    //sort the keys
	    for (let key in record.fields) {
    	  if (key.substring(0, 3) === 'Day' && record.fields.hasOwnProperty(key)) {
		    arr.push(key);
		  }
	    }
	    arr.sort();
	    arr.forEach(key => {
	    	console.log(key, ": ", record.fields[key]);
	    })
	});
}

/*
ROUTES
*/

// homepage
app.get("/", (req, res) => {
	res.render("home", {});
});

app.get("/trips", (req, res) => {
	res.render("trips", {});
});

app.get("/trips/:slug", (req, res) => {
	console.log(req.params.slug)
	res.render("trip", {});
});

app.get("/apply", (req, res) => {
	res.render("apply", {});
});

app.get("/schedule", (req, res) => {
	res.render("schedule", {});
});

app.get("/teachers", (req, res) => {
	res.render("teachers", {});
});

app.get("/contact", (req, res) => {
	res.render("contact", {});
});

app.get("/subscribe", (req, res) => {
	res.render("subscribe", {});
});

// handle 404 errors
app.use(function(req, res) {
	res.status(400);
	res.render("error", { message: "404 error: page not found" });
});

// handle 500 errors
app.use(function(error, req, res) {
	res.status(500);
	res.render("error", { message: "500 error" });
});

module.exports = app;
