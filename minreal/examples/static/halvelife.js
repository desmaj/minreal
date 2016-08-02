var TICKS_PER_DIMENSION = 200;

var max = function (a, b) {
    if (a > b) {
	return a;
    } else {
	return b;
    }
}
var min = function (a, b) {
    if (a < b) {
	return a;
    } else {
	return b;
    }
}

var HalveLifeStore = function (protocol, host, port, path, app) {
    this._app = app;
    this._csp = new CSPSession(protocol, host, port, path, 'xhrstreaming', false);
    this._csp.open();
    this._csp.onopen = this.onOpen.bind(this);
    this._csp.onread = this.onMessage.bind(this);
    this._address = null;
    this._port = null;
};
HalveLifeStore.prototype.onOpen = function (environ) {
    this._address = environ['CLIENT_ADDR'];
    this._port = environ['CLIENT_PORT'];
}
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
HalveLifeStore.prototype.getID = function () {
    return this._address + ":" + this._port;
};
HalveLifeStore.prototype.setCharacterDestination = function (address, destination) {
    var characters = this._app.state.characters;
    for (var c=0; c<characters.length; c++) {
	if (characters[c].address == address) {
	    characters[c].destination = destination;
	    this._app.setState({characters: characters});
	    break;
	}
    }
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
	var board = document.getElementById('halvelife-board');
	var boardRect = board.getBoundingClientRect();
	var packet = {type: "join",
		      payload: {address: this.props.store.getID(),
				name: this.refs.name.value,
				destination: [Math.floor(boardRect.width/2),
					      Math.floor(boardRect.height/2)]}};
	this.props.store.sendMessage(packet);
    }
});

var HalveLifeBoard = React.createClass({
    render: function () {
	var chars = this.props.app.characters.map(function (char) {
	    var src = "static/" + char.avatar;
	    var style = {position: 'relative',
			 width: 24,
			 height: 36,
			 left: char.center[0],
			 top: char.center[1]
			};
	    return (
		    <img key={char.name} src={src} alt={char.name} style={style} />
	    );
	});
	return (
		<div id="halvelife-board" onClick={this.boardClicked}>
		{chars}
		</div>
	);
    },

    boardClicked: function (event) {
	event.preventDefault();
	var boardRect = event.target.getBoundingClientRect();
	var destination = [Math.floor(event.clientX-boardRect.left),
			   Math.floor(event.clientY-boardRect.top)];
	this.props.store.setCharacterDestination(this.props.store.getID(),
						 destination);
    }
});

var HalveLifeApp = React.createClass({
    componentWillMount: function () {
	this.store = new HalveLifeStore(window.location.protocol,
					'localhost',
					'5001',
					'hl/csp',
					this);
	requestAnimationFrame(this.tick);
    },

    getInitialState: function () {
	return {
	    messages: ["Welcome to HalveLife"],
	    characters: []
	};
    },

    tick: function (timestamp) {
	requestAnimationFrame(this.tick);

	var board = document.getElementById('halvelife-board');
	var boardRect = board.getBoundingClientRect();
	var tickX = boardRect.width / TICKS_PER_DIMENSION;
	var tickY = boardRect.height / TICKS_PER_DIMENSION;
	
	for (var i=0; i<this.state.characters.length; i++) {
	    var character = this.state.characters[i];
	    if (character.center[0] != character.destination[0] ||
		character.center[1] != character.destination[1]) {
		var distanceX = character.destination[0] - character.center[0];
		var stepX = tickX * character.speed;
		var newX;
		if (distanceX > 0) {
		    newX = min(character.center[0] + stepX,
			       character.destination[0]);
		} else {
		    newX = max(character.center[0] - stepX,
			       character.destination[0]);
		}
		var distanceY = character.destination[1] - character.center[1];
		var stepY = tickY * character.speed;
		var newY;
		if (distanceY > 0) {
		    newY = min(character.center[1] + stepY,
			       character.destination[1]);
		} else {
		    newY = max(character.center[1] - stepY,
			       character.destination[1]);
		}
		var move = [Math.floor(newX), Math.floor(newY)];
		var packet = {type: "move",
			      payload: {id: character.id,
					center: move}};
		this.store.sendMessage(packet);
	    }
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
	    if (char.id == moveSpec.id) {
		char.center[0] = moveSpec.center[0];
		char.center[1] = moveSpec.center[1];
		this.setState({characters: this.state.characters});
		break;
	    }
	}
    }
});

ReactDOM.render(<HalveLifeApp />, document.getElementById('halvelife-app-container'));
