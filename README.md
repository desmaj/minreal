# minreal
A Python comet server build on CSP (Comet Session Protocol) and providing a TCP socket proxy.

Disclaimer: Gosh this is a new project. Don't use it for anything yet.

Disclaimer disclaimer: None of the technology s particularly new, but I have ideas for where
this might go that might be interesting.

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
Take a look at the [annotated example](https://github.com/desmaj/minreal/blob/master/minreal/examples/echo.py) to get started.
