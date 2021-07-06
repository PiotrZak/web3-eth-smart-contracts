var WalletProvider = require("truffle-wallet-provider");

// Read and unlock keystore 
var keystore = require('fs').readFileSync('./keystore').toString();
//console.log(keystore);
var pass = require('fs').readFileSync('./pass').toString();
var wallet = require('ethereumjs-wallet').fromV3(keystore, pass);

module.exports = {
    // See <http://truffleframework.com/docs/advanced/configuration>
	// to customize your Truffle configuration!
	compilers: {
        solc: {
        version: "^0.4.25"
        }
    },
    networks: {
        development: {
            host: "localhost",
            port: 8545,
            network_id: "*"  // Match any network id
        },
		rinkeby_infura: {
			provider: function() { return new WalletProvider(wallet, "https://rinkeby.infura.io/"); },
			network_id: 4,
		    gas: 4712388,  // Gas limit used for deploys. Default is 4712388
			gasPrice: 100000000000  // Default is 100000000000 (100 Shannon == 100 * 1,000,000,000 wei)
		},
		mainnet_infura: {
			provider: function() { return new WalletProvider(wallet, "https://mainnet.infura.io/"); },
			network_id: 1,
		    gas: 4712388,  // Gas limit used for deploys. Default is 4712388
			gasPrice: 100000000000  // Default is 100000000000 (100 Shannon)
		}
    }
};