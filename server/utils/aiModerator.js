const { callGroq } = require('./groq');
const User = require('../models/User');
const Report = require('../models/Report');
const Notification = require('../models/Notification');

/**
 * Parses and cleans JSON response from Groq.
 */
function parseGroqJson(responseString) {
  try {
    const jsonMatch = responseString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(responseString);
  } catch (e) {
    console.error('Failed to parse Groq response as JSON:', responseString);
    return null;
  }
}

/**
 * Checks a profile for impersonation (either a public figure or an existing user).
 * Asynchronous background operation.
 */
async function checkProfileImpersonation(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    // Fetch existing users to compare names
    const existingUsers = await User.find({ _id: { $ne: user._id } })
      .select('name username')
      .limit(100);

    const existingUsersList = existingUsers
      .map(u => `Name: "${u.name}", Username: "${u.username}"`)
      .join('\n');

    const publicFigures = [
      'Taylor Swift', 'Donald Trump', 'Elon Musk', 'Cristiano Ronaldo', 'Lionel Messi',
      'Mark Zuckerberg', 'Bill Gates', 'Jeff Bezos', 'Joe Biden', 'Barack Obama',
      'LeBron James', 'Kylie Jenner', 'Kim Kardashian', 'Selena Gomez', 'Ariana Grande'
    ].join(', ');

    const prompt = `You are a professional automated content moderation assistant for the Spheral social media platform.
Analyze if this new/updated user profile is suspiciously trying to impersonate a public figure or an existing user.
A slight spelling variation or using a public figure's direct photo/name is considered impersonation.

New/Updated User Profile:
Name: "${user.name}"
Username: "${user.username}"

Well-known Public Figures:
${publicFigures}

Existing Platform Users:
${existingUsersList || 'No other users registered yet.'}

Respond ONLY with a JSON object in this format:
{
  "isImpersonation": boolean,
  "explanation": "Brief, clear details of who is being impersonated and why, or why not",
  "confidence": number (0 to 100)
}`;

    const messages = [
      { role: 'system', content: 'You are a strict, helpful content moderation assistant. Respond ONLY with valid JSON.' },
      { role: 'user', content: prompt }
    ];

    const resultStr = await callGroq(messages);
    const result = parseGroqJson(resultStr);

    if (result && result.isImpersonation && result.confidence >= 70) {
      // Find an admin to be the official reporter
      const admin = await User.findOne({ isAdmin: true });
      const reporterId = admin ? admin._id : user._id;

      // 1. Surface the issue in the Admin Reports queue
      await Report.create({
        reporter: reporterId,
        contentId: user._id,
        contentType: 'user',
        reason: 'AI-flagged: possible impersonation',
        description: `Explanation: ${result.explanation} (Confidence: ${result.confidence}%). AI-assisted flagging - human review only.`,
        status: 'pending'
      });

      // 2. Automatically send warning notification to user
      await Notification.create({
        recipient: user._id,
        actor: reporterId,
        type: 'warning',
        content: `Automated warning: Your profile appears to be impersonating another user or public figure (${result.explanation}). Please update your profile name/username within 48 hours or your account may be restricted. If you believe this is a mistake, you can submit an appeal to support.`,
        read: false
      });

      console.log(`[AI Moderation] Impersonation warning sent to user ${user.username}.`);
    }
  } catch (err) {
    console.error('[AI Moderation] Error running profile impersonation check:', err.message);
  }
}

/**
 * Analyzes content (posts, comments, reels text) for policy violations.
 * Asynchronous background operation.
 */
async function checkContentModeration(contentId, contentType, text, authorId) {
  try {
    if (!text || !text.trim()) return;

    const prompt = `You are a professional automated content moderation assistant for the Spheral social media platform.
Analyze the following user-submitted text and classify it into one of these categories:

1. "crime": Accusations of real-world crimes, safety threats, self-harm, weapons, illegal drugs, or severe physical harm.
2. "general_abuse": Harassment, spam, hate speech, explicit insults, slurs, or major toxicity.
3. "safe": Friendly, general, safe, standard content.

Content details:
Text: "${text}"

Respond ONLY with a JSON object in this format:
{
  "category": "crime" | "general_abuse" | "safe",
  "explanation": "Brief explanation of what triggered the flag",
  "confidence": number (0 to 100)
}`;

    const messages = [
      { role: 'system', content: 'You are a strict, helpful content moderation assistant. Respond ONLY with valid JSON.' },
      { role: 'user', content: prompt }
    ];

    const resultStr = await callGroq(messages);
    const result = parseGroqJson(resultStr);

    if (!result || result.category === 'safe' || result.confidence < 70) {
      return;
    }

    const admin = await User.findOne({ isAdmin: true });
    const reporterId = admin ? admin._id : authorId;

    if (result.category === 'crime') {
      // Category 3: Crime-related safety threats.
      // High-priority report for immediate human review. Do NOT auto-warn, auto-ban, or take auto-actions.
      await Report.create({
        reporter: reporterId,
        contentId: contentId,
        contentType: contentType,
        reason: 'AI-flagged: HIGH PRIORITY - crime / safety threat',
        description: `Explanation: ${result.explanation} (Confidence: ${result.confidence}%). HUMAN REVIEW ONLY - no automated user warnings sent.`,
        status: 'pending'
      });
      console.log(`[AI Moderation] Crime accusation reported to admin queue (High Priority) for content ${contentId}.`);
    } else if (result.category === 'general_abuse') {
      // Category 2: Harassment, spam, hate speech.
      // Auto-warn user and report to admin.
      await Report.create({
        reporter: reporterId,
        contentId: contentId,
        contentType: contentType,
        reason: 'AI-flagged: general abuse',
        description: `Explanation: ${result.explanation} (Confidence: ${result.confidence}%). User auto-warned.`,
        status: 'pending'
      });

      await Notification.create({
        recipient: authorId,
        actor: reporterId,
        type: 'warning',
        content: `Automated warning: Your content was flagged for potential general abuse (${result.explanation}). Spheral does not tolerate harassment, spam, or hate speech. If you believe this is a mistake, you can contest this warning by submitting an appeal to support.`,
        read: false
      });
      console.log(`[AI Moderation] General abuse warning sent to user ${authorId} for content ${contentId}.`);
    }
  } catch (err) {
    console.error('[AI Moderation] Error running content moderation check:', err.message);
  }
}

module.exports = {
  checkProfileImpersonation,
  checkContentModeration
};
