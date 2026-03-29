import { NextRequest, NextResponse } from 'next/server';
import { 
  updateMpesaTransaction, 
  getMpesaTransaction, 
  updateTransactionStatus, 
  updateWalletBalance 
} from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (data.Body?.stkCallback) {
      const callback = data.Body.stkCallback;
      const checkoutRequestId = callback.CheckoutRequestID;
      const resultCode = callback.ResultCode;
      const resultDesc = callback.ResultDesc;
      
      const mpesaTx = getMpesaTransaction(checkoutRequestId) as any;
      
      if (!mpesaTx) {
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
      }
      
      if (resultCode === 0) {
        const items = callback.CallbackMetadata?.Item || [];
        const amount = items.find((i: any) => i.Name === 'Amount')?.Value;
        const mpesaRef = items.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value;
        const phone = items.find((i: any) => i.Name === 'PhoneNumber')?.Value;
        
        updateMpesaTransaction(checkoutRequestId, mpesaRef, 'success');
        
        if (mpesaTx.type === 'stk_push' && mpesaTx.id) {
          updateTransactionStatus(mpesaTx.id, 'success', mpesaRef);
          
          updateWalletBalance(mpesaTx.id.replace(/[^a-z0-9-]/gi, ''), mpesaTx.amount);
        }
      } else {
        updateMpesaTransaction(checkoutRequestId, '', 'failed');
        
        if (mpesaTx.id) {
          updateTransactionStatus(mpesaTx.id, 'failed');
        }
      }
    }
    
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error) {
    console.error('M-PESA callback error:', error);
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Error processing callback' });
  }
}
