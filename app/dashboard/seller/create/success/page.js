'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '../../../../../utils/supabase/client';
import Link from 'next/link';
import Image from 'next/image';

function SuccessContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const supabase = createClient();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const productId = searchParams.get('id');

    useEffect(() => {
        if (!productId) {
            setLoading(false);
            return;
        }

        const fetchProduct = async () => {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('id', productId)
                .single();

            if (data) setProduct(data);
            setLoading(false);
        };

        fetchProduct();
    }, [productId, supabase]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f7f7f8] dark:bg-[#21242c] flex items-center justify-center">
                <div className="animate-pulse text-primary font-bold">Preparing your celebration...</div>
            </div>
        );
    }

    return (
        <div className="bg-[#f7f7f8] dark:bg-[#21242c] font-display text-[#111617] dark:text-white antialiased min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-6 py-12 transition-colors duration-300">
            {/* Decorative Background / Confetti */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <style jsx>{`
                    .confetti-piece {
                        position: absolute;
                        width: 10px;
                        height: 10px;
                        border-radius: 2px;
                        opacity: 0.7;
                        z-index: 0;
                    }
                    .c-blue { background-color: #1daddd; }
                    .c-yellow { background-color: #F1D38A; }
                    .c-red { background-color: #FF6B6B; }
                    
                    .floating-anim {
                        animation: float 6s ease-in-out infinite;
                    }
                    
                    @keyframes float {
                        0% { transform: translateY(0px) rotate(0deg); }
                        50% { transform: translateY(-10px) rotate(5deg); }
                        100% { transform: translateY(0px) rotate(0deg); }
                    }
                `}</style>
                <div className="confetti-piece c-blue top-[10%] left-[15%] rotate-12"></div>
                <div className="confetti-piece c-yellow top-[20%] right-[20%] -rotate-45 w-4 h-3"></div>
                <div className="confetti-piece c-red top-[15%] left-[60%] rotate-[30deg] w-2 h-2 rounded-full"></div>
                <div className="confetti-piece c-blue top-[40%] left-[5%] rotate-45 w-3 h-6"></div>
                <div className="confetti-piece c-yellow top-[50%] right-[10%] rotate-12 w-2 h-4"></div>
                <div className="confetti-piece c-red bottom-[30%] left-[20%] -rotate-12"></div>
                <div className="confetti-piece c-blue bottom-[20%] right-[30%] rotate-[60deg] w-3 h-3 rounded-full"></div>
                {/* Soft glow behind the illustration */}
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
            </div>

            {/* Main Content Container */}
            <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
                {/* Hero Illustration */}
                <div className="floating-anim mb-8 relative w-full flex justify-center">
                    <div
                        className="w-48 h-48 bg-contain bg-center bg-no-repeat drop-shadow-2xl"
                        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBEU9Pk4VjVPsyjUNomWMcYSIcDgp6HvSJuM2uedA8qqdAxRFO32ZUcPuhDlth9k8YLzVGt7H4hhiIMCw8EfMB847muETJ5A5z6D7DWBI-NIhXT-vP365Dcujxo1Xtg4TD2dX1A6FBdo8BiJ-JxMGMJkqnvUMF7tFKF-dren8YDWGeaJxRvh7J_DZfX7ZGbOJw83z2EdJrNQmVfMavFobTdi-FPhXH04O2oevTj9P6TgAZVc5ftMI6coOMQfWWBUocfr4t8VKAaMHhl')" }}
                    ></div>
                </div>

                {/* Headlines */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-3xl font-extrabold tracking-tight leading-tight mb-3">
                        Your item is live!
                    </h1>
                    <p className="text-[#647e87] dark:text-gray-400 text-base font-medium leading-relaxed max-w-xs mx-auto">
                        Fellow students can now see your listing. Good luck with your sale!
                    </p>
                </div>

                {/* Listing Preview Card */}
                {product && (
                    <div className="w-full mb-10">
                        <div className="bg-white dark:bg-[#2c303b] rounded-2xl p-4 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] dark:shadow-none border border-gray-100 dark:border-gray-700 flex items-center gap-4 transition-transform hover:scale-[1.02] duration-300">
                            {/* Item Image */}
                            <div className="w-20 h-20 shrink-0 rounded-xl bg-gray-100 dark:bg-gray-800 relative overflow-hidden border border-gray-100 dark:border-gray-700">
                                {product.image_url ? (
                                    <Image
                                        src={product.image_url}
                                        alt={product.title}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-gray-300">image</span>
                                    </div>
                                )}
                            </div>
                            {/* Item Details */}
                            <div className="flex-1 min-w-0 flex flex-col gap-1">
                                <div className="flex items-start justify-between gap-2">
                                    <h3 className="font-bold text-[#111617] dark:text-white text-base truncate">{product.title}</h3>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                        Active
                                    </span>
                                </div>
                                <p className="text-sm text-[#647e87] dark:text-gray-400 truncate">{product.condition} • {product.category}</p>
                                <p className="text-lg font-bold text-[#111617] dark:text-white mt-1">₵{parseFloat(product.price).toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="w-full flex flex-col gap-3">
                    {/* Primary Action: Promote */}
                    <button
                        onClick={() => router.push(`/dashboard/seller/listings/promote/${product.id}`)}
                        className="group relative w-full h-14 bg-[#1daddd] hover:bg-[#159cc9] active:scale-[0.98] transition-all duration-200 rounded-xl flex items-center justify-between px-6 shadow-[0_0_20px_rgba(29,173,221,0.3)] overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        <span className="relative z-10 flex items-center gap-2 text-white font-bold text-lg">
                            <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
                            Promote Listing
                        </span>
                        <span className="relative z-10 bg-white/20 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-sm">
                            Boost 2x
                        </span>
                    </button>
                    {/* Secondary Action: Done */}
                    <button
                        onClick={() => router.push('/dashboard/seller')}
                        className="w-full h-12 flex items-center justify-center text-[#647e87] dark:text-gray-400 font-bold hover:text-[#111617] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ListingSuccessCelebration() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#f7f7f8] dark:bg-[#21242c] flex items-center justify-center">
                <div className="animate-pulse text-primary font-bold">Loading...</div>
            </div>
        }>
            <SuccessContent />
        </Suspense>
    );
}
