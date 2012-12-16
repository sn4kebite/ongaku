#!/usr/bin/env python2

import db, mutagen, os
from config import config
from PIL import Image

try:
	import cStringIO as StringIO
except ImportError:
	import StringIO

def get_coverart(album, ignorecache = False):
	covercache_dir = config.get('covercache_dir')
	covercache = os.path.join(covercache_dir, '%d.jpg' % album.id)

	def makecover(fileobj):
		im = Image.open(fileobj)
		im.thumbnail((128, 128), Image.ANTIALIAS)
		im.save(covercache)
		return covercache

	if not ignorecache and os.path.exists(covercache):
		return covercache

	if not len(album.tracks):
		return

	track = album.tracks[0]
	try:
		f = mutagen.File(track.get_path())
	except:
		f = None
	if hasattr(f, 'pictures') and len(f.pictures):
		p = f.pictures[0]
		s = StringIO.StringIO(p.data)
		return makecover(s)

	dirname = os.path.dirname(track.get_path())
	files = os.listdir(dirname)
	files.sort()
	cover = []
	for f in files:
		filename = os.path.join(dirname, f)
		if os.path.isdir(filename) and f.lower() in ('scans', 'jpg', 'jpeg', 'img', 'image', 'cover', 'covers'):
			files.extend(os.path.join(f, x) for x in os.listdir(filename))
			files.sort()
		if not os.path.isfile(filename):
			continue
		extensions = ('.jpg', '.jpeg', '.png', '.bmp')
		root, ext = os.path.splitext(f)
		# Ignore non-image files
		if not ext.lower() in extensions:
			continue
		if os.path.split(root)[-1].lower() in ('cover', 'cover-large', 'cover-front'):
			cover.insert(0, f)
		elif 'cover' in f.lower() and not len(cover):
			cover.append(f)
		elif not len(cover):
			cover.append(f)

	while len(cover):
		filename = os.path.join(dirname, cover.pop(0))
		return makecover(open(filename, 'rb'))

def main():
	session = db.Session()
	for album in session.query(db.Album):
		get_coverart(album, True)

if __name__ == '__main__':
	main()
