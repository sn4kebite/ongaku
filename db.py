import os
from config import config
from sqlalchemy import create_engine
engine = create_engine(config.get('db_path'))

from sqlalchemy.ext.declarative import declarative_base
Base = declarative_base()

from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship, backref
from sqlalchemy import and_, or_

from sqlalchemy.orm.exc import NoResultFound

class Directory(Base):
	__tablename__ = 'directories'

	id = Column(Integer, primary_key = True)
	path = Column(String, nullable = False, index = True)
	parent_id = Column(Integer, ForeignKey('directories.id'))

	parent = relationship('Directory', backref = backref('children'), remote_side = [id])

	def __init__(self, path, parent_id = None):
		self.path = path
		self.parent_id = parent_id

	def __repr__(self):
		return '<Directory("{0}")>'.format(self.path.encode('utf-8'))

	@staticmethod
	def get(session, path, parent_id = None):
		try:
			directory = session.query(Directory).filter(Directory.path == path).one()
		except NoResultFound:
			directory = Directory(path, parent_id)
			session.add(directory)
			session.commit()
		return directory

	def get_relpath(self):
		return os.path.relpath(self.path, config.get('music_root'))

	def dict(self):
		return {
			'type': 'dir',
			'name': self.get_relpath(),
			'metadata': {},
		}

class Artist(Base):
	__tablename__ = 'artists'

	id = Column(Integer, primary_key = True)
	name = Column(String, nullable = False, index = True)

	def __init__(self, name):
		self.name = name

	def __repr__(self):
		return '<Artist("{0}")>'.format(self.name.encode('utf-8'))

	@staticmethod
	def get(session, name):
		try:
			artist = session.query(Artist).filter(Artist.name == name).one()
		except NoResultFound:
			artist = Artist(name)
			session.add(artist)
			session.commit()
		return artist

class Album(Base):
	__tablename__ = 'albums'

	id = Column(Integer, primary_key = True)
	name = Column(String, nullable = False, index = True)
	artist_id = Column(Integer, ForeignKey('artists.id'), nullable = False)

	artist = relationship(Artist, backref = backref('albums', order_by = name))

	def __init__(self, name, artist_id):
		self.name = name
		self.artist_id = artist_id

	def __repr__(self):
		return '<Album("{0}")>'.format(self.name)

	@staticmethod
	def get(session, name, artist_id = None):
		try:
			album = session.query(Album).filter(Album.name == name).one()
		except NoResultFound:
			album = Album(name, artist_id)
			session.add(album)
			session.commit()
		return album

class Track(Base):
	__tablename__ = 'tracks'

	id = Column(Integer, primary_key = True)
	name = Column(String, index = True)
	num = Column(Integer)
	filename = Column(String, nullable = False, index = True)
	file_index = Column(Integer)
	directory_id = Column(Integer, ForeignKey('directories.id'), nullable = False)
	artist_id = Column(Integer, ForeignKey('artists.id'))
	album_id = Column(Integer, ForeignKey('albums.id'))

	directory = relationship(Directory, backref = backref('tracks', order_by = filename))
	artist = relationship(Artist, backref = backref('tracks'))
	album = relationship(Album, backref = backref('tracks'))

	def __init__(self, name, num, filename, file_index, directory_id, artist_id, album_id):
		self.name = name
		self.num = num
		self.filename = filename
		self.file_index = file_index
		self.directory_id = directory_id
		self.artist_id = artist_id
		self.album_id = album_id

	def __repr__(self):
		return '<Track("{0}")>'.format(self.filename.encode('utf-8'))

	@staticmethod
	def get(session, name, num, filename, file_index, directory_id, artist_id, album_id):
		try:
			track = session.query(Track).filter(and_(Track.filename == filename, Track.file_index == file_index)).one()
		except NoResultFound:
			track = Track(name, num, filename, file_index, directory_id, artist_id, album_id)
			session.add(track)
		return track

	@staticmethod
	def find(session, path, track = None):
		directory, filename = os.path.split(path)
		return session.query(Track).filter(and_(Track.filename == filename, Directory.path == directory, Track.file_index == track)).one()

	@staticmethod
	def search(session, *args, **kwargs):
		r = session.query(Track)
		s_or = []
		for f, n in ((Track, 'title'), (Album, 'album'), (Artist, 'artist')):
			if f != Track:
				r = r.join(f)
			if n in kwargs:
				r = r.filter(f.name.ilike('%{0}%'.format(kwargs[n])))
			for i in args:
				s_or.append(f.name.ilike('%{0}%'.format(i)))
		if len(s_or):
			r = r.filter(or_(*s_or))
		return r.all()

	def get_path(self):
		return os.path.join(self.directory.path, self.filename)

	def get_relpath(self):
		return os.path.relpath(self.get_path(), config.get('music_root'))

	def get_metadata(self):
		metadata = {}
		if self.name:
			metadata['title'] = self.name
		if self.artist:
			metadata['artist'] = self.artist.name
		if self.album:
			metadata['album'] = self.album.name
		return metadata

	def dict(self):
		return {
			'type': 'track',
			'name': self.get_relpath(),
			'track': self.file_index,
			'metadata': self.get_metadata(),
		}

Base.metadata.create_all(engine)

from sqlalchemy.orm import sessionmaker
Session = sessionmaker(bind = engine)
