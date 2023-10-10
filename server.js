const express = require('express');
const os = require('os');
const { exec } = require('child_process');

const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public')); // Serve static files from a 'public' directory

function isPrivateIP(ip) {
    const parts = ip.split('.').map(part => parseInt(part, 10));
    if (parts[0] === 10) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 172 && (parts[1] >= 16 && parts[1] <= 31)) return true;
    return false;
}

function formatUptime(uptime) {
    const secondsInMinute = 60;
    const secondsInHour = secondsInMinute * 60;
    const secondsInDay = secondsInHour * 24;

    const days = Math.floor(uptime / secondsInDay);
    uptime %= secondsInDay;

    const hours = Math.floor(uptime / secondsInHour);
    uptime %= secondsInHour;

    const minutes = Math.floor(uptime / secondsInMinute);

    return `${days} days, ${hours} hours, ${minutes} minutes`;
}

async function main() {

app.get('/', (req, res) => {
    res.render('index'); 
});

app.get('/data', async (req, res) => {
    // System
    const systemInfo = {
        hostname: os.hostname(),
        os: os.type(),
        kernelVersion: os.release(),
        uptime: formatUptime(os.uptime())
    };

    // Load Average
    const loadAvg = os.loadavg()[0] / os.cpus().length * 100;
    let loadColor;
    if (loadAvg <= 50) loadColor = 'green';
    else if (loadAvg <= 75) loadColor = 'orange';
    else loadColor = 'red';

    // CPU
    const cpuInfo = os.cpus()[0];
    const cpu = {
        model: cpuInfo.model,
        cores: os.cpus().length,
        speed: cpuInfo.speed,
    };

    // Network Usage
    const networkInterfaces = os.networkInterfaces();
    const networkUsage = Object.keys(networkInterfaces)
        .map(iface => {
            const details = networkInterfaces[iface].find(detail => detail.family === 'IPv4');
            return {
                name: iface,
                ip: details.address
            };
        })
        .filter(net => !isPrivateIP(net.ip)); // Filter out private IP addresses using the isPrivateIP function

    // Disk Usage
    const diskUsage = await getDiskUsage();

    // Memory Information
    const totalMem = os.totalmem() / (1024 * 1024);
    const freeMem = os.freemem() / (1024 * 1024);
    const usedMem = totalMem - freeMem;
    const memInfo = {
        usedPercentage: (usedMem / totalMem) * 100,
        used: usedMem,
        free: freeMem,
        total: totalMem
    };

    res.json({
        systemInfo,
        loadAvg,
        loadColor,
        cpu,
        networkUsage,
        diskUsage,
        memInfo
    });
});

app.listen(8888, '0.0.0.0', () => {
    console.log('Server started on http://0.0.0.0:8888');
});

}

main();

// Helper function to get Disk Usage using df
async function getDiskUsage() {
    return new Promise((resolve, reject) => {
        exec('df -h', (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            const lines = stdout.split('\n').slice(1);
            const disks = lines.map(line => {
                const parts = line.split(/\s+/);
                if (parts.length < 6) {
                    return null; // Return null for lines that don't have the expected number of columns
                }
                return {
                    filesystem: parts[0],
                    total: parts[1],
                    used: parts[2],
                    free: parts[3],
                    usePercentage: parts[4],
                    mount: parts[5]
                };
            }).filter(disk => {
                if (!disk) return false; // Filter out null values
                // Filter out non-primary partitions
                const nonPrimaryMounts = ['/dev', '/run', '/sys', '/proc', '/snap'];
                return !nonPrimaryMounts.some(mount => disk.mount.startsWith(mount));
            });
            resolve(disks);
        });
    });
}