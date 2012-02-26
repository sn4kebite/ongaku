#!/usr/bin/env python2

import db, os, json, mimetypes, datetime
from config import config

class JSONApplication(object):
	def list(self, environ, start_response, path):
		root_id = int(path[1]) if len(path) > 1 and len(path[1]) else 0
		session = db.Session()
		try:
			if root_id > 0:
				directory = db.Directory.get_by_id(session, root_id)
			else:
				directory = db.Directory.get(session, config.get('music_root'))
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
	rfc1123_format = '%a, %d %b %Y %H:%M:%S +0000'

	def __init__(self):
		self.jsonapp = JSONApplication()

	def json(self, environ, start_response, path):
		path.pop(0)
		return self.jsonapp(environ, start_response, path)

	def _serve_path(self, environ, start_response, filename):
		if not os.path.exists(filename) or '..' in filename.split(os.path.sep):
			start_response('404 Not Found', [])
			return []

		do_range = 'HTTP_RANGE' in environ
		if do_range:
			file_range = environ['HTTP_RANGE'].split('bytes=')[1]

		mime = mimetypes.guess_type(filename, strict = False)[0] or 'application/octet-stream'
		last_modified = datetime.datetime.fromtimestamp(os.path.getmtime(filename)).strftime(self.rfc1123_format)

		# Range handling
		if do_range:
			start, end = [int(x or 0) for x in file_range.split('-')]
			size = os.path.getsize(filename)

			if end == 0:
				end = size-1

			write_out = start_response('206 Partial Content', [('Content-Type', mime),
				('Content-Range', 'bytes {start}-{end}/{size}'.format(start = start, end = end, size = size)),
				('Content-Length', str(end - start + 1)), ('Last-Modified', last_modified)])

			f = open(filename, 'rb')
			f.seek(start)
			remaining = end-start+1
			s = f.read(min(remaining, 1024))
			while s:
				write_out(s)
				remaining -= len(s)
				s = f.read(min(remaining, 1024))
			return []

		start_response('200 OK', [('Content-Type', mime), ('Content-Length', str(os.path.getsize(filename))),
			('Last-Modified', last_modified)])
		return open(filename, 'rb')

	def static(self, environ, start_response, path):
		filename = os.path.join('static', *path[1:])
		return self._serve_path(environ, start_response, filename)

	def track(self, environ, start_response, path):
		track = int(path[1])
		session = db.Session()
		try:
			track = db.Track.get_by_id(session, track)
			filename = track.get_path()
		except db.NoResultFound:
			start_response('404 Not Found', [])
			return []
		finally:
			session.close()

		return self._serve_path(environ, start_response, filename)

	handlers = {
		'json': json,
		'static': static,
		'file': file,
		'track': track,
	}

	def __call__(self, environ, start_response):
		path = environ['PATH_INFO'].split('/')[1:]
		module = path[0] or None
		if not module:
			module = 'static'
			path = ['static', 'index.html']

		if module in self.handlers:
			return self.handlers[module](self, environ, start_response, path)

		start_response('404 Not Found', [])
		return []

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
