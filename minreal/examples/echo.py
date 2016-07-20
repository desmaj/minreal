import os

from paste import urlmap
from paste import fileapp

from webob.exc import HTTPNotFound

from minreal.client import MinrealClient
from minreal.csp import CSPApp


class EchoClient(MinrealClient):
    """ A plugin that echos back any data sent it.

        This plugin also provides a simple HTML UI that allows user interaction
        as a demonstration.
    """

    @classmethod
    def app(cls):
        """ The 'app' method returns a WSGI app that wraps the plugin."""

        # Here, we build a PythonPaste URLMap WSGI application that will
        # that will dispatch to our various components.
        map = urlmap.URLMap(HTTPNotFound())

        # This plugin provides an index page,
        index_path = os.path.join(os.path.dirname(__file__),
                                  'static',
                                  'echo.html')
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
        self._send = send_func

    def handle_data(self, chunk):
        """ Process a chunk of data transmitted from the browser to the plugin.

            This 'chunk' will be be a unicode string containing the transmitted
            data.
        """
        # The EchoClient plugin sends the chunk right back to the browser.
        self._send(chunk)
