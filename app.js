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

function renderTrips() {
	const trip = {};

	base('Trips')	
		.select()
		.eachPage(function page(records, fetchNextPage) {
		    records.forEach(function(record) {
		    	if (record.get('Trip Name') !== undefined) {
		    		trip.tripName = record.get('Trip Name');
		    		trip.startDate = record.get('Start Date');
		    		trip.endDate = record.get('End Date');
			        const it = record.get('Itinerary');
				        if (it !== undefined) {
				        	getItinerary(it, trip, "trips");
				        }
			        
		    	}
		    });
		    fetchNextPage();
		}, function done(err) {
		    if (err) { console.error(err); return; }
		});
}

function getItinerary(id, obj, template) {
	obj.itinerary = {};
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
	    	obj.itinerary[key] = record.fields[key];
	    })
    	res.render(template, obj);
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
	const trips = [];
	const queryHasEnded = req.query.hasEnded || 'false';

	base('Trips')	
		.select()
		.eachPage(function page(records, fetchNextPage) {
		    records.forEach(function(record) {
		    	const trip = {};
		    	if (record.get('Trip Name') !== undefined) {
		    		trip.hasEnded = (record.get('hasEnded') === 'NO') ? 'false': 'true';
		    		trip.visible = trip.hasEnded === queryHasEnded ? true: false;
		    		trip.tripName = record.get('Trip Name');
		    		trip.startDate = record.get('Start Date');
		    		trip.endDate = record.get('End Date');
		    		trip.photos = record.get('Pictures')[0].url;
		    		trip.teachers = record.get('Teachers'); //need to get teachers...

			        const id = record.get('Itinerary');
				        if (id !== undefined) {
		        			trip.itinerary = {};
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
							    	trip.itinerary[key] = record.fields[key];
							    })
							});
				        }
		    	}

		    	trips.push(trip);
		    });
		    //end for each
		    res.render("trips", {trips: trips});
		    fetchNextPage();
		    //figure out how to handle this recursion...
		}, function done(err) {
		    if (err) { console.error(err); return; }
		});
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
