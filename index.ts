import { GoveeService } from './GoveeService';
import { Controller } from './Controller';

const LightControl = new GoveeService('H619E');
const RemoteControl = new Controller();
LightControl.scan()


// --- CONFIGURE SOFABATON REMOTE CONTROL BUTTONS ---
RemoteControl.register('InputHDMI1', LightControl.command('on'));
RemoteControl.register('InputHDMI2', LightControl.command('off'));
RemoteControl.register('InputHDMI3', LightControl.brighten);
RemoteControl.register('InputHDMI4', LightControl.dim);
RemoteControl.register('VolumeUp', LightControl.randomColor);
RemoteControl.register('VolumeDown', LightControl.randomColor);
// --- END CONFIGURE REMOTE CONTROL BUTTONS ---


RemoteControl.listen();

process.on("SIGINT", () => {
  console.log('SIGINT received. Closing connections...');
  RemoteControl.close();
  LightControl.close();
  process.exit();
});
