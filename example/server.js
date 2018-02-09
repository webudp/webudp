const WebUDPServer = require('webudp/server')

class WebUDP extends WebUDPServer {
  constructor(port) {
    super({ port: port })
  }

  onLeave(id) {
    console.log('leave: ', id)
  }

  onJoin(id) {
    console.log('join: ', id)
    this.send(id, 'hello from UDP server')
  }

  onError(id, err) {
    console.log('error: ', id, err)
  }

  onMessage(id, data) {
    console.log('data: ', id, data)

    setTimeout(() => {
      this.send(id, 'hello from UDP server again')
    }, 1000)
  }
}

new WebUDP(8001)
