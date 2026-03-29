import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, updateSetting } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function updateEnvFile(key: string, value: string) {
  const envPath = path.join(process.cwd(), '.env.local');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }
  
  const lines = envContent.split('\n');
  const keyPattern = new RegExp(`^${key}=.*$`, 'm');
  let keyExists = false;
  
  lines.forEach((line, index) => {
    if (line.match(keyPattern)) {
      lines[index] = `${key}=${value}`;
      keyExists = true;
    }
  });
  
  if (!keyExists) {
    lines.push(`${key}=${value}`);
  }
  
  fs.writeFileSync(envPath, lines.join('\n'));
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const user = getUserById(session.userId);
    if (!user?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const body = await request.json();
    const { action } = body;
    
    if (action === 'update_settings') {
      const { commission, minStake, maxStake } = body;
      
      if (commission !== undefined) {
        updateSetting('commission', (commission / 100).toString());
      }
      if (minStake !== undefined) {
        updateSetting('min_stake', minStake.toString());
      }
      if (maxStake !== undefined) {
        updateSetting('max_stake', maxStake.toString());
      }
      
      return NextResponse.json({ success: true, message: 'Settings updated' });
    }
    
    if (action === 'update_mpesa') {
      const { consumerKey, consumerSecret, shortcode, passkey, callbackUrl } = body;
      
      if (consumerKey) updateEnvFile('MPESA_CONSUMER_KEY', consumerKey);
      if (consumerSecret) updateEnvFile('MPESA_CONSUMER_SECRET', consumerSecret);
      if (shortcode) updateEnvFile('MPESA_SHORTCODE', shortcode);
      if (passkey) updateEnvFile('MPESA_PASSKEY', passkey);
      if (callbackUrl) updateEnvFile('MPESA_CALLBACK_URL', callbackUrl);
      
      return NextResponse.json({ 
        success: true, 
        message: 'M-PESA settings saved to .env.local. Restart the server for changes to take effect.' 
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Admin settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
