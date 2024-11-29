const dgram = require('dgram');
const http = require('http');
const os = require('os');
const commands = {
    scan: { msg: { cmd: 'scan', data: { account_topic: 'reserve' } } },
    on: { msg: { cmd: 'turn', data: { value: 1 } } },
    off: { msg: { cmd: 'turn', data: { value: 0 } } },
    brighten: { msg: { cmd: 'brightness', data: { value: 80 } } },
    dim: { msg: { cmd: 'brightness', data: { value: 20 } } },
    status: { msg: { cmd: 'devStatus', data: {} } } ,
    color: { msg: { cmd: "colorwc", data: { color: { r: 0, g: 12, b: 8 }, colorTempInKelvin: 7200 } } }
}

const registered_handlers = {
    'InputHDMI1': runCommand('on'),
    'InputHDMI2': runCommand('off'),
    'InputHDMI3': brighten,
    'InputHDMI4': dim,
    'VolumeUp': randomColor,
    'VolumeDown': randomColor,
};


const device_name = 'Govee Light';
const roku_url = 'http://192.168.4.24:8060' // this checks if the roku is playing and dims/turns off the light. local ip of roku
const device_sku = 'H619E';
const serial_num = 'ROKU-ECP-GOVEE-H619E';
const device_uuid = 'b491599b-1d11-4cee-998b-15da56f3021c'
const socket = dgram.createSocket('udp4');
const controller_socket = dgram.createSocket('udp4');;
const server = http.createServer();
const join_port = 4001;
const listening_port = 4002;
const default_multicast_address = '239.255.255.250';
const webserver_port = 8060;
const webserver_host = '0.0.0.0';
const device_ip = getIpAddress().ipAddress;
const multicast_ip = '239.255.255.250'
const device_info_port = 8060;
const msearch_response = Buffer.from([
    'HTTP/1.1 200 OK', 'ST: roku:ecp', `USN: uuid:roku:ecp:${device_uuid}`,
    'CACHE-CONTROL: max-age=3600', `DATE: ${new Date().toUTCString()}`, 'SERVER: Roku/9.3.0 UPnP/1.0 Roku/9.3.0',
    `LOCATION: http://${device_ip}:${device_info_port}/`, 'EXT:',
].join('\r\n'), 'ascii');

const alive_messages = [
    Buffer.from([
        'NOTIFY * HTTP/1.1', 'Host: 239.255.255.250:1900', 'Cache-Control: max-age=3600',
        'NT: upnp:rootdevice', 'NTS: ssdp:alive', `LOCATION: http://${device_ip}:${device_info_port}/`,
        `USN: uuid:${device_uuid}::upnp:rootdevice`
    ].join('\r\n'), 'ascii'),
    Buffer.from([
        'NOTIFY * HTTP/1.1', 'HOST: 239.255.255.250:1900', 'NT: roku:ecp', 'NTS: ssdp:alive',
        `USN: uuid:roku:ecp:${device_uuid}`, `LOCATION: http://${device_ip}:${device_info_port}/`,
        'CACHE-CONTROL: max-age=1800', 'SERVER: Roku/9.3.0 UPnP/1.0 Roku/9.3.0'
    ].join('\r\n'), 'ascii')
]
let device_local_ip = ''
let device_brightness = 0;

socket.bind(listening_port)

function runCommand(name) {
    return () => {
        socket.send(JSON.stringify(commands[name]), join_port, default_multicast_address, (error) => {
            if (error) {
                console.error(error);
            } else {
                console.log(`Command: [${name}] sent`);
            }
        });
        if ((name === 'on') && roku_url) {
            let count = 0;
            device_brightness = 50;
            brighten();
            status();
            const int_id = setInterval(async () => {
                const player = await getRokuStatus(`${roku_url}`);
                if((player?.state === 'play' || count >= 36)) {
                    dimOff();
                    clearInterval(int_id);
                    status();
                }
                count++;
            }, 5000)
        }
    }
}

function scan() {
    socket.on('message', async (chunk) => {
        const buffer = Buffer.from(chunk);
        const messages = buffer.toString().trim().split('\r\n');
        messages.forEach((message) => {
            const parsed_message = JSON.parse(message);
            const { msg: { cmd, data : { ip, sku }} } = parsed_message;
            if (cmd === 'devStatus') {
                device_brightness = parsed_message.msg.data.brightness;
            } else if (cmd === 'scan' && device_sku === sku) {
                device_local_ip = ip;
            }
        })
    });

    socket.on('error', (err) => {
        console.error(err);
    });

    socket.on('close', () => {
        console.log('Socket is closed !');
    });
    runCommand('scan')();
    runCommand('status')();
}
function brighten() {
    let command = { ...commands['brighten'] }
    const new_brightness = (device_brightness + 30 > 100) ? 100 : device_brightness + 30;
    device_brightness = new_brightness;
    command.msg.data.value = new_brightness

    socket.send(JSON.stringify(command), join_port, device_local_ip, (error) => {
        if (error) {
            console.error(error);
        } else {
            console.log(`Command: [brighten] sent`);
        }
    });
}
function dim() {
    let command = { ...commands['dim'] }
    const new_brightness = (device_brightness - 30 <= 0) ? 0 : device_brightness - 30;
    device_brightness = new_brightness;
    command.msg.data.value = new_brightness

    socket.send(JSON.stringify(command), join_port, device_local_ip, (error) => {
        if (error) {
            console.error(error);
        } else {
            console.log(`Command: [dim] sent`);
        }
    });
}
function dimOff(){
    console.log(`Command: [dimOff] Received`);
    const int_id = setInterval(() => {
        let exe_command = { ...commands['dim'] }
        const new_brightness = device_brightness <= 5 ? 0 : device_brightness - 5
        device_brightness = new_brightness;
        exe_command.msg.data.value = new_brightness

        socket.send(JSON.stringify(exe_command), join_port, device_local_ip, (error) => {
            if (error) {
                console.error(error);
            } else {
                if (new_brightness <= 0) {
                    runCommand('off')();
                    clearInterval(int_id);
                    status();
                }
            }
        });
    }, 150)
}
function randomColor() {
    const exe_command = commands['color']
    exe_command.msg.data.color = {
        r: Math.floor(Math.random() * 255),
        g: Math.floor(Math.random() * 255),
        b: Math.floor(Math.random() * 255)
    }
    exe_command.msg.data.colorTempInKelvin = 5000
    socket.send(JSON.stringify(exe_command), join_port, device_local_ip, (error) => {
        if (error) {
            console.error(error);
        } else {
            console.log(`Command: [color] sent`);
        }
    });
}
function status() {
    socket.send(JSON.stringify(commands['status']), join_port, device_local_ip, (error) => {
        if (error) {
            console.error(error);
        } else {
            console.log(`Command: [status] sent`);
        }
    });
}
function close() {
    socket.close();
}

async function getRokuStatus(origin) {
    let playerState = null
    http.request(
        { hostname: `192.168.4.24`, port: 8060, method: 'GET', headers: { 'Content-Type': 'application/xml' }, path: '/query/media-player' },
        (res) => {
            let data = ""

            res.on("data", d => {
                data += d
            })
            res.on("end", () => {
                playerState = parseRokuResponse(data);
            })
        }
    )
    .end()
    return playerState
}

function parseRokuResponse(response) {
    const lines = response.split('\n');
    let playerState = {}
    lines.forEach((line) => {
        if(line.includes(' error=true>')) {
            playerState.error = 'true';
            isStreaming = false;
        } else if(line.includes('player state="close" error="false"')) {
            playerState.state = 'close';
            playerState.error = false;
            isStreaming = false;
        } else if(line.includes('player state="none" error="false"')) {
            playerState.state = 'close';
            playerState.error = false;
            isStreaming = false;
        } else if(line.includes('player state=play error=false')) {
            playerState.state = 'play';
            playerState.error = false;
            isStreaming = true;
        }
    })
    return playerState;
}

// ------ End GoveeService ------

// ------ Start Controller ------

controller_socket.bind(1900, () => controller_socket.addMembership(multicast_ip, device_ip));
controller_socket.on('error', (err) => {
    console.error('Socket Error', err);
    controller_socket.close();
});
controller_socket.on('listening', () => {
    const address = controller_socket.address();
    console.log(`Socket Listening on ${address.address}:${address.port}`);
});

function handleButton(button) {
    if (registered_handlers[button]) {
      registered_handlers[button]?.();
    } else {
      console.log(`Button ${button} not configured`);
    }
}

function requestHandler(req, res) { 
    if (req.url === '/') {
        res.setHeader('Content-Type', 'application/xml');
        res.writeHead(200);
        res.end(`
        <root xmlns="urn:schemas-upnp-org:device-1-0">
            <device>
                <deviceType>urn:roku-com:device:player:1-0</deviceType>
                <friendlyName>${device_name}</friendlyName>
                <manufacturer>Roku</manufacturer>
                <manufacturerURL>http://www.github.com/ambats</manufacturerURL>
                <modelName>Govee H619E</modelName>
                <serialNumber>${serial_num}</serialNumber>
                <UDN>uuid:${device_uuid}</UDN>
            </device>
        </root>
        `);
    } else if (req.url.startsWith('/keypress/')) {
        const button = req.url.split('/')[2];
        handleButton(button);
        res.writeHead(200);
        res.end();
    } else {
        res.writeHead(404);
        res.end();
    }
}
  
function listen() {
    console.log('Listening on port 8060');
    setInterval(() => {
        alive_messages.forEach((alive_message) => {
            controller_socket.emit('advertise-alive', alive_message);
        })
    }, 600 * 1000);

    controller_socket.on('message', async (chunk, rinfo) => {
        const buffer = Buffer.from(chunk);
        const message = buffer.toString().trim().split('\r\n');
        if (message[0].includes('M-SEARCH *' )) {
            controller_socket.send(msearch_response, 0, msearch_response.length, rinfo.port, rinfo.address, (err) => {
                if (err) {
                    console.error(err);
                }
            })
        }
    });
    server.on('request', requestHandler);
    server.listen(webserver_port, webserver_host, () => console.log(`Roku Service listening`));
}

function stop_controller() {
    controller_socket.close();
    server.close();
}
process.on("SIGINT", () => {
    console.log('SIGINT received. Closing connections...');
    stop_controller();
    close();
    process.exit();
});

function getIpAddress() {
    const interfaces = os.networkInterfaces()
    const keys = Object.keys(os.networkInterfaces())
    let ipAddress = ''
    let iface = ''
    keys.forEach((key) => {
        const ipV4 = interfaces[key]?.find((i) => i.family === 'IPv4' && !i.internal);
        if (ipV4) {
            ipAddress = ipV4.address;
            iface = key
        };
    })
    return { ipAddress, iface };
}
function start() {
    scan()
    listen();
}
start()