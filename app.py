#!/usr/bin/env python2

class Application(object):
	def __call__(self, environ, start_response):
		start_response('200 OK', [('Content-Type', 'text/html')])
		return open('static/index.html', 'r')

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
