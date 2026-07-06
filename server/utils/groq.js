const https = require('https');

/**
 * Sends a message/prompt to Groq API.
 * Uses native https module to avoid external dependencies.
 * Handles rate limits (HTTP 429) gracefully.
 * 
 * @param {Array} messages - OpenAI-compatible messages array.
 * @returns {Promise<string>} The assistant's text response.
 */
const callGroq = (messages) => {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return reject(new Error('GROQ_API_KEY is not configured in the server environment.'));
    }

    const payload = JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500
    });

    const options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode === 429) {
            return reject(new Error('Rate limit reached. Please try again in a moment.'));
          }

          if (res.statusCode >= 200 && res.statusCode < 300) {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.message?.content;
            if (content) {
              resolve(content.trim());
            } else {
              reject(new Error('Invalid response format from Groq.'));
            }
          } else {
            const errorMsg = JSON.parse(data || '{}')?.error?.message || `HTTP ${res.statusCode}`;
            reject(new Error(errorMsg));
          }
        } catch (e) {
          reject(new Error(`Failed to parse Groq response: ${e.message}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(payload);
    req.end();
  });
};

module.exports = { callGroq };
