export default function AboutPage() {
    return (
        <main className="bg-[#f6f7f8] dark:bg-[#111d21] min-h-screen font-display">
            {/* Hero Section */}
            <div
                className="relative h-[60vh] flex items-center justify-center bg-cover bg-center"
                style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=2000')` }}
            >
                <div className="text-center px-6 max-w-4xl">
                    <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter">Empowering Campus Commerce</h1>
                    <p className="text-lg md:text-xl text-gray-200 font-medium">Connecting students. Simplifying exchange. Building community.</p>
                </div>
            </div>

            {/* Mission Section */}
            <section className="py-20 px-6 max-w-6xl mx-auto">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h2 className="text-3xl font-extrabold mb-6 tracking-tight text-[#0e171b] dark:text-white">Our Mission</h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-4 leading-relaxed font-medium">
                            Founded in 2024, KART was born from a simple observation: university students need a safer, easier, and more reliable way to buy and sell within their community.
                        </p>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                            Current solutions were either too broad, unsafe, or cluttered. KART provides a specialized platform tailored to the unique needs of campus life—whether it's finding affordable textbooks, selling furniture at the end of the semester, or discovering student-made crafts.
                        </p>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm text-center border border-slate-100 dark:border-white/5">
                            <div className="text-2xl font-black text-primary mb-1">5k+</div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Students</div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm text-center border border-slate-100 dark:border-white/5">
                            <div className="text-2xl font-black text-primary mb-1">12k+</div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Listings</div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm text-center border border-slate-100 dark:border-white/5">
                            <div className="text-2xl font-black text-primary mb-1">₵500k</div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Saved</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Team Section */}
            <section className="py-20 px-6 bg-white/50 dark:bg-white/[0.02]">
                <div className="max-w-6xl mx-auto text-center mb-12">
                    <h2 className="text-3xl font-extrabold tracking-tight text-[#0e171b] dark:text-white">Meet the Team</h2>
                    <p className="text-slate-500 font-medium">The humans behind the marketplace.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {[
                        {
                            name: "David Chen",
                            role: "Founder & CEO",
                            bio: "CS Major. Built the first version of KART in his dorm room to help friends sell textbooks.",
                            image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400"
                        },
                        {
                            name: "Sarah Johnson",
                            role: "Head of Design",
                            bio: "Design student passionate about creating intuitive and beautiful user experiences.",
                            image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400"
                        },
                        {
                            name: "Marcus Williams",
                            role: "Lead Engineer",
                            bio: "Full-stack wizard ensuring KART runs smoothly and securely for everyone.",
                            image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400"
                        }
                    ].map((member, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-white/5 group hover:shadow-xl transition-all duration-300">
                            <div className="h-64 overflow-hidden relative">
                                <img
                                    src={member.image}
                                    alt={member.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                <div className="absolute bottom-4 left-6 text-white text-xl font-bold">{member.name}</div>
                            </div>
                            <div className="p-6">
                                <p className="text-primary font-bold text-sm uppercase tracking-widest mb-3">{member.role}</p>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-medium">{member.bio}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Contact Section */}
            <section className="py-24 px-6 text-center max-w-4xl mx-auto">
                <h2 className="text-4xl font-black mb-6 tracking-tight text-[#0e171b] dark:text-white uppercase transition-all duration-500 hover:tracking-tighter">Get in Touch</h2>
                <p className="text-slate-500 font-medium mb-10 leading-relaxed text-lg italic">
                    Have questions or feedback? We'd love to hear from you. Reach out to our team directly.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="mailto:support@kart.com" className="bg-primary text-white px-10 py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-lg shadow-primary/25 hover:scale-105 transition-all">
                        Email Support
                    </a>
                    <a href="#" className="bg-white dark:bg-slate-800 text-[#0e171b] dark:text-white px-10 py-4 rounded-2xl font-black uppercase text-sm tracking-widest border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                        Follow on Social
                    </a>
                </div>
            </section>
        </main>
    );
}

// Ensure the page is static since it doesn't use any dynamic features
export const dynamic = 'force-static';
