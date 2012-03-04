import subprocess, os, cuesheet
from config import config

decoders = {}
encoders = {}

class DecoderMeta(type):
	def __init__(cls, name, bases, attrs):
		if not name in ('Decoder',):
			if cls.test_exists():
				decoders[cls.decoder_name] = cls

class Decoder(object):
	__metaclass__ = DecoderMeta

class EncoderMeta(type):
	def __init__(cls, name, bases, attrs):
		if not name in ('Encoder',):
			if cls.test_exists():
				encoders[cls.encoder_name] = cls

class Encoder(object):
	__metaclass__ = EncoderMeta

def test_executable(name):
	@staticmethod
	def do_test():
		exists = True
		devnull = open('/dev/null', 'a+')
		try:
			subprocess.Popen([name], stdout = devnull, stderr = devnull, close_fds = True)
		except OSError:
			exists = False
		devnull.close()
		return exists
	return do_test

class FFmpeg(Decoder):
	decoder_name = 'ffmpeg'

	def __init__(self, source, destination):
		self.source = source
		self.destination = destination

	@staticmethod
	def probe(source):
		'''
		Calls ffprobe to test wether ffmpeg supports this file.
		'''
		devnull = open('/dev/null', 'a+')
		p = subprocess.Popen(['ffprobe', source], stdout = devnull, stderr = devnull, close_fds = True)
		ret = p.wait()
		return ret == 0

	test_exists = test_executable('ffmpeg')

	def decode(self, **kwargs):
		cmd = 'ffmpeg -loglevel quiet'.split()
		if 'start_time' in kwargs and kwargs['start_time']:
			cmd += ['-ss', str(kwargs['start_time'])]
		if 'end_time' in kwargs and kwargs['end_time']:
			cmd += ['-t', str(kwargs['end_time'] - kwargs['start_time'])]
		cmd += ['-i', self.source, '-y', self.destination]
		devnull = open('/dev/null', 'a+')
		p = subprocess.Popen(cmd, stderr = devnull, close_fds = True)
		p.wait()

class Ogg(Encoder):
	encoder_name = 'ogg'
	extension = '.ogg'

	def __init__(self, source, destination):
		self.source = source
		self.destination = destination

	test_exists = test_executable('oggenc')

	def encode(self):
		cmd = ['oggenc', '-Q', self.source, '-o', self.destination]
		subprocess.call(cmd)

class RecoderError(Exception): pass
class DecoderNotFoundError(Exception): pass
class EncoderNotFoundError(Exception): pass

class Recoder(object):
	def __init__(self, source, encoder, track = None, destination = None):
		if track:
			cue = cuesheet.Cuesheet(source)
			source = os.path.join(os.path.dirname(source), cue.info[0].file[0])
			track = cue.tracks[track-1]
			self.start_time = track.get_start_time()
			track = cue.get_next(track)
			self.end_time = track.get_start_time() if track else None
		else:
			self.start_time, self.end_time = None, None
		# TODO: Python 3 breakage (must be str)
		if isinstance(encoder, basestring):
			if not encoder in encoders:
				raise EncoderNotFoundError('Encoder "%s" not found (%s).' % (encoder, ', '.join(encoders.keys())))
			encoder = encoders[encoder]

		self.dec_source = source
		# Boldly assume all decoders can convert to wave format.
		if destination:
			self.dec_destination = os.path.splitext(destination)[0] + '.wav'
		else:
			self.dec_destination = os.path.join(config.get('cache_dir'), os.path.splitext(os.path.basename(source))[0] + '.wav')
		self.enc_source = self.dec_destination
		if destination:
			self.enc_destination = os.path.splitext(destination)[0] + encoder.extension
		else:
			self.enc_destination = os.path.splitext(self.dec_destination)[0] + encoder.extension

		self.decoder = None
		for decoder in decoders.itervalues():
			if decoder.probe(self.dec_source):
				self.decoder = decoder(self.dec_source, self.dec_destination)
				break
		if not self.decoder:
			raise DecoderNotFoundError('No decoder found for source file "%s".' % self.dec_source)
		self.encoder = encoder(self.enc_source, self.enc_destination)

	def recode(self):
		self.decoder.decode(start_time = self.start_time, end_time = self.end_time)
		self.encoder.encode()
		os.unlink(self.dec_destination)

if not os.path.exists(config.get('cache_dir')):
	os.makedirs(config.get('cache_dir'))

if __name__ == '__main__':
	import sys, optparse

	parser = optparse.OptionParser()
	parser.add_option('-e', '--encoder', help = 'Encoder to use, must be one of: ' + ', '.join(encoders.keys()))
	options, args = parser.parse_args()

	if not options.encoder:
		parser.print_help()
		sys.exit(1)

	for f in args:
		r = Recoder(f, options.encoder)
		r.recode()
