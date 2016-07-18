import os

from paste import urlmap
from paste import fileapp

from webob.exc import HTTPNotFound

from minreal.client import MinrealClient
from minreal.csp import CSPApp

class EchoClient(MinrealClient):

    @classmethod
    def app(cls):
        map = urlmap.URLMap(HTTPNotFound)

        index_path = os.path.join(os.path.dirname(__file__),
                                  'static',
                                  'echo.html')
        map['/'] = fileapp.FileApp(index_path)

        static_path = os.path.join(os.path.dirname(__file__), 'static')
        map['/static'] = fileapp.DirectoryApp(static_path)

        map['/csp'] = CSPApp(cls)

        return map

    def __init__(self, send_func):
        self._send = send_func

    def handle_data(self, chunk):
        self._send(chunk)
