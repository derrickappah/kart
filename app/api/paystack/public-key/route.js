import { NextResponse } from 'next/server';

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';
  
  if (!publicKey) {
    return NextResponse.json({ 
      error: 'Paystack public key not configured',
      message: 'Please set NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY in your environment variables'
    }, { status: 500 });
  }

  return NextResponse.json({ public_key: publicKey });
}
