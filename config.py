try:
	from configparser import ConfigParser, NoOptionError
except ImportError:
	from ConfigParser import ConfigParser, NoOptionError

class Config(object):
	config_section = 'ongaku'

	def __init__(self, filename = 'config'):
		self.config = ConfigParser()
		self.config.read(filename)

	def get(self, key, section = config_section, default = None):
		try:
			return self.config.get(section, key)
		except NoOptionError:
			if default != None:
				return default
			else:
				raise

	def getint(self, key, section = config_section, default = None):
		try:
			return self.config.getint(section, key)
		except NoOptionError:
			if default != None:
				return default
			else:
				raise

config = Config()
