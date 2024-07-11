#!/usr/bin/env -S pipy --log-local=null --args

var options = parseOptions({
  defaults: {
    '--method': 'GET',
    '--header': [],
    '--connections': 10,
    '--duration': 10,
    '--payload': 0,
  },
  shorthands: {
    '-X': '--method',
    '-H': '--header',
    '-c': '--connections',
    '-d': '--duration',
    '-p': '--payload',
  },
})

function parseOptions({ defaults, shorthands }) {
  var args = []
  var opts = {}
  var lastOption

  pipy.argv.forEach(
    function (term, i) {
      if (i === 0) return
      if (lastOption) {
        if (term.startsWith('-')) throw `Value missing for option ${lastOption}`
        addOption(lastOption, term)
        lastOption = undefined
      } else if (term.startsWith('--')) {
        var kv = term.split('=')
        processOption(kv[0], kv[1])
      } else if (term.startsWith('-')) {
        if (term.length === 2) {
          processOption(term)
        } else {
          processOption(term.substring(0, 2), term.substring(2))
        }
      } else {
        args.push(term)
      }
    }
  )

  function processOption(name, value) {
    var k = shorthands[name] || name
    if (!(k in defaults)) throw `invalid option ${k}`
    if (typeof defaults[k] === 'boolean') {
      opts[k] = true
    } else if (value) {
      addOption(k, value)
    } else {
      lastOption = name
    }
  }

  function addOption(name, value) {
    var k = shorthands[name] || name
    switch (typeof defaults[k]) {
      case 'number': opts[k] = Number.parseFloat(value); break
      case 'string': opts[k] = value; break
      case 'object': (opts[k] ??= []).push(value); break
    }
  }

  return { args, ...defaults, ...opts }
}

if (options.args.length !== 2) {
  println('Usage: stress <options> <URL>')
  println('Options:')
  println('  -c, --connections <number>  Number of connections')
  println('  -d, --duration    <number>  Duration of test in seconds')
  println('  -X, --method      <string>  HTTP request method such as GET, POST, ...')
  println('  -H, --header      <string>  Add an HTTP request header')
  println('  -p, --payload     <number>  Request payload size in bytes')
  return
}

var urlStr = options.args[1]
if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
  urlStr = 'http://' + urlStr
}

var url = new URL(urlStr)

var headers = options['--header'].map(
  function (header) {
    var kv = header.split(':')
    var k = kv[0]
    var v = kv[1] || ''
    return [k.trim(), v.trim()]
  }
)

if (!headers.some(([k]) => k.toLowerCase() === 'host')) {
  headers.push(['Host', url.host])
}

var payload = options['--payload']

var request = new Message(
  {
    method: options['--method'],
    path: url.path,
    headers: Object.fromEntries(headers),
  },
  payload > 0 ? 'x'.repeat(payload) : null
)

var connections = options['--connections']
var duration = options['--duration']
var endTime = Date.now() + duration * 1000

if (pipy.thread.id === 0) {
  println('Stress testing', url.href)
  println(`Running ${pipy.thread.concurrency} threads for ${duration} seconds with ${connections} connections each`)
}

var counts = new stats.Counter('counts', ['status'])

var latency = new stats.Histogram('latency', [
  ...Array(10).fill().map((_, i) => (i + 1) / 100),
  ...Array(16).fill().map((_, i) => (i * 50 + 200) / 1000),
  ...Array(7).fill().map((_, i) => (2 ** i)),
  ...Array(9).fill().map((_, i) => (i + 1) * 100),
  ...Array(5).fill().map((_, i) => (i + 1) * 1000),
  Number.POSITIVE_INFINITY
])

var stopAll
var stopPromise = new Promise(r => stopAll = r)

var $time
var $conn

var tcp = pipeline($=>$
  .connect(`${url.hostname}:${url.port}`)
)

var tls = pipeline($=>$
  .connectTLS({ sni: url.host }).to(tcp)
)

pipeline($=>$
  .onStart(request)
  .forkJoin(Array(connections)).to($=>$
    .onStart((_, i) => void ($conn = i))
    .encodeHTTPRequest()
    .repeat(() => Date.now() < endTime).to($=>$
      .handleMessageStart(() => void ($time = pipy.now()))
      .mux(() => $conn).to($=>$
        .insert(() => stopPromise.then(new StreamEnd))
        .pipe(url.protocol === 'https:' ? tls : tcp)
        .decodeHTTPResponse()
      )
      .handleMessageStart(
        function (res) {
          latency.observe(pipy.now() - $time)
          counts.increase()
          counts.withLabels(res.head.status).increase()
        }
      )
      .replaceMessage(new StreamEnd)
    )
  )
  .replaceStreamStart(() => {
    stopAll()
    return new StreamEnd
  })

).spawn().then(
  function () {
    if (pipy.thread.id === 0) {
      stats.sum(['counts', 'latency', 'pipy_outbound_in']).then(
        function ({ counts, latency, pipy_outbound_in }) {
          var total = counts.value
          println(`Completed ${total} requests in ${duration} seconds, ${formatSize(pipy_outbound_in.value)} read`)
          println('  Responses')
          counts.submetrics().forEach(
            m => {
              println('   ', formatPercentage(m.value / total).padEnd(5), 'Status', m.label)
            }
          )
          var p = latency.percentile
          println('  Latency')
          println('    50% ', formatTime(p.calculate(50)))
          println('    75% ', formatTime(p.calculate(75)))
          println('    90% ', formatTime(p.calculate(90)))
          println('    95% ', formatTime(p.calculate(95)))
          println('    99% ', formatTime(p.calculate(99)))
          println('Requests per second:', Math.round(total / duration))
          println('Transfer per second:', formatSize(pipy_outbound_in.value / duration))
        }
      )
    }
  }
)

function formatPercentage(n) {
  return (n * 100).toFixed(0) + '%'
}

function formatSize(n) {
  var KB = 1024
  var MB = KB * 1024
  var GB = MB * 1024
  var TB = GB * 1024
  if (n < KB) return n + 'B'
  else if (n < MB) return (n / KB).toFixed(2) + 'KB'
  else if (n < GB) return (n / MB).toFixed(2) + 'MB'
  else if (n < TB) return (n / GB).toFixed(2) + 'GB'
  else return (n / TB).toFixed(2) + 'TB'
}

function formatTime(t) {
  if (t < 1) return Math.round(t * 1000) + 'us'
  else if (t < 1000) return t.toFixed(2) + 'ms'
  else return (t / 1000).toFixed(2) + 's'
}
