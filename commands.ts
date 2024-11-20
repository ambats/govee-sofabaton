export const commands: Record<string, any> = {
    scan: { msg: { cmd: 'scan', data: { account_topic: 'reserve' } } },
    on: { msg: { cmd: 'turn', data: { value: 1 } } },
    off: { msg: { cmd: 'turn', data: { value: 0 } } },
    brighten: { msg: { cmd: 'brightness', data: { value: 80 } } },
    dim: { msg: { cmd: 'brightness', data: { value: 20 } } },
    status: { msg: { cmd: 'devStatus', data: {} } } ,
    color: { msg: { cmd: "colorwc", data: { color: { r: 0, g: 12, b: 8 }, colorTempInKelvin: 7200 } } }
}