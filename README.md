```
              _               _
__      _____| |__  _   _  __| |_ __  
\ \ /\ / / _ \ '_ \| | | |/ _` | '_ \
 \ V  V /  __/ |_) | |_| | (_| | |_) |
  \_/\_/ \___|_.__/ \__,_|\__,_| .__/
                               |_|
```

## WebUDP

> NOTE: This is highly experimental and the API will be change

WebUDP is a thin wraper on top of WebRTC. WebUDP tries to mimic the WebSocket API as much as possible at least on the client side.

> Signaling server/client are built on top of noraml http/fetch to make it super portable and light weight.

# Installation

```
yarn add webudp
```

# Usage

WebUDP comes with both server and client class which simplified the complexity of using WebRTC.

#### WebUDPServer

extends WebUDPServer and implement one or more of `onLeave`, `onJoin`, `onError` or `onMessage`.

Also `send(id, data)`, `sendAll(data)` and `close(id)` method are provided by WebUDPServer.

```js
const WebUDPServer = require('webudp/server')

//
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
```

#### WebUDPClient

Client side there are four(4) methods to implements. `send(data)` and `close()` are also provided by `WebUDPClient`

```js
class WebUDP extends WebUDPClient {
  constructor(addr) {
    super({ addr: addr })
  }

  onClose() {
    console.log('closed')
  }

  onOpen() {
    console.log('opened')
    this.send('hello udp server')

    setTimeout(() => {
      this.close()
    }, 5000)
  }

  onError(err) {
    console.log('error: ', err)
  }

  onMessage(data) {
    console.log('data', data)

    setTimeout(() => {
      this.send('hello from UDP client again')
    }, 1000)
  }
}

const webUDP = new WebUDP('http://localhost:8001')
```
