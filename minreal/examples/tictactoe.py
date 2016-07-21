import os
import uuid

from paste import urlmap
from paste import fileapp

from webob.exc import HTTPNotFound

from minreal.client import MinrealClient
from minreal.csp import CSPApp


class TicTacToeController(object):

    def __init__(self):
        self._wait_queue = []
        self._games = {}

    def join(self, player):
        player_id, player_send = player
        if self._wait_queue and player not in self._wait_queue:
            opponent = self._wait_queue.pop(0)
            opponent_id, opponent_send = opponent
            game_id = str(uuid.uuid4())
            self._games[game_id] = TicTacToeGame(player, opponent)
            player_send('game:{}:{}'.format(game_id, 'X'))
            opponent_send('game:{}:{}'.format(game_id, 'O'))
        else:
            self._wait_queue.append(player)

    def play(self, game_id, mark, square):
        square = int(square)
        if mark == 'X':
            winner = self._games[game_id].mark_X(square)
        else:
            winner = self._games[game_id].mark_O(square)
        if winner is not False:
            del self._games[game_id]


class TicTacToeGame(object):
    WINNERS = (
        (0, 1, 2), (3, 4, 5), (6, 7, 8),  # Vertical
        (0, 3, 6), (1, 4, 7), (2, 5, 8),  # Horizontal
        (0, 4, 8), (2, 4, 6),             # Diagonal
    )

    def __init__(self, playerX, playerO):
        self.playerX = playerX
        self.playerO = playerO
        self._nextPlayer = playerX

        self._squares = [None] * 9

    def _send_mark(self, mark, square):
        message = 'mark:{}:{}'.format(mark, square)
        self.playerX[1](message)
        self.playerO[1](message)

    def mark_X(self, square):
        if self._nextPlayer == self.playerX and not self._squares[square]:
            self._nextPlayer = self.playerO
            self._send_mark('X', square)
            self._squares[square] = 'X'
            return self.winner()

    def mark_O(self, square):
        if self._nextPlayer == self.playerO and not self._squares[square]:
            self._nextPlayer = self.playerX
            self._send_mark('O', square)
            self._squares[square] = 'O'
            return self.winner()

    def winner(self):
        for a, b, c in self.WINNERS:
            if (self._squares[a] and
                self._squares[b] and
                self._squares[c] and
                (self._squares[a] ==
                 self._squares[b] ==
                 self._squares[c])):
                winning_mark = self._squares[a]
                if winning_mark == 'X':
                    self.playerX[1]('result:winner')
                    self.playerO[1]('result:loser')
                else:
                    self.playerO[1]('result:winner')
                    self.playerX[1]('result:loser')
                return winning_mark
        if all(self._squares):
            self.playerO[1]('result:tie')
            self.playerX[1]('result:tie')
            return None
        return False


class TicTacToeClient(MinrealClient):
    """ A plugin that echos back any data sent it.

        This plugin also provides a simple HTML UI that allows user interaction
        as a demonstration.
    """
    controller = TicTacToeController()

    @classmethod
    def app(cls):
        """ The 'app' method returns a WSGI app that wraps the plugin."""

        # Here, we build a PythonPaste URLMap WSGI application that will
        # that will dispatch to our various components.
        map = urlmap.URLMap(HTTPNotFound())

        # This plugin provides an index page,
        index_path = os.path.join(os.path.dirname(__file__),
                                  'static',
                                  'tictactoe.html')
        map['/'] = fileapp.FileApp(index_path)

        # as well as an app to serve its static assets.
        static_path = os.path.join(os.path.dirname(__file__), 'static')
        map['/static'] = fileapp.DirectoryApp(static_path)

        # The CSPApp must be mounted somewhere in the WSGI tree as this is the
        # WSGI app that handles communication with the browser.
        map['/csp'] = CSPApp(cls)

        return map

    def __init__(self, send_func):
        # The plugin constructor takes one argument: a callable that sends its
        # (unicode) argument to the browser client.
        self.send = send_func

        self._uuid = str(uuid.uuid4())

    def handle_data(self, message):
        """ Process a chunk of data transmitted from the browser to the plugin.

            This 'chunk' will be be a unicode string containing the transmitted
            data.
        """
        print "***" + message + "***"
        if message == 'join':
            self.controller.join((self._uuid, self.send))
        elif message.startswith('play'):
            token, game_id, mark, square = message.split(':')
            self.controller.play(game_id, mark, square)
