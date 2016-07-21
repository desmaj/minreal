var TicTacToeStore = function (baseURL, app) {
    this._app = app;
    this._csp = new csp.CometSession();
    this._csp.connect(baseURL);
    this._csp.onread = this.onMessage.bind(this);
};
TicTacToeStore.prototype.onMessage = function (message) {
    console.log(message);
    var messageParts = message.split(":")
    if (messageParts[0] == "game") {
	this._app.setState({game: messageParts[1],
			    mark: messageParts[2],
			    next: 'X',
			    board: new Array(9)});
    } else if (messageParts[0] == "mark") {
	var board = this._app.state.board;
	board[parseInt(messageParts[2])] = messageParts[1];
	var next = this._app.state.next == 'X' ? 'O' : 'X';
	this._app.setState({board: board,
			    next: next});
    } else if (messageParts[0] == "result") {
	this._app.setState({result: messageParts[1]});
    }
};
TicTacToeStore.prototype.sendMessage = function (message) {
    this._csp.write(message);
};

var GAME_STATE_INITIAL = 0;
var GAME_STATE_PLAYING = 1;

var TicTacToeControls = React.createClass({
    getInitialState: function () {
	return {
	    gameState: GAME_STATE_INITIAL
	};
    },
    
    render: function () {
	var joinButton = <input type="submit" onClick={this.join} value='Join'/>;
	var waitingMessage = <h2>Waiting for an opponent ...</h2>;
	return (
		<div id="tictactoe-controls">
		{this.state.gameState == GAME_STATE_INITIAL && joinButton}
	        {this.state.gameState == GAME_STATE_PLAYING && !this.props.game && waitingMessage}
		</div>
	);
    },

    join: function () {
	this.setState({gameState: GAME_STATE_PLAYING});
	this.props.store.sendMessage("join");
    }
});

var TicTacToeBoard = React.createClass({
    render: function () {
	if (!this.props.app.board) {
	    return <div></div>;
	}

	var message = this.props.app.result || (this.isMyTurn() ? "play ..." : "wait ...");
	var clickEvent = function () {};
	if (!this.props.app.result && this.isMyTurn()) {
	    clickEvent = function (square) {
		return function (event) {
		    this.mark(square);
		}.bind(this);
	    }.bind(this);
	}
	var rows = [0, 1, 2];
	rows = rows.map(function (rownum) {
	    return (
		    <tr key={rownum} >
		    <td className="board-cell" onClick={clickEvent(rownum * 3 + 0)}>{this.props.app.board[rownum * 3 + 0] || '-'}</td>
		    <td className="board-cell" onClick={clickEvent(rownum * 3 + 1)}>{this.props.app.board[rownum * 3 + 1] || '-'}</td>
		    <td className="board-cell" onClick={clickEvent(rownum * 3 + 2)}>{this.props.app.board[rownum * 3 + 2] || '-'}</td>
		    </tr>
	    );
	}.bind(this));
	return (
		<div id="tictactoe-board-container" >
		<table id="game-board">
		<tbody>
		{rows}
	        </tbody>
		</table>
		<div id="status-message">{message}</div>
		</div>
	);
    },

    isMyTurn: function () {
	return this.props.app.next == this.props.app.mark;
    },
    
    mark: function (square) {
	if (this.props.app.next == this.props.app.mark && !this.props.app.board[square]) {
	    this.props.store.sendMessage("play:" + this.props.app.game + ":" + this.props.app.mark + ":" + square);
	}
    }
});

var TicTacToeApp = React.createClass({
    componentWillMount: function () {
	this.store = new TicTacToeStore('csp', this);
    },

    getInitialState: function () {
	return {game: null,
		mark: null,
		board: null,
		result: null};
    },
    
    render: function () {
	return (
		<div id="tictactoe-app">
		<TicTacToeControls store={this.store} game={this.state.game} />
		<TicTacToeBoard store={this.store} app={this.state} />
		</div>
	);
    }
});

ReactDOM.render(<TicTacToeApp />, document.getElementById('tictactoe-app-container'));
