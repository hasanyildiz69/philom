const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const URLSlugs = require('mongoose-url-slugs');

const TeacherSchema = new Schema({
	name: {type: String, default: '', trim: true, required: true},
	education: {type: String, default: '', trim: true, required: true},
	info: {type: String, default: '', trim: true, required: true},
});

const ItinerarySchema = new Schema({
	day: {type: Number, default: -1, trim: true, required: true},
	description: {type: String, default: '', trim: true, required: true}
})

const PricingSchema = new Schema({
	pax: {type: Number, default: -1, trim: true},
	price: {type: Number, default: -1, trim: true},
})

const TripSchema = new Schema({
	title: {type: String, default: '', trim: true, required: true},
	startDate: {type: Date, default: '', trim: true, required: true},
	endDate: {type: Date, default: '', trim: true, required: true},
	destinations: [String],
	teacher: [TeacherSchema],
	displayText: {type: String, default: '', trim: true, required: true},
	fullInfo: {type: String, default: '', trim: true, required: true},
	itinerary:[ItinerarySchema],
	price: [PricingSchema],
	paypalURL: {type: String, default: '', trim: true}
});

TripSchema.plugin(URLSlugs('title'));
//slug is derived from 'title' field of Link object
//will be added with the field name 'slug'

mongoose.connect('mongodb://ashleytqy:password123@ds157459.mlab.com:57459/philomobile');
