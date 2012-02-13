#!/usr/bin/env python2

import db, os, json, mimetypes
from config import config

class JSONApplication(object):
	def list(self, environ, start_response, path):
		root = os.path.join(config.get('music_root'), '/'.join(path[1:]))
		if root[-1] == '/':
			root = root[:-1]
		session = db.Session()
		try:
			directory = db.Directory.get(session, root)
			directories = directory.children
			tracks = directory.tracks
			contents = json.dumps([x.dict() for x in directories] +
				[x.dict() for x in tracks])
		finally:
			session.close()
		start_response('200 OK', [('Content-Type', 'application/json'), ('Content-Length', str(len(contents)))])
		return [contents]

	handlers = {
		'list': list,
	}

	def __call__(self, environ, start_response, path):
		module = path[0]
		if module in self.handlers:
			return self.handlers[module](self, environ, start_response, path)

class Application(object):
	def __init__(self):
		self.jsonapp = JSONApplication()

	def json(self, environ, start_response, path):
		path.pop(0)
		return self.jsonapp(environ, start_response, path)

	def static(self, environ, start_response, path):
		filename = os.path.join('static', *path[1:])

		if not os.path.exists(filename) or '..' in path:
			start_response('404 Not Found', [])
			return []

		mime = mimetypes.guess_type(filename, strict = False)[0] or 'application/octet-stream'
		start_response('200 OK', [('Content-Type', mime)])
		return open(filename, 'rb')

	handlers = {
		'json': json,
		'static': static,
	}

	def __call__(self, environ, start_response):
		path = environ['PATH_INFO'].split('/')[1:]
		module = path[0] or None
		if not module:
			module = 'static'
			path = ['static', 'index.html']

		if module in self.handlers:
			return self.handlers[module](self, environ, start_response, path)

		#start_response('200 OK', [('Content-Type', 'text/html')])
		#return open('static/index.html', 'r')

if __name__ == '__main__':
	import sys
	if len(sys.argv) == 3:
		from flup.server.fcgi import WSGIServer
		WSGIServer(Application(), bindAddress = (sys.argv[1], int(sys.argv[2]))).run()
	else:
		from wsgiref.simple_server import make_server, WSGIServer
		# enable IPv6
		WSGIServer.address_family |= 10
		httpd = make_server('', 8000, Application())
		httpd.serve_forever()
