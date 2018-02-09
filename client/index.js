const RTCPeerConnection =
  window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection
const RTCSessionDescription =
  window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription

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

const s4 = () =>
  Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1)

const guid = () => {
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4()
}

class RemotePeer {
  constructor(id, signal, onDataRecv, onOpen, onClose, onError) {
    this.id = id
    this.signal = signal
    this.conn = new RTCPeerConnection(peerConnectionConfig)

    this.conn.onicecandidate = event => {
      if (event && event.candidate) {
        this.signal.send(event.candidate)
      }
    }

    const channel = this.conn.createDataChannel('dataChannel', { maxRetransmits: 0, reliable: false })

    channel.onmessage = event => {
      onDataRecv(event)
    }

    channel.onopen = event => {
      this.channel = channel
      onOpen()
    }

    channel.onclose = event => {
      this.channel = null
      onClose()
    }

    channel.onerror = err => {
      onError(err)
    }

    this.conn.createOffer(offer => {
      offer = new RTCSessionDescription(offer)
      this.conn.setLocalDescription(
        offer,
        () => {},
        handleError(`error setting local description for peer ${id}`)
      )
      this.signal.send(offer)
    }, handleError('error creating offer'))
  }
}

class WebUDPClient {
  constructor(opts) {
    this.id = guid()

    this.signal = new SignalClient({
      id: this.id,
      addr: opts.addr,
      onRecv: this._onSignalRecv.bind(this)
    })

    this.onMessage = this.onMessage.bind(this)
    this.onOpen = this.onOpen.bind(this)
    this.onClose = this.onClose.bind(this)
    this.onError = this.onError.bind(this)

    this.peer = new RemotePeer(this.id, this.signal, this.onMessage, this.onOpen, this.onClose, this.onError)
  }

  _onSignalRecv(data) {
    if (data.type === 'answer') {
      this.peer.conn.setRemoteDescription(
        data,
        () => {},
        handleError(`error setting peer remote description for peer ${this.id}`)
      )
    } else if (data.candidate) {
      this.peer.conn.addIceCandidate(data)
    }
  }

  send(data) {
    if (this.peer.channel) {
      this.peer.channel.send(data)
    }
  }

  close() {
    if (this.peer.channel) {
      this.peer.channel.close()
    }
  }

  onClose() {}
  onOpen(id) {}
  onError(err) {}
  onMessage(data) {}
}
