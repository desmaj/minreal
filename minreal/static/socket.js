var STATE = {
    'UNINITIALIZED': 0,
    'OPENING': 1,
    'OPEN': 2,
    'CLOSING': 3,
    'CLOSED': 3,
};
window.TCPSocket = function (protocol, host, port, path) {
    this._host = null;
    this._port = null;
    this._csp = new CSPSession(protocol, host, port, path, null, true);
    this._csp.onread = this.onMessage.bind(this);
    this._csp.onopen = this.onOpen.bind(this);
    this._csp.onclose = this.onClose.bind(this);
    this.recv = function (bytes) {};
    this._state = STATE.UNINITIALIZED;
}
TCPSocket.prototype.connect = function (host, port) {
    this._host = host;
    this._port = port;
    this._csp.open();
    this._state = STATE.INITIALIZED;
}
TCPSocket.prototype.send = function (bytes) {
    this._send({'content': bytes});
}
TCPSocket.prototype._send = function (payload) {
    var message = msgpack.encode(payload);
    var str = [];
    for (var i=0; i<message.length; i++) {
	str += String.fromCharCode(message[i]);
    };
    this._csp.write(str);
}
TCPSocket.prototype.close = function () {
    this._state = STATE.CLOSING;
    this._send({'close': True})
}
TCPSocket.prototype.onOpen = function () {
    this._state = STATE.OPENING;
    this._send({'connect': this._host + "::" + this._port});
}
TCPSocket.prototype.onMessage = function (messagestr) {
    var message = [];
    try {
	for (var i=0; i<messagestr.length; i++) {
	    message.push(messagestr.charCodeAt(i));
	}
	var payload = msgpack.decode(message);
    } catch (err) {
	console.log(err);
    }
    if (payload.type == 'STATUS') {
	if (payload.value == 'OPEN') {
	    this._state = STATE.OPEN;
	} else if (payload.value == 'CLOSED') {
	    this._state = STATE.CLOSED;
	}
    } else if (payload.type == 'CONTENT') {
	this.recv(payload.value);
    }
}
TCPSocket.prototype.onClose = function () {
    this._state = STATE.CLOSED;
}
