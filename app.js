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

app.get("/apply", (req, res) => {
	res.render("apply", {});
});

// app.get("/schedule", (req, res) => {
// 	res.render("schedule", {});
// });

app.get("/teachers", (req, res) => {
	res.render("teachers", {});
});

app.get("/contact", (req, res) => {
	res.render("contact", {});
});

app.get("/subscribe", (req, res) => {
	res.render("subscribe", {});
});

app.get("/admin", (req, res) => {
	// require login at some point
	res.render("admin", {});
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
