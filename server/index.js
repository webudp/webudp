const SignalServer = require('./signal')
const { RTCPeerConnection, RTCSessionDescription } = require('wrtc')

const peerConnectionConfig = {
  iceServers: [
    { url: 'stun:stun.l.google.com:19302' },
    { url: 'stun:stun1.l.google.com:19302' },
    { url: 'stun:stun2.l.google.com:19302' },
    { url: 'stun:stun3.l.google.com:19302' },
    { url: 'stun:stun4.l.google.com:19302' }
  ]
}

const handleError = message => err => console.log(message, err)

class RemotePeer {
  constructor(id, signal, onDataRecv, onOpen, onClose, onError) {
    this.id = id
    this.conn = new RTCPeerConnection(peerConnectionConfig)
    this.signal = signal
    this.channel = null

    this.conn.ondatachannel = event => {
      const { channel } = event
      channel.onmessage = event => {
        onDataRecv(id, event)
      }
      channel.onopen = event => {
        this.channel = channel
        setTimeout(() => {
          signal.disconnectAndClean(this.id)
        }, 2000)
        onOpen(this.id)
      }
      channel.onclose = event => {
        this.channel = null
        setTimeout(() => {
          signal.disconnectAndClean(this.id)
        }, 2000)
        onClose(id)
      }
      channel.onerror = err => {
        setTimeout(() => {
          signal.disconnectAndClean(this.id)
        }, 2000)

        onError(id, err)
      }
    }

    this.conn.onicecandidate = event => {
      if (event && event.candidate) {
        signal.send(this.id, event.candidate)
      }
    }
  }

  shouldAcceptOffer(offer) {
    offer = new RTCSessionDescription(offer)
    this.conn.setRemoteDescription(
      offer,
      () => {
        this.conn.createAnswer(answer => {
          answer = new RTCSessionDescription(answer)
          this.conn.setLocalDescription(
            answer,
            () => {},
            handleError(`error setting answer local description for peer ${this.id}`)
          )
          this.signal.send(this.id, answer)
        }, handleError(`error creating answer for peer ${this.id}`))
      },
      handleError(`error setting remote description for peer ${this.id}`)
    )
  }

  addCandidate(candidate) {
    this.conn.addIceCandidate(candidate)
  }

  send(data) {
    if (this.channel) {
      this.channel.send(data)
    } else {
      console.log(`channel is not open for peer ${this.id}`)
    }
  }
}

class WebUDPServer {
  constructor(opt) {
    this.peers = {}

    this.onLeave = this.onLeave.bind(this)
    this.onJoin = this.onJoin.bind(this)
    this.onError = this.onError.bind(this)
    this.onMessage = this.onMessage.bind(this)

    this.signal = new SignalServer({
      port: opt.port,
      onRecv: this._onSignalRecv.bind(this)
    })
  }

  _onSignalRecv(id, data) {
    const peer = this._getPeer(id)

    if (data.type === 'offer') {
      peer.shouldAcceptOffer(data)
    } else if (data.candidate) {
      peer.addCandidate(data)
    }
  }

  _getPeer(id) {
    let peer = this.peers[id]
    if (!peer) {
      peer = new RemotePeer(id, this.signal, this.onMessage, this.onJoin, this.onLeave, this.onError)
      this.peers[id] = peer
    }

    return peer
  }

  onLeave(id) {}
  onJoin(id) {}
  onError(id, err) {}
  onMessage(id, data) {}

  close(id) {
    const peer = this.peers[id]
    if (peer) {
      peer.channel.close()
    }
  }

  send(id, data) {
    const peer = this.peers[id]
    if (peer) {
      peer.send(data)
    }
  }

  sendAll(data) {
    Object.keys(this.peers).forEach(id => {
      const peer = this.peers[id]
      peer.send(data)
    })
  }
}

module.exports = WebUDPServer
