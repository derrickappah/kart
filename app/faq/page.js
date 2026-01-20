const faqs = [
  {
    question: 'How do I start selling on KART?',
    answer: 'First, sign up for an account. Then, choose a subscription plan from our subscription page. Once subscribed, you can access the seller dashboard and start creating listings.',
  },
  {
    question: 'What payment methods are accepted?',
    answer: 'We accept MTN MoMo, Vodafone Cash, AirtelTigo, and cards through Paystack.',
  },
  {
    question: 'How do I verify my seller account?',
    answer: 'Go to your seller dashboard and click on "Verify Account". Upload a photo of your student ID, and our admin team will review it within 24-48 hours.',
  },
  {
    question: 'What happens if my subscription expires?',
    answer: 'You have a 7-day grace period after expiry. During this time, your listings will be hidden. Renew your subscription to reactivate them.',
  },
  {
    question: 'How do I boost my listing?',
    answer: 'On your product details page, click the "Boost Listing" button. Choose a duration and pay the fee. Boosted listings appear higher in search results.',
  },
  {
    question: 'Is KART safe to use?',
    answer: 'Yes! We only allow verified students to buy and sell. All transactions are tracked, and we have a reporting system for any issues.',
  },
  {
    question: 'Can I cancel my subscription?',
    answer: 'Yes, you can cancel your subscription at any time from your dashboard. Your subscription will remain active until the end of the current billing period.',
  },
  {
    question: 'How do I contact a seller?',
    answer: 'Click "Message Seller" on any product page. This will start a conversation where you can ask questions and arrange the exchange.',
  },
];

export default function FAQPage() {
  return (
    <main className="bg-slate-50 dark:bg-[#111d21] min-h-screen py-16 px-6 font-display text-slate-900 dark:text-white transition-colors duration-300">
      <header className="max-w-4xl mx-auto text-center mb-16 px-4">
        <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight uppercase">Frequently Asked Questions</h1>
        <p className="text-slate-500 font-medium bg-slate-100 dark:bg-white/5 inline-block px-4 py-1 rounded-full text-sm">Everything you need to know about KART</p>
      </header>

      <div className="max-w-3xl mx-auto space-y-4">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="group bg-white dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 rounded-2xl p-6 transition-all hover:shadow-md"
          >
            <h3 className="text-lg font-bold text-[#0e171b] dark:text-white mb-2 flex items-start gap-3">
              <span className="text-primary mt-1 font-black leading-none">?</span>
              {faq.question}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-medium pl-5">{faq.answer}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
