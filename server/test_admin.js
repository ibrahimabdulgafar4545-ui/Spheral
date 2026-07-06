require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Post = require('./models/Post');
const Reel = require('./models/Reel');
const Comment = require('./models/Comment');
const Report = require('./models/Report');
const SupportTicket = require('./models/SupportTicket');

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    console.log('\n--- Testing Database Queries ---');
    
    console.log('Counting users...');
    const usersCount = await User.countDocuments();
    console.log('Users:', usersCount);

    console.log('Counting posts...');
    const postsCount = await Post.countDocuments();
    console.log('Posts:', postsCount);

    console.log('Counting reels...');
    const reelsCount = await Reel.countDocuments();
    console.log('Reels:', reelsCount);

    console.log('Counting support tickets...');
    const ticketsCount = await SupportTicket.countDocuments();
    console.log('Support Tickets:', ticketsCount);

    console.log('Fetching a single ticket...');
    const ticket = await SupportTicket.findOne().populate('user', 'name');
    console.log('Ticket:', ticket);

    console.log('\n✅ All queries executed successfully! Database connection is fully healthy.');
  } catch (error) {
    console.error('❌ Query failed:', error);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
}

test();
