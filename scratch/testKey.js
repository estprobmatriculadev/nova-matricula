const crypto = require('crypto');

const key = `-----BEGIN PRIVATE KEY-----\\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDCcdrk9+Pa5awU\\nLAWRVjuSCXlJNjuUkEft28erfMaLjFWG33kT4UD4R7DZNNLFAUay2iB6ZhzDyGqp\\nzKadfyv27Jhe87Vbau/TxWfWRir3otwGvQ34Mo4UHAt7lfwgTSVy5KpEjvFaBIm3\\nkbrXCDzPzCjpPHKHdKKQZjPeskNpdY0x/5f6pS+51pMNv56luh9Wlj2xfDOhZ38S\\n+14xwHMZC+VpeO8w9/Vk1qFaoH1Gv/pSFFCStP069Egcj+9W7J76pbWW/nM44ubo\\n1zD4uZ3UlQfkqrs8dz9+G05sRlhSkY61bYxuQLKYxLwY42hiG4HQUUcMyvR2iEU+\\n0ND/Tc4bAgMBAAECggEAE8n+QuxJnRcKds5uI0xOlBPGa2GLbxi/VqFWBl6/XtIW\\nuWJJIakaUBJQCnZ7jaC3qPyxzzfiOYQ7kayNE2OM2YBMd9atzrrEoyWKfQKiRkN\\njIVZcnJEDHQ4Okku7ONSat7ZHKYcQRLnfdkP1gpJahqMlVl+DHQd2//9dRjZDIE+\\nTf2mOMrNcZrynJvKAFPVd80Y31dbhWx3lOmE7IJLAJ1IFYcMZ34G0FypuoN4Tf5N\\n0ubv4bqEVGObuQAmr6krgrdDiRQBkqxk1uoafTsQ6dVEjsf8Tsd9v2En0915dt+H\\nXv6bKklUxvEgXShgtmxN8CC/2EngXysXzVSFuyJlkQKBgQD6ZroTTh9Y++1YAMUy\\nojLu4cKO8VSPtT9onhlKUO1m8NNLy7Ria6qbBoxlBtlld3vgT1L24RlgKdznYevf\\nbOKweRqoFwn5566aQ9fQWb89corE4NQ0wVLbfP44jAnoiP4jePasYDLiF8Au71aL\\nU7T6vuRQ9OojjRR1dkaehFCUqwKBgQDGytacxGHuFoAWmUEsrElH6++RE9TA93kn\\n/SdZqV4CHG1PT2MZ58JD0SEOEGW0zILbPgT+ZXmhciX9mPp/RFZhrmnpyQafZ3rT\\nTTBMdtJ6wU85p4Pv59PtusAxkUx8noFgYTCwIgtraKE+/KdLWPZ72BAzM7WSpglC\\nM83uqQRMUQKBgQDXnvIIgbM4uudsam1k5osZbUpOML3yac7KVanNdtaXWDV7BVS1\\nk6T7ja4DqNw3JaaER4pXkQp65lGU5Ztpb6fc8svjhsNOcRTHPjhu73lgfmvEkR3q\\nt7aTzpRTOTOnC6BcB2PSl5v5WR5izDIoE9K6QPr2Q5ADQQ8m/sxc3+9LtQKBgQDD\\n4u51jeI+HTfcjOm3HpIbZ/cqi1MTTwi5CfDznjw/ckmYZE7wIPrBntqmpCvEa93q\\nMoPzNoUTPIsJCOyV6f4AxUAime+Htg1HGAGm51NimQf7dQFCrrubv3FRpq6rAfnU\\nwhCbDwEXtwNlMMudKK3BvVfBTIv4VNo8vRWIvk248QKBgQCDxr7OKYeHuasR/fX7\\nb795sCOX/PX5SgwKHtFD8R50nYB2oKGiPdLxmdNKud3w0xr3mUKgN8RDWBDIjoey\\n7EF0RV21DO1RM95eCJTL/goFq8UvinUHe6Pev2eSELxP/YbOlu9f+VYE8MTbRTkD\\n7IQtcBhzPATz7gc4LPXKd03iWw==\\n-----END PRIVATE KEY-----\\n`;

function getPrivateKey(keyVal) {
  let key = keyVal || '';
  
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.slice(1, -1);
  }
  if (key.startsWith("'") && key.endsWith("'")) {
    key = key.slice(1, -1);
  }
  
  key = key.replace(/\\n/g, '\n');

  let isRsa = false;
  let cleanKey = key;
  if (key.includes('RSA PRIVATE KEY')) {
    isRsa = true;
    cleanKey = cleanKey
      .replace('-----BEGIN RSA PRIVATE KEY-----', '')
      .replace('-----END RSA PRIVATE KEY-----', '');
  } else {
    cleanKey = cleanKey
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '');
  }

  const base64Data = cleanKey.replace(/\s+/g, '');

  const lines = [];
  if (isRsa) {
    lines.push('-----BEGIN RSA PRIVATE KEY-----');
  } else {
    lines.push('-----BEGIN PRIVATE KEY-----');
  }

  for (let i = 0; i < base64Data.length; i += 64) {
    lines.push(base64Data.substring(i, i + 64));
  }

  if (isRsa) {
    lines.push('-----END RSA PRIVATE KEY-----');
  } else {
    lines.push('-----END PRIVATE KEY-----');
  }

  return lines.join('\n');
}

try {
  const formatted = getPrivateKey(key);
  console.log('Formatted Key:');
  console.log(formatted);
  const pkey = crypto.createPrivateKey(formatted);
  console.log('SUCCESS! Private key decoded successfully!');
} catch (e) {
  console.error('FAILED to decode private key:', e.message);
}
