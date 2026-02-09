
import fs from 'fs';
import path from 'path';
import { io } from 'socket.io-client';

const envPath = path.resolve('.env');
let env = {};
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) env[key.trim()] = value.trim();
    });
}

const API_URL = env.VITE_API_URL || 'https://api.voxeflow.com';
const API_KEY = env.VITE_API_KEY || 'Beatriz@CB650';
const INSTANCE = env.VITE_INSTANCE_NAME || 'VoxeFlow';

console.log(`🔌 Connecting to Socket: ${API_URL}`);

const socket = io(API_URL, {
    transports: ['websocket', 'polling'],
    query: {
        apikey: API_KEY
    }
});

socket.on('connect', () => {
    console.log('✅ Connected to Evolution API Socket!');
    console.log(`👂 Listening for events on instance: ${INSTANCE}`);
});

socket.on('connect_error', (err) => {
    console.error('❌ Connection Error:', err.message);
});

socket.on('messages.upsert', (data) => {
    // data structure: { instance: '...', data: { ...message... } }
    if (data.instance !== INSTANCE) return;

    const msg = data.data;
    const remoteJid = msg.key.remoteJid;

    // Check if it's the LID
    if (remoteJid.includes('97401268338833') || JSON.stringify(msg).includes('rosangela')) {
        console.log('\n🚨 RECEIVED MESSAGE FROM ROSANGELA!');
        console.log(JSON.stringify(msg, null, 2));
    } else {
        console.log(`📩 Message from ${remoteJid}`);
    }
});

socket.on('messages.update', (data) => {
    if (data.instance !== INSTANCE) return;
    if (JSON.stringify(data).includes('97401268338833')) {
        console.log('\n🔄 UPDATE FROM ROSANGELA:');
        console.log(JSON.stringify(data, null, 2));
    }
});
