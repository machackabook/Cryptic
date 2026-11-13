import {readFile} from 'node:fs/promises';
const port = Number(process.env.NEXUS_BROKER_PORT || 7341);
if (!Number.isInteger(port) || port < 1 || port > 65535 || !process.env.NEXUS_BROKER_SECRET) throw new Error('broker_configuration_required');
const action = process.argv[2] || 'health';
const headers = {Authorization: 'Bearer ' + process.env.NEXUS_BROKER_SECRET};
const options = {headers, redirect: 'error', signal: AbortSignal.timeout(120000)};
let route = '/health';
if (action !== 'health') {
  if (!process.env.NEXUS_CAPABILITY_FILE) throw new Error('fresh_gateway_capability_file_required');
  headers['x-synapse-capability'] = (await readFile(process.env.NEXUS_CAPABILITY_FILE, 'utf8')).trim();
  headers['Content-Type'] = 'application/json';
  options.method = 'POST'; options.body = JSON.stringify({action, input: JSON.parse(process.argv[3] || '{}')}); route = '/v1/action';
}
const response = await fetch('http://127.0.0.1:' + port + route, options);
const result = await response.json(); console.log(JSON.stringify(result, null, 2));
if (!response.ok) process.exitCode = 1;
