const path = require('path'); 
const CertificateGenerator = require (path.join(__dirname,"certificate/CertificateGenerator.js")).CertificateGenerator;
const PairingManager = require (path.join(__dirname,"pairing/PairingManager.js")).PairingManager;
const RemoteManager = require (path.join(__dirname,"remote/RemoteManager.js")).RemoteManager;
const remoteMessageManager = require (path.join(__dirname,"remote/RemoteMessageManager.js")).remoteMessageManager;
const EventEmitter = require ('events');

class AndroidRemote extends EventEmitter {
    constructor(host, options)
    {
        super();
        this.host = host
        this.cert = {
            key:options.cert?.key,
            cert:options.cert?.cert,
        }
        this.pairing_port = options.pairing_port?options.pairing_port:6467;
        this.remote_port = options.remote_port?options.remote_port:6466;
        this.service_name = options.service_name?options.service_name:"Service Name";
    }

    async start(){

        if(!this.cert.key || !this.cert.cert){
            this.cert = CertificateGenerator.generateFull(
                this.service_name,
                'CNT',
                'ST',
                'LOC',
                'O',
                'OU'
            );

            this.pairingManager = new PairingManager(this.host, this.pairing_port, this.cert, this.service_name)
            this.pairingManager.on('secret', () => this.emit('secret'));

            let paired = await this.pairingManager.start().catch(function (error) {
                console.error(error);
            });

            if(!paired){
                return;
            }
        }

        this.remoteManager = new RemoteManager(this.host, this.remote_port, this.cert);

        this.remoteManager.on('powered', (powered) => this.emit('powered', powered));

        this.remoteManager.on('volume', (volume) => this.emit('volume', volume));

        this.remoteManager.on('current_app', (current_app) => this.emit('current_app', current_app));

        this.remoteManager.on('ready', () => this.emit('ready'));

        await new Promise(resolve => setTimeout(resolve, 1000));

        let started = await this.remoteManager.start().catch(function (error){
            console.error(error);
        });

        return started;
    }

    sendCode(code){
        return this.pairingManager.sendCode(code);
    }

    sendPower(){
        return this.remoteManager.sendPower();
    }

    sendAppLink(app_link){
        return this.remoteManager.sendAppLink(app_link);
    }

    sendKey(key, direction){
        return this.remoteManager.sendKey(key, direction);
    }

    getCertificate(){
        return {
            key:this.cert.key,
            cert:this.cert.cert,
        }
    }

    stop(){
        this.remoteManager.stop();
    }
}

let RemoteKeyCode = remoteMessageManager.RemoteKeyCode;
let RemoteDirection = remoteMessageManager.RemoteDirection;
module.exports = {AndroidRemote, CertificateGenerator, RemoteKeyCode, RemoteDirection};

