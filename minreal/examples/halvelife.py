import os
import uuid
import warnings

import eventlet

import msgpack

from paste import urlmap
from paste import fileapp

from webob.exc import HTTPNotFound

from minreal.client import MinrealClient
from minreal.csp import CSPApp

DEFAULT_AVATAR = 'default_avatar.png'
DEFAULT_CENTER = (0, 0)
DEFAULT_SPEED = 1


def make_packet(type, payload):
    return dict(type=type, payload=payload)


class HalveLifeCharacter(object):

    @classmethod
    def create(cls, name, address):
        id_ = str(uuid.uuid4())
        return cls(id_, name, address)

    @classmethod
    def load(cls, id_, name, client, address, **specs):
        char = cls(id_, name, address)
        char.avatar = specs.get('avatar', DEFAULT_AVATAR)
        char.center = tuple(specs.get('center', DEFAULT_CENTER))
        char.destination = specs.get('destination')
        char.speed = specs.get('speed', DEFAULT_SPEED)
        return char

    def __init__(self, id_, name, address):
        self.id = id_
        self.name = name
        self.address = address
        self.avatar = DEFAULT_AVATAR
        self.center = (0, 0)
        self.destination = None
        self.speed = DEFAULT_SPEED

    def update(self, update):
        for attr in ['avatar', 'center', 'destination', 'speed']:
            if attr in update:
                setattr(self, attr, update[attr])

    def serialize(self):
        attrs = ['id', 'name', 'address',
                 'avatar', 'center', 'destination', 'speed']
        return dict((attr, getattr(self, attr)) for attr in attrs)


class HalveLifeController(object):
    SEND_INTERVAL = 0.25

    def __init__(self):
        self._clients = []
        self._characters = {}
        self._packet_buffer = []

        eventlet.spawn_n(self._sender)

    def _sender(self):
        while True:
            if self._packet_buffer:
                batch = msgpack.packb(self._packet_buffer)
                self._packet_buffer = []
                clients_to_remove = []
                for client in self._clients:
                    try:
                        client.send(batch)
                    except Exception:
                        clients_to_remove.append(client)
                for client in clients_to_remove:
                    self._clients.remove(client)
            eventlet.sleep(self.SEND_INTERVAL)

    def _send_packet(self, type_, payload):
        self._packet_buffer.append(make_packet(type_, payload))

    def join(self, type_, name, address, destination, client):
        self._clients.append(client)
        char = HalveLifeCharacter.create(name, address)
        char.destination = tuple(destination)
        self._characters[char.id] = char
        char_attrs = char.serialize()
        self._send_packet('joined', char_attrs)

    def move(self, type_, id, center):
        char = self._characters[id]
        char.center = tuple(center)
        spec = {'id': char.id, 'address': char.address, 'center': char.center}
        self._send_packet('move', spec)

    def broadcast(self, type_, id, message):
        self._send_packet('broadcast', message)


class HalveLifeClient(MinrealClient):
    """ A plugin that echos back any data sent it.

        This plugin also provides a simple HTML UI that allows user interaction
        as a demonstration.
    """
    controller = HalveLifeController()

    @classmethod
    def app(cls):
        """ The 'app' method returns a WSGI app that wraps the plugin."""

        # Here, we build a PythonPaste URLMap WSGI application that will
        # that will dispatch to our various components.
        map = urlmap.URLMap(HTTPNotFound())

        # This plugin provides an index page,
        index_path = os.path.join(os.path.dirname(__file__),
                                  'static',
                                  'halvelife.html')
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

    def handle_data(self, encoded_batch):
        """ Process a chunk of data transmitted from the browser to the plugin.

            This 'chunk' will be be a unicode string containing the transmitted
            data.
        """
        packet = msgpack.unpackb(encoded_batch)
        type_ = packet['type']
        handler = getattr(self.controller, type_, self._unknown_handler)
        if type_ == 'join':
            packet['payload']['client'] = self
        handler(type_, **packet['payload'])

    def _unknown_handler(self, type_, payload):
        message = "unknown handler requested: {}".format(type_)
        warnings.warn(message)
