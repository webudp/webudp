class SignalClient {
  constructor(opts) {
    this.addr = `${opts.addr}/${opts.id}`
    this.onRecv = opts.onRecv
    setTimeout(() => this._onRecv(), 10)
  }

  send(data) {
    if (typeof data !== 'string') {
      data = JSON.stringify(data)
    }

    return fetch(this.addr, {
      method: 'POST',
      body: data
    })
  }

  _onRecv() {
    fetch(this.addr, { method: 'GET' })
      .then(data => {
        return data.json()
      })
      .then(data => {
        if (data.signal === 'destroy') {
          return
        }
        setTimeout(() => {
          this.onRecv(data)
        }, 10)
        this._onRecv()
      })
      .catch(err => {
        console.log(err)
      })
  }
}
