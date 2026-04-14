const axios = require('axios');
const crypto = require('crypto');

const fbToken = "EAAUZCVDCBj48BQwVykg3udvifZB2PD5bfUUebdqRYsz70jYaUIvjAphzvZAU59736Nx3IAdLuuOAWijZA9uOtVOZCDombJm4SlRkmjKCKpArkovbxNg499U2QqHmZC4VyOYOeJSvgTrbBqZAICHKAGXjYUjRluucyZBcDIMFWQYJ8PeIrxfOAjlVrEk81VIqAe1TVirIT2xTH8fQmEXFs3SK0ZBx3ZBtiybdAD7jZC262lRQnIa25eHCrcDrZCzjP5rhO00qC5d89kozUreihV9AZBUvBwWrEZANibesD5";
const fbSecret = "71add3525cf76ed5414faf252574420d";

async function testBulkFunding() {
  const proof = crypto.createHmac('sha256', fbSecret).update(fbToken).digest('hex');
  try {
    const response = await axios.get(`https://graph.facebook.com/v22.0/me/adaccounts`, {
      params: {
        access_token: fbToken,
        appsecret_proof: proof,
        fields: 'name,account_id,id,funding_source_details',
        limit: 10
      }
    });
    console.log('Bulk FB Response:', JSON.stringify(response.data, null, 2));
  } catch (e) {
    console.error('Bulk FB Error:', e.response?.data || e.message);
  }
}

testBulkFunding();
