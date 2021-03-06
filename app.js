const express = require("express");
const app = express();
const path = require("path");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const moment = require("moment");

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
const allTrips = {};

// populate data store
mapTeacherIdToName();

// map teacher id to name
const teacherIDtoDetails = {};
function mapTeacherIdToName() {
	base("Teachers")
		.select({
			sort:[{field: "Name", direction: "asc"}]		
		}).eachPage(
		function page(records, fetchNextPage) {
			records.forEach(function(record) {
				teacherIDtoDetails[record.id] = {
					name: record.get("Name"),
					description: record.get("Description"),
					picture: record.get("Picture") ? record.get("Picture")[0].url : "images/background-image/jpeg"
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

function sortDay(a, b) {
	aDay = parseInt(a.substring(4))
	bDay = parseInt(b.substring(4))
	return aDay - bDay;
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
			if (record) {
				for (let key in record.fields) {
					if (
						key.substring(0, 3) === "Day" &&
						record.fields.hasOwnProperty(key)
					) {
						arr.push(key);
					}
				}
				arr.sort(sortDay);
				arr.forEach(key => {
					trip.itinerary[key] = record.fields[key].replace("\n", "<br><br>");
				});
				resolve(trip.itinerary);
			} else {
				reject(trip.itinerary);
			}
		});
	});
}

function promisifyRecord(record, trips, hasEnded) {
	return new Promise((resolve, reject) => {
		// store data for individual trips
		const trip = {};
		if (record.get("Trip Name") !== undefined) {
			let tripHasEnded = record.get("hasEnded") === "NO"
							? false
							: true;
			trip.visible = tripHasEnded === hasEnded
							? true
							: false;

			trip.tripID = record["id"]
			trip.tripName = record.get("Trip Name");
			trip.startDate = moment(record.get("Start Date")).format("Do MMM YYYY");
			trip.endDate = moment(record.get("End Date")).format("Do MMM YYYY");
			trip.shortDescription = record.get("Short Description");
			trip.fullDescription = record.get("Full Description");
			trip.fullDescription = trip.fullDescription.replace("\n", "<br><br>")
			trip.photos = record.get("Pictures")[0]
				? record.get("Pictures")[0].url
				: "no image";
			teacherIDs = record.get("Teachers");
			trip.teachers = teacherIDs
				? teacherIDs.map(id => teacherIDtoDetails[id] && teacherIDtoDetails[id].name).join(", ")
				: "";
			trip.earlyBirdPrice = record.get("Early Bird Price").replace("\n", "<br><br>");
			trip.earlyBirdDeadline = moment(record.get("Early Bird Deadline")).format("Do MMM YYYY") || "N/A";
			trip.regularPrice = record.get("Regular Price").replace("\n", "<br><br>");
			trip.regularDeadline = moment(record.get("Regular Deadline")).format("Do MMM YYYY") || "N/A";
			trip.priceInfo = record.get("Price Info");

			const id = record.get("Itinerary");
			if (id) {
				getItinerary(id, trip)
					.then(() => {
						// add individual trip to array
						trips.push(trip);
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
		base("Trips")
			.select()
			.eachPage(function page(records, fetchNextPage) {
				records.forEach(record => {
					if (record.get("Trip Name") !== undefined) {
						let teacherIDs = record.get("Teachers");
						let teachers = teacherIDs
							? teacherIDs
									.map(id => teacherIDtoDetails[id].name)
									.join(", ")
							: "";

						allTrips[record.id] = {
							tripName: record.get("Trip Name"),
							startDate: moment(record.get("Start Date")).format("Do MMM YYYY") || "N/A",
							endDate: moment(record.get("End Date")).format("Do MMM YYYY") || "N/A",
							regularDeadline: moment(record.get("Regular Deadline")).format("Do MMM YYYY") || "N/A",
							regularPrice: record.get("Regular Price").replace("\n", "<br>"),
							earlyBirdDeadline: moment(record.get("Early Bird Deadline")).format("Do MMM YYYY") || "N/A",
							earlyBirdPrice: record.get("Early Bird Price").replace("\n", "<br>") || "N/A",
							destinations: record.get("Destinations") || "N/A",
							teachers: teachers,
							tripID: record.id
						};
						resolve(allTrips);
					} else {
						reject("trip name undefined");
					} // end undefined check		
				});
		});
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
	let hasEnded;
	if (req.query.hasEnded) {
		hasEnded = req.query.hasEnded === "true" ? true : false;
	} else {
		hasEnded = false;
	}

	const trips = [];
	base("Trips")
		.select()
		.eachPage(function page(records, fetchNextPage) {
			let promises = [];
			records.forEach(record => {
				promises.push(promisifyRecord(record, trips, hasEnded));
			});

			Promise.all(promises)
				.then(() => {

					//sort by trip name
					trips.sort((a, b) => {
						return a.tripName.charCodeAt(0) - b.tripName.charCodeAt(0);
					})

					res.render("trips", {
						trips: trips,
						hasEnded: hasEnded
					});
				})
				.catch(err => console.log(err));
		});
});

app.get("/trips/:tripID", (req, res) => {
	const tripID = req.params.tripID;
	const trips = []

	base('Trips').find(tripID, function(err, record) {
    if (err) {
    	console.error(err);
    	res.render("error", { message: "404 error: page not found" });
    }

   	promisifyRecord(record, trips)
		.then(() => {
			res.render("trip", {
				trip: trips[0]
			});
		})
		.catch(err => console.log(err));
	});

});

app.get("/apply", (req, res) => {
	res.render("apply", {});
});

app.get("/schedule", (req, res) => {
	refreshTrips()
		.then(trips =>  {
			const tripsArray = [];
			for (key in trips) {
				tripsArray.push(trips[key])
			}

			tripsArray.sort((a, b) => {
				return a.tripName.charCodeAt(0) - b.tripName.charCodeAt(0);
			});

			res.render("schedule", { trips: tripsArray });
		});
});

app.get("/instructors", (req, res) => {
	mapTeacherIdToName();
	res.render("lecturers", { teachers: teacherIDtoDetails });
});

app.get("/blog", (req, res) => {
	res.render("blog", {});
});

app.get("/subscribe", (req, res) => {
	res.render("subscribe", {});
});

app.get("/apply", (req, res) => {
	res.render("apply", {});
});

app.get("/contact", (req, res) => {
	res.render("contact", {});
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
