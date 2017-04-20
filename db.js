const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const URLSlugs = require('mongoose-url-slugs');

const CommentSchema = new Schema({
	text: {type: String, default: '', trim: true, required: true},
	user: {type: String, default: 'anonymous', trim: true, required: true},
});

const LinkSchema = new Schema({
	title: {type: String, default: '', trim: true, required: true},
	url: {type: String, default: '', trim: true, required: true},
	upvotes: {type: Number, default: 0, required: true},
	comments: [CommentSchema]
});

LinkSchema.plugin(URLSlugs('title'));
//slug is derived from 'title' field of Link object
//will be added with the field name 'slug'

const Comment = mongoose.model('Comment', CommentSchema);
const Link = mongoose.model('Link', LinkSchema);
mongoose.connect('mongodb://ashleytqy:password123@ds157459.mlab.com:57459/philomobile');
