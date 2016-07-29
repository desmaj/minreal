import eventlet
from eventlet import wsgi

from .app import MinrealApp


class MinrealServer(object):

    def __init__(self, clients):
        self._clients = clients

    def run(self, host='0.0.0.0', port=5001):
        app = MinrealApp(self._clients)
        wsgi.server(eventlet.listen((host, port)), app, minimum_chunk_size=1)
