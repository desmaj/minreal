# minreal
A Python comet server build on CSP (Comet Session Protocol) and providing a TCP socket proxy.

## Running the examples
The standalone server can be run like:
```bash
$ mrl <mount path>:<client plugin module dotted name>:<client plugin class>
```

So you can run the examples like:
```bash
# For the echo server example
$ mrl echo:minreal.examples.echo:EchoClient

# For the TCPSocket IRC example
$ mrl tcp:minreal.examples.tcp:TCPClient
```

## Developing a plugin
Take a look at the [annotated example](https://github.com/desmaj/minreal/blob/minreal/examples/echo.py) to get started.
