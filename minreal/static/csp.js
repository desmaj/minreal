var createXHR = function () {
    return new XMLHttpRequest()
};

var debugFactory = function (flag) {
    if (flag && window.console && console.log) {
	return (function (m) {
	    console.log(m);
	});
    } else {
	return (function (m) {});
    };
};

/**
*
*  Base64 encode / decode
*  http://www.webtoolkit.info/
*
**/
 
var Base64 = {
 
    // private property
    _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
 
    // public method for encoding
    encode : function (input) {
	var output = "";
	var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
	var i = 0;
 
	// input = Base64._utf8_encode(input);
 
	while (i < input.length) {
 
	    chr1 = input.charCodeAt(i++);
	    chr2 = input.charCodeAt(i++);
	    chr3 = input.charCodeAt(i++);
	    
	    enc1 = chr1 >> 2;
	    enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
	    enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
	    enc4 = chr3 & 63;

	    if (isNaN(chr2)) {
		enc3 = enc4 = 64;
	    } else if (isNaN(chr3)) {
		enc4 = 64;
	    }

	    output = output +
		this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
		this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
	}
 
	return output;
    },
 
    // public method for decoding
    decode : function (input) {
	var output = "";
	var chr1, chr2, chr3;
	var enc1, enc2, enc3, enc4;
	var i = 0;
 
	input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
 
	while (i < input.length) {
 
	    enc1 = this._keyStr.indexOf(input.charAt(i++));
	    enc2 = this._keyStr.indexOf(input.charAt(i++));
	    enc3 = this._keyStr.indexOf(input.charAt(i++));
	    enc4 = this._keyStr.indexOf(input.charAt(i++));
 
	    chr1 = (enc1 << 2) | (enc2 >> 4);
	    chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
	    chr3 = ((enc3 & 3) << 6) | enc4;
 
	    output = output + String.fromCharCode(chr1);
 
	    if (enc3 != 64) {
		output = output + String.fromCharCode(chr2);
	    }
	    if (enc4 != 64) {
		output = output + String.fromCharCode(chr3);
	    }
 
	}
 
	// output = Base64._utf8_decode(output);
 
	return output;
 
    },
 
    // // private method for UTF-8 encoding
    // _utf8_encode : function (string) {
    // 	string = string.replace(/\r\n/g,"\n");
    // 	var utftext = "";
 
    // 	for (var n = 0; n < string.length; n++) {
 
    // 	    var c = string.charCodeAt(n);
 
    // 	    if (c < 128) {
    // 		utftext += String.fromCharCode(c);
    // 	    }
    // 	    else if((c > 127) && (c < 2048)) {
    // 		utftext += String.fromCharCode((c >> 6) | 192);
    // 		utftext += String.fromCharCode((c & 63) | 128);
    // 	    }
    // 	    else {
    // 		utftext += String.fromCharCode((c >> 12) | 224);
    // 		utftext += String.fromCharCode(((c >> 6) & 63) | 128);
    // 		utftext += String.fromCharCode((c & 63) | 128);
    // 	    }
 
    // 	}
 
    // 	return utftext;
    // },
 
    // // private method for UTF-8 decoding
    // _utf8_decode : function (utftext) {
    // 	var string = "";
    // 	var i = 0;
    // 	var c = c1 = c2 = 0;
 
    // 	while ( i < utftext.length ) {
 
    // 	    c = utftext.charCodeAt(i);
 
    // 	    if (c < 128) {
    // 		string += String.fromCharCode(c);
    // 		i++;
    // 	    }
    // 	    else if((c > 191) && (c < 224)) {
    // 		c2 = utftext.charCodeAt(i+1);
    // 		string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
    // 		i += 2;
    // 	    }
    // 	    else {
    // 		c2 = utftext.charCodeAt(i+1);
    // 		c3 = utftext.charCodeAt(i+2);
    // 		string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
    // 		i += 3;
    // 	    }
 
    // 	}
 
    // 	return string;
    // }
 
};

var CSPSession = function (host, port, path, transport, debug) {
    this._host = host;
    this._port = port;
    this._path = path;
    this._debug = debugFactory(debug);
    
    this._packets_to_send = new Array();
    this._last_packet_id = -1;
    this._current_packet_id = 1;
    this._transport = null;
    if (transport) {
	this._transport_choices = [transport];
    } else {
	this._transport_choices = ['xhrstreaming', 'jsonp', 'polling'];
    };
    this.onopen = function (environ) {
	this._debug("session opened")
    }.bind(this);
    this._onopen = function (environ) {
	this.onopen(environ);
    }.bind(this);
    this.onread = function (message) { this._debug("session read: " + message) }.bind(this);
    this.onclose = function () { this._debug("session closed") }.bind(this);
    this.onerror = function (e) {
	this._debug("transport error detected for transport " + this._transport.name);
	var open = !this._transport.opened;
	this._transport = this.getTransport(this, this._host, this._port, this._path, this._debug)
	this._debug('trying transport: ' + this._transport.name);
	if (open) {
	    this._transport.open();
	} else {
	    this._transport.opened = true;
	    this._transport.start();
	};
    }.bind(this);
};

CSPSession.prototype.getTransport = function (session, host, port, path, debug) {
    var transports = {
	polling: CSPPollingTransport,
	xhrstreaming: CSPXHRStreamingTransport,
	jsonp: CSPJSONPTransport
    };
    var preference = null;
    if (this._transport) {
	for (var i=0; i < this._transport_choices.length; i++) {
	    if (this._transport.name == this._transport_choices[i]) {
		if (i < (this._transport_choices.length - 1)) {
		    preference = this._transport_choices[i+1];
		    break
		};
	    };
	};
	if (!preference) {
	    throw "NoWorkingTransportsError";
	};
    } else {
	preference = this._transport_choices[0]
    };
    var transport = new transports[preference](session, host, port, path, debug);
    transport.onopen = this._on_transport_open.bind(this);
    return transport;
};

CSPSession.prototype.open = function () {
    this._transport = this.getTransport(this, this._host, this._port, this._path, this._debug);
    try {
	this._transport.open();
    } catch (e) {
	this.onerror(e);
    };
};

CSPSession.prototype._on_transport_open = function (environ) {
    this._onopen(environ);
};

CSPSession.prototype.close = function () {
    this._transport.close();
};

CSPSession.prototype._makePacket = function (data) {
    var encoded_data = Base64.encode(data);
    var packet = [this._current_packet_id, 1, encoded_data];
    this._current_packet_id += 1;
    return packet;
};

CSPSession.prototype.write = function (data) {
    var packet = this._makePacket(data);
    this._packets_to_send.push(packet);
    var self = this;
    var message = JSON.stringify(this._packets_to_send);
    this._transport.send(message, function () {
	self._packets_to_send = new Array();
    });
};

CSPSession.prototype._receive = function (message) {
    var batch = JSON.parse(message);
    for (var i=0; i < batch.length; i++) {
	var data = batch[i][2];
	if (batch[i][1] == 1) {
	    data = Base64.decode(batch[i][2]);
	}
	this.onread(data);
	this._last_packet_id = batch[i][0];
    };
};

var CSPTransport = function (session, host, port, path, debug) {
    var self = this;
    
    this._session = session;
    this._host = host;
    this._port = port;
    this._path = path;
    this.opened = false;
    this._debug = debug;
    
    this._onopen = function (environ) {
	var onopen = this.onopen || function (environ) {
	    debug("transport " + self.name + " opened");
	};
	onopen(environ);
	this.opened = true;
	this.start();
    };
    this._onread = function (message) {
	(this.onread || function () { debug("transport read: " + message) })();
	this._session._receive(message);
    };
    this._onclose = function () {
	(this.onclose || function () { debug("transport closed") })();
	this._session.onclose();
	this.opened = false;
    };
    this._onerror = function (e) {
	(this.onerror || function () { debug("transport error: " + e.toString()) })();
	this._session.onerror(e);
    };
};

CSPTransport.prototype.makeUrl = function (path, args) {
    var url = 'http://' + this._host + ':' + this._port + '/' + this._path;
    if (path) {
	url += '/' + path;
    };
    
    if (args) {
	url += "?"
	for (var arg in args) {
	    if (url.slice(-1) != "?") {
		url += "&";
	    };
	    url += arg + "=" + args[arg];
	};
    };
    
    return url
};

CSPTransport.prototype.makeBody = function (args) {
    var body = ""
    for (var arg in args) {
	if (body.length > 0) {
	    body += "&";
	}
	body += arg + "=" + encodeURIComponent(args[arg]);
    };
    return body;
}

CSPTransport.prototype.send = function (data, success_callback) {
    var self = this;
    try {
	var url = this.makeUrl('send')
	var body = this.makeBody({s: this._session._session_id,
				  d: data,
				  a: this._session._last_packet_id});
	this._debug(url);
	this._debug(body);
	var xhr = createXHR();
	xhr.onreadystatechange = function () {
	    if (this.readyState == 4) {
		if (this.responseText.slice(1, -1) == "OK") {
		    success_callback();
		} else {
		    self._debug("SEND_ERROR: [" + this.responseText + "]");
		};
	    };
	};
	xhr.open('POST', url);
	xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
	xhr.send(body);
    } catch (e) {
	self._onerror(e);
    };
};

CSPTransport.prototype.close = function () {
    this._closing = true;
};

CSPTransport.prototype._close = function () {
    this._onclose();
};

CSPTransport.prototype.start = function () {
    var self = this;
    self.doComet();
};

CSPTransport.prototype.doXHR = function (url, callback, data) {
    try {
	this._debug(url);
	var xhr = createXHR();
	xhr.onreadystatechange = callback;
	xhr.open('POST', url);
	xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
	if (data) {
	    xhr.send(data);
	} else {
	    xhr.send();
	};
    } catch (e) {
	self._onerror(e);
    };
};

CSPTransport.prototype.parseHandshake = function (handshake) {
    return JSON.parse(handshake)['session'];
};

var CSPPollingTransport = function (session, host, port, path, debug) {
    CSPTransport.call(this, session, host, port, path, debug);
    this._closing = false;
    this.name = "polling";
};
CSPPollingTransport.prototype = new CSPTransport();



CSPPollingTransport.prototype.open = function () {
    var self = this;
    var url = this.makeUrl('handshake', 
			   {d: '{}'}
			  );
    this._debug(url);
    var xhr = createXHR();
    xhr.onreadystatechange = function () {
	if (this.readyState == 4) {
	    var environ = JSON.parse(this.responseText);
	    self._session._session_id = environ['session'];
	    self._onopen(environ);
	};
    };
    xhr.open('GET', url);
    xhr.send();
};

CSPPollingTransport.prototype.doComet = function () {
    this._debug('making comet request');
    var self = this;
    var url = this.makeUrl('comet',
			   {s: this._session._session_id,
			    du: "0",
			    a: this._session._last_packet_id}
			  );
    try {
	this.doXHR(url, function () {
	    if (this.readyState == 4) {
		self._onread(this.responseText);
		if (!self._closing) {
		    setTimeout(function () { self.doComet() }, 1000);
		} else {
		    self._close();
		};
	    };
	});
    } catch (e) {
	self._onerror(e);
    };
};

CSPPollingTransport.prototype.doSend = function () {
};

CSPPollingTransport.prototype.doClose = function () {
};

var CSPXHRStreamingTransport = function (session, host, port, path, debug) {
    CSPTransport.call(this, session, host, port, path, debug);
    this.closeable = true;
    this.name = "xhrstreaming";
};
CSPXHRStreamingTransport.prototype = new CSPTransport();

CSPXHRStreamingTransport.prototype.open = function () {
    var self = this;
    var url = this.makeUrl('handshake', 
			   {d: '{}',
			    ct: 'application/octet-stream'}
			  );
    var onReadyStateChange = function () {
	if (this.readyState == 4) {
	    var environ = JSON.parse(this.responseText);
	    self._session._session_id = environ['session'];
	    self._onopen(environ);
	};
    };
    try {
	this.doXHR(url, onReadyStateChange);
    } catch (e) {
	self._onerror(e);
    };
};

CSPXHRStreamingTransport.prototype.doComet = function () {
    this._debug('making comet request');
    var self = this;
    var url = this.makeUrl('comet',
			   {s: this._session._session_id,
			    du: "10",
			    is: "1",
			    p: "256",
			    a: this._session._last_packet_id}
			  );
    try {
	this._debug(url);
	this.xhr = createXHR();
	var data_received = "";
	this.xhr.onreadystatechange = function () {
	    self._debug('XHR callback:(' + this.responseText + ')');
	    try {
		self.closeable = false;
		if (this.readyState > 2) {
		    if (this.status != 200) {
			this.abort();
			return
		    };
		};
		
		if (this.readyState == 3) {
		    if (this.responseText.length == data_received.length) {
			return
		    };
		    var message = this.responseText.slice(data_received.length);
		    data_received = this.responseText;
		    self._onread(message);
		    self.closeable = true;
		} else if (this.readyState == 4) {
		    if (!this.responseText.length) return;
		    
		    if (this.responseText.length != data_received.length) {
			var message = this.responseText.slice(data_received.length);
			data_received = this.responseText;
			self._onread(message);
		    };
		    self.closeable = true;
		    if (!self._closing) {
			setTimeout(function () { self.doComet() }, 0);
		    } else {
			self._close();
		    };
		} else {
		    self.closeable = true;
		};
	    } catch (e) {
		self._onerror(e);
	    };
	};
	this.xhr.open('GET', url);
	this.xhr.send();
	this.closer = function () {
	    if (self.closeable) {
		self.xhr.abort()
		self._close();
	    } else {
		setTimeout(self.closer, 1);
	    };
	};
    } catch (e) {
	self._onerror(e);
    };
};

CSPXHRStreamingTransport.prototype.close = function () {
    this._debug("closing");
    this._closing = true;
    this.closer();
};

var CSPJSONPTransport = function (session, host, port, path, debug) {
    CSPTransport.call(this, session, host, port, path, debug);
    this.name = "jsonp";
};
CSPJSONPTransport.prototype = new CSPTransport();

CSPJSONPTransport.prototype.open = function () {
    var self = this;
    var url = this.makeUrl('handshake', 
			   {d: '{}',
			    bp: "trickly_comet_cb('",
			    bs: "');",
			    rp: "trickly_cb('",
			    rs: "');",
			    ct: encodeURI('text/javascript')}
			  );
    try {
	this._debug(url);
	var script_tag_id = '__xxx__trickly_jsonp_open_tag__';
	window.trickly_cb = function (message) {
	    var environ = JSON.parse(message);
	    self._session._session_id = environ['session'];
	    var tag = document.getElementById(script_tag_id);
	    document.body.removeChild(tag);
	    try {
		delete window.trickly_cb;
	    } catch (e) {
	    };
	    self._onopen(environ);
	};
	var tag = document.createElement('script');
	tag.id = script_tag_id;
	tag.type = 'text/javascript';
	tag.src = url;
	document.body.appendChild(tag);
    } catch (e) {
	self._onerror(e);
    };
};

CSPJSONPTransport.prototype.send = function (data, success_callback) {
    var url = this.makeUrl('send', 
			   {s: this._session._session_id,
			    d: data,
			    a: this._session._last_packet_id}
			  );
    try {
    this._debug(url);
    var script_tag_id = '__xxx__trickly_jsonp_send_tag__';
    window.trickly_cb = function (message) {
	if (message == "OK") {
	    success_callback();
	};
	try {
	    delete window.trickly_cb;
	} catch (e) {
	};
	var tag = document.getElementById(script_tag_id);
	document.body.removeChild(tag);
    };
    var tag = document.createElement('script');
    tag.id = script_tag_id;
    tag.type = 'text/javascript';
    tag.src = url;
    document.body.appendChild(tag);
    } catch (e) {
	self._onerror(e);
    };
};

CSPJSONPTransport.prototype.doComet = function () {
    this._debug('making comet request');
    var self = this;
    var url = this.makeUrl('comet/' + (new Date()).getTime().toString(),
			   {s: this._session._session_id,
			    du: "30",
			    a: this._session._last_packet_id,
			    is: 0
			   }
			  );
    try {
	this._debug(url);
	var script_tag_id = '__xxx__trickly_jsonp_comet_tag__';
	window.trickly_comet_cb = function (message) {
	    self._onread(message);
	    var tag = document.getElementById(script_tag_id);
	    document.body.removeChild(tag);
	    if (!self._closing) {
		setTimeout(function () { self.doComet() }, 0);
	    } else {
		self._close();
	    };
	};
	var tag = document.createElement('script');
	tag.id = script_tag_id;
	tag.type = 'text/javascript';
	tag.src = url;
	document.body.appendChild(tag);
    } catch (e) {
	self._onerror(e);
    };
};
