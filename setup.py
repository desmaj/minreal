import os

from setuptools import setup, find_packages

version = '0.4'

DESCRIPTION = ("A Python comet server build on CSP (Comet Session"
               " Protocol) and providing a TCP socket proxy.")

CHANGELOG = open(os.path.join(os.path.dirname(__file__), 'CHANGES.rst')).read()

LONG_DESCRIPTION = DESCRIPTION + """

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
Take a look at the [annotated example]
(https://github.com/desmaj/minreal/blob/master/minreal/examples/echo.py)
to get started.


""" + CHANGELOG

setup(name='minreal',
      version=version,
      description=DESCRIPTION,
      long_description=LONG_DESCRIPTION,
      classifiers=[],
      keywords='',
      author='Matthew Desmarais',
      author_email='matthew.desmarais@gmail.com',
      url='',
      license='MIT',
      packages=find_packages(exclude=['ez_setup', 'examples', 'tests']),
      include_package_data=True,
      zip_safe=False,
      install_requires=[
          'paste',
          'eventlet',
          'webob',
          'msgpack-python',
      ],
      entry_points="""
      [console_scripts]
      mrl = minreal.run:main
      """,
      )
