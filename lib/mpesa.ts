import { createMpesaTransaction, getMpesaTransaction, updateMpesaTransaction, updateWalletBalance, updateTransactionStatus } from './db';

const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || '';
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || '';
const SHORTCODE = process.env.MPESA_SHORTCODE || '';
const PASSKEY = process.env.MPESA_PASSKEY || '';
const CALLBACK_URL = process.env.MPESA_CALLBACK_URL || '';
const ENV = process.env.MPESA_ENV || 'sandbox';
const SIMULATE = process.env.SIMULATE_MPESA === 'true';

const BASE_URL = ENV === 'sandbox' 
  ? 'https://sandbox.safaricom.co.ke' 
  : 'https://api.safaricom.co.ke';

function simulateSuccess(txId: string, phone: string, amount: number, type: 'stk_push' | 'b2c') {
  setTimeout(() => {
    const mpesaTx = getMpesaTransaction(txId) as any;
    if (mpesaTx) {
      updateMpesaTransaction(txId, `SIM${Date.now()}`, 'success');
      
      const txParts = mpesaTx.id.split('-');
      const userId = txParts[0];
      
      updateTransactionStatus(mpesaTx.id, 'success', `SIM${Date.now()}`);
      
      if (type === 'stk_push') {
        updateWalletBalance(userId, amount);
      }
    }
  }, 2000);
}

async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  
  const response = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });
  
  const data = await response.json();
  return data.access_token;
}

function generatePassword(): string {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -5);
  const passwordString = `${SHORTCODE}${PASSKEY}${timestamp}`;
  return Buffer.from(passwordString).toString('base64');
}

export interface STKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export async function initiateSTKPush(
  phone: string,
  amount: number,
  transactionId: string,
  description: string = 'SnakeBet Arena'
): Promise<STKPushResponse | null> {
  if (SIMULATE) {
    console.log(`[SIMULATE] STK Push: ${amount} KES to ${phone}`);
    
    createMpesaTransaction({
      id: transactionId,
      checkout_request_id: `SIM_CHECKOUT_${Date.now()}`,
      phone,
      amount,
      type: 'stk_push'
    });
    
    simulateSuccess(`SIM_CHECKOUT_${Date.now()}`, phone, amount, 'stk_push');
    
    return {
      MerchantRequestID: `SIM_MERCHANT_${Date.now()}`,
      CheckoutRequestID: `SIM_CHECKOUT_${Date.now()}`,
      ResponseCode: '0',
      ResponseDescription: 'Success. Request accepted for processing',
      CustomerMessage: '仿真模式：支付请求已发送 (Simulated: Payment request sent)'
    };
  }

  try {
    const token = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -5);
    const password = generatePassword();
    
    const formattedPhone = phone.startsWith('0') ? `254${phone.slice(1)}` : phone;
    
    const response = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount),
        PartyA: formattedPhone,
        PartyB: SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL: CALLBACK_URL,
        AccountReference: transactionId,
        TransactionDesc: description,
      }),
    });
    
    const data = await response.json();
    
    if (data.ResponseCode === '0') {
      createMpesaTransaction({
        id: transactionId,
        checkout_request_id: data.CheckoutRequestID,
        phone: formattedPhone,
        amount: amount,
        type: 'stk_push'
      });
    }
    
    return data;
  } catch (error) {
    console.error('STK Push Error:', error);
    return null;
  }
}

export interface B2CResponse {
  ConversationID: string;
  OriginatorConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

export async function initiateB2C(
  phone: string,
  amount: number,
  transactionId: string,
  description: string = 'SnakeBet Arena Withdrawal'
): Promise<B2CResponse | null> {
  if (SIMULATE) {
    console.log(`[SIMULATE] B2C: ${amount} KES to ${phone}`);
    
    createMpesaTransaction({
      id: transactionId,
      checkout_request_id: `SIM_B2C_${Date.now()}`,
      phone,
      amount,
      type: 'b2c'
    });
    
    simulateSuccess(`SIM_B2C_${Date.now()}`, phone, amount, 'b2c');
    
    return {
      ConversationID: `SIM_CONV_${Date.now()}`,
      OriginatorConversationID: `SIM_B2C_${Date.now()}`,
      ResponseCode: '0',
      ResponseDescription: 'Success'
    };
  }

  try {
    const token = await getAccessToken();
    
    const formattedPhone = phone.startsWith('0') ? `254${phone.slice(1)}` : phone;
    
    const response = await fetch(`${BASE_URL}/mpesa/b2c/v1/paymentrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        InitiatorName: 'apitest346',
        SecurityCredential: 'YWN0aXZlfGVuY3J5cHRpb25mcm9tbXlzYWZhcmljb21wYXNzMTIz',
        CommandID: 'BusinessPayment',
        Amount: Math.round(amount),
        PartyA: SHORTCODE,
        PartyB: formattedPhone,
        Remarks: description,
        QueueTimeOutURL: `${CALLBACK_URL.replace('callback', 'b2c_timeout')}`,
        ResultURL: `${CALLBACK_URL.replace('callback', 'b2c_result')}`,
        Occasion: transactionId,
      }),
    });
    
    const data = await response.json();
    
    if (data.ResponseCode === '0') {
      createMpesaTransaction({
        id: transactionId,
        checkout_request_id: data.OriginatorConversationID,
        phone: formattedPhone,
        amount: amount,
        type: 'b2c'
      });
    }
    
    return data;
  } catch (error) {
    console.error('B2C Error:', error);
    return null;
  }
}

export async function checkTransactionStatus(checkoutRequestId: string): Promise<any> {
  if (SIMULATE) {
    return {
      ResponseCode: '0',
      ResponseDescription: 'The service is available'
    };
  }

  try {
    const token = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -5);
    const password = generatePassword();
    
    const response = await fetch(`${BASE_URL}/mpesa/stkpushquery/v1/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      }),
    });
    
    return await response.json();
  } catch (error) {
    console.error('Transaction Status Error:', error);
    return null;
  }
}

export function parseCallbackData(data: any): { 
  ResultCode: number; 
  ResultDesc: string; 
  CheckoutRequestID?: string;
  TransactionId?: string;
  Amount?: string;
  PhoneNumber?: string;
} {
  if (data.Body?.stkCallback) {
    const callback = data.Body.stkCallback;
    return {
      ResultCode: callback.ResultCode,
      ResultDesc: callback.ResultDesc,
      CheckoutRequestID: callback.CheckoutRequestID,
      TransactionId: callback.TransactionId,
      Amount: callback.Amount,
      PhoneNumber: callback.PhoneNumber
    };
  }
  
  return {
    ResultCode: data.ResultCode || 0,
    ResultDesc: data.ResultDesc || 'Unknown'
  };
}
