const express = require("express");
const app = express();
const path = require("path");
const bodyParser = require("body-parser");
const morgan = require("morgan");

// requiring database and models
require("./db");
const mongoose = require("mongoose");
// const Link = mongoose.model("Link");

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

app.use(morgan("tiny"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

// airtable config
const Airtable = require("airtable");
Airtable.configure({
	endpointUrl: "https://api.airtable.com",
	apiKey: "key7hriyx2rRS88Gn"
});
const base = Airtable.base("appQnbzyvd5JZmo1v");

// global data store
const tripSlugToDetails = {};
const allTrips = {}

// map teacher id to name
const teacherIDtoDetails = {};
function mapTeacherIdToName() {
	base("Teachers").select().eachPage(
		function page(records, fetchNextPage) {
			records.forEach(function(record) {
				teacherIDtoDetails[record.id] = {
					name: record.get("Name"),
					description: record.get("Description"),
					picture: record.get("Picture")[0].url
				};
			});
			fetchNextPage();
		},
		function done(err) {
			if (err) {
				console.error(err);
				return;
			}
		}
	);
}

function getItinerary(id, trip) {
	return new Promise((resolve, reject) => {
		trip.itinerary = {};
		let arr = [];
		base("Itineraries").find(id, function(err, record) {
			if (err) {
				reject(err);
			}
			//sort the keys
			for (let key in record.fields) {
				if (
					key.substring(0, 3) === "Day" &&
					record.fields.hasOwnProperty(key)
				) {
					arr.push(key);
				}
			}
			arr.sort();
			arr.forEach(key => {
				trip.itinerary[key] = record.fields[key];
			});

			resolve(trip.itinerary);
		});
	});
}

function promisifyRecord(record, req, trips) {
	return new Promise((resolve, reject) => {
		// store data for individual trips
		const trip = {};
		if (record.get("Trip Name") !== undefined) {
			if (!req.query.hasEnded) {
				trip.visible = true;
			} else {
				let tripHasEnded = record.get("hasEnded") === "NO"
					? "false"
					: "true";
				trip.visible = tripHasEnded === req.query.hasEnded
					? true
					: false;
			}

			trip.slug = record.get("Slug");
			trip.tripName = record.get("Trip Name");
			trip.startDate = record.get("Start Date");
			trip.endDate = record.get("End Date");
			trip.shortDescription = record.get("Short Description");
			trip.fullDescription = record.get("Full Description");
			trip.photos = record.get("Pictures")[0]
				? record.get("Pictures")[0].url
				: "no image";
			teacherIDs = record.get("Teachers");
			trip.teachers = teacherIDs
				? teacherIDs.map(id => teacherIDtoDetails[id].name).join(", ")
				: "";

			const id = record.get("Itinerary");
			if (id) {
				getItinerary(id, trip)
					.then(() => {
						// add individual trip to array
						trips.push(trip);
						tripSlugToDetails[trip.slug] = trip;
					})
					.then(() => resolve(trips));
				// return trips array with the new trip pushed
			} else {
				reject("id undefined");
			}
		} else {
			reject("trip name undefined");
		} // end undefined check
	});
}


function refreshTrips() {
	return new Promise((resolve, reject) => {
		base("Trips").select().eachPage(function page(records, fetchNextPage) {
		records.forEach(record => {
			let teacherIDs = record.get("Teachers");
			let teachers = teacherIDs
				? teacherIDs.map(id => teacherIDtoDetails[id].name).join(", ")
				: "";

			allTrips[record.id] = {
				name: record.get("Trip Name"),
				startDate: record.get("Start Date"),
				endDate: record.get("End Date"),
				applyBy: record.get("Deadline"),
				destinations: record.get("Destinations"),
				teachers: teachers
			}
			resolve(allTrips);
		});
	});	
})
}

/*
ROUTES
*/

// homepage
app.get("/", (req, res) => {
	res.render("home", {});
});

app.get("/trips", (req, res) => {
	const doesQueryExist = req.query.hasEnded ? true : false;
	const hasEnded = req.query.hasEnded === "true" ? true : false;

	const trips = [];
	base("Trips").select().eachPage(function page(records, fetchNextPage) {
		let promises = [];
		records.forEach(record => {
			promises.push(promisifyRecord(record, req, trips));
		});

		Promise.all(promises)
			.then(() => {
				res.render("trips", {
					trips: trips,
					queryExists: doesQueryExist,
					hasEnded: hasEnded
				});
			})
			.catch(err => console.log(err));
	});
});

app.get("/trips/:slug", (req, res) => {
	const slug = req.params.slug;
	const details = tripSlugToDetails[req.params.slug];
	console.log(details);
	res.render("trip", { trip: details });
});

app.get("/apply", (req, res) => {
	res.render("apply", {});
});

app.get("/schedule", (req, res) => {
	refreshTrips().then((trips) => res.render("schedule", {trips: trips}));	
});

app.get("/lecturers", (req, res) => {
	mapTeacherIdToName();
	res.render("lecturers", {teachers: teacherIDtoDetails});
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
