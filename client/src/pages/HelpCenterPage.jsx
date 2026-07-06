import { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useApp } from '../context/AppContext';
import { supportAPI } from '../api/support';
import { FiHelpCircle, FiMail, FiSend } from 'react-icons/fi';

export default function HelpCenterPage() {
  const { showToast } = useApp();
  const [type, setType] = useState('support');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message) return showToast('error', 'Please enter a message');
    
    try {
      setLoading(true);
      await supportAPI.submitTicket({ type, subject, message });
      showToast('success', type === 'support' ? 'Your message has been sent to support!' : 'Thank you for your feedback!');
      setSubject('');
      setMessage('');
    } catch (err) {
      showToast('error', 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const faqs = [
    { q: 'How do I change my privacy settings?', a: 'Go to Settings > Privacy to adjust who can see your profile and posts.' },
    { q: 'How can I block someone?', a: 'Go to Settings > Privacy (Content Preferences) to manage your blocked users.' },
    { q: 'How do I turn on notifications?', a: 'Go to Settings > Notifications to toggle alerts for likes and comments.' },
    { q: 'Can I change the application theme?', a: 'Yes! Open the main menu or go to Settings > Display & Theme to toggle Dark Mode.' }
  ];

  return (
    <MainLayout hideRight>
      <div className="max-w-[800px] mx-auto mt-4 px-4 pb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-sp-blue/10 text-sp-blue flex items-center justify-center">
            <FiHelpCircle size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-sp-text">Help Center</h1>
            <p className="text-sp-muted text-sm">We're here to help you with Spheral</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-sp-text">Frequently Asked Questions</h2>
            {faqs.map((faq, idx) => (
              <div key={idx} className="card p-4">
                <h3 className="font-semibold text-sp-text text-sm mb-2">{faq.q}</h3>
                <p className="text-sp-muted text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>

          <div>
            <div className="card p-6 sticky top-20">
              <h2 className="text-lg font-bold text-sp-text flex items-center gap-2 mb-4">
                <FiMail className="text-sp-blue" /> Contact Us
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider mb-1.5 block">Message Type</label>
                  <select
                    className="input font-medium"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="support">Help & Support Request</option>
                    <option value="feedback">App Feedback & Ideas</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider mb-1.5 block">Subject</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="What do you need help with?"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider mb-1.5 block">Message</label>
                  <textarea
                    className="input min-h-[120px] resize-none"
                    placeholder="Describe your issue in detail..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full flex justify-center items-center gap-2">
                  <FiSend size={16} />
                  {loading ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
