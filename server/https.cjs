// Project-local certificates only. This script never changes the system trust store.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync,spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),directory=path.join(root,'.runtime/tls');fs.mkdirSync(directory,{recursive:true,mode:0o700});
const caKey=path.join(directory,'ca.key'),ca=path.join(directory,'ca.pem'),key=path.join(directory,'server.key'),cert=path.join(directory,'server.pem');
const openssl=(...args)=>execFileSync('openssl',args,{stdio:['ignore','pipe','pipe']});
if(!fs.existsSync(ca)){
 openssl('req','-x509','-newkey','rsa:3072','-nodes','-sha256','-days','730','-keyout',caKey,'-out',ca,'-subj','/CN=Sight Local Development','-addext','basicConstraints=critical,CA:TRUE','-addext','keyUsage=critical,keyCertSign,cRLSign');fs.chmodSync(caKey,0o600);
}
const addresses=[...new Set(Object.values(os.networkInterfaces()).flat().filter(x=>x&&x.family==='IPv4'&&!x.internal).map(x=>x.address))];
const config=path.join(directory,'extensions.cnf');fs.writeFileSync(config,`basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\nsubjectAltName=DNS:localhost,IP:127.0.0.1${addresses.map(ip=>`,IP:${ip}`).join('')}\n`);
const request=path.join(directory,'server.csr');openssl('req','-new','-newkey','rsa:2048','-nodes','-keyout',key,'-out',request,'-subj','/CN=Sight');fs.chmodSync(key,0o600);
openssl('x509','-req','-in',request,'-CA',ca,'-CAkey',caKey,'-CAcreateserial','-out',cert,'-days','365','-sha256','-extfile',config);
const der=openssl('x509','-in',ca,'-outform','DER');fs.writeFileSync(path.join(root,'assets/sight-local-ca.cer'),der);
const profile=`<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>PayloadType</key><string>Configuration</string><key>PayloadVersion</key><integer>1</integer><key>PayloadIdentifier</key><string>local.sight.reader</string><key>PayloadUUID</key><string>${crypto.randomUUID()}</string><key>PayloadDisplayName</key><string>Sight local development</string><key>PayloadDescription</key><string>Trust your own computer's local Sight practice server.</string><key>PayloadContent</key><array><dict><key>PayloadType</key><string>com.apple.security.root</string><key>PayloadVersion</key><integer>1</integer><key>PayloadIdentifier</key><string>local.sight.reader.certificate</string><key>PayloadUUID</key><string>${crypto.randomUUID()}</string><key>PayloadDisplayName</key><string>Sight Local Development</string><key>PayloadContent</key><data>${der.toString('base64')}</data></dict></array></dict></plist>`;
fs.writeFileSync(path.join(root,'assets/sight-ipad.mobileconfig'),profile);
console.log('Project-local HTTPS ready. No certificate was installed on this computer.');
console.log(openssl('x509','-in',ca,'-noout','-fingerprint','-sha256').toString().trim());
for(const address of addresses)console.log(`iPad setup: http://${address}:5173/connect-ipad.html\nPractice: https://${address}:5174`);
const python=process.env.SIGHT_PYTHON||path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3');
const result=spawnSync(fs.existsSync(python)?python:'python3',[path.join(__dirname,'service.py'),'--port','5174','--cert',cert,'--key',key],{stdio:'inherit'});process.exit(result.status??1);
