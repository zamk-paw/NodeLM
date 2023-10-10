const express = require('express');
const os = require('os');
const { exec } = require('child_process');

const app = express();
app.set('view engine', 'ejs');

app.get('/', async (req, res) => {
    // System
    const systemInfo = {
        hostname: os.hostname(),
        os: os.type(),
        kernelVersion: os.release(),
        uptime: os.uptime()
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
        temperature: await getTemperature()
    };

    // Network Usage
    const networkInterfaces = os.networkInterfaces();
    const networkUsage = Object.keys(networkInterfaces).map(iface => {
        const details = networkInterfaces[iface][0];
        return {
            name: iface,
            ip: details.address,
            receiveData: 'N/A',  // Placeholder, requires additional logic
            transmitData: 'N/A'  // Placeholder, requires additional logic
        };
    });

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

    res.render('index', {
        systemInfo,
        loadAvg,
        loadColor,
        cpu,
        networkUsage,
        diskUsage,
        memInfo
    });
});

app.listen(80, '0.0.0.0', () => {
    console.log('Server started on http://0.0.0.0:80');
});

// Helper function to get CPU temperature using lm-sensors
async function getTemperature() {
    return new Promise((resolve, reject) => {
        exec('sensors', (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            const tempMatch = stdout.match(/temp1:\s+\+([\d.]+)/);
            const temperature = tempMatch ? parseFloat(tempMatch[1]) : 'N/A';
            resolve(temperature);
        });
    });
}

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
                return {
                    filesystem: parts[0],
                    total: parts[1],
                    used: parts[2],
                    free: parts[3],
                    usePercentage: parts[4],
                    mount: parts[5]
                };
            });
            resolve(disks);
        });
    });
}
