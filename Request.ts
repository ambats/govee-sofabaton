import * as http from 'http';
// API request  class using node http module
export class Request {
    private options: any;
    private protocol: string;
    private host: string;
    private port: number;
    private path: string;
    private method: string;
    private headers: any;
    private body: any;
    private request: any;
    private response: any;
    private data: any;
    private error: any;
    private callback: any;
    constructor(options: any) {
        this.options = options;
        const urlParts = this.urlSplitter(options.url);
        this.protocol = urlParts.protocol || 'http:';
        this.host = urlParts.host;
        this.port = urlParts.port;
        this.path = urlParts.path;
        this.method = options.method || 'GET';
        this.headers = options.headers || {};
        this.body = options.body;
        this.request = null;
        this.response = null;
        this.data = null;
        this.error = null;
        this.callback = null;
    }
    private urlSplitter(url: string) {
        const result = {
            protocol: 'http:',
            host: '',
            port: 80,
            path: '',
        };
        result.protocol = `${url.split(':')[0]}:`;
        const withoutProtocol = url.split('//')[1];
        const hostWithPort = withoutProtocol.split('/')[0];
        result.host = hostWithPort.split(':')[0];
        result.port = Number(hostWithPort.split(':')[1]) || 80;
        result.path = `/${withoutProtocol.split('/').splice(1).join('/')}`;
        return result;
    }
    send(callback: any) {
        this.callback = callback;
        const options = {
            protocol: this.protocol,
            host: this.host,
            port: this.port,
            path: this.path,
            method: this.method,
            headers: this.headers
        };

        if (this.body) {
            options.headers['Content-Length'] = Buffer.byteLength(this.body);
        }
        this.request = http.request(options, this.handleResponse.bind(this));
        this.request.on('error', this.handleError.bind(this));
        if (this.body) {
            this.request.write(this.body);
        }
        this.request.end();
    }
    handleResponse(response: any) {
        this.response = response;
        this.data = '';
        response.on('data', (chunk: any) => {
            this.data += chunk;
        });
        response.on('end', () => {
            this.handleEnd();
        });
    }
    handleError(error: any) {
        this.error = error;
        this.handleEnd();
    }
    handleEnd() {
        if (this.callback) {
            this.callback(this.error, this.data, this.response);
        }
    }
}
