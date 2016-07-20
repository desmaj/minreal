from setuptools import setup, find_packages

version = '0.0'

setup(name='minreal',
      version=version,
      description="",
      long_description="""\
""",
      classifiers=[],
      keywords='',
      author='',
      author_email='',
      url='',
      license='',
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
