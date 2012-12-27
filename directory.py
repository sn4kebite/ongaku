import os, mimetypes, cuesheet, mutagen, db, traceback

from config import config

class DirectoryEntry(object):
	'''Base class for directory entries.'''

	def __init__(self, path, track = None, metadata = {}):
		self.path = path
		self.track = track
		self.metadata = metadata

		if '..' in path.split():
			raise Exception('Invalid path')

		self.rel_path = os.path.relpath(path, config.get('music_root'))

	def __cmp__(self, other):
		return cmp(self.path, other.path)

	def __lt__(self, other):
		return self.path < other.path

	def __str__(self):
		return '<a href="/files/{path}">{name}</a><br />'.format(path = self.rel_path, name = os.path.basename(self.path))

	def json(self):
		return {'type': self.entry_type, 'name': self.rel_path, 'track': self.track, 'metadata': self.metadata}

class Directory(DirectoryEntry):
	'''A directory entry inside a directory.'''

	entry_type = 'dir'

	def listdir(self):
		directories = []
		files = []

		for f in os.listdir(self.path):
			path = os.path.join(self.path, f)
			if os.path.isdir(path):
				directories.append(Directory(path))
			elif os.path.isfile(path):
				if os.path.splitext(f)[1] == '.cue':
					cue = cuesheet.Cuesheet(path)
					for t in cue.tracks:
						metadata = {}
						info = cue.info[0]
						if info.performer:
							metadata['artist'] = info.performer
						if info.title:
							metadata['album'] = info.title
						if t.title:
							metadata['title'] = t.title
						files.append(File(path, track = t.track[0], metadata = metadata))
				else:
					metadata = {}
					try:
						tags = mutagen.File(path) or []
					except:
						tags = []
						traceback.print_exc()
					if isinstance(tags, mutagen.mp3.MP3):
						for id3, tn in (('TPE1', 'artist'), ('TALB', 'album'), ('TIT2', 'title')):
							if id3 in tags:
								metadata[tn] = tags[id3].text[0]
					else:
						for tn in ('artist', 'album', 'title'):
							if tn in tags:
								s = tags[tn][0].encode('utf-8', 'replace')
								if len(s):
									metadata[tn] = s
					files.append(File(path, metadata = metadata))
		return sorted(directories) + sorted(files)

class File(DirectoryEntry):
	'''A file entry inside a directory.'''

	entry_type = 'file'

	def send(self, environ, start_response):
		do_range = 'HTTP_RANGE' in environ
		if do_range:
			file_range = environ['HTTP_RANGE'].split('bytes=')[1]

		mime = mimetypes.guess_type(self.path, strict = False)[0] or 'application/octet-stream'
		size = os.path.getsize(self.path)
		if do_range:
			start, end = [int(x or 0) for x in file_range.split('-')]
			if end == 0:
				end = size-1

			write_out = start_response('206 Partial Content', [
				('Content-Type', mime),
				('Content-Range', 'bytes {start}-{end}/{size}'.format(start = start, end = end, size = size)),
				('Content-Length', str(end - start + 1))])

			f = open(self.path, 'rb')
			f.seek(start)
			remaining = end-start+1
			s = f.read(min(remaining, 1024))
			while s:
				write_out(s)
				remaining -= len(s)
				s = f.read(min(remaining, 1024))
			return []
		
		start_response('200 OK', [
			('Content-Type', mime),
			('Content-Length', str(size))])
		return open(self.path, 'rb')

def rec_scan(session, root, parent_id = None):
	directory = db.Directory.get(session, root, parent_id)

	d = Directory(root)
	for de in d.listdir():
		if isinstance(de, Directory):
			print 'id:', directory.id
			rec_scan(session, de.path, directory.id)
		else:
			print de.metadata
			try:
				artist = db.Artist.get(session, de.metadata['artist']) if 'artist' in de.metadata else None
				album = db.Album.get(session, de.metadata['album'], artist.id if artist else None) if 'album' in de.metadata else None
				track = db.Track.get(session, de.metadata['title'] if 'title' in de.metadata else None, None,
					os.path.basename(de.path), de.track, directory.id, artist.id if artist else None, album.id if album else None)
			except:
				print de
				print type(de.path), repr(de.path)
				raise

def scan(root = None):
	if not root:
		root = config.get('music_root')

	try:
		session = db.Session()
		rec_scan(session, root)
		session.commit()
	finally:
		session.close()

if __name__ == '__main__':
	import sys
	if len(sys.argv) > 1:
		for root in sys.argv[1:]:
			scan(root)
	else:
		scan()
