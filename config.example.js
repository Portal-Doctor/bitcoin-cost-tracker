// Bitcoin Core Node Configuration
// Copy this file to config.js and update with your Bitcoin node settings

module.exports = {
  bitcoin: {
    host: 'localhost',
    port: 8332,
    username: 'bitcoin',
    password: 'your_bitcoin_rpc_password',
    timeout: 30000
  },
  
  // Optional: Testnet configuration
  // bitcoin: {
  //   host: 'localhost',
  //   port: 18332,
  //   username: 'bitcoin',
  //   password: 'your_testnet_rpc_password',
  //   timeout: 30000
  // }
};
