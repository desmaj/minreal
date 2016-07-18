import eventlet
eventlet.monkey_patch()

import importlib

from argparse import ArgumentParser  # noqa: E402

from .server import MinrealServer  # noqa: E402


def main():
    parser = ArgumentParser()
    parser.add_argument('clients', metavar='CLIENTS', nargs='+')

    args = parser.parse_args()

    clients = {}
    for client_spec in args.clients:
        path, client_path = client_spec.split(':', 1)
        modulename, clientname = client_path.split(':', 1)
        clients[path] = getattr(importlib.import_module(modulename),
                                clientname)

    server = MinrealServer(clients)
    server.run()


if __name__ == '__main__':
    main()
