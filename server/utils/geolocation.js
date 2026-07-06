const https = require('https');

/**
 * Resolves country name for a given IP using ipapi.co.
 * Falls back to 'United States' for localhost/private IPs.
 */
const getCountryByIp = (ip) => {
  return new Promise((resolve) => {
    if (!ip) return resolve('United States');
    
    // Clean IP in case of IPv6 prefixing or forwarded list
    let cleanIp = ip.split(',')[0].trim();
    if (cleanIp.startsWith('::ffff:')) {
      cleanIp = cleanIp.substring(7);
    }
    
    if (cleanIp === '::1' || cleanIp === '127.0.0.1' || cleanIp.startsWith('10.') || cleanIp.startsWith('192.168.') || cleanIp.startsWith('172.')) {
      return resolve('United States');
    }

    const url = `https://ipapi.co/${cleanIp}/json/`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed && parsed.country_name) {
            return resolve(parsed.country_name);
          }
          resolve('United States');
        } catch {
          resolve('United States');
        }
      });
    }).on('error', () => {
      resolve('United States');
    });
  });
};

module.exports = { getCountryByIp };
