import base64
import copy
import json
import os
import time
import uuid

import eventlet
from eventlet import queue

from paste import fileapp
from paste import urlmap

import webob
from webob.exc import HTTPBadRequest
from webob.exc import HTTPNotFound

PACKET_ID = 0
PACKET_ENCODING = 1
PACKET_DATA = 2

PACKET_ENCODING_PLAIN = 0
PACKET_ENCODING_BASE64 = 1


class CSPResponseFactory(object):
    SEND_RESPONSE_FORMAT = (
        '{prebuffer}{preamble}'
        '{request_prefix}({data}){request_suffix}'
    )
    COMET_RESPONSE_FORMAT = (
        '{prebuffer}{preamble}'
        '{batch_prefix}({data}){batch_suffix}'
    )

    def render_handshake_response(self, session_vars, session_id):
        response_vars = {
            'data': json.dumps({'session': session_id}),
            'prebuffer': ' ' * session_vars['ps'],
            'preamble': session_vars['p'],
            'request_prefix': session_vars['rp'],
            'request_suffix': session_vars['rs'],
        }
        response = self.SEND_RESPONSE_FORMAT.format(**response_vars)
        headers = {'Content-type': session_vars['ct']}
        return headers, response

    def render_send_response(self, session_vars, message):
        headers = {'Content-type': session_vars['ct']}
        response_vars = {
            'data': json.dumps(message),
            'prebuffer': ' ' * session_vars['ps'],
            'preamble': session_vars['p'],
            'request_prefix': session_vars['rp'],
            'request_suffix': session_vars['rs'],
        }
        return headers, self.SEND_RESPONSE_FORMAT.format(**response_vars)

    def render_comet_response(self, session_vars, packets):
        headers = {'Content-type': session_vars['ct']}
        yield headers

        prebuffer = ' ' * session_vars['ps']
        preamble = session_vars['p']
        yield prebuffer + preamble

        for batch in packets:
            response_vars = {
                'data': json.dumps(batch),
                'prebuffer': ' ' * session_vars['ps'],
                'preamble': session_vars['p'],
                'batch_prefix': session_vars['bp'],
                'batch_suffix': session_vars['bs'],
            }
            yield self.COMET_RESPONSE_FORMAT.format(**response_vars)


class CSPSession(object):

    @staticmethod
    def parse_request_vars(request):
        parsed_request_vars = {}
        parsed_request_vars['s'] = request.get('s')
        parsed_request_vars['a'] = int(request.get('a', '-1'))
        parsed_request_vars['d'] = json.loads(request.get('d', '{}'))
        parsed_request_vars['n'] = bool(request.get('n'))
        return parsed_request_vars

    @staticmethod
    def parse_session_vars(request):
        parsed_session_vars = {}
        parsed_session_vars['rp'] = request.get('rp', '')
        parsed_session_vars['rs'] = request.get('rs', '')
        parsed_session_vars['du'] = int(request.get('du', '30'))
        parsed_session_vars['is'] = bool(int(request.get('is', '0')))
        parsed_session_vars['i'] = int(request.get('i', '0'))
        parsed_session_vars['ps'] = int(request.get('ps', '0'))
        parsed_session_vars['p'] = request.get('p', '')
        parsed_session_vars['bp'] = request.get('bp', '')
        parsed_session_vars['bs'] = request.get('bs', '')
        parsed_session_vars['g'] = bool(request.get('g', ''))
        parsed_session_vars['se'] = bool(request.get('se', ''))
        parsed_session_vars['ct'] = request.get('ct', 'text/html')
        return parsed_session_vars

    def __init__(self, session_id, client_factory, request_vars, session_vars):
        self._id = session_id
        self._vars = session_vars.copy()
        self._next_packet_id = 1
        self._packet_buffer = []

        self._packet_queue = queue.Queue()
        self._client = client_factory(self.add_chunk)
        self._client_gt = eventlet.spawn(self._client.run)

    @classmethod
    def create(cls, request_vars, session_vars, client_factory):
        session_uuid = str(uuid.uuid4())
        return cls(session_uuid, client_factory, request_vars, session_vars)

    @property
    def id(self):
        return self._id

    @property
    def session_vars(self):
        return self._vars.copy()

    def update_session_vars(self, new_session_vars):
        self._vars.update(new_session_vars)

    def add_chunk(self, chunk):
        self._packet_buffer.append(
            [self._next_packet_id, 1, base64.b64encode(chunk)]
        )
        self._next_packet_id += 1
        self._packet_queue.put(True)

    def _ack_packets(self, ack_id):
        buffer_copy = copy.copy(self._packet_buffer)
        self._packet_buffer = []
        for packet in buffer_copy:
            if packet[PACKET_ID] > ack_id:
                self._packet_buffer.append(packet)

    def _batch_packets(self):
        return [packet for packet in self._packet_buffer]

    def send(self, request_vars, session_vars):
        self._ack_packets(request_vars['a'])
        for packet in request_vars['d']:
            data = packet[PACKET_DATA]
            if packet[PACKET_ENCODING] == PACKET_ENCODING_BASE64:
                data = base64.b64decode(data)
            self._client.handle_data(data)
        return "OK"

    def comet(self, request_vars, session_vars):
        self._ack_packets(request_vars['a'])
        if not session_vars['is']:
            if self._packet_buffer:
                yield self._batch_packets()
            else:
                try:
                    self._packet_queue.get(timeout=session_vars['du'])
                except queue.Empty:
                    pass
                yield self._batch_packets()
        else:
            start = time.time()
            waited = 0.0
            try:
                timeout = session_vars['du']
                while self._packet_queue.get(timeout=timeout-waited):
                    yield self._batch_packets()
                    waited += time.time() - start
            except queue.Empty:
                pass
            yield self._batch_packets()


class CSPApp(object):

    def __init__(self, client_factory):
        self._client_factory = client_factory
        self._sessions = {}
        self._response_factory = CSPResponseFactory()

        self._wsgi_app = urlmap.URLMap(HTTPNotFound())
        self._wsgi_app['/handshake'] = self.handshake
        self._wsgi_app['/send'] = self.send
        self._wsgi_app['/comet'] = self.comet
        static_path = os.path.join(os.path.dirname(__file__), 'static')
        self._wsgi_app['/static'] = fileapp.DirectoryApp(static_path)

    def __call__(self, environ, start_response):
        return self._wsgi_app(environ, start_response)

    def handshake(self, environ, start_response):
        request = webob.Request(environ).params
        request_vars = CSPSession.parse_request_vars(request)
        session_vars = CSPSession.parse_session_vars(request)
        session = CSPSession.create(request_vars,
                                    session_vars,
                                    self._client_factory)
        self._sessions[session.id] = session

        headers, response = self._response_factory.render_handshake_response(
            session.session_vars, session.id
        )
        return webob.Response(headers=headers, app_iter=response)(
            environ, start_response)

    def send(self, environ, start_response):
        request = webob.Request(environ).params
        request_vars = CSPSession.parse_request_vars(request)
        session_vars = CSPSession.parse_session_vars(request)
        session = self._sessions.get(request_vars['s'])
        if session:
            message = session.send(request_vars, session_vars)
            headers, response = self._response_factory.render_send_response(
                session.session_vars, message
            )
            response = webob.Response(headers=headers, app_iter=response)
        else:
            response = HTTPBadRequest()
        return response(environ, start_response)

    def comet(self, environ, start_response):
        request = webob.Request(environ).params
        request_vars = CSPSession.parse_request_vars(request)
        session_vars = CSPSession.parse_session_vars(request)
        session = self._sessions.get(request_vars['s'])
        if session:
            packets = session.comet(request_vars, session_vars)

            response = self._response_factory.render_comet_response(
                session.session_vars, packets
            )
            headers = response.next()
            response = webob.Response(headers=headers, app_iter=response)
        else:
            response = HTTPBadRequest()
        return response(environ, start_response)
