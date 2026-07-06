const SupportTicket = require('../models/SupportTicket');
const AdminLog = require('../models/AdminLog');
const { callGroq } = require('../utils/groq');
const { sendEmail } = require('../utils/email');

const startAISupportJob = () => {
  console.log('🤖 AI Support Auto-Reply Job initialized. Runs every 10 minutes.');
  
  // Run every 10 minutes (600,000 ms)
  setInterval(async () => {
    try {
      // Find tickets that are pending/open and older than 1 hour (60 minutes)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const tickets = await SupportTicket.find({
        status: { $in: ['open', 'pending'] },
        createdAt: { $lte: oneHourAgo }
      }).populate('user', 'name email');

      for (const ticket of tickets) {
        if (!ticket.user || !ticket.user.email) continue;

        console.log(`[AI Support] Processing auto-reply for ticket ${ticket._id}...`);

        // Generate AI response
        const prompt = `
          You are a friendly, helpful customer support agent for the social media app Spheral.
          A user named ${ticket.user.name} submitted the following support ticket or feedback:
          Subject: ${ticket.subject || 'General Inquiry'}
          Message: ${ticket.message}
          
          Write a professional and empathetic response addressing their issue. Be concise and helpful.
          Do not include placeholders. Sign off as "Spheral AI Support".
        `;

        const aiResponse = await callGroq([{ role: 'user', content: prompt }]);
        
        if (aiResponse) {
           const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
              <h2>Hi ${ticket.user.name},</h2>
              <p style="white-space: pre-wrap;">${aiResponse}</p>
              <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;" />
              <p style="font-size: 12px; color: #888;">
                Re: ${ticket.subject || 'Your Support Ticket'}
              </p>
            </div>
          `;

          // Send email
          await sendEmail(ticket.user.email, `Re: ${ticket.subject || 'Your Support Ticket'}`, htmlContent);

          // Resolve ticket
          ticket.status = 'resolved';
          await ticket.save();

          // Log in AdminLog
          await AdminLog.create({
            adminId: null, // null indicates system/AI action
            action: 'resolve_ticket',
            targetId: ticket._id,
            targetModel: 'SupportTicket',
            details: `AI Auto-replied and resolved ticket ${ticket._id} after 1 hour of inactivity`,
          });
          
          console.log(`[AI Support] Successfully auto-replied and resolved ticket ${ticket._id}`);
        }
      }
    } catch (error) {
      console.error('[AI Support Job Error]', error);
    }
  }, 10 * 60 * 1000); // 10 minutes
};

module.exports = startAISupportJob;
