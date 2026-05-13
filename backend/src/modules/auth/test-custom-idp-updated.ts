import axios from 'axios';
import { env } from '../../config/env';

// This script helps you test the OIDC flow manually
// Usage: 
// 1. bun src/modules/auth/test-custom-idp-updated.ts --get-url
// 2. bun src/modules/auth/test-custom-idp-updated.ts --code <CODE> --verifier <VERIFIER>

const CLIENT_ID = env.CUSTOM_IDP_CLIENT_ID;
const REDIRECT_URI = env.CUSTOM_IDP_REDIRECT_URI;
const IDP_URL = env.CUSTOM_IDP_URL;

import { createHash } from 'crypto';

function generateS256Challenge(verifier: string): string {
  return createHash('sha256')
    .update(verifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function run() {
  const args = process.argv.slice(2);

  if (args.includes('--get-url')) {
    const verifier = 'this_is_a_very_long_and_secure_verifier_string_1234567890';
    const challenge = generateS256Challenge(verifier);
    
    const url = `${IDP_URL}/api/auth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&code_challenge=${challenge}&code_challenge_method=S256`;
    
    console.log('\n1. Open this URL in your browser and log in:');
    console.log('-------------------------------------------');
    console.log(url);
    console.log('-------------------------------------------');
    console.log('\n2. After logging in, copy the "code" from the address bar and run:');
    console.log(`   bun src/modules/auth/test-custom-idp-updated.ts --code <YOUR_CODE> --verifier ${verifier}`);
    return;
  }

  const codeIndex = args.indexOf('--code');
  const verifierIndex = args.indexOf('--verifier');

  if (codeIndex !== -1 && verifierIndex !== -1) {
    const code = args[codeIndex + 1];
    const code_verifier = args[verifierIndex + 1];

    try {
      console.log('Exchanging code for token (using JSON body)...');
      const response = await axios.post(`${IDP_URL}/api/auth/token`, {
        client_id: CLIENT_ID,
        client_secret: env.CUSTOM_IDP_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier
      });

      console.log('\nSuccess! Token Response:');
      console.log(JSON.stringify(response.data, null, 2));
    } catch (error: any) {
      console.error('\nToken Exchange Failed:');
      console.error(error.response?.data || error.message);
    }
    return;
  }

  console.log('Usage:');
  console.log('  --get-url                   Generate authorize URL');
  console.log('  --code <code> --verifier <v>  Exchange code for token');
}

run();
