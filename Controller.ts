import dgram from 'dgram';
import http from 'http';
import os from 'os';

export class Controller {
  // change this to the name of your device
  private DEVICE_NAME = 'Govee H619E';

  // -- NO NEED TO CHANGE ANYTHING BELOW THIS LINE --
  private webserver_port: number = 8060;
  private webserver_host: string = '0.0.0.0';
  private registered_handlers: any = {};
  private socket: dgram.Socket;
  private DEVICE_INFO_PORT = 8060;
  private DEVICE_IP: string = getIpAddress().ipAddress;
  private MULTICAST_IP = '239.255.255.250'
  private server: http.Server;

  private MSEARCH_RESPONSE = Buffer.from([
      'HTTP/1.1 200 OK',
      'ST: roku:ecp',
      `USN: uuid:roku:ecp:${this.DEVICE_NAME}`,
      'CACHE-CONTROL: max-age=3600',
      `DATE: ${new Date().toUTCString()}`,
      'SERVER: Roku/9.3.0 UPnP/1.0 Roku/9.3.0',
      `LOCATION: http://${this.DEVICE_IP}:${this.DEVICE_INFO_PORT}/`,
      'EXT:',
  ].join('\r\n'), 'ascii');
  private NOTIFY_ALIVE = Buffer.from([
      'NOTIFY * HTTP/1.1',
      'HOST: 239.255.255.250:1900',
      'NT: roku:ecp',
      'NTS: ssdp:alive',
      `USN: uuid:roku:ecp:${this.DEVICE_NAME}`,
      `LOCATION: http://${this.DEVICE_IP}:${this.DEVICE_INFO_PORT}/`,
      'CACHE-CONTROL: max-age=1800',
      'SERVER: Roku/9.3.0 UPnP/1.0 Roku/9.3.0'
    ].join('\r\n'), 'ascii');

  constructor() {
    this.socket = dgram.createSocket('udp4');
    this.server = http.createServer();

    this.socket.bind(1900, () => this.socket.addMembership(this.MULTICAST_IP, this.DEVICE_IP));

    this.socket.on('error', (err) => {
        console.error('Socket Error', err);
        this.socket.close();
    });
    this.socket.on('listening', () => {
        const address = this.socket.address();
        console.log(`Socket Listening on ${address.address}:${address.port}`);
    });
  }

  private handleButton(button: string) {
    if (this.registered_handlers[button]) {
      this.registered_handlers[button]?.();
    } else {
      console.log(`Button ${button} not configured`);
    }
  }

  public register(button: string, handler: () => void) {
    this.registered_handlers[button] = handler;
  }

  private requestHandler = (req: any, res: http.ServerResponse) => { 
    console.log(`Request from: ${req.url}`);
    if (req.url === '/') {
      res.setHeader('Content-Type', 'application/xml');
      res.writeHead(200);
      res.end(`
      <root xmlns="urn:schemas-upnp-org:device-1-0">
      <device>
          <friendlyName>${this.DEVICE_NAME}</friendlyName>
          <manufacturer>Roku</manufacturer>
          <manufacturerURL>http://www.github.com/ambats</manufacturerURL>
          <modelName>Govee H619E</modelName>
          <serialNumber>ROKUFY-GOVEE-H619E</serialNumber>
          <UDN>uuid:b491599b-1d11-4cee-998b-15da56f3022c</UDN>
          </device>
      </root>
      `);
      } else if (req.url.startsWith('/keypress/')) {
        const button = req.url.split('/')[2];
        this.handleButton(button);
        res.writeHead(200);
        res.end();
      } else {
        res.writeHead(404);
        res.end();
      }
  }
  
  public listen() {
      setInterval(() => {
        this.socket.emit('advertise-alive', this.NOTIFY_ALIVE);
    }, 1800 * 1000);

    this.socket.on('message', async (chunk: any, rinfo: any) => {
        const buffer = Buffer.from(chunk);
        const message = buffer.toString().trim().split('\r\n');
        if (message[0].includes('M-SEARCH *') && message.join('|').includes('ST: roku:ecp')) {
            this.socket.send(this.MSEARCH_RESPONSE, 0, this.MSEARCH_RESPONSE.length, rinfo.port, rinfo.address, (err) => {
                if (err) {
                    console.error(err);
                }
            })
        }
    });
    this.server.on('request', this.requestHandler);
    this.server.listen(this.webserver_port, this.webserver_host, () => console.log(`Roku Service listening`));
  }

  public close() {
    this.socket.close();
    this.server.close();
  }
}

function getIpAddress() {
  const interfaces = os.networkInterfaces()
  const keys = Object.keys(os.networkInterfaces())
  let ipAddress = ''
  let iface = ''
  keys.forEach((key) => {
      const ipV4 = interfaces[key]?.find((i: any) => i.family === 'IPv4' && !i.internal);
      if (ipV4) {
          ipAddress = ipV4.address;
          iface = key
      };
  })
  return { ipAddress, iface };
}
