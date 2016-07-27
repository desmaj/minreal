import os

from paste import fileapp
from paste import urlmap

from webob.exc import HTTPNotFound


class MinrealApp(object):

    def __init__(self, clients):
        self._app = urlmap.URLMap(HTTPNotFound())
        for path, client_klass in clients.items():
            self._app['/' + path] = client_klass.app()
        static_path = os.path.join(os.path.dirname(__file__), 'static')
        self._app['/static'] = fileapp.DirectoryApp(static_path)

    def __call__(self, environ, start_response):
        return self._app(environ, start_response)
