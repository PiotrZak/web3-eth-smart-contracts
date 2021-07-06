'use strict';

var config = require('../config')
var Web3js = require('web3')
var contract = require('./ValueStoContract.json')
var token = require('./ValueERC2xxToken.json')
var EthereumTx = require('ethereumjs-tx')

var w3js = null
var _contract = null
var _token = null

/**
 * Get access to web3js
 * @return {Object} Web3 object with provider
 */
const web3 = () => {
    if(!w3js)
        w3js = new Web3js(new Web3js.providers.HttpProvider(config.blockchain.host))

    return w3js
}


/**
 * Get contract instance
 * @returns {Object} Contract instance
 */
const instance = () => {
    if(!_contract)
        _contract = web3().eth.Contract(contract.abi, config.blockchain.contractAddr, {from: config.blockchain.wallet})

        return _contract
}

/**
 * Get token instance
 * @returns {Object} Token instance
 */
const tokenInstance = () => {
    if(!_token)
        _token = web3().eth.Contract(token.abi, config.blockchain.tokenAddr)

        return _token
}

/**
 * Get access to methods from token instance
 * The methods of this smart token are available through:
 * - The name
 * - The name with parameters
 * - The signature
 * @return {Object} Transaction Object
 */
const tokenMethods = () => {
    return tokenInstance().methods
}

/**
 * Get access to methods from contract instance
 * The methods of this smart contract are available through:
 * - The name
 * - The name with parameters
 * - The signature
 * @return {Object} Transaction Object
 */
const methods = () => {
    return instance().methods
}

/**
 * Execute signed method on contract
 * @param {any} method
 * @return {Promise} Return promise with transaction hash or error
 */
var lastNonce = false
var pendingNonce = -1;
const sendSigned = (method, gasPriceMultipler = 1) => {
    let from = config.blockchain.wallet

    return new Promise((resolve, reject) => {
        web3().eth.getTransactionCount(from, 'pending').then(nonce => {

            if(!lastNonce)
                lastNonce = nonce

            pendingNonce += 1 + (lastNonce - nonce)
            lastNonce = nonce
            nonce += pendingNonce

            if(nonce < lastNonce) {
                nonce = lastNonce
                pendingNonce = 0
            }

            
            web3().eth.getGasPrice().then(gasPrice => {
                var gp = gasPrice < 6000000000 ? 6000000000 : gasPrice
                gp = gp * gasPriceMultipler
                let transactionObject = {
                    gasPrice: web3().utils.toHex(gp),
                    gasLimit: web3().utils.toHex(config.blockchain.gasLimit),
                    data: method.encodeABI(),
                    from: config.blockchain.wallet,
                    to: config.blockchain.contractAddr,
                    value: web3().utils.toHex(0),
                    nonce: web3().utils.toHex(nonce)
                }

                const tx = new EthereumTx(transactionObject)

                tx.sign(Buffer.from(config.blockchain.privateKey, 'hex'))

                web3().eth.sendSignedTransaction('0x'+tx.serialize().toString('hex')).then(hash => {
                    console.log('tx_hash: ', hash.transactionHash)
                    console.log('success: ', web3().utils.hexToNumber(hash.status) ? true : false)
                    resolve(hash.transactionHash)
                }).catch(error => {
                    pendingNonce--;
                    reject({code: error, txObject: transactionObject})
                })

            }).catch(error => {
                console.error(error)
                pendingNonce--;
                reject(error)
            })
        }).catch(error => {
            console.error(error)
            pendingNonce--;
            reject(error)
        })
    })
}

// Methods implementations

/**
 * Set ETH/USD rate on contract
 * @param {number} rate Rate as decimal number
 */
const setEthUsd = (rate) => {
    return sendSigned(methods().setEthUsdRate(Math.round(rate * 100)))
}

const setEthFiatRate = (rate) => {
    return sendSigned(methods().setEthFiatRate(Math.round(rate * 100)))
}

const ethUsd = () => {
    return methods().ethUsd().call()
}

const addAllowedWallet = (wallet) => {
    return sendSigned(methods().addAllowedWallet(wallet), 2)
}

const addInvestorPartner = (wallet, partner) => {
    return sendSigned(methods().addInvestorPartner(wallet, partner), 2)
}

const AllowedWallets = (wallet) => {
    return methods().AllowedWallets(wallet).call()
}

const PartnerWallet = (wallet) => {
    return methods().PartnerWallet(wallet).call()
}

const currentOffer = () => {
    return methods().currentOffer().call()
}

const Offers = currentOffer => {
    return methods().Offers(currentOffer).call()
}

const TokenBalance = (wallet) => {
    return tokenMethods().balanceOf(wallet).call()
}

// End methods implementation

module.exports = {
    web3,
    sendSigned,
    instance,
    tokenInstance,
    tokenMethods,
    methods,

    setEthUsd,
    setEthFiatRate,
    addAllowedWallet,
    addInvestorPartner,
    AllowedWallets,
    PartnerWallet,
    ethUsd,
    currentOffer,
    Offers,

    TokenBalance,
}