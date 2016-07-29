var TCPStore = function (host, port, path, app) {
    this._messages = [];
    this._app = app;
    this._sock = new TCPSocket(host, port, path);
    this._sock.connect('chat.freenode.net', '6667');
    this._sock.recv = this.onMessage.bind(this);
};
TCPStore.prototype.onMessage = function (message) {
    this._messages.push(message);
    this._app.setState({messages: this._messages});
};
TCPStore.prototype.sendMessage = function (message) {
    this._sock.send(message);
};

var TCPControls = React.createClass({
    render: function () {
	return (
		<div id="tcp-controls">
		<input type="text" /><input type="submit" onClick={this.send} />
		</div>
	);
    },

    send: function () {
	this.props.store.sendMessage($("input:text").val());
    }
});

var TCPControls = React.createClass({
    getInitialState: function () {
	return {
	    acceptNick: true
	};
    },
    
    render: function () {
	return (
		<div id="tcp-controls">
		<input type="text" /><input type="submit" onClick={this.send} />
		</div>
	);
    },

    send: function () {
	var input = $("input:text").val();
	if (this.state.acceptNick) {
	    this.props.store.sendMessage('USER ' + input + ' HawkF Server MacD\n');
	    this.props.store.sendMessage('NICK ' + input + '\n');
	    this.setState({acceptNick: false});
	} else {
	    this.props.store.sendMessage(input + "\n");
	}
	$("input:text").val('');
    }
});

var TCPConsole = React.createClass({
    render: function () {
	var id = 1;
	var messageEntries = this.props.messages.map(function (message) {
	    return <span key={id++} className="tcp-entry">{message}</span>;
	});
	return (
		<div>
		<pre id="tcp-console" style={{border: 'solid black 1px'}} >
		{messageEntries}
	        </pre>
		</div>
	);
    }
});

var TCPApp = React.createClass({
    componentWillMount: function () {
	this.store = new TCPStore('localhost', '5001', 'tcp/csp', this);
    },

    getInitialState: function () {
	return {messages: []};
    },
    
    render: function () {
	return (
		<div id="tcp-app">
		<TCPControls store={this.store} />
		<TCPConsole messages={this.state.messages} />
		</div>
	);
    }
});

ReactDOM.render(<TCPApp />, document.getElementById('tcp-app-container'));
