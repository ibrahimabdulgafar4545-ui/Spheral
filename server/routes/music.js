const express = require('express');
const https = require('https');
const { protect } = require('../middleware/auth');
const { callGroq } = require('../utils/groq');

const router = express.Router();

// Helper to make HTTPS requests natively with custom headers and follow redirects
const makeRequest = (url, headers = {}) => {
  return new Promise((resolve, reject) => {
    const request = (targetUrl) => {
      const parsedUrl = new URL(targetUrl);
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: headers
      };

      https.get(options, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return request(res.headers.location);
        }

        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(JSON.parse(data));
            } else {
              reject(new Error(`HTTP ${res.statusCode}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${e.message}`));
          }
        });
      }).on('error', (e) => {
        reject(e);
      });
    };
    request(url);
  });
};

// Core music search logic helper
const performMusicSearch = async (query) => {
  const apiKey = process.env.RAPIDAPI_KEY;

  if (apiKey && apiKey !== 'YOUR_RAPIDAPI_KEY_HERE') {
    console.log('Searching via Deezer RapidAPI...');
    const url = `https://deezerdevs-deezer.p.rapidapi.com/search?q=${encodeURIComponent(query)}`;
    const headers = {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'deezerdevs-deezer.p.rapidapi.com'
    };
    
    const data = await makeRequest(url, headers);
    if (!data.data) return [];

    return data.data.map(track => ({
      id: track.id || Math.random().toString(),
      name: track.title,
      artist_name: track.artist?.name || 'Unknown Artist',
      audio: track.preview, // Direct MP3 preview stream
      cover: track.album?.cover_medium,
      duration_ms: (track.duration || 30) * 1000
    }));
  } else {
    console.log('Searching via iTunes Fallback...');
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=20`;
    const data = await makeRequest(url);

    if (!data.results) return [];

    return data.results.map(track => ({
      id: track.trackId || Math.random().toString(),
      name: track.trackName,
      artist_name: track.artistName,
      audio: track.previewUrl,
      cover: track.artworkUrl100,
      duration_ms: track.trackTimeMillis || 30000
    }));
  }
};

// @desc    Search Deezer (via RapidAPI if key is set) or iTunes (as fallback)
// @route   GET /api/music/search
// @access  Protected
router.get('/search', protect, async (req, res, next) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    const results = await performMusicSearch(query);
    res.status(200).json({ success: true, results });
  } catch (error) {
    console.error('Music Search Error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: `Music Search Error: ${error.message}`
    });
  }
});

// @desc    Suggest songs based on caption using Groq + Music Search
// @route   POST /api/music/suggest-song
// @access  Protected
router.post('/suggest-song', protect, async (req, res, next) => {
  try {
    const { caption } = req.body;
    if (!caption) {
      return res.status(400).json({ success: false, message: 'Caption is required' });
    }

    const messages = [
      {
        role: 'system',
        content: `Analyze the user's social media post caption and suggest a single music search query word or genre/vibe tag (e.g. upbeat, lofi chill, energetic, acoustic, sad, summer pop, rock, jazz, motivational). Respond with ONLY the query term, no punctuation, no extra words, and no explanations.`
      },
      {
        role: 'user',
        content: `Caption: "${caption}"`
      }
    ];

    const suggestedVibe = await callGroq(messages);
    console.log(`Groq suggested vibe: "${suggestedVibe}" for caption: "${caption}"`);

    // Search music using the vibe
    const allTracks = await performMusicSearch(suggestedVibe);
    
    // Surface 2-3 matching tracks (limit to top 3)
    const tracks = allTracks.slice(0, 3);

    res.status(200).json({
      success: true,
      vibe: suggestedVibe,
      results: tracks
    });
  } catch (error) {
    if (error.message.includes('Rate limit')) {
      return res.status(429).json({ success: false, message: error.message });
    }
    console.error('Suggest Song Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
