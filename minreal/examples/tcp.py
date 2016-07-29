import os
import sys

import eventlet
from eventlet.green import socket

import msgpack

from paste import urlmap
from paste import fileapp

from webob.exc import HTTPNotFound

from minreal.client import MinrealClient
from minreal.csp import CSPApp


class TCPClient(MinrealClient):

    @classmethod
    def app(cls):
        map = urlmap.URLMap(HTTPNotFound)

        index_path = os.path.join(os.path.dirname(__file__),
                                  'static',
                                  'tcp.html')
        map['/'] = fileapp.FileApp(index_path)

        static_path = os.path.join(os.path.dirname(__file__), 'static')
        map['/static'] = fileapp.DirectoryApp(static_path)

        map['/csp'] = CSPApp(cls)

        return map

    def __init__(self, send_func):
        self._send = send_func
        self._sock = None

    def handle_data(self, message):
        payload = msgpack.unpackb(message)
        if 'connect' in payload:
            host, port_str = payload['connect'].split('::')
            port = int(port_str)
            self._sock = socket.socket()
            self._sock.connect((host, port))
            response = msgpack.packb({'type': 'STATUS',
                                      'value': 'OPEN'})
            self._send(response)
            eventlet.spawn(self._reader)
        elif 'close' in payload:
            self._sock.close()
            status = msgpack.packb({'type': 'STATUS',
                                    'value': 'CLOSED'})
            self._send(status)
        elif 'content' in payload:
            try:
                self._sock.send(payload['content'])
            except Exception as exc:
                print exc
                self._sock.close()
        else:
            message = 'Unknown payload type: {}\n'.format(payload.type)
            sys.write(message)

    def _reader(self):
        while True:
            chunk = self._sock.recv(2048)
            if not chunk:
                self._sock.close()
                break
            else:
                content = msgpack.packb({'type': 'CONTENT',
                                         'value': chunk})
                self._send(content)
