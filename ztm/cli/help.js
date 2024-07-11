export default function (argv) {
  switch (argv[0]) {
    case 'version': return helpVersion()
    case 'config': return helpConfig()
    case 'run':
      switch (argv[1]) {
        case 'ca': return helpRunCA()
        case 'hub': return helpRunHub()
        case 'agent': return helpRunAgent()
        default: return helpRun()
      }
    case 'start':
      switch (argv[1]) {
        case 'ca': return helpRunCA('start')
        case 'hub': return helpRunHub('start')
        case 'agent': return helpRunAgent('start')
        case 'app': return helpCommandApp('start')
        default: return helpStart()
      }
    case 'stop':
      switch (argv[1]) {
        case 'ca': return helpStopCA()
        case 'hub': return helpStopHub()
        case 'agent': return helpStopAgent()
        case 'app': return helpCommandApp('stop')
        default: return helpStop()
      }
    case 'invite': return helpInvite()
    case 'evict': return helpEvict()
    case 'join': return helpJoin()
    case 'leave': return helpLeave()
    case 'get': return helpGet()
    case 'describe': return helpDescribe()
    case 'download':
      switch (argv[1]) {
        case 'file': return helpDownloadFile()
        case 'app': return helpCommandApp('download')
        default: return helpDownload()
      }
    case 'erase': return helpCommandApp('erase')
    case 'publish': return helpCommandApp('publish')
    case 'unpublish': return helpCommandApp('unpublish')
    case 'create':
      switch (argv[1]) {
        case 'service': return helpCreateService()
        case 'port': return helpCreatePort()
        default: return helpCreate()
      }
    case 'delete': return helpDelete()
    case 'log':
      switch (argv[1]) {
        case 'endpoint': return helpLogEndpoint()
        case 'app': return helpCommandApp('log')
        default: return helpLog()
      }
    default: return helpAll()
  }
}

function helpAll() {
  println()
  println(`Usage:`)
  println(`  ztm <command> [<object type>] [<object name>] [<options>]`)
  println(`  ztm <app> ...`)
  println()
  println(`Commands:`)
  println()
  println(`  version`)
  println(`  config`)
  println(`  start     ca | hub | agent | app`)
  println(`  stop      ca | hub | agent | app`)
  println(`  run       ca | hub | agent`)
  println(`  app`)
  println(`  invite`)
  println(`  evict`)
  println(`  join`)
  println(`  leave`)
  println(`  get       service | port | app | file | endpoint | mesh`)
  println(`  describe  service | port | app | file | endpoint | mesh`)
  println(`  create    service | port`)
  println(`  delete    service | port`)
  println(`  download  app | file`)
  println(`  erase     app`)
  println(`  publish   app`)
  println(`  unpublish app`)
  println(`  log       app | endpoint`)
  println()
  println(`Object types:`)
  println()
  println(`  ca`)
  println(`  hub`)
  println(`  agent`)
  println(`  mesh      meshes`)
  println(`  endpoint  endpoints  ep`)
  println(`  app       apps`)
  println(`  service   services   svc`)
  println(`  port      ports`)
  println()
  helpAppName()
  println()
  helpServiceName()
  println()
  helpPortName()
  println()
  println(`Type 'ztm help <command> [<object type>]' for more details.`)
  println()
}

function helpAppName() {
  println(`App name:`)
  println()
  println(`  provider/name@tag`)
  println(`  provider/name`)
  println(`  name@tag`)
  println(`  name`)
  println()
  println(`  e.g. 'root/my-fancy-hello-app@v2', 'ztm/ports'`)
}

function helpServiceName() {
  println(`Service name:`)
  println()
  println(`  tcp/name`)
  println(`  udp/name`)
  println()
  println(`  e.g. 'tcp/my-fancy-service', 'udp/voice-chat-svc'`)
}

function helpPortName() {
  println(`Port name:`)
  println()
  println(`  ip/tcp/port`)
  println(`  ip/udp/port`)
  println(`  localhost/tcp/port`)
  println(`  localhost/udp/port`)
  println(`  tcp/port`)
  println(`  udp/port`)
  println()
  println(`  e.g. '10.0.0.2/tcp/8080', 'localhost/udp/445', 'tcp/80'`)
}

function helpVersion() {
  println()
  println(`Usage: ztm version [--json]`)
  println()
  println(`Options:`)
  println(`  --json  Output version information in JSON format`)
  println()
}

function helpConfig() {
  println()
  println(`Usage: ztm config [--ca <host>:<port>] [--agent <host>:<port>]`)
  println()
  println(`Options:`)
  println(`  --ca     <host>:<port>  Where to access the CA service`)
  println(`                          Defaults to 'localhost:9999'`)
  println(`  --agent  <host>:<port>  Where to access the agent service`)
  println(`                          Defaults to 'localhost:7777'`)
  println()
}

function helpRun() {
  println()
  println(`Usage: ztm run ca|hub|agent <options>`)
  println()
  println(`Type 'ztm help run ca|hub|agent' for more details.`)
  println()
}

function helpRunCA(cmd) {
  cmd = cmd || 'run'
  println()
  println(`Usage: ztm ${cmd} ca [--listen [<ip>:]<port>] [--database <filename>]`)
  println()
  println(`Options:`)
  println(`  -l, --listen    [<ip>:]<port>  Service listening address`)
  println(`                                 Defaults to '127.0.0.1:9999'`)
  println(`  -d, --database  <filename>     Location of the database file`)
  println(`                                 Defaults to '~/ztm-ca.db'`)
  println()
}

function helpRunHub(cmd) {
  cmd = cmd || 'run'
  println()
  println(`Usage: ztm ${cmd} hub [--listen [<ip>:]<port>] [--ca <host>:<port>] [--name <address>]`)
  println()
  println(`Options:`)
  println(`  -l, --listen  [<ip>:]<port>   Service listening address`)
  println(`                                Defaults to '127.0.0.1:8888'`)
  println(`      --ca      <host>:<port>   Address of the CA service to connect to`)
  println(`                                Defaults to 'localhost:9999'`)
  println(`  -n, --name    <address>       Address of the hub that is visible to agents`)
  println(`                                More than one addresses can be provided if any`)
  println()
}

function helpRunAgent(cmd) {
  cmd = cmd || 'run'
  println()
  println(`Usage: ztm ${cmd} agent [--listen [<ip>:]<port>] [--database <filename>]`)
  println()
  println(`Options:`)
  println(`  -l, --listen    [<ip>:]<port>  Service listening address`)
  println(`                                 Defaults to '127.0.0.1:7777'`)
  println(`  -d, --database  <filename>     Location of the database file`)
  println(`                                 Defaults to '~/ztm.db'`)
  println()
}

function helpStart() {
  println()
  println(`Usage: ztm start ca|hub|agent|app [<app name>] <options>`)
  println()
  helpAppName()
  println()
  println(`Type 'ztm help start ca|hub|agent|app' for more details.`)
  println()
}

function helpStop() {
  println()
  println(`Usage: ztm stop ca|hub|agent|app [<app name>] <options>`)
  println()
  helpAppName()
  println()
  println(`Type 'ztm help stop ca|hub|agent|app' for more details.`)
  println()
}

function helpStopCA() {
  println()
  println(`Usage: ztm stop ca`)
  println()
}

function helpStopHub() {
  println()
  println(`Usage: ztm stop hub`)
  println()
}

function helpStopAgent() {
  println()
  println(`Usage: ztm stop agent`)
  println()
}

function helpInvite() {
  println()
  println(`Usage: ztm invite <username> --bootstrap <host>:<port> [--output <filename>]`)
  println()
  println(`Options:`)
  println(`  -b, --bootstrap  <host>:<port>  Target address of a hub for endpoint agents to connect to`)
  println(`  -o, --output     <filename>     Filename of the generated permit for an endpoint to join the mesh`)
  println(`                                  Output to stdout if not present`)
  println()
}

function helpEvict() {
  println()
  println(`Usage: ztm evict <username>`)
  println()
}

function helpJoin() {
  println()
  println(`Usage: ztm join <mesh name> --as <name> --permit <filename>`)
  println()
  println(`Options:`)
  println(`  -a, --as      <name>      Specify a name of the endpoint seen by other endpoints in the mesh`)
  println(`  -p, --permit  <filename>  Point to a file containing the permit for joining the mesh`)
  println(`                            A permit is generated with command 'ztm invite'`)
  println()
}

function helpLeave() {
  println()
  println(`Usage: ztm leave <mesh name>`)
  println()
}

function helpGet() {
  println()
  println(`Usage: ztm get mesh|endpoint|file|app|service|port [<name>] [--mesh <name>] [--endpoint <name>]`)
  println()
  println(`Options:`)
  println(`  -m, --mesh            <name>  Specify a mesh by name`)
  println(`                                Can be omitted when only 1 mesh is joined`)
  println(`                                Not applicable when doing 'ztm get mesh'`)
  println(`  -e, --ep, --endpoint  <name>  Specify an endpoint by name or UUID`)
  println(`                                Only applicable when doing 'ztm get app', 'ztm get service' or 'ztm get port'`)
  println()
  helpServiceName()
  println()
  helpPortName()
  println()
}

function helpDescribe() {
  println()
  println(`Usage: ztm describe mesh|endpoint|file|app|service|port <name> [--mesh <name>] [--endpoint <name>]`)
  println()
  println(`Options:`)
  println(`  -m, --mesh           <name>  Specify a mesh by name`)
  println(`                               Can be omitted when only 1 mesh is joined`)
  println(`                               Not applicable when doing 'ztm describe mesh'`)
  println(`  -e, --ep, --endpoint <name>  Specify an endpoint by name or UUID`)
  println(`                               Only applicable when doing 'ztm get app', 'ztm describe service' or 'ztm describe port'`)
  println()
  helpServiceName()
  println()
  helpPortName()
  println()
}

function helpDownload() {
  println()
  println(`Usage: ztm download app  <app name> <options>`)
  println(`       ztm download file <pathname> <options>`)
  println()
  helpAppName()
  println()
  println(`Type 'ztm help download app|file' for more details.`)
  println()
}

function helpDownloadFile(cmd) {
  println()
  println(`Usage: ztm download file <pathname> [--mesh <name>] [--output <pathname>]`)
  println()
  println(`Options:`)
  println(`  -m, --mesh    <name>  Specify a mesh by name`)
  println(`                        Can be omitted when only 1 mesh is joined`)
  println(`  -o, --output  <name>  Specify an output file for the download`)
  println(`                        Defaults to the stdout`)
  println()
}

function helpCommandApp(cmd) {
  println()
  println(`Usage: ztm ${cmd} app <app name> [--mesh <name>] [--endpoint <name>]`)
  println()
  println(`Options:`)
  println(`  -m, --mesh            <name>  Specify a mesh by name`)
  println(`                                Can be omitted when only 1 mesh is joined`)
  println(`  -e, --ep, --endpoint  <name>  Specify an endpoint by name or UUID`)
  println(`                                Defaults to the local endpoint`)
  println()
  helpAppName()
  println()
}

function helpCreate() {
  println()
  println(`Usage: ztm create service|port <name> <options>`)
  println()
  helpServiceName()
  println()
  helpPortName()
  println()
  println(`Type 'ztm help create service|port' for more details.`)
  println()
}

function helpCreateService() {
  println()
  println(`Usage: ztm create service <name> [--mesh <name>] [--endpoint <name>] --host <name> --port <number>`)
  println()
  println(`Options:`)
  println(`  -m, --mesh            <name>    Specify a mesh by name`)
  println(`                                  Can be omitted when only 1 mesh is joined`)
  println(`  -e, --ep, --endpoint  <name>    Specify an endpoint by name or UUID`)
  println(`                                  Can be omitted for the current local endpoint`)
  println(`  -h, --host            <name>    Host name or IP address of the service`)
  println(`  -p, --port            <number>  Port number of the service`)
  println()
  helpServiceName()
  println()
}

function helpCreatePort() {
  println()
  println(`Usage: ztm create port <name> [--mesh <name>] [--endpoint <name>] --service <name>`)
  println()
  println(`Options:`)
  println(`  -m, --mesh            <name>    Specify a mesh by name`)
  println(`                                  Can be omitted when only 1 mesh is joined`)
  println(`  -e, --ep, --endpoint  <name>    Specify an endpoint by name or UUID`)
  println(`                                  Can be omitted for the current local endpoint`)
  println(`  -s, --service         <name>    Name of the service that the port connects to`)
  println()
  helpPortName()
  println()
}

function helpDelete() {
  println()
  println(`Usage: ztm delete service|port [<name>] [--mesh <name>] [--endpoint <name>]`)
  println()
  println(`Options:`)
  println(`  -m, --mesh            <name>  Specify a mesh by name`)
  println(`                                Can be omitted when only 1 mesh is joined`)
  println(`  -e, --ep, --endpoint  <name>  Specify an endpoint by name or UUID`)
  println(`                                Can be omitted for the current local endpoint`)
  println()
  helpServiceName()
  println()
  helpPortName()
  println()
}

function helpLog() {
  println()
  println(`Usage: ztm log endpoint [<endpoint>] <options>`)
  println(`Usage: ztm log app       <app name>  <options>`)
  println()
  println(`Type 'ztm help log endpoint|app' for more details.`)
  println()
  helpAppName()
  println()
}

function helpLogEndpoint() {
  println()
  println(`Usage: ztm log endpoint [<endpoint>] [--mesh <name>]`)
  println()
  println(`Options:`)
  println(`  -m, --mesh  <name>  Specify a mesh by name`)
  println(`                      Can be omitted when only 1 mesh is joined`)
  println()
}
