var HalveLifeStore = function (baseURL, app) {
    this._app = app;
    this._csp = new csp.CometSession();
    this._csp.connect(baseURL);
    this._csp.onread = this.onMessage.bind(this);
};
HalveLifeStore.prototype._encode = function (message) {
    var message = msgpack.encode(message);
    var payload = [];
    for (var i=0; i<message.length; i++) {
	payload += String.fromCharCode(message[i]);
    };
    return payload;
}
HalveLifeStore.prototype._decode = function (payload) {
    var message = [];
    try {
	for (var i=0; i<payload.length; i++) {
	    message.push(payload.charCodeAt(i));
	}
	return msgpack.decode(message);
    } catch (err) {
	console.log(err);
    }
}
HalveLifeStore.prototype.onMessage = function (message) {
    var batch = this._decode(message);
    console.log(batch);
    for (var i=0; i<batch.length; i++) {
	var packet = batch[i];
	var handler = this._app[packet.type];
	if (handler) {
	    handler(packet.payload);
	} else {
	    console.log("Unknown handler: " + packet.type);
	}
    }
};
HalveLifeStore.prototype.sendMessage = function (message) {
    this._csp.write(this._encode(message));
};

var HalveLifeConsole = React.createClass({
    render: function () {
	var id = 0;
	var messages = this.props.messages.map(function (message) {
	    return (
		    <div key={id++} className="halvelife-console-message">
		    <span>: {message}</span>
		    </div>
	    );
		
	});
	return (
		<div id="halvelife-console">
		{messages}
		</div>
	);
    }
});

var HalveLifeControls = React.createClass({
    render: function () {
	var joinButton = <input type="submit" onClick={this.join} value='Join'/>;
	return (
		<div id="halvelife-controls">
		<input ref="name" name="character-name" type="text" />
		{joinButton}
		</div>
	);
    },

    join: function () {
	var packet = {type: "join",
		      payload: {name: this.refs.name.value,
				destination: [300, 300]}};
	this.props.store.sendMessage(packet);
    }
});

var HalveLifeBoard = React.createClass({
    render: function () {
	var chars = this.props.app.characters.map(function (char) {
	    var src = "static/" + char.avatar;
	    var style = {width: 24,
			 height: 36,
			 left: char.center[0] - 12,
			 top: char.center[1] - 18
			};
			 
	    return (
		    <img key={char.name} src={src} alt={char.name} style={style} />
	    );
	});
	return (
		<div id="halvelife-board">
		{chars}
		</div>
	);
    },
});

var HalveLifeApp = React.createClass({
    componentWillMount: function () {
	this.store = new HalveLifeStore('csp', this);
	requestAnimationFrame(this.tick);
    },

    getInitialState: function () {
	return {
	    messages: ["Welcome to HalveLife"],
	    characters: []
	};
    },

    tick: function () {
	requestAnimationFrame(this.tick);
	for (var i=0; i<this.state.characters.length; i++) {
	    var char = this.state.characters[i];
	    var move = [(char.destination[0] - char.center[0]) / char.speed,
			(char.destination[1] - char.center[1]) / char.speed];
	    var packet = {type: "move",
			  payload: {id: char.id,
				    center: move}};
	    this.store.sendMessage(packet);
	}
    },
    
    render: function () {
	return (
		<div id="halvelife-app">
		<HalveLifeConsole messages={this.state.messages} />
		<HalveLifeControls store={this.store} game={this.state.game} />
		<HalveLifeBoard store={this.store} app={this.state} />
		</div>
	);
    },

    joined: function (character) {
	var chars = this.state.characters;
	chars.push(character);
	this.setState({characters: chars});
    },

    move: function (moveSpec) {
	for (var i=0; i<this.state.characters.length; i++) {
	    var char = this.state.characters[i];
	    console.log(char.id + "::" + moveSpec.id);
	    if (char.id == moveSpec.id) {
		char.center = moveSpec.center;
		this.setState({characters: this.state.characters});
		break;
	    }
	}
    }
});

ReactDOM.render(<HalveLifeApp />, document.getElementById('halvelife-app-container'));
