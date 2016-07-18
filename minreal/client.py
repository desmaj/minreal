import eventlet


class MinrealClient(object):

    def run(self):
        while True:
            eventlet.sleep(0.01)
