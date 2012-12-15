import re

cdtext_re = {
	'REM': r'^(REM) (.+)$',
	'PERFORMER': r'^(PERFORMER) "?(.+?)"?$',
	'TITLE': r'^(TITLE) "?(.+?)"?$',
	'FILE': r'^(FILE) "?(.+?)"? (BINARY|MOTOROLA|AIFF|WAVE|MP3)$',
	'TRACK': r'^(TRACK) (\d+) (AUDIO|CDG|MODE1/2048|MODE1/2352|MODE2/2336|MODE2/2352|CDI/2336|CDI2352)$',
	'INDEX': r'^(INDEX) (\d+) (\d+):(\d+):(\d+)$',
	'FLAGS': r'^((?:DCP|4CH|PRE|SCMS) ?){1,4}$',
	'ISRC': r'^(ISRC) (\w{5}\d{7})$',
	'SONGWRITER': r'^(SONGWRITER) "?(.+?)"?$',
	'CATALOG': r'^(CATALOG) (\d{13})$',
}

for k, v in cdtext_re.iteritems():
	cdtext_re[k] = re.compile(v)

class CDText(object):
	def __init__(self, str):
		name = str.split()[0]
		self.re = cdtext_re[name]
		l = self.parse(str)
		self.type, self.value = l[0], l[1:]
		if type(self.value) == tuple and len(self.value) == 1:
			self.value = self.value[0]

	def __repr__(self):
		return '<CDText "%s" "%s">' % (self.type, self.value)

	def __str__(self):
		return repr(self)

	def parse(self, str):
		r = self.re.match(str)
		if not r:
			return None, None
		return r.groups()

class FieldDescriptor(object):
	def __init__(self, field):
		self.field = field

	def __get__(self, instance, owner):
		def find(name):
			for l in instance.cdtext:
				if l.type == name:
					return l
		cdtext = find(self.field)
		return cdtext.value if cdtext else None

class Track(object):
	def __init__(self):
		self.cdtext = []
		self.abs_tot, self.abs_end, self.nextstart = 0, 0, None

	def add(self, cdtext):
		self.cdtext.append(cdtext)

	def set_abs_tot(self, tot):
		self.abs_tot = tot

	def set_abs_end(self, end):
		self.abs_end

	def get_start_time(self):
		index = self.index
		return int(index[1])*60 + int(index[2]) + float(index[3])/75

	def get_length(self):
		return self.nextstart - self.get_start_time()

for f in cdtext_re.keys():
	setattr(Track, f.lower(), FieldDescriptor(f))

class Cuesheet(object):
	def __init__(self, filename = None, fileobj = None):
		if not fileobj and filename:
			fileobj = open(filename, 'rb')
		if fileobj:
			self.parse(fileobj)

	def parse(self, f):
		info = []
		tracks = []
		track = Track()
		info.append(track)
		if not f.read(3) == '\xef\xbb\xbf':
			f.seek(0)
		for line in f:
			line = line.strip()
			if not len(line):
				continue
			cdtext = CDText(line)
			if cdtext.type == 'TRACK':
				track = Track()
				tracks.append(track)
			track.add(cdtext)
		self.info = info
		self.tracks = tracks

	def get_next(self, track):
		found = False
		for i in self.tracks:
			if found:
				return i
			elif i == track:
				found = True
		return None
