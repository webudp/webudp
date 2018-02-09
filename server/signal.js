const http = require('http')

const readBody = req =>
  new Promise(res => {
    let body = ''
    req.on('data', function(data) {
      body += data
    })
    req.on('end', function() {
      res(JSON.parse(body))
    })
  })

const getId = req => {
  return req.url
    .split('/')
    .join('')
    .trim()
}

class SignalServer {
  constructor(opts) {
    this.onRecv = opts.onRecv // (id, data) =>
    this.queues = {}
    this.responses = {}

    http.createServer(this._onReceiveConn.bind(this)).listen(opts.port)
  }

  send(id, data) {
    let queue = this.queues[id]
    if (!queue) {
      queue = []
      this.queues[id] = queue
    }

    if (typeof data !== 'string') {
      data = JSON.stringify(data)
    }

    queue.push(data)
  }

  disconnectAndClean(id) {
    const res = this.responses[id]
    if (res) {
      this._header(res, 200)
      res.end('{"signal": "destroy"}')
    }

    delete this.responses[id]
    delete this.queues[id]
  }

  _header(res, status) {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept'
    })
  }

  _listen(id, res) {
    const queue = this.queues[id]

    if (queue && queue.length !== 0) {
      this._header(res, 200)
      res.end(queue.shift())
      return
    }

    this.responses[id] = res
  }

  _onReceiveConn(req, res) {
    const id = getId(req)
    switch (req.method) {
      case 'POST':
        readBody(req).then(data => {
          setImmediate(() => {
            this.onRecv(id, data)
          })
          this._header(res, 200)
          res.end()
        })
        break
      case 'GET':
        setImmediate(() => {
          this._listen(id, res)
        })
        break
      default:
        this._header(res, 405)
        res.end('{"error":"Method Not Allowed"}')
    }
  }
}

module.exports = SignalServer
