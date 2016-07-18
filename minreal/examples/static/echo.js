var EchoStore = function (baseURL, app) {
    this._messages = [];
    this._app = app;
    this._csp = new csp.CometSession();
    this._csp.connect(baseURL);
    this._csp.onread = this.onMessage.bind(this);
};
EchoStore.prototype.onMessage = function (message) {
    this._messages.push(message);
    this._app.setState({messages: this._messages});
};
EchoStore.prototype.sendMessage = function (message) {
    this._csp.write($("input:text").val());
    $("input:text").val('');
};

var EchoControls = React.createClass({
    render: function () {
	return (
		<div id="echo-controls">
		<input type="text" /><input type="submit" onClick={this.send} />
		</div>
	);
    },

    send: function () {
	this.props.store.sendMessage($("input:text").val());
    }
});

var EchoConsole = React.createClass({
    render: function () {
	var messageEntries = this.props.messages.map(function (message) {
	    return <div className="echo-entry">{message}</div>;
	});
	return (
		<div id="echo-console" style={{border: 'solid black 1px'}} >
		{messageEntries}
		</div>
	);
    }
});

var EchoApp = React.createClass({
    componentWillMount: function () {
	this.store = new EchoStore('csp', this);
    },

    getInitialState: function () {
	return {messages: []};
    },
    
    render: function () {
	return (
		<div id="echo-app">
		<EchoControls store={this.store} />
		<EchoConsole messages={this.state.messages} />
		</div>
	);
    }
});

ReactDOM.render(<EchoApp />, document.getElementById('echo-app-container'));
