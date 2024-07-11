((
  tag = 0,
  bodies = new Array(10).fill().map((_, i) => (
    new Data(
      new Array(i * 2000).fill('x'.charCodeAt(0))
    )
  )),
  requests = new stats.Counter('requests'),
  errors = new stats.Counter('errors'),

) => pipy({
  _session: null,
  _tag: 0,
})

.task()
.onStart(new Data)
.fork(new Array(100).fill()).to($=>$
  .onStart(() => void (_session = {}))
  .replay().to($=>$
    .replaceData(
      () => new Message(
        {
          method: 'POST',
          path: '/test',
          headers: {
            'x-tag': _tag = (tag++).toString(),
          },
        },
        bodies[tag % bodies.length],
      )
    )
    .muxHTTP(() => _session).to(
      $=>$.connect('localhost:8000')
    )
    .handleMessageStart(
      ({ head }) => (
        head.status == 200 && head.headers['x-tag'] !== _tag ? (
          errors.increase(),
          console.log('Sent tag', _tag, 'but got', head.headers['x-tag'])
        ) : (
          requests.increase()
        )
      )
    )
    .replaceMessage(new StreamEnd('Replay'))
    .replaceStreamEnd(new StreamEnd('Replay'))
  )
)

)()
