require('dotenv').config();
const mongoose = require('mongoose');
const Report = require('./models/Report');
const Post = require('./models/Post');
const Comment = require('./models/Comment');

const check = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/spheral');
    console.log('\n--- 1. SUBMITTED REPORTS ---');
    const reports = await Report.find().populate('reporter', 'name email');
    if (reports.length === 0) {
      console.log('No reports found.');
    } else {
      reports.forEach((r, i) => {
        console.log(`[${i+1}] Reporter: ${r.reporter?.name || 'Unknown'} (${r.reporter?.email || 'N/A'})`);
        console.log(`    Content ID: ${r.contentId} | Content Type: ${r.contentType}`);
        console.log(`    Reason: ${r.reason} | Details: ${r.description || 'None'}`);
        console.log(`    Status: ${r.status}`);
      });
    }

    console.log('\n--- 2. ARCHIVED POSTS ---');
    const archivedPosts = await Post.find({ archived: true }).populate('author', 'name');
    if (archivedPosts.length === 0) {
      console.log('No archived posts found.');
    } else {
      archivedPosts.forEach((p, i) => {
        console.log(`[${i+1}] Content: "${p.content.substring(0, 50)}..."`);
        console.log(`    Author: ${p.author?.name || 'Unknown'} | ID: ${p._id}`);
      });
    }

    console.log('\n--- 3. LIKED COMMENTS ---');
    const likedComments = await Comment.find({ likesCount: { $gt: 0 } }).populate('author', 'name');
    if (likedComments.length === 0) {
      console.log('No comments have likes yet.');
    } else {
      likedComments.forEach((c, i) => {
        console.log(`[${i+1}] Comment: "${c.content}"`);
        console.log(`    Author: ${c.author?.name || 'Unknown'} | Likes: ${c.likesCount}`);
      });
    }

  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
};

check();
