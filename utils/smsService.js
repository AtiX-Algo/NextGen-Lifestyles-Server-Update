// server/utils/smsService.js
const axios = require('axios'); // Install axios if you haven't: npm install axios

const sendSMS = async (phone, message) => {
  try {
    console.log("========================================");
    console.log(`📱 SENDING SMS TO: ${phone}`);
    console.log(`💬 MESSAGE: ${message}`);
    console.log("========================================");

    // 🟢 OPTIONAL: If you buy GreenWeb API (BD Provider), uncomment this:
    /*
    const apiKey = 'YOUR_GREENWEB_API_KEY'; // Buy for ~250 BDT
    await axios.post(`http://api.greenweb.com.bd/api.php?token=${apiKey}&to=${phone}&message=${message}`);
    */
    
    return true;
  } catch (error) {
    console.error("SMS Failed:", error);
    return false;
  }
};

module.exports = sendSMS;