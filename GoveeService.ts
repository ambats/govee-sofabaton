import dgram from 'dgram';
import { commands } from './commands';
import { Request } from './Request';

export class GoveeService {

    // update roku_url to the IP address of your Roku device. 
    // The port is usually 8060
    private roku_url: string | null = 'http://192.168.4.24:8060'

    // -- NO NEED TO CHANGE ANYTHING BELOW THIS LINE --
    // unless the join port and listening port are different for your device.
    
    private socket: dgram.Socket;
    private join_port: number = 4001;
    private listening_port: number = 4002;
    private default_multicast_address: string = '239.255.255.250';
    public device_local_ip: string = ''
    private device_sku: string = '';
    private device_brightness: number = 0;

    constructor(sku: string) {
        this.device_sku = sku
        this.socket = dgram.createSocket('udp4');
        this.socket.bind(this.listening_port);
    }

    scan() {
        this.socket.on('message', async (chunk: any) => {
            const buffer = Buffer.from(chunk);
            const messages = buffer.toString().trim().split('\r\n');
            messages.forEach((message: any) => {
                const parsed_message = JSON.parse(message);
                const { msg: { cmd, data : { ip, sku }} } = parsed_message;
                if (cmd === 'devStatus') {
                    this.device_brightness = parsed_message.msg.data.brightness;
                } else if (cmd === 'scan' && this.device_sku === sku) {
                    this.device_local_ip = ip;
                }
            })
        });

        this.socket.on('error', (err: any) => {
            console.error(err);
        });

        this.socket.on('close', () => {
            console.log('Socket is closed !');
        });
        this.command('scan')();
        this.command('status')();
    }

    command(name: string) {
        return () => {
            this.socket.send(JSON.stringify(commands[name]), this.join_port, this.default_multicast_address, (error: any) => {
                if (error) {
                    console.error(error);
                } else {
                    console.log(`Command: [${name}] sent`);
                }
            });
            if ((name === 'on') && this.roku_url) {
                let count = 0;
                this.device_brightness = 50;
                this.brighten();
                this.status();
                const int_id = setInterval(async () => {
                    const player: any = await getRokuStatus(`${this.roku_url}:8060`);
                    if((player?.state === 'play' || count >= 36)) {
                        this.dimOff();
                        clearInterval(int_id);
                        this.status();
                    }
                    count++;
                }, 5000)
            }
        }
    }

    brighten = () => {
        let command = { ...commands['brighten'] }
        const new_brightness = (this.device_brightness + 30 > 100) ? 100 : this.device_brightness + 30;
        this.device_brightness = new_brightness;
        command.msg.data.value = new_brightness

        this.socket.send(JSON.stringify(command), this.join_port, this.device_local_ip, (error: any) => {
            if (error) {
                console.error(error);
            } else {
                console.log(`Command: [brighten] sent`);
            }
        });
    }
    dim = () => {
        let command = { ...commands['dim'] }
        const new_brightness = (this.device_brightness - 30 <= 0) ? 0 : this.device_brightness - 30;
        this.device_brightness = new_brightness;
        command.msg.data.value = new_brightness

        this.socket.send(JSON.stringify(command), this.join_port, this.device_local_ip, (error: any) => {
            if (error) {
                console.error(error);
            } else {
                console.log(`Command: [dim] sent`);
            }
        });
    }
    dimOff = () => {
        console.log(`Command: [dimOff] Received`);
        const int_id = setInterval(() => {
            let command = { ...commands['dim'] }
            const new_brightness = this.device_brightness <= 5 ? 0 : this.device_brightness - 5
            this.device_brightness = new_brightness;
            command.msg.data.value = new_brightness
    
            this.socket.send(JSON.stringify(command), this.join_port, this.device_local_ip, (error: any) => {
                if (error) {
                    console.error(error);
                } else {
                    if (new_brightness <= 0) {
                        this.command('off')();
                        clearInterval(int_id);
                        this.status();
                    }
                }
            });
        }, 150)
    }
    randomColor = () => {
        const command = commands['color']
        command.msg.data.color = {
            r: Math.floor(Math.random() * 255),
            g: Math.floor(Math.random() * 255),
            b: Math.floor(Math.random() * 255)
        }
        command.msg.data.colorTempInKelvin = 5000
        this.socket.send(JSON.stringify(command), this.join_port, this.device_local_ip, (error: any) => {
            if (error) {
                console.error(error);
            } else {
                console.log(`Command: [color] sent`);
            }
        });
    }
    status = () => {
        this.socket.send(JSON.stringify(commands['status']), this.join_port, this.device_local_ip, (error: any) => {
            if (error) {
                console.error(error);
            } else {
                console.log(`Command: [status] sent`);
            }
        });
    }
    close() {
        this.socket.close();
    }
}


async function getRokuStatus(origin: string) {
    const url = `${origin}/query/media-player`;
    console.log('url', url);
    const request = new Request({ url, method: 'GET' });
    let playerState = null
    request.send((e: any, d: any, r: any) => {
        if (e) {
            console.error(e);
            return;
        }
        playerState = parseRokuResponse(d);
    });
    return playerState
}

function parseRokuResponse(response: string) {
    const lines = response.split('\n');
    let isStreaming = false;
    let playerState: Record<string, any> = {}
    lines.forEach((line: string) => {
        console.log('response', line);
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
