
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
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>Frequently Asked Questions</h1>
        <p className={styles.subtitle}>Everything you need to know about KART</p>
      </header>

      <div className={styles.faqList}>
        {faqs.map((faq, index) => (
          <div key={index} className={styles.faqItem}>
            <h3 className={styles.question}>{faq.question}</h3>
            <p className={styles.answer}>{faq.answer}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
