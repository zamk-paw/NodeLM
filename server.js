const express = require('express');
const osUtils = require('os-utils');
const netstat = require('node-netstat');
const fs = require('fs');

const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/stats', async (req, res) => {
    const cpuUsageValue = await new Promise(resolve => {
        osUtils.cpuUsage(v => {
            resolve(v * 100);
        });
    });

    const freememPercentage = osUtils.freememPercentage() * 100;
    const totalmem = osUtils.totalmem();
    const usedmem = totalmem * (1 - freememPercentage / 100);

    const stats = fs.statSync('/');
    const diskIO = {
        bytesRead: stats.rdev,
        bytesWritten: stats.blksize
    };

    const openPorts = [];
    netstat({
        done: () => {
            res.json({
                cpuUsage: cpuUsageValue,
                usedmem: usedmem,
                totalmem: totalmem,
                diskIO: diskIO,
                openPorts: openPorts
            });
        }
    }, data => {
        if (data.state === 'LISTEN') {
            openPorts.push(data);
        }
    });
});

app.get('/', (req, res) => {
    res.render('index');
});


app.listen(80, () => {
    console.log('Server started on http://localhost:80');
});

